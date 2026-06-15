import mongoose from 'mongoose';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';
import Address from '../models/Address.js';
import { PaymentMethod } from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import SupportTicket from '../models/SupportTicket.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import { CouponUsage } from '../models/Coupon.js';
import { getPermissionsForUser, mapRoleIdToKey } from '../services/rbacService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { isValidVietnamPhone, normalizeVietnamPhone } from '../utils/validatePhone.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envLoadResult = dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const isEnvLoaded = !envLoadResult.error;

console.info('[Auth][Facebook] env loaded:', isEnvLoaded);
console.info('[Auth][Facebook] Facebook App ID exists:', !!process.env.FACEBOOK_APP_ID);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const EMAIL_OTP_TTL_MINUTES = Number(process.env.EMAIL_OTP_TTL_MINUTES || 10);
const EMAIL_OTP_RESEND_SECONDS = Number(process.env.EMAIL_OTP_RESEND_SECONDS || 60);
const EMAIL_OTP_MAX_ATTEMPTS = Number(process.env.EMAIL_OTP_MAX_ATTEMPTS || 5);

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getDefaultFrontendRedirect = () => {
  const fallback = 'http://localhost:5173/login';
  const raw = String(process.env.FRONTEND_URL || '').trim();
  if (!raw) return fallback;

  try {
    const parsed = new URL(raw);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/login';
    }
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return fallback;
  }
};

const getAllowedRedirectOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  if (process.env.FRONTEND_URL) {
    try {
      origins.push(new URL(process.env.FRONTEND_URL).origin);
    } catch {
      // Ignore malformed FRONTEND_URL and keep safe defaults.
    }
  }

  return Array.from(new Set(origins));
};

const sanitizeFrontendRedirect = (rawRedirect) => {
  const fallback = getDefaultFrontendRedirect();
  if (!rawRedirect) return fallback;

  const redirectValue = String(rawRedirect).trim();
  if (!redirectValue) return fallback;

  if (redirectValue.startsWith('/') && !redirectValue.startsWith('//')) {
    try {
      const base = new URL(fallback);
      return new URL(redirectValue, `${base.origin}/`).toString();
    } catch {
      return fallback;
    }
  }

  try {
    const parsed = new URL(redirectValue);
    if (getAllowedRedirectOrigins().includes(parsed.origin)) {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const appendQuery = (url, key, value) => {
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const encodeOAuthState = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');

const decodeOAuthState = (stateRaw) => {
  if (!stateRaw) return null;

  try {
    const state = String(stateRaw).replace(/-/g, '+').replace(/_/g, '/');
    const padded = state + '='.repeat((4 - (state.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getFacebookOAuthConfig = (req) => {
  const clientId = String(process.env.FACEBOOK_APP_ID || '').trim();
  const clientSecret = String(process.env.FACEBOOK_APP_SECRET || '').trim();
  const callbackUrl = String(process.env.FACEBOOK_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`).trim();

  const configured = Boolean(clientId && clientSecret && callbackUrl);
  return {
    configured,
    clientId,
    clientSecret,
    callbackUrl,
    message: configured ? null : 'Facebook OAuth not configured',
  };
};

const issueEmailOtpForUser = async (user, emailInput, options = {}) => {
  const { bypassResendLimit = false } = options;
  const normalizedEmail = normalizeEmail(emailInput || user.email);
  if (!normalizedEmail) throw new Error('Email is required');

  if (!bypassResendLimit && user.email_otp_last_sent_at) {
    const sinceLastSent = Date.now() - new Date(user.email_otp_last_sent_at).getTime();
    if (sinceLastSent < EMAIL_OTP_RESEND_SECONDS * 1000) {
      const retryAfter = Math.ceil((EMAIL_OTP_RESEND_SECONDS * 1000 - sinceLastSent) / 1000);
      const err = new Error(`Vui long cho ${retryAfter}s truoc khi gui lai OTP`);
      err.code = 'OTP_RATE_LIMITED';
      err.retryAfter = retryAfter;
      throw err;
    }
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000);

  user.email = normalizedEmail;
  user.email_verified = false;
  user.email_verification_code = otpHash;
  user.email_verification_expires_at = expiresAt;
  user.email_verification_attempts = 0;
  user.email_otp_last_sent_at = new Date();
  await user.save();

  await sendOtpEmail({
    email: normalizedEmail,
    otp,
    expiresMinutes: EMAIL_OTP_TTL_MINUTES,
  });

  return { expiresAt, email: normalizedEmail };
};

const hydrateUserAuthPayload = async (user) => {
  user.role_key = user.role_key || mapRoleIdToKey(user.role_id);
  user.permissions = await getPermissionsForUser(user);
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  await RefreshToken.create({ token: refreshToken, user_id: user._id });
  user.last_login_at = new Date();
  await user.save();
  return { token, refreshToken, user: user.toPublic() };
};

const upsertFacebookUser = async ({ facebookId, email, name, avatar }) => {
  const normalizedEmail = normalizeEmail(email);
  let user = await User.findOne({ facebookId });

  if (!user && normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
  }

  if (!user) {
    user = new User({
      username: name || `facebook_${String(facebookId || '').slice(-6)}`,
      full_name: name || '',
      email: normalizedEmail || null,
      phone: '',
      facebookId,
      facebook_id: facebookId,
      avatar: avatar || null,
      role_key: 'customer',
      permissions: [],
      signup_method: 'facebook',
      login_provider: 'facebook',
      authProviders: ['facebook'],
      email_verified: Boolean(normalizedEmail),
      social_providers: [{ provider: 'facebook', provider_user_id: String(facebookId || '') }],
    });
  } else {
    user.facebookId = user.facebookId || String(facebookId || '');
    user.facebook_id = user.facebook_id || String(facebookId || '');
    user.login_provider = 'facebook';
    if (!user.email && normalizedEmail) user.email = normalizedEmail;
    user.avatar = user.avatar || avatar || null;
    user.full_name = user.full_name || name || '';
    if (!Array.isArray(user.social_providers)) user.social_providers = [];
    if (!user.social_providers.some((p) => p.provider === 'facebook')) {
      user.social_providers.push({ provider: 'facebook', provider_user_id: String(facebookId || '') });
    }
    // Add 'facebook' to authProviders if not present
    if (!Array.isArray(user.authProviders)) user.authProviders = [];
    if (!user.authProviders.includes('facebook')) {
      user.authProviders.push('facebook');
    }
  }

  if (normalizedEmail && (!user.email || normalizeEmail(user.email) === normalizedEmail)) {
    user.email = normalizedEmail;
    user.email_verified = true;
    user.email_verification_code = null;
    user.email_verification_expires_at = null;
    user.email_verification_attempts = 0;
  }

  if (!normalizeEmail(user.email)) {
    user.email = null;
    user.email_verified = false;
  }

  return user;
};

const fetchFacebookProfile = async (accessToken) => {
  const profileResponse = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`);
  if (!profileResponse.ok) {
    throw new Error('Facebook profile fetch failed');
  }
  const profile = await profileResponse.json();
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar: profile?.picture?.data?.url || null,
  };
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc' });
    }

    const normalizedRegEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedRegEmail });

    if (existing) {
      // SECURITY: Detect provider collision — block email/password registration
      // if the email is already owned by an OAuth provider
      const providers = Array.isArray(existing.authProviders) ? existing.authProviders : [];
      if (providers.includes('google') && !existing.password_hash) {
        return res.status(409).json({
          success: false,
          message: 'Email này đã được liên kết với Google Sign-In. Vui lòng đăng nhập bằng Google trước.',
          code: 'PROVIDER_COLLISION_GOOGLE',
        });
      }
      if (providers.includes('facebook') && !existing.password_hash) {
        return res.status(409).json({
          success: false,
          message: 'Email này đã được liên kết với Facebook. Vui lòng đăng nhập bằng Facebook trước.',
          code: 'PROVIDER_COLLISION_FACEBOOK',
        });
      }
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const normalizedPhone = normalizeVietnamPhone(phone || '');
    if (normalizedPhone && !isValidVietnamPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ hoặc chưa cập nhật' });
    }
    const user = await User.create({
      username: username || normalizedRegEmail.split('@')[0],
      full_name: username || '',
      email: normalizedRegEmail,
      password_hash: password,
      phone: normalizedPhone,
      role_key: 'customer',
      permissions: [],
      email_verified: false,
      signup_method: 'email',
      login_provider: 'local',
      authProviders: ['local'],
    });

    try {
      await issueEmailOtpForUser(user, user.email, { bypassResendLimit: true });
    } catch (otpErr) {
      console.error('[Auth][register] send OTP failed:', otpErr.message);
    }

    const payload = await hydrateUserAuthPayload(user);
    return res.status(201).json({
      success: true,
      data: {
        ...payload,
        needs_email_verification: true,
      },
      message: 'Đăng ký thành công. Vui lòng xác thực email bằng OTP.',
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }
    const query = emailOrPhone.includes('@')
      ? { email: normalizeEmail(emailOrPhone) }
      : { phone: emailOrPhone.trim() };
    const user = await User.findOne(query);
    if (!user) {
      await logSecurityEvent({ userId: null, action: 'LOGIN_FAILED', resource: 'Auth', details: { identifier: emailOrPhone }, ip: req.ip, requestId: req.id, status: 'FAILURE' });
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    if (!user.is_active) {
      await logSecurityEvent({ userId: user._id, action: 'LOGIN_BLOCKED', resource: 'Auth', details: { reason: 'Account locked' }, ip: req.ip, requestId: req.id, status: 'FAILURE' });
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
    }

    // SECURITY: If user has no local password (pure OAuth), guide them to the correct provider
    if (!user.password_hash) {
      const providers = Array.isArray(user.authProviders) ? user.authProviders : [];
      if (providers.includes('google')) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản này sử dụng Google Sign-In. Vui lòng đăng nhập bằng Google.',
          code: 'USE_GOOGLE_LOGIN',
        });
      }
      if (providers.includes('facebook')) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản này sử dụng Facebook. Vui lòng đăng nhập bằng Facebook.',
          code: 'USE_FACEBOOK_LOGIN',
        });
      }
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      await logSecurityEvent({ userId: user._id, action: 'LOGIN_FAILED', resource: 'Auth', details: { reason: 'Invalid password' }, ip: req.ip, requestId: req.id, status: 'FAILURE' });
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    await RefreshToken.create({ token: refreshToken, user_id: user._id });

    user.role_key = user.role_key || mapRoleIdToKey(user.role_id);
    user.permissions = await getPermissionsForUser(user);
    user.last_login_at = new Date();
    await user.save();

    await logSecurityEvent({ userId: user._id, action: 'LOGIN_SUCCESS', resource: 'Auth', details: { role: user.role_key }, ip: req.ip, requestId: req.id, status: 'SUCCESS' });
    return res.json({ success: true, data: { token, refreshToken, user: user.toPublic() }, message: 'Đăng nhập thành công' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/verify
export const verify = async (req, res) => {
  try {
    const user = req.user;
    return res.json({ success: true, data: { user: user.toPublic ? user.toPublic() : user } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/google
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Thiếu Google credential' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google token verify error:', verifyErr.message);
      return res.status(401).json({ success: false, message: 'Google token không hợp lệ' });
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account không cung cấp email' });
    }

    const normalizedEmail = normalizeEmail(email);

    // Find user by googleId first
    let user = await User.findOne({ googleId });

    if (!user) {
      // Find by email for account linking
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        // Link Google to existing account
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        user.full_name = user.full_name || name;
        if (!Array.isArray(user.social_providers)) user.social_providers = [];
        if (!user.social_providers.some(p => p.provider === 'google')) {
          user.social_providers.push({ provider: 'google', provider_user_id: googleId });
        }
        // Add 'google' to authProviders if not present
        if (!Array.isArray(user.authProviders)) user.authProviders = [];
        if (!user.authProviders.includes('google')) {
          user.authProviders.push('google');
        }
      } else {
        // Create new user
        user = new User({
          username: name || normalizedEmail.split('@')[0],
          full_name: name || '',
          email: normalizedEmail,
          phone: '',
          googleId,
          avatar: picture,
          role_key: 'customer',
          permissions: [],
          signup_method: 'google',
          login_provider: 'google',
          authProviders: ['google'],
          email_verified: true,
          social_providers: [{ provider: 'google', provider_user_id: googleId }],
        });
      }
    } else {
      // Existing user found by googleId — ensure 'google' is in authProviders
      if (!Array.isArray(user.authProviders)) user.authProviders = [];
      if (!user.authProviders.includes('google')) {
        user.authProviders.push('google');
      }
    }

    // Update login_provider to reflect CURRENT login, mark email as verified (Google guarantees it)
    user.login_provider = 'google';
    user.email_verified = true;
    const payloadData = await hydrateUserAuthPayload(user);

    return res.json({ success: true, data: payloadData, message: 'Đăng nhập Google thành công' });
  } catch (err) {
    console.error('Google login error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/facebook
export const facebookAuthStart = async (req, res) => {
  const safeRedirect = sanitizeFrontendRedirect(req.query?.redirect);
  try {
    console.info('[Auth][Facebook] route /api/auth/facebook hit');
    console.info('[Auth][Facebook] redirect param:', String(req.query?.redirect || ''));

    const fbConfig = getFacebookOAuthConfig(req);
    if (!fbConfig.configured) {
      console.warn('[Auth][Facebook] Facebook OAuth not configured');
      const redirectWithError = appendQuery(appendQuery(safeRedirect, 'oauth_error', 'facebook_not_configured'), 'oauth_message', fbConfig.message);
      return res.redirect(redirectWithError);
    }

    const state = encodeOAuthState({ redirect: safeRedirect, ts: Date.now() });
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(fbConfig.clientId)}&redirect_uri=${encodeURIComponent(fbConfig.callbackUrl)}&scope=email,public_profile&state=${encodeURIComponent(state)}`;
    return res.redirect(authUrl);
  } catch (err) {
    console.error('[Auth][Facebook] facebookAuthStart error:', err?.stack || err?.message || err);
    const redirectWithError = appendQuery(appendQuery(safeRedirect, 'oauth_error', 'facebook_oauth_start_failed'), 'oauth_message', 'Facebook OAuth start failed');
    return res.redirect(redirectWithError);
  }
};

// GET /api/auth/facebook/callback
export const facebookAuthCallback = async (req, res) => {
  let redirectTarget = getDefaultFrontendRedirect();
  try {
    console.info('[Auth][Facebook] callback hit');
    const { code, state } = req.query;
    console.info('[Auth][Facebook] callback params:', { hasCode: !!code, hasState: !!state });

    const decodedState = decodeOAuthState(state);
    redirectTarget = sanitizeFrontendRedirect(decodedState?.redirect || req.query?.redirect);

    if (!code) {
      return res.redirect(`${redirectTarget}?oauth_error=missing_code_or_state`);
    }

    const fbConfig = getFacebookOAuthConfig(req);

    if (!fbConfig.configured) {
      return res.redirect(appendQuery(appendQuery(redirectTarget, 'oauth_error', 'facebook_not_configured'), 'oauth_message', fbConfig.message));
    }

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${encodeURIComponent(fbConfig.clientId)}&client_secret=${encodeURIComponent(fbConfig.clientSecret)}&redirect_uri=${encodeURIComponent(fbConfig.callbackUrl)}&code=${encodeURIComponent(String(code))}`,
    );
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      console.error('[Auth][Facebook] Failed to exchange access token:', tokenData);
      return res.redirect(`${redirectTarget}?oauth_error=facebook_access_token_failed`);
    }

    const profile = await fetchFacebookProfile(accessToken);
    console.info('[Auth][Facebook] profile received:', {
      id: profile?.id || null,
      hasEmail: !!profile?.email,
      hasName: !!profile?.name,
      hasAvatar: !!profile?.avatar,
    });

    const user = await upsertFacebookUser({
      facebookId: profile.id,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
    });

    const payloadData = await hydrateUserAuthPayload(user);
    console.info('[Auth][Facebook] auth payload ready:', {
      userId: String(payloadData?.user?._id || payloadData?.user?.id || ''),
      hasToken: !!payloadData?.token,
      hasRefreshToken: !!payloadData?.refreshToken,
      provider: 'facebook',
    });

    const encodedUser = Buffer.from(JSON.stringify(payloadData.user)).toString('base64url');
    const joiner = redirectTarget.includes('?') ? '&' : '?';
    return res.redirect(
      `${redirectTarget}${joiner}oauth_token=${encodeURIComponent(payloadData.token)}&oauth_refresh=${encodeURIComponent(payloadData.refreshToken || '')}&oauth_user=${encodeURIComponent(encodedUser)}&oauth_provider=facebook`,
    );
  } catch (err) {
    console.error('[Auth][Facebook] callback error:', err?.stack || err?.message || err);
    const joiner = redirectTarget.includes('?') ? '&' : '?';
    return res.redirect(`${redirectTarget}${joiner}oauth_error=facebook_callback_failed`);
  }
};

// POST /api/auth/facebook
export const facebookLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Thiếu access token Facebook' });
    }

    const profile = await fetchFacebookProfile(accessToken);
    console.info('[Auth][Facebook] profile received:', {
      id: profile?.id || null,
      hasEmail: !!profile?.email,
      hasName: !!profile?.name,
      hasAvatar: !!profile?.avatar,
    });

    const user = await upsertFacebookUser({
      facebookId: profile.id,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
    });

    const payloadData = await hydrateUserAuthPayload(user);
    console.info('[Auth][Facebook] auth payload ready:', {
      userId: String(payloadData?.user?._id || payloadData?.user?.id || ''),
      hasToken: !!payloadData?.token,
      hasRefreshToken: !!payloadData?.refreshToken,
      provider: 'facebook',
    });

    return res.json({ success: true, data: payloadData, message: 'Đăng nhập Facebook thành công' });
  } catch (err) {
    console.error('Facebook login error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Facebook login failed' });
  }
};

// POST /api/auth/email/request-otp
export const requestEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email || req.user?.email);
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const duplicateUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (duplicateUser) {
        return res.status(409).json({ success: false, message: 'Email da duoc su dung boi tai khoan khac' });
      }
    } else {
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan voi email nay' });
      }
    }

    try {
      const result = await issueEmailOtpForUser(user, normalizedEmail);
      return res.json({
        success: true,
        message: 'OTP da duoc gui ve email',
        data: {
          email: result.email,
          expires_at: result.expiresAt,
        },
      });
    } catch (otpErr) {
      if (otpErr.code === 'OTP_RATE_LIMITED') {
        return res.status(429).json({
          success: false,
          message: otpErr.message,
          retry_after: otpErr.retryAfter,
        });
      }

      if (otpErr.code === 'EMAIL_CONFIG_MISSING') {
        return res.status(500).json({ success: false, message: otpErr.message });
      }

      throw otpErr;
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/email/resend-otp
export const resendEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email || req.user?.email);
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const duplicateUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (duplicateUser) {
        return res.status(409).json({ success: false, message: 'Email da duoc su dung boi tai khoan khac' });
      }
    } else {
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan voi email nay' });
      }
    }

    try {
      const result = await issueEmailOtpForUser(user, normalizedEmail);
      return res.json({
        success: true,
        message: 'OTP da duoc gui lai ve email',
        data: {
          email: result.email,
          expires_at: result.expiresAt,
        },
      });
    } catch (otpErr) {
      if (otpErr.code === 'OTP_RATE_LIMITED') {
        return res.status(429).json({
          success: false,
          message: otpErr.message,
          retry_after: otpErr.retryAfter,
        });
      }

      if (otpErr.code === 'EMAIL_CONFIG_MISSING') {
        return res.status(500).json({ success: false, message: otpErr.message });
      }

      throw otpErr;
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/email/verify-otp
export const verifyEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email || req.user?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ success: false, message: 'Email va OTP la bat buoc' });
    }

    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (normalizeEmail(user.email) !== normalizedEmail) {
        const duplicateUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (duplicateUser) {
          return res.status(409).json({ success: false, message: 'Email da duoc su dung boi tai khoan khac' });
        }
      }
      user.email = normalizedEmail;
    } else {
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan voi email nay' });
      }
    }

    if (!user.email_verification_code || !user.email_verification_expires_at) {
      return res.status(400).json({ success: false, message: 'OTP chua duoc yeu cau. Vui long gui lai OTP.' });
    }

    if (user.email_verification_attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Ban da nhap sai qua nhieu lan. Vui long gui lai OTP moi.' });
    }

    if (new Date(user.email_verification_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP da het han. Vui long gui lai OTP.', code: 'OTP_EXPIRED' });
    }

    const isValidOtp = await bcrypt.compare(otp, user.email_verification_code);
    if (!isValidOtp) {
      user.email_verification_attempts = Number(user.email_verification_attempts || 0) + 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'OTP khong dung',
        attempts_left: Math.max(0, EMAIL_OTP_MAX_ATTEMPTS - Number(user.email_verification_attempts || 0)),
      });
    }

    user.email = normalizedEmail;
    user.email_verified = true;
    user.email_verification_code = null;
    user.email_verification_expires_at = null;
    user.email_verification_attempts = 0;
    await user.save();

    return res.json({ success: true, message: 'Xac thuc email thanh cong', data: { user: user.toPublic() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Missing refresh token' });
    }

    // Check if token exists in DB
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    // REUSE DETECTION: If token is already revoked, someone is reusing an old token!
    if (storedToken.is_revoked) {
      // Invalidate ALL sessions for this user (force logout everywhere)
      await RefreshToken.deleteMany({ user_id: storedToken.user_id });
      await logSecurityEvent({ userId: storedToken.user_id, action: 'TOKEN_REUSE_DETECTED', resource: 'Auth', details: { token: refreshToken }, ip: req.ip, requestId: req.id, status: 'SUSPICIOUS' });
      return res.status(401).json({ success: false, message: 'Security alert: Token reuse detected. All sessions terminated.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Token rotation: Mark old token as revoked, generate new
    storedToken.is_revoked = true;
    await storedToken.save();

    const newToken = generateToken(user);
    const newRefresh = generateRefreshToken(user);
    await RefreshToken.create({ token: newRefresh, user_id: user._id });

    return res.json({ success: true, data: { token: newToken, refreshToken: newRefresh } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    if (req.user) {
      // Clear refresh tokens for user in DB
      await RefreshToken.deleteMany({ user_id: req.user._id });
      req.user.refresh_token = null;
      await req.user.save();
    }
    return res.json({ success: true, message: 'Đăng xuất thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/profile
export const getProfile = async (req, res) => {
  return res.json({ success: true, data: { user: req.user.toPublic() } });
};

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const allowed = ['username', 'full_name', 'phone', 'avatar', 'dob', 'gender', 'address', 'bio', 'preferences'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.phone !== undefined) {
      const normalizedPhone = normalizeVietnamPhone(updates.phone || '');
      if (normalizedPhone && !isValidVietnamPhone(normalizedPhone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ hoặc chưa cập nhật' });
      }
      updates.phone = normalizedPhone;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password_hash -refresh_token');
    return res.json({ success: true, data: { user: user.toPublic() }, message: 'Cập nhật thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/change-password
// SECURITY: Only allow password creation/change for AUTHENTICATED users.
// For OAuth-only users, this acts as "Create Password" (account linking).
// Unauthenticated users CANNOT create a password for an OAuth account.
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới tối thiểu 8 ký tự' });
    }
    // Password strength: uppercase, lowercase, number, special char
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!strongRegex.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    const isCreatingPassword = !user.password_hash;

    // If user already has a password, verify the current one
    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại' });
      }
      const valid = await user.comparePassword(currentPassword);
      if (!valid) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password_hash = newPassword; // pre-save hook hashes it
    user.password_changed_at = new Date();

    // Add 'local' to authProviders if creating password for OAuth-only account (account linking)
    if (!Array.isArray(user.authProviders)) user.authProviders = [];
    if (!user.authProviders.includes('local')) {
      user.authProviders.push('local');
    }

    await user.save();

    // Invalidate all other sessions (security best practice)
    await RefreshToken.deleteMany({ user_id: user._id });

    // Create new session for current device
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    await RefreshToken.create({ token: refreshToken, user_id: user._id });

    // Audit log
    await logSecurityEvent({
      userId: user._id,
      action: isCreatingPassword ? 'PASSWORD_CREATED' : 'PASSWORD_CHANGED',
      resource: 'Auth',
      details: { had_previous_password: !isCreatingPassword },
      ip: req.ip,
      requestId: req.id,
      status: 'SUCCESS',
    });

    return res.json({
      success: true,
      message: isCreatingPassword ? 'Tạo mật khẩu thành công' : 'Đổi mật khẩu thành công',
      data: { token, refreshToken, user: user.toPublic() },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/forgot-password
// SECURITY: Only allow forgot-password for accounts that HAVE a local password.
// OAuth-only accounts should not be able to reset/create password via forgot-password.
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    // We intentionally return a success message even if the user is not found to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã OTP' });
    }

    // SECURITY: Block forgot-password for OAuth-only accounts (no local password)
    // This prevents attackers from using forgot-password to claim an OAuth account
    if (!user.password_hash) {
      const providers = Array.isArray(user.authProviders) ? user.authProviders : [];
      const oauthOnly = providers.some(p => ['google', 'facebook'].includes(p)) && !providers.includes('local');
      if (oauthOnly) {
        // Return generic message to avoid email enumeration, but don't send OTP
        return res.json({ success: true, message: 'Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã OTP' });
      }
    }

    try {
      await issueEmailOtpForUser(user, normalizedEmail, { bypassResendLimit: true });
    } catch (err) {
      console.error('Failed to send forgot password OTP:', err);
    }

    return res.json({ success: true, message: 'Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã OTP' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/reset-password
// SECURITY: Only allow reset for accounts that already have 'local' in authProviders.
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email, OTP và mật khẩu mới' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    // SECURITY: Block password reset for OAuth-only accounts
    const providers = Array.isArray(user.authProviders) ? user.authProviders : [];
    if (!user.password_hash && !providers.includes('local')) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản này sử dụng đăng nhập qua mạng xã hội. Vui lòng đăng nhập bằng Google/Facebook trước rồi tạo mật khẩu.',
      });
    }

    if (!user.email_verification_code || !user.email_verification_expires_at) {
      return res.status(400).json({ success: false, message: 'OTP chưa được yêu cầu hoặc đã hết hạn' });
    }

    if (new Date(user.email_verification_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP đã hết hạn. Vui lòng yêu cầu OTP mới.' });
    }

    if (user.email_verification_attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.' });
    }

    const isValidOtp = await bcrypt.compare(String(otp).trim(), user.email_verification_code);
    if (!isValidOtp) {
      user.email_verification_attempts = Number(user.email_verification_attempts || 0) + 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác',
        attempts_left: Math.max(0, EMAIL_OTP_MAX_ATTEMPTS - Number(user.email_verification_attempts)),
      });
    }

    // OTP is valid. Update password.
    user.password_hash = newPassword;

    // Add 'local' to authProviders if not present
    if (!providers.includes('local')) {
      user.authProviders.push('local');
    }

    // Clear OTP states
    user.email_verification_code = null;
    user.email_verification_expires_at = null;
    user.email_verification_attempts = 0;

    // Invalidate all active sessions (security measure)
    await RefreshToken.deleteMany({ user_id: user._id });
    user.refresh_token = null;

    await user.save();

    return res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/logout-all
export const logoutAll = async (req, res) => {
  try {
    if (req.user) {
      // Delete ALL refresh tokens for this user from the DB
      await RefreshToken.deleteMany({ user_id: req.user._id });
      req.user.refresh_token = null;
      await req.user.save();

      // Re-issue a single session for the current device
      const token = generateToken(req.user);
      const refreshToken = generateRefreshToken(req.user);
      await RefreshToken.create({ token: refreshToken, user_id: req.user._id });

      await logSecurityEvent({
        userId: req.user._id,
        action: 'LOGOUT_ALL_DEVICES',
        resource: 'Auth',
        details: {},
        ip: req.ip,
        requestId: req.id,
        status: 'SUCCESS',
      });

      return res.json({
        success: true,
        message: 'Đã đăng xuất tất cả thiết bị',
        data: { token, refreshToken },
      });
    }
    return res.json({ success: true, message: 'Đã đăng xuất tất cả thiết bị' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/profile/summary — returns counts for the current user ONLY
export const profileSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const [totalOrders, processingOrders, shippingOrders, deliveredOrders, cancelledOrders, addressCount, paymentMethodCount, unreadNotifications, reviewCount, openTickets, loyaltyTx, couponUsageCount] = await Promise.all([
      Order.countDocuments({ user_id: userId }),
      Order.countDocuments({ user_id: userId, status: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } }),
      Order.countDocuments({ user_id: userId, status: 'SHIPPING' }),
      Order.countDocuments({ user_id: userId, status: 'DELIVERED' }),
      Order.countDocuments({ user_id: userId, status: 'CANCELLED' }),
      Address.countDocuments({ user_id: userId }),
      PaymentMethod.countDocuments({ user_id: userId }),
      Notification.countDocuments({ user_id: userId, is_read: false }),
      Review.countDocuments({ user_id: userId }),
      SupportTicket.countDocuments({ user_id: userId, status: { $nin: ['CLOSED', 'RESOLVED'] } }),
      LoyaltyTransaction.find({ user_id: userId }).select('points'),
      CouponUsage.countDocuments({ user_id: userId }),
    ]);
    const totalLoyaltyPoints = loyaltyTx.reduce((sum, t) => sum + (t.points || 0), 0);
    return res.json({
      success: true,
      data: {
        totalOrders,
        processingOrders,
        shippingOrders,
        deliveredOrders,
        cancelledOrders,
        addressCount,
        paymentMethodCount,
        unreadNotifications,
        reviewCount,
        openTickets,
        totalLoyaltyPoints,
        couponUsageCount,
      },
    });
  } catch (err) {
    console.error('Profile summary error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/validate-balance
export const validateBalance = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const toObjectIdIfValid = (id) => {
      if (!id) return id;
      if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
      return id;
    };

    const userIds = [toObjectIdIfValid(userId), String(userId)];

    // Sum all points in LoyaltyTransaction ledger
    const ledger = await LoyaltyTransaction.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $group: { _id: null, totalPoints: { $sum: '$points' } } }
    ]);

    const ledgerTotal = ledger.length > 0 ? Math.max(0, ledger[0].totalPoints) : 0;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentPoints = user.lotte_points || 0;
    let corrected = false;

    if (currentPoints !== ledgerTotal) {
      user.lotte_points = ledgerTotal;
      await user.save();
      corrected = true;

      // Log the discrepancy and the fix
      try {
        const { logActivity } = await import('../services/auditService.js');
        await logActivity({
          userId: user._id,
          userName: 'SYSTEM_LEDGER_VALIDATION',
          action: 'LOYALTY_BALANCE_CORRECTION',
          entity: 'user',
          entityId: user._id,
          details: {
            previousPoints: currentPoints,
            newPoints: ledgerTotal,
            reason: 'Auto-corrected from transaction ledger verification'
          },
          ip: req.ip || '127.0.0.1'
        });
      } catch (auditErr) {
        console.error('[ValidateBalance] Failed to write audit log:', auditErr.message);
      }
    }

    return res.json({
      success: true,
      data: {
        points: user.lotte_points,
        corrected,
        previousPoints: corrected ? currentPoints : undefined
      },
      message: corrected ? 'Đã đồng bộ điểm từ lịch sử giao dịch.' : 'Điểm số hoàn toàn khớp với lịch sử giao dịch.'
    });
  } catch (err) {
    console.error('[ValidateBalance] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

