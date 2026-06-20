// src/pages/Register.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { register, loginWithGoogle, clearAuthMessages, hydrateOAuthSession, verifySession } from '../slices/authSlice';
import { setupGoogleSignIn } from '../utils/googleIdentity';
import { authService } from '../services/authService';
import { toast } from '../components/Toast/toastEvent';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^(?:\+84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
const usernameRegex = /^[\p{L} \.'\-]{2,80}$/u;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^~#\-+=<>/\\;:'",.])[A-Za-z\d@$!%*?&()[\]{}^~#\-+=<>/\\;:'",.]{8,}$/;

const Register: React.FC = () => {
  const { t } = useTranslation();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const isGoogleConfigured = googleClientId.length > 0;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4 levels
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpInfoMessage, setOtpInfoMessage] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const getSafeRedirect = () => {
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');

    if (
      redirect &&
      redirect.startsWith('/') &&
      redirect !== '/login' &&
      redirect !== '/register' &&
      !redirect.includes('redirect=')
    ) {
      return redirect;
    }

    return '/';
  };

  const handlePostAuthRedirect = () => {
    navigate(getSafeRedirect(), { replace: true });
  };


  const getErrorText = (error: unknown, fallback: string) => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message?: string }).message || fallback;
    }
    return fallback;
  };

  const mapGoogleAuthError = (error: unknown): string => {
    const text = getErrorText(error, 'Đăng nhập Google thất bại');
    const normalized = text.toLowerCase();

    if (normalized.includes('popup')) {
      return 'Popup Google đã bị chặn hoặc đã đóng. Vui lòng cho phép popup và thử lại.';
    }

    if (normalized.includes('origin') || normalized.includes('not allowed')) {
      return 'Google OAuth chưa cho phép domain hiện tại. Vui lòng cấu hình Authorized JavaScript origins trên Google Cloud Console.';
    }

    if (normalized.includes('credential')) {
      return 'Google không trả về credential hợp lệ. Vui lòng thử lại.';
    }

    if (normalized.includes('chưa sẵn sàng') || normalized.includes('initialize')) {
      return 'Không thể khởi tạo Google Identity Services. Vui lòng tải lại trang.';
    }

    return text;
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  
  React.useEffect(() => {
    if (Object.keys(errors).length > 0 && !errors.form) {
      validate();
    }
  }, [username, email, phone, password, confirmPassword, agreeTerms]);

  React.useEffect(() => {
    if (authState.error) {
      setErrors((prev: any) => ({ ...prev, form: authState.error || undefined }));
    }
  }, [authState.error]);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const oauthToken = searchParams.get('oauth_token');
    const oauthRefresh = searchParams.get('oauth_refresh') || undefined;
    const oauthUser = searchParams.get('oauth_user');
    const oauthError = searchParams.get('oauth_error');
    const oauthMessage = searchParams.get('oauth_message');

    if (oauthError) {
      setErrors({ form: oauthMessage || 'Đăng nhập Facebook thất bại. Vui lòng thử lại.' });
      return;
    }

    if (oauthToken && oauthUser) {
      try {
        const raw = decodeURIComponent(oauthUser);
        const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const user = JSON.parse(atob(padded));
        dispatch(hydrateOAuthSession({ token: oauthToken, refreshToken: oauthRefresh, user }));
        handlePostAuthRedirect();
      } catch (err) {
        setErrors({ form: 'Không thể xử lý dữ liệu đăng nhập Facebook.' });
      }
    }
  }, [location.search, dispatch]);

  React.useEffect(() => {
    if (!isGoogleConfigured) {
      return;
    }
    
    setupGoogleSignIn({
      containerId: 'google-login-btn-container',
      onSuccess: async (credential) => {
        dispatch(clearAuthMessages());
        setSocialLoading('google');
        try {
          await dispatch(loginWithGoogle(credential)).unwrap();
          handlePostAuthRedirect();
        } catch (err: any) {
          setErrors({ form: mapGoogleAuthError(err) });
        } finally {
          setSocialLoading(null);
        }
      },
      onError: (errMessage) => {
        setSocialLoading(null);
        setErrors({ form: errMessage });
      }
    });

  }, [isGoogleConfigured, dispatch]);

  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPwd = e.target.value;
    setPassword(newPwd);
    calculatePasswordStrength(newPwd);
  };

  function validate() {
    const e:any = {};
    if (!usernameRegex.test(username)) e.username = 'Họ tên không hợp lệ (2-80 ký tự)';
    if (!emailRegex.test(email)) e.email = 'Vui lòng nhập email hợp lệ';
    if (phone && !phoneRegex.test(phone)) e.phone = 'Số điện thoại không hợp lệ';
    if (!passwordRegex.test(password)) e.password = 'Mật khẩu ít nhất 8 ký tự, gồm HOA, thường, số, ký tự đặc biệt';
    if (password !== confirmPassword) e.confirmPassword = 'Xác nhận mật khẩu không khớp';
    if (!agreeTerms) e.terms = 'Bạn cần đồng ý với điều khoản dịch vụ';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    dispatch(clearAuthMessages());
    try {
      await dispatch(register({ username, email, phone, password })).unwrap();
      toast.success('Đăng ký thành công!');
      handlePostAuthRedirect();
    } catch (err: any) {
      setErrors({ form: getErrorText(err, 'Đăng ký thất bại') });
    }
  };

  const handleResendEmailOtp = async () => {
    if (!otpEmail) return;
    setOtpSending(true);
    setOtpInfoMessage(null);
    try {
      const result = await authService.resendEmailOtp(otpEmail);
      const cooldown = Math.max(0, Number(result?.retry_after || 60));
      setOtpCooldown(cooldown);
      setOtpInfoMessage(result?.message || 'Đã gửi lại OTP, vui lòng kiểm tra email.');
      toast.success(result?.message || 'Đã gửi lại OTP');
    } catch (err: any) {
      const retryAfter = Number(err?.response?.data?.retry_after || 0);
      if (retryAfter > 0) setOtpCooldown(retryAfter);
      const message = getErrorText(err?.response?.data || err, 'Không thể gửi lại OTP');
      setOtpInfoMessage(message);
      toast.error(message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpEmail || !otpCode.trim()) {
      setOtpInfoMessage('Vui lòng nhập OTP để xác thực email.');
      return;
    }

    setOtpVerifying(true);
    setOtpInfoMessage(null);
    try {
      await authService.verifyEmailOtp({ email: otpEmail, otp: otpCode.trim() });
      await dispatch(verifySession() as any);
      setShowEmailOtpModal(false);
      toast.success('Xác thực email thành công.');
      handlePostAuthRedirect();
    } catch (err: any) {
      const message = getErrorText(err?.response?.data || err, 'OTP không hợp lệ hoặc đã hết hạn');
      setOtpInfoMessage(message);
      toast.error(message);
    } finally {
      setOtpVerifying(false);
    }
  };


  const handleFacebookRegister = async () => {
    dispatch(clearAuthMessages());
    setSocialLoading('facebook');
    try {
      const redirect = '/';
      window.location.href = authService.getFacebookOAuthUrl(redirect);
    } catch (err: any) {
      setErrors({ form: getErrorText(err, 'Đăng nhập Facebook thất bại') });
      setSocialLoading(null);
    } finally {
      // no-op: redirect flow handles loading state
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Left Side: Brand Illustration (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 flex justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-2xl">
              <svg className="w-20 h-20 text-primary" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
              </svg>
            </div>
          </div>
          <h1 className="text-white text-5xl font-extrabold leading-tight mb-6">{t('auth.registerBannerTitle')}</h1>
          <p className="text-white/80 text-xl font-medium mb-12">
            Hàng ngàn ưu đãi hấp dẫn đang chờ đón bạn. Đăng ký ngay để trải nghiệm dịch vụ đi chợ online tiện lợi nhất.
          </p>
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVR47ZiZv9W-cMLQQ1YDNhOFX-yRNEarslAQ8iQgfE9OrzeOJFtUcVJJFIgE3Onhv3IlqlINgnjqcL1t5qab9zg1fu4pLwyuTl8vFbCxS8gWnTyIqvnm4PtAM7uINY9Dzq1DiIBRNnoztVOL24Upx5ztYuKN1SwaBtoCHdcQr5pm4S52M6nCLP8UOmD-Tir7mEouSGsm-eGIHZPwaoZjm8i0kZ1k0kUI6FPJiVmR-kKTwkkS8-QmUN5IivJO8mCvdUci3Sd-eQDDk"
              alt="A modern bright grocery store aisle with fresh produce"
            />
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form - CĂN GIỮA HOÀN HẢO */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 md:p-20 overflow-y-auto bg-white dark:bg-background-dark">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Header Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="text-primary size-8">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
              </svg>
            </div>
            <span className="text-2xl font-black text-primary">Lotte Mart</span>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">{t('auth.createAccount')}</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Bạn đã có tài khoản?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>

          {/* Social Sign-up */}
          <div className={`grid ${isGoogleConfigured ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-8 w-full`}>
            {isGoogleConfigured ? (
              <div className="relative flex items-center justify-center gap-3 h-[48px] px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden group">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{socialLoading === 'google' ? 'Đang mở Google...' : 'Continue with Google'}</span>
                
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, opacity: 0.01, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div id="google-login-btn-container" style={{ transform: 'scale(3)', transformOrigin: 'center' }}></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-3 px-4 border border-amber-300 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium">
                Google Sign-In chưa được cấu hình
              </div>
            )}
            <button
              type="button"
              onClick={handleFacebookRegister}
              disabled={authState.loading || socialLoading !== null}
              className="flex items-center justify-center gap-3 h-[48px] px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{socialLoading === 'facebook' ? 'Đang mở Facebook...' : 'Continue with Facebook'}</span>
            </button>
          </div>

          <div className="relative flex items-center py-5 mb-6 w-full">
            <div className="grow border-t border-slate-200 dark:border-slate-700" />
            <span className="shrink mx-4 text-slate-400 text-sm font-medium">{t('auth.orRegisterWithEmail')}</span>
            <div className="grow border-t border-slate-200 dark:border-slate-700" />
          </div>

          {/* Form */}
          <form className="space-y-4 w-full" onSubmit={onSubmit}>
            {errors.form && (() => {
              const formError = errors.form || '';
              const isGoogleCollision = formError.includes('[PROVIDER_COLLISION_GOOGLE]') || formError.includes('[USE_GOOGLE_LOGIN]');
              const isFacebookCollision = formError.includes('[PROVIDER_COLLISION_FACEBOOK]') || formError.includes('[USE_FACEBOOK_LOGIN]');
              const cleanMessage = formError.replace(/\[[\w_]+\]\s*/g, '');

              if (isGoogleCollision) {
                return (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="font-bold text-blue-800">Tài khoản Google</span>
                    </div>
                    <p className="text-blue-700">{cleanMessage}</p>
                    <Link to="/login" className="inline-block mt-2 text-sm font-bold text-blue-600 hover:underline">← Quay về trang đăng nhập</Link>
                  </div>
                );
              }

              if (isFacebookCollision) {
                return (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span className="font-bold text-indigo-800">Tài khoản Facebook</span>
                    </div>
                    <p className="text-indigo-700">{cleanMessage}</p>
                    <Link to="/login" className="inline-block mt-2 text-sm font-bold text-indigo-600 hover:underline">← Quay về trang đăng nhập</Link>
                  </div>
                );
              }

              return <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm font-medium">{cleanMessage}</div>;
            })()}
            {authState.successMessage && !errors.form && (
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">{authState.successMessage}</div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('auth.fullName')}</label>
              <input
                className={`w-full h-12 px-4 rounded-xl border ${errors.username ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                placeholder={t('auth.fullName')}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              {errors.username && <div className="text-red-500 text-sm mt-1">{errors.username}</div>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input
                className={`w-full h-12 px-4 rounded-xl border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                placeholder="example@gmail.com"
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Số điện thoại <span className="text-slate-400 font-normal">(tùy chọn)</span>
              </label>
              <input
                className={`w-full h-12 px-4 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                placeholder={t('auth.phoneNumber')}
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              {errors.phone && <div className="text-red-500 text-sm mt-1">{errors.phone}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('auth.password')}</label>
                <div className="relative flex items-center group">
                  <input
                    className={`w-full h-12 pl-4 pr-12 rounded-xl border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <div className="absolute right-0 top-0 h-full w-12 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-slate-400 hover:text-slate-600 flex items-center justify-center w-full h-full"
                    >
                      <span className="material-symbols-outlined text-[20px] leading-none block">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('auth.confirmPassword')}</label>
                <div className="relative flex items-center group">
                  <input
                    className={`w-full h-12 pl-4 pr-12 rounded-xl border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                    placeholder="••••••••"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <div className="absolute right-0 top-0 h-full w-12 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="text-slate-400 hover:text-slate-600 flex items-center justify-center w-full h-full"
                    >
                      <span className="material-symbols-outlined text-[20px] leading-none block">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                {errors.confirmPassword && <div className="text-red-500 text-xs mt-1">{errors.confirmPassword}</div>}
              </div>
            </div>

            {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}

            {/* Password Strength Meter */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-1 h-1.5 w-full">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      i < passwordStrength ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Độ bảo mật: <span className="text-primary">{[t('auth.weak'), t('auth.weak'), t('auth.medium'), t('auth.good'), t('auth.strong')][passwordStrength] || t('auth.weak')}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 text-xs ${password.length >= 8 ? 'text-primary font-medium' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {password.length >= 8 ? 'check_circle' : 'circle'}
                  </span>
                  <span>{t('auth.min8chars')}</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(password) ? 'text-primary font-medium' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {/[A-Z]/.test(password) ? 'check_circle' : 'circle'}
                  </span>
                  <span>{t('auth.min1uppercase')}</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${/[0-9]/.test(password) ? 'text-primary font-medium' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {/[0-9]/.test(password) ? 'check_circle' : 'circle'}
                  </span>
                  <span>{t('auth.min1number')}</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-0 checked:bg-primary checked:border-primary transition-all"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                  />
                  <span className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] pointer-events-none">
                    check
                  </span>
                </div>
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 leading-tight">
                    {t('auth.iAgree')}{' '}
                    <a className="text-primary font-bold hover:underline" href="#">
                      Điều khoản dịch vụ
                    </a>{' '}
                    và{' '}
                    <a className="text-primary font-bold hover:underline" href="#">
                      Chính sách bảo mật
                    </a>{' '}
                    {t('auth.ofLotteMart')}
                  </span>
                  {errors.terms && <div className="text-red-500 text-xs mt-1">{errors.terms}</div>}
                </div>
              </label>
            </div>

            <button
              disabled={authState.loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all mt-6 active:scale-[0.98] disabled:opacity-70"
            >
              {authState.loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
            </button>
          </form>

          <footer className="mt-12 text-center text-sm text-slate-400">
            © 2024 Lotte Mart Việt Nam. Bảo lưu mọi quyền.
          </footer>
        </div>
      </div>

      {showEmailOtpModal && (
        <div className="fixed inset-0 z-220 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setShowEmailOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-xl font-bold mb-2">{t('auth.verifyRegEmail')}</h3>
            <p className="text-sm text-slate-500 mb-4">{t('auth.enterOtpToActivate')}</p>

            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="example@gmail.com"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">OTP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nhập OTP 6 số"
                />
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={otpSending || otpCooldown > 0}
                  className="px-3 py-2 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 disabled:opacity-60"
                >
                  {otpSending ? t('auth.verifyingEmail') : otpCooldown > 0 ? t('auth.resendOTP', { seconds: otpCooldown }) : t('auth.sendOTP')}
                </button>
              </div>
            </div>

            {otpInfoMessage && (
              <p className="text-xs text-slate-500 mb-3">{otpInfoMessage}</p>
            )}

            <button
              type="button"
              onClick={handleVerifyEmailOtp}
              disabled={otpVerifying}
              className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60"
            >
              {otpVerifying ? 'Đang xác thực...' : 'Xác thực email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;