import { Router } from 'express';
import passport from 'passport';
import { auth, optionalAuth } from '../middlewares/auth.js';
import * as c from '../controllers/authController.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { getPermissionsForUser, mapRoleIdToKey } from '../services/rbacService.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { strictAuthLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

const LOGIN_SUCCESS_PATH = '/login-success';

const getFrontendBase = () => {
	const fallback = 'http://localhost:5173';
	try {
		const raw = String(process.env.FRONTEND_URL || '').trim();
		if (!raw) return fallback;
		const parsed = new URL(raw);
		return parsed.origin;
	} catch {
		return fallback;
	}
};

const buildFrontendUrl = (pathname, query = {}) => {
	const url = new URL(pathname, getFrontendBase());
	Object.entries(query).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			url.searchParams.set(key, String(value));
		}
	});
	return url.toString();
};

const getFrontendOrigin = () => {
	try {
		return new URL(getFrontendBase()).origin;
	} catch {
		return 'http://localhost:5173';
	}
};

const sanitizeNextPath = (raw) => {
	if (!raw) return '/';
	const value = String(raw).trim();
	if (!value) return '/';

	if (value.startsWith('/') && !value.startsWith('//')) {
		return value;
	}

	try {
		const parsed = new URL(value);
		if (parsed.origin !== getFrontendOrigin()) return '/';
		return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
	} catch {
		return '/';
	}
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

const isFacebookStrategyReady = () => Boolean(passport._strategy('facebook'));

const loginSchema = z.object({
  body: z.object({
    emailOrPhone: z.string().min(1, 'Vui lòng nhập email hoặc số điện thoại'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  }).passthrough(),
  query: z.any().optional(),
  params: z.any().optional()
});

router.post('/register', strictAuthLimiter, c.register);
router.post('/login', strictAuthLimiter, validate(loginSchema), c.login);
router.get('/verify', auth, c.verify);
router.get('/validate-balance', auth, c.validateBalance);
router.post('/google', c.googleLogin);

router.get('/facebook', (req, res, next) => {
	console.info('[Auth][Facebook] route /api/auth/facebook hit');
	if (!isFacebookStrategyReady()) {
		return res.status(500).json({ success: false, message: 'Facebook OAuth not configured' });
	}

	const state = encodeOAuthState({
		next: sanitizeNextPath(req.query?.redirect || req.query?.next),
		ts: Date.now(),
	});

	return passport.authenticate('facebook', {
		scope: ['public_profile', 'email'],
		state,
		session: false,
	})(req, res, next);
});

router.get('/facebook/callback', (req, res, next) => {
	console.info('[Auth][Facebook] callback hit');

	if (!req.query?.code) {
		return res.redirect(buildFrontendUrl('/login', { oauth_error: 'missing_code_or_state' }));
	}

	if (!isFacebookStrategyReady()) {
		return res.redirect(buildFrontendUrl('/login', { oauth_error: 'facebook_not_configured' }));
	}

	return passport.authenticate('facebook', { session: false }, async (err, user) => {
		try {
			if (err) {
				console.error('[Auth][Facebook] callback error:', err?.stack || err?.message || err);
				return res.redirect(buildFrontendUrl('/login', { oauth_error: 'facebook_callback_failed' }));
			}

			if (!user) {
				return res.redirect(buildFrontendUrl('/login', { oauth_error: 'facebook_auth_failed' }));
			}

			user.role_key = user.role_key || mapRoleIdToKey(user.role_id);
			user.permissions = await getPermissionsForUser(user);

			const token = generateToken(user);
			const refreshToken = generateRefreshToken(user);
			user.refresh_token = refreshToken;
			user.last_login_at = new Date();
			await user.save();

			const publicUser = user.toPublic ? user.toPublic() : user;
			const encodedUser = Buffer.from(JSON.stringify(publicUser)).toString('base64url');
			const oauthState = decodeOAuthState(req.query?.state);
			const nextPath = sanitizeNextPath(oauthState?.next);

			console.info('[Auth][Facebook] auth payload ready:', {
				userId: String(publicUser?._id || publicUser?.id || ''),
				hasToken: !!token,
				hasRefreshToken: !!refreshToken,
				provider: 'facebook',
			});

			return res.redirect(buildFrontendUrl(LOGIN_SUCCESS_PATH, {
				token,
				refresh_token: refreshToken,
				user: encodedUser,
				provider: 'facebook',
				next: nextPath,
			}));
		} catch (callbackErr) {
			console.error('[Auth][Facebook] callback finalize error:', callbackErr?.stack || callbackErr?.message || callbackErr);
			return res.redirect(buildFrontendUrl('/login', { oauth_error: 'facebook_callback_finalize_failed' }));
		}
	})(req, res, next);
});

router.post('/facebook', c.facebookLogin);
router.post('/email/request-otp', strictAuthLimiter, optionalAuth, c.requestEmailOtp);
router.post('/email/resend-otp', strictAuthLimiter, optionalAuth, c.resendEmailOtp);
router.post('/email/verify-otp', strictAuthLimiter, optionalAuth, c.verifyEmailOtp);
router.post('/refresh', c.refresh);
router.post('/logout', auth, c.logout);
router.post('/logout-all', auth, c.logoutAll);
router.get('/profile/summary', auth, c.profileSummary);
router.get('/profile', auth, c.getProfile);
router.put('/profile', auth, c.updateProfile);
router.post('/change-password', strictAuthLimiter, auth, c.changePassword);
router.post('/forgot-password', strictAuthLimiter, c.forgotPassword);
router.post('/reset-password', strictAuthLimiter, c.resetPassword);

export default router;
