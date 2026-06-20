import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { login, loginWithGoogle, sendOTP, verifyOTP, clearAuthMessages, hydrateOAuthSession, forgotPassword, resetPassword } from '../slices/authSlice';
import { toast } from '../components/Toast/toastEvent';
import { setupGoogleSignIn } from '../utils/googleIdentity';
import { authService } from '../services/authService';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const isGoogleConfigured = googleClientId.length > 0;
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [errors, setErrors] = useState<{identifier?:string, password?:string, form?:string}>({});

  // Forgot password state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Email OTP state for unverified accounts
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpInfoMessage, setEmailOtpInfoMessage] = useState<string | null>(null);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpVerifying, setEmailOtpVerifying] = useState(false);

  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

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

  const getSafeRedirect = () => {
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');

    if (
      redirect &&
      redirect.startsWith('/') &&
      redirect !== '/login' &&
      redirect !== '/register' &&
      !redirect.startsWith('/admin') &&
      !redirect.includes('redirect=')
    ) {
      return redirect;
    }

    return '/';
  };

  const handlePostLoginRedirect = () => {
    navigate(getSafeRedirect(), { replace: true });
  };

  useEffect(() => {
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
        handlePostLoginRedirect();
      } catch {
        setErrors({ form: 'Không thể xử lý dữ liệu đăng nhập Facebook.' });
      }
    }
  }, [location.search, dispatch]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('expired')) {
      toast.warning("Phiên đã hết hạn, vui lòng đăng nhập lại");
    }
  }, [location.search]);

  useEffect(() => {
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
          handlePostLoginRedirect();
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

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (emailOtpCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setEmailOtpCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailOtpCooldown]);

  useEffect(() => {
    if (authState.error) {
      setErrors((prev) => ({ ...prev, form: authState.error || undefined }));
    }
  }, [authState.error]);

  // Real-time validation
  useEffect(() => {
    if (Object.keys(errors).length > 0 && !errors.form) {
      validate();
    }
  }, [identifier, password]);

  function validate() {
    const e:any = {};
    if (loginMode === 'password') {
      if (!identifier) e.identifier = 'Vui lòng nhập email hoặc số điện thoại.';
      if (!password) e.password = 'Vui lòng nhập mật khẩu.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    dispatch(clearAuthMessages());
    try {
      await dispatch(login({ emailOrPhone: identifier, password })).unwrap();
      handlePostLoginRedirect();
    } catch (err: any) {
      const errorMsg = getErrorText(err, 'Đăng nhập thất bại');
      if (errorMsg.includes('[EMAIL_NOT_VERIFIED]')) {
         setOtpEmail(identifier);
         setShowEmailOtpModal(true);
         setEmailOtpInfoMessage('Tài khoản chưa xác thực. Một mã OTP mới đã được gửi vào email của bạn.');
      } else {
         setErrors({ form: errorMsg });
      }
    }
  }

  const handleFacebookLogin = async () => {
    dispatch(clearAuthMessages());
    setSocialLoading('facebook');
    try {
      const nextPath = getSafeRedirect();
      window.location.href = authService.getFacebookOAuthUrl(nextPath);
    } catch (err: any) {
      setErrors({ form: getErrorText(err, 'Đăng nhập Facebook thất bại') });
      setSocialLoading(null);
    } finally {
      // no-op: redirect flow handles loading state
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      setErrors({ form: 'Vui lòng nhập số điện thoại' });
      return;
    }
    dispatch(clearAuthMessages());
    try {
      await dispatch(sendOTP(phone.trim())).unwrap();
      setResendCountdown(60);
      toast.success('Mã OTP đã được gửi');
    } catch (err: any) {
      setErrors({ form: getErrorText(err, 'Gửi OTP thất bại') });
    }
  };

  const handleVerifyOTP = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!phone.trim() || !otp.trim()) {
      setErrors({ form: 'Vui lòng nhập đầy đủ số điện thoại và OTP' });
      return;
    }
    dispatch(clearAuthMessages());
    try {
      await dispatch(verifyOTP({ phone: phone.trim(), otp: otp.trim() })).unwrap();
      handlePostLoginRedirect();
    } catch (err: any) {
      setErrors({ form: getErrorText(err, 'Xác thực OTP thất bại') });
    }
  };

  const handleResendEmailOtp = async () => {
    if (!otpEmail) return;
    setEmailOtpSending(true);
    setEmailOtpInfoMessage(null);
    try {
      const result = await authService.resendEmailOtp(otpEmail);
      const cooldown = Math.max(0, Number(result?.retry_after || 60));
      setEmailOtpCooldown(cooldown);
      setEmailOtpInfoMessage(result?.message || 'Đã gửi lại OTP, vui lòng kiểm tra email.');
      toast.success(result?.message || 'Đã gửi lại OTP');
    } catch (err: any) {
      const retryAfter = Number(err?.response?.data?.retry_after || 0);
      if (retryAfter > 0) setEmailOtpCooldown(retryAfter);
      const message = getErrorText(err?.response?.data || err, 'Không thể gửi lại OTP');
      setEmailOtpInfoMessage(message);
      toast.error(message);
    } finally {
      setEmailOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpEmail || !emailOtpCode.trim()) {
      setEmailOtpInfoMessage('Vui lòng nhập OTP để xác thực email.');
      return;
    }
    setEmailOtpVerifying(true);
    setEmailOtpInfoMessage(null);
    try {
      await authService.verifyEmailOtp({ email: otpEmail, otp: emailOtpCode.trim() });
      setShowEmailOtpModal(false);
      toast.success('Xác thực email thành công. Vui lòng đăng nhập lại.');
    } catch (err: any) {
      const message = getErrorText(err?.response?.data || err, 'OTP không hợp lệ hoặc đã hết hạn');
      setEmailOtpInfoMessage(message);
      toast.error(message);
    } finally {
      setEmailOtpVerifying(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }
    setIsForgotLoading(true);
    try {
      await dispatch(forgotPassword(forgotEmail.trim())).unwrap();
      toast.success('Mã xác nhận đã được gửi đến email của bạn');
      setForgotStep(2);
    } catch (err: any) {
      toast.error(getErrorText(err, 'Lỗi gửi yêu cầu'));
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword.trim()) {
      toast.error('Vui lòng nhập đầy đủ OTP và mật khẩu mới');
      return;
    }
    setIsForgotLoading(true);
    try {
      await dispatch(resetPassword({ email: forgotEmail.trim(), otp: forgotOtp.trim(), newPassword: forgotNewPassword })).unwrap();
      toast.success('Đặt lại mật khẩu thành công, vui lòng đăng nhập');
      setIsForgotModalOpen(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
    } catch (err: any) {
      toast.error(getErrorText(err, 'Lỗi đặt lại mật khẩu'));
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Left Side: Illustrative Banner (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/10">
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-60"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0vaFcvRm0NyqmZh5tQaEcOGY7W6X08oj_iaRWnbSIibquhhza_mYSoJTNCVrqL0O2S5xlDSsZvDBSpMSIO-L8z-tIEA_0qSpFgLAsoV0LVXL4ovN_1golU_F2JrI7plsdhXRYtneBLDFNUbemDES_cqr3fCfKsA6k_XNRDin7PebVpp3Op3zd5IiGMkhWRUphSmjderaX0Rg2-4fzUhpkAZrwXJygWYKW1o5Q2qxPo3OoGVzFspMzbdpfa8WK_520bnrKZFGhuTc")',
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-20 text-slate-900 dark:text-slate-100">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-3 bg-primary rounded-xl text-white">
              <span className="material-symbols-outlined text-3xl">shopping_cart</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Lotte Mart</h1>
          </div>
          <h2 className="text-5xl font-black leading-tight mb-6">
            Trải nghiệm mua sắm <br />
            <span className="text-primary">{t('auth.convenientAtHome')}</span>
          </h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 max-w-md leading-relaxed">
            Hàng ngàn sản phẩm tươi ngon, chất lượng từ Lotte Mart đang chờ đón bạn. Đăng nhập ngay để nhận ưu đãi độc quyền.
          </p>
          <div className="mt-12 flex gap-4">
            <div className="flex -space-x-3">
              <img
                className="h-10 w-10 rounded-full border-2 border-white"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXpp7ANLy-cW-fHpKcURla6hBSP_UlYCZbNnxuC0ayWPALta8dFxn9mNxKFVsevtBkcnpXzeRZ5dq7rwTyZ7m0Zb17JgPhNBQJOOCyYXo31BvkkYUGUm3KxooFh_9cHaQOR3MLuZqkRIGKq5a9LgbWA9s9dKnyRWBGP9-T8qGVdnj6DrTloqhFiMVWJVWsKE7use9pQbB1h5pjib6KYBbVpuAZoNGzjAozLuDpZvzy6r64Wam7T5exwFOMp9QrQjwBLXKyu1oQ0dw"
                alt="User avatar 1"
              />
              <img
                className="h-10 w-10 rounded-full border-2 border-white"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHVrzc9rlOiZwcGMAz0oIa7AFxK831BW_DL-woMP8v1AnDk1ptdZa6FLA-CCfYH83DNlIldje7JBqHbUBIPJdOWKVHeBar0hOQaJnX3lXi7-I6SHN72vZYvbcNf-julCBvYBJAlyCSWBCzLXQthPCe1iniABUP2UTOKMIYCLxI737dhhJ3E4wIBOneit93hkRQby1En9ARzAR8Ca49k0R-ByLgsC3WBQwhQhm7HLHWi_9Ol3jshbriN5aEy7Y6FHU1sOlSqu8B4G4"
                alt="User avatar 2"
              />
              <img
                className="h-10 w-10 rounded-full border-2 border-white"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpozpESZBnPQ1xMaX-NaO28RkjLMd08a2nGVudSdW9eikqj9gDL4D2yhntsxDyZR0uTlbMojLex9sA5JMP-3kQ9B7HYX2KQdWRL3M0hgzFwxjtMDfJFjluYJlM4dJet-WrwEZ8K1x4pCl-t5mXf3mDhAnIUwZnJK1y8RruOYHOw96aSC9FPmt9QEDg_zpZGPzdSiw3UqWRhsM9c9TEgn97oOOBG2euyQLzRmQXWXq6VECMU8Y6kXqz4mSn-6jXBnpWYFQy1eMW_0Q"
                alt="User avatar 3"
              />
            </div>
            <p className="text-sm font-medium flex items-center text-slate-600 dark:text-slate-400">
              Hơn 1tr+ khách hàng tin dùng
            </p>
          </div>
        </div>

        {/* Abstract decorative elements */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-20 -mb-20 blur-3xl" />
        <div className="absolute top-0 left-0 w-48 h-48 bg-primary/10 rounded-full -ml-10 -mt-10 blur-2xl" />
      </div>

      {/* Right Side: Login Form - CĂN GIỮA THEO CHIỀU NGANG */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-background-dark">
        <div className="w-full max-w-120 flex flex-col items-center">
          {/* Header Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">shopping_bag</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Lotte Mart</span>
          </div>

          <div className="mb-10 text-center">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t('auth.welcomeBack')}</h3>
            <p className="text-slate-500 dark:text-slate-400">{t('auth.pleaseEnterInfo')}</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setErrors({});
                dispatch(clearAuthMessages());
              }}
              className={`px-4 py-2 rounded-xl font-semibold border transition ${loginMode === 'password' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'}`}
            >
              Email/Password
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('otp');
                setErrors({});
                dispatch(clearAuthMessages());
              }}
              className={`px-4 py-2 rounded-xl font-semibold border transition ${loginMode === 'otp' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'}`}
            >
              Phone OTP
            </button>
          </div>

          {errors.form && (() => {
            const formError = errors.form || '';
            const isGoogleCollision = formError.includes('[PROVIDER_COLLISION_GOOGLE]') || formError.includes('[USE_GOOGLE_LOGIN]');
            const isFacebookCollision = formError.includes('[PROVIDER_COLLISION_FACEBOOK]') || formError.includes('[USE_FACEBOOK_LOGIN]');
            const cleanMessage = formError.replace(/\[[\w_]+\]\s*/g, '');

            if (isGoogleCollision) {
              return (
                <div className="w-full p-4 mb-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
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
                </div>
              );
            }

            if (isFacebookCollision) {
              return (
                <div className="w-full p-4 mb-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span className="font-bold text-indigo-800">Tài khoản Facebook</span>
                  </div>
                  <p className="text-indigo-700">{cleanMessage}</p>
                </div>
              );
            }

            return <div className="w-full p-3 mb-4 bg-red-100 text-red-600 rounded-lg text-sm font-medium">{cleanMessage}</div>;
          })()}
          {authState.successMessage && !errors.form && (
            <div className="w-full p-3 mb-4 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">{authState.successMessage}</div>
          )}

          {loginMode === 'password' ? (
          <form className="w-full space-y-5" onSubmit={onSubmit}>
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('auth.emailOrPhone')}</label>
              <div className="relative flex items-center group">
                <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block group-focus-within:text-primary transition-colors">
                    mail
                  </span>
                </div>
                <input
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border ${errors.identifier ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white`}
                  placeholder={t('auth.emailOrPhone')}
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  aria-invalid={!!errors.identifier}
                />
              </div>
              {errors.identifier && <div className="text-red-500 text-sm mt-1 font-medium">{errors.identifier}</div>}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('auth.password')}</label>
                <button type="button" onClick={() => setIsForgotModalOpen(true)} className="text-sm font-semibold text-primary hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative flex items-center group">
                <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                </div>
                <input
                  className={`w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white`}
                  placeholder={t('auth.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
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
              {errors.password && <div className="text-red-500 text-sm mt-1 font-medium">{errors.password}</div>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                className="h-5 w-5 text-primary focus:ring-primary border-slate-300 rounded transition-all cursor-pointer"
                id="remember-me"
                type="checkbox"
              />
              <label className="ml-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="remember-me">
                Ghi nhớ tôi
              </label>
            </div>

            {/* Submit Button */}
            <button
              className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70"
              type="submit"
              disabled={authState.loading}
            >
              {authState.loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
          ) : (
            <form className="w-full space-y-4" onSubmit={handleVerifyOTP}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('auth.phoneNumber')}</label>
                <input
                  className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                  placeholder={t('auth.phoneNumber')}
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={authState.loading || resendCountdown > 0}
                className="w-full py-3 border border-primary text-primary font-semibold rounded-xl disabled:opacity-50"
              >
                {resendCountdown > 0 ? t('auth.resendOTP', { seconds: resendCountdown }) : t('auth.sendOTP')}
              </button>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('auth.otpCode')}</label>
                <input
                  className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                  placeholder={t('auth.otpCode')}
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>

              <button
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70"
                type="submit"
                disabled={authState.loading}
              >
                {authState.loading ? 'Đang xác thực OTP...' : 'Xác thực OTP'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-8 w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-background-dark text-slate-500">{t('auth.orContinueWith')}</span>
            </div>
          </div>

          {/* Social Sign In */}
          <div className={`grid ${isGoogleConfigured ? 'grid-cols-2' : 'grid-cols-1'} gap-4 w-full`}>
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
              onClick={handleFacebookLogin}
              disabled={authState.loading || socialLoading !== null}
              className="flex items-center justify-center gap-3 h-[48px] px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{socialLoading === 'facebook' ? 'Đang mở Facebook...' : 'Continue with Facebook'}</span>
            </button>
          </div>

          {/* Footer Text */}
          <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => {setIsForgotModalOpen(false); setForgotStep(1);}} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Quên mật khẩu</h3>
            <p className="text-slate-500 mb-6">{forgotStep === 1 ? 'Nhập email đã đăng ký để nhận mã OTP' : 'Nhập mã OTP và mật khẩu mới của bạn'}</p>
            
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest}>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Email</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Nhập email..." required />
                </div>
                <button disabled={isForgotLoading} type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {isForgotLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset}>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Mã OTP</label>
                  <input type="text" value={forgotOtp} onChange={e => setForgotOtp(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Nhập 6 số OTP" required />
                </div>
                <div className="mb-6">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Mật khẩu mới</label>
                  <input type="password" value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Mật khẩu mới" required />
                </div>
                <button disabled={isForgotLoading} type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {isForgotLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Email OTP Verification Modal for unverified login */}
      {showEmailOtpModal && (
        <div className="fixed inset-0 z-220 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setShowEmailOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-xl font-bold mb-2">{t('auth.verifyRegEmail', 'Xác thực Email')}</h3>
            <p className="text-sm text-slate-500 mb-4">{t('auth.enterOtpToActivate', 'Vui lòng nhập mã OTP để kích hoạt tài khoản.')}</p>

            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={otpEmail}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">OTP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nhập OTP 6 số"
                />
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={emailOtpSending || emailOtpCooldown > 0}
                  className="px-3 py-2 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 disabled:opacity-60"
                >
                  {emailOtpSending ? 'Đang gửi...' : emailOtpCooldown > 0 ? `Gửi lại (${emailOtpCooldown}s)` : 'Gửi lại OTP'}
                </button>
              </div>
            </div>

            {emailOtpInfoMessage && (
              <p className="text-xs text-slate-500 mb-3">{emailOtpInfoMessage}</p>
            )}

            <button
              type="button"
              onClick={handleVerifyEmailOtp}
              disabled={emailOtpVerifying}
              className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60"
            >
              {emailOtpVerifying ? 'Đang xác thực...' : 'Xác thực email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;