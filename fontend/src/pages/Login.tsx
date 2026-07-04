import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { login, register, loginWithGoogle, sendOTP, verifyOTP, clearAuthMessages, hydrateOAuthSession, forgotPassword, resetPassword, authVerify } from '../slices/authSlice';
import { toast } from '../components/Toast/toastEvent';
import { setupGoogleSignIn } from '../utils/googleIdentity';
import { authService } from '../services/authService';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^(?:\+84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
const usernameRegex = /^[\p{L} .'-]{2,80}$/u;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^~#\-+=<>/\\;:'",.])[A-Za-z\d@$!%*?&()[\]{}^~#\-+=<>/\\;:'",.]{8,}$/;

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

interface LoginProps {
  mode?: 'login' | 'register';
}

const Login: React.FC<LoginProps> = ({ mode = 'login' }) => {
  const { t } = useTranslation();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const isGoogleConfigured = googleClientId.length > 0;
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(mode);
  
  // Login states
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Register states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4 levels
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // Common states
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [errors, setErrors] = useState<any>({});

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

  // Sync mode prop with active tab
  useEffect(() => {
    setActiveTab(mode);
    setErrors({});
    dispatch(clearAuthMessages());
  }, [mode, dispatch]);

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setErrors({});
    dispatch(clearAuthMessages());
    navigate(tab === 'login' ? '/login' : '/register');
  };

  const getSafeRedirect = useCallback(() => {
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
  }, [location.search]);

  const handlePostLoginRedirect = useCallback(() => {
    navigate(getSafeRedirect(), { replace: true });
  }, [navigate, getSafeRedirect]);

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
  }, [location.search, dispatch, handlePostLoginRedirect]);

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

  }, [isGoogleConfigured, dispatch, activeTab, handlePostLoginRedirect]);

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
      setErrors((prev: any) => ({ ...prev, form: authState.error || undefined }));
    }
  }, [authState.error]);

  const validateLogin = useCallback(() => {
    const e: any = {};
    if (loginMode === 'password') {
      if (!identifier) e.identifier = 'Vui lòng nhập email hoặc số điện thoại.';
      if (!loginPassword) e.password = 'Vui lòng nhập mật khẩu.';
    }
    setErrors((prev: any) => {
      const changed = Object.keys(e).length !== Object.keys(prev).length ||
        Object.keys(e).some(k => e[k] !== prev[k]);
      return changed ? e : prev;
    });
    return Object.keys(e).length === 0;
  }, [loginMode, identifier, loginPassword]);

  const validateRegister = useCallback(() => {
    const e: any = {};
    if (!usernameRegex.test(username)) e.username = 'Họ tên không hợp lệ (2-80 ký tự)';
    if (!emailRegex.test(email)) e.email = 'Vui lòng nhập email hợp lệ';
    if (phone && !phoneRegex.test(phone)) e.phone = 'Số điện thoại không hợp lệ';
    if (!passwordRegex.test(registerPassword)) e.password = 'Mật khẩu ít nhất 8 ký tự, gồm HOA, thường, số, ký tự đặc biệt';
    if (registerPassword !== confirmPassword) e.confirmPassword = 'Xác nhận mật khẩu không khớp';
    if (!agreeTerms) e.terms = 'Bạn cần đồng ý với điều khoản dịch vụ';
    setErrors((prev: any) => {
      const changed = Object.keys(e).length !== Object.keys(prev).length ||
        Object.keys(e).some(k => e[k] !== prev[k]);
      return changed ? e : prev;
    });
    return Object.keys(e).length === 0;
  }, [username, email, phone, registerPassword, confirmPassword, agreeTerms]);

  // Real-time validation for login
  useEffect(() => {
    if (activeTab === 'login' && Object.keys(errors).length > 0 && !errors.form) {
      validateLogin();
    }
  }, [activeTab, errors, validateLogin]);

  // Real-time validation for registration
  useEffect(() => {
    if (activeTab === 'register' && Object.keys(errors).length > 0 && !errors.form) {
      validateRegister();
    }
  }, [activeTab, errors, validateRegister]);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const handleRegisterPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPwd = e.target.value;
    setRegisterPassword(newPwd);
    calculatePasswordStrength(newPwd);
  };

  async function onLoginSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateLogin()) return;
    dispatch(clearAuthMessages());
    try {
      await dispatch(login({ emailOrPhone: identifier, password: loginPassword })).unwrap();
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

  async function onRegisterSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateRegister()) return;
    dispatch(clearAuthMessages());
    try {
      const result = await dispatch(register({ username, email, phone, password: registerPassword })).unwrap();
      toast.success('Đăng ký thành công!');
      if (result?.needs_email_verification) {
        setOtpEmail(email);
        setShowEmailOtpModal(true);
        setEmailOtpInfoMessage('Mã OTP xác thực tài khoản đã được gửi tới email đăng ký.');
      } else {
        handlePostLoginRedirect();
      }
    } catch (err: any) {
      setErrors({ form: getErrorText(err, 'Đăng ký thất bại') });
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
      await dispatch(authVerify() as any);
      setShowEmailOtpModal(false);
      toast.success('Xác thực email thành công.');
      handlePostLoginRedirect();
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
    <div 
      className="flex min-h-screen w-full relative items-center justify-center p-4 sm:p-6 md:p-10 font-display text-slate-900 dark:text-slate-100 antialiased bg-cover bg-center"
      style={{
        backgroundImage:
          'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0vaFcvRm0NyqmZh5tQaEcOGY7W6X08oj_iaRWnbSIibquhhza_mYSoJTNCVrqL0O2S5xlDSsZvDBSpMSIO-L8z-tIEA_0qSpFgLAsoV0LVXL4ovN_1golU_F2JrI7plsdhXRYtneBLDFNUbemDES_cqr3fCfKsA6k_XNRDin7PebVpp3Op3zd5IiGMkhWRUphSmjderaX0Rg2-4fzUhpkAZrwXJygWYKW1o5Q2qxPo3OoGVzFspMzbdpfa8WK_520bnrKZFGhuTc")',
      }}
    >
      {/* Blurred Fullscreen Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-md z-0" />

      {/* Center Glassmorphism Form Card */}
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800/30 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Bách hóa XANH</span>
        </div>

        {/* Tab Selection */}
        <div className="w-full border-b border-slate-100 dark:border-slate-800/50 mb-6 flex justify-center">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`pb-3 px-2 text-base font-bold border-b-2 transition-all relative ${
                activeTab === 'login'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('auth.login', 'Đăng nhập')}
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`pb-3 px-2 text-base font-bold border-b-2 transition-all relative ${
                activeTab === 'register'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('auth.register', 'Đăng ký')}
            </button>
          </div>
        </div>

        {/* Error and Success Messages */}
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

        {activeTab === 'login' ? (
          /* ================= LOGIN FORM ================= */
          <div className="w-full">
            <div className="mb-5 text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{t('auth.welcomeBack')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">{t('auth.pleaseEnterInfo')}</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('password');
                  setErrors({});
                  dispatch(clearAuthMessages());
                }}
                className={`px-4 py-2 rounded-xl font-semibold border text-xs transition ${loginMode === 'password' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'}`}
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
                className={`px-4 py-2 rounded-xl font-semibold border text-xs transition ${loginMode === 'otp' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'}`}
              >
                Phone OTP
              </button>
            </div>

            {loginMode === 'password' ? (
              <form className="w-full space-y-4" onSubmit={onLoginSubmit}>
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.emailOrPhone')}</label>
                  <div className="relative flex items-center group">
                    <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                      <span className="material-symbols-outlined text-slate-400 text-[20px] leading-none block group-focus-within:text-primary transition-colors">
                        mail
                      </span>
                    </div>
                    <input
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.identifier ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                      placeholder={t('auth.emailOrPhone')}
                      type="text"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      aria-invalid={!!errors.identifier}
                    />
                  </div>
                  {errors.identifier && <div className="text-red-500 text-xs mt-1 font-medium">{errors.identifier}</div>}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('auth.password')}</label>
                    <button type="button" onClick={() => setIsForgotModalOpen(true)} className="text-xs font-semibold text-primary hover:underline">
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
                      className={`w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                      placeholder={t('auth.password')}
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
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
                  {errors.password && <div className="text-red-500 text-xs mt-1 font-medium">{errors.password}</div>}
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    className="h-4.5 w-4.5 text-primary focus:ring-primary border-slate-300 rounded transition-all cursor-pointer"
                    id="remember-me"
                    type="checkbox"
                  />
                  <label className="ml-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="remember-me">
                    Ghi nhớ tôi
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70 text-sm mt-1"
                  type="submit"
                  disabled={authState.loading}
                >
                  {authState.loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            ) : (
              <form className="w-full space-y-4" onSubmit={handleVerifyOTP}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.phoneNumber')}</label>
                  <input
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm"
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
                  className="w-full py-2.5 border border-primary text-primary font-semibold rounded-xl disabled:opacity-50 text-xs"
                >
                  {resendCountdown > 0 ? t('auth.resendOTP', { seconds: resendCountdown }) : t('auth.sendOTP')}
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.otpCode')}</label>
                  <input
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm"
                    placeholder={t('auth.otpCode')}
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>

                <button
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70 text-sm mt-1"
                  type="submit"
                  disabled={authState.loading}
                >
                  {authState.loading ? 'Đang xác thực OTP...' : 'Xác thực OTP'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ================= REGISTER FORM ================= */
          <div className="w-full">
            <div className="mb-5 text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{t('auth.createAccount', 'Tạo tài khoản mới!')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">{t('auth.registerBannerDesc', 'Đăng ký ngay để nhận nhiều ưu đãi.')}</p>
            </div>

            <form className="w-full space-y-3.5" onSubmit={onRegisterSubmit}>
              {/* Full name input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.fullName', 'Họ và Tên')}</label>
                <div className="relative flex items-center group">
                  <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">
                      person
                    </span>
                  </div>
                  <input
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border ${errors.username ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                    placeholder={t('auth.fullName', 'Họ và Tên')}
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                {errors.username && <div className="text-red-500 text-xs mt-1 font-medium">{errors.username}</div>}
              </div>

              {/* Email input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <div className="relative flex items-center group">
                  <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">
                      mail
                    </span>
                  </div>
                  <input
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                    placeholder="example@gmail.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                {errors.email && <div className="text-red-500 text-xs mt-1 font-medium">{errors.email}</div>}
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số điện thoại <span className="text-slate-400 font-normal text-xs">(tùy chọn)</span>
                </label>
                <div className="relative flex items-center group">
                  <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">
                      call
                    </span>
                  </div>
                  <input
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border ${errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                    placeholder={t('auth.phoneNumber', 'Số điện thoại')}
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                {errors.phone && <div className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</div>}
              </div>

              {/* Password and Confirm Password Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.password', 'Mật khẩu')}</label>
                  <div className="relative flex items-center group">
                    <input
                      className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={handleRegisterPasswordChange}
                    />
                    <div className="absolute right-0 top-0 h-full w-9 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="text-slate-400 hover:text-slate-600 flex items-center justify-center w-full h-full"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.confirmPassword', 'Nhập lại Mật khẩu')}</label>
                  <div className="relative flex items-center group">
                    <input
                      className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-sm`}
                      placeholder="••••••••"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <div className="absolute right-0 top-0 h-full w-9 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="text-slate-400 hover:text-slate-600 flex items-center justify-center w-full h-full"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  {errors.confirmPassword && <div className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</div>}
                </div>
              </div>
              {errors.password && <div className="text-red-500 text-xs mt-1 font-medium">{errors.password}</div>}

              {/* Password Strength Meter */}
              <div className="space-y-2 pt-1">
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
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Độ bảo mật: <span className="text-primary">{[t('auth.weak', 'Yếu'), t('auth.weak', 'Yếu'), t('auth.medium', 'Trung bình'), t('auth.good', 'Tốt'), t('auth.strong', 'Mạnh')][passwordStrength]}</span></span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className={`flex items-center gap-1 ${registerPassword.length >= 8 ? 'text-primary font-medium' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[12px] leading-none">
                      {registerPassword.length >= 8 ? 'check_circle' : 'circle'}
                    </span>
                    <span>Tối thiểu 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(registerPassword) ? 'text-primary font-medium' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[12px] leading-none">
                      {/[A-Z]/.test(registerPassword) ? 'check_circle' : 'circle'}
                    </span>
                    <span>1 chữ hoa</span>
                  </div>
                  <div className={`flex items-center gap-1 ${/[0-9]/.test(registerPassword) ? 'text-primary font-medium' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[12px] leading-none">
                      {/[0-9]/.test(registerPassword) ? 'check_circle' : 'circle'}
                    </span>
                    <span>1 chữ số</span>
                  </div>
                </div>
              </div>

              {/* Terms and conditions */}
              <div className="pt-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      className="peer appearance-none w-4.5 h-4.5 border-2 border-slate-300 rounded checked:bg-primary checked:border-primary transition-all focus:ring-0 focus:outline-none"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={e => setAgreeTerms(e.target.checked)}
                    />
                    <span className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[14px] pointer-events-none font-bold">
                      check
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      {t('auth.iAgree', 'Tôi đồng ý với')}{' '}
                      <a className="text-primary font-bold hover:underline" href="#">
                        Điều khoản dịch vụ
                      </a>{' '}
                      và{' '}
                      <a className="text-primary font-bold hover:underline" href="#">
                        Chính sách bảo mật
                      </a>{' '}
                      của Bách hóa XANH.
                    </span>
                    {errors.terms && <div className="text-red-500 text-xs mt-1 font-medium">{errors.terms}</div>}
                  </div>
                </label>
              </div>

              <button
                disabled={authState.loading}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all mt-3 active:scale-[0.98] disabled:opacity-70 text-sm"
                type="submit"
              >
                {authState.loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
              </button>
            </form>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-5 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-slate-800/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white dark:bg-slate-900 text-slate-400">{t('auth.orContinueWith')}</span>
          </div>
        </div>

        {/* Social Sign In / Up */}
        <div className={`grid ${isGoogleConfigured ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full`}>
          {isGoogleConfigured ? (
            <div className="relative flex items-center justify-center gap-2 h-[40px] px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden group">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{socialLoading === 'google' ? 'Đang mở Google...' : 'Google'}</span>
              
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, opacity: 0.01, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div id="google-login-btn-container" style={{ transform: 'scale(3)', transformOrigin: 'center' }}></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2 px-3 border border-amber-200 bg-amber-50/50 text-amber-700 rounded-xl text-xs font-medium">
              Google Sign-In chưa cấu hình
            </div>
          )}
          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={authState.loading || socialLoading !== null}
            className="flex items-center justify-center gap-2 h-[40px] px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 text-xs font-semibold"
          >
            <svg className="h-4.5 w-4.5" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>{socialLoading === 'facebook' ? 'Đang mở Facebook...' : 'Facebook'}</span>
          </button>
        </div>

        {/* Footer Text */}
        <footer className="mt-8 text-center text-xs text-slate-400">
          © 2026 Bách hóa XANH. Tất cả các quyền được bảo lưu.
        </footer>
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
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="Nhập email..." required />
                </div>
                <button disabled={isForgotLoading} type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm">
                  {isForgotLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset}>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Mã OTP</label>
                  <input type="text" value={forgotOtp} onChange={e => setForgotOtp(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="Nhập 6 số OTP" required />
                </div>
                <div className="mb-6">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Mật khẩu mới</label>
                  <input type="password" value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="Mật khẩu mới" required />
                </div>
                <button disabled={isForgotLoading} type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm">
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 outline-none text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">OTP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  placeholder="Nhập OTP 6 số"
                />
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={emailOtpSending || emailOtpCooldown > 0}
                  className="px-3 py-2 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 disabled:opacity-60 text-xs"
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
              className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60 text-sm"
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