import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store';
import { adminLogin, clearAdminError } from '../slices/adminAuthSlice';

const AdminLogin: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  const translations: Record<string, Record<string, string>> = {
    vi: {
      title: 'Hệ thống Quản trị Master',
      subtitle: 'Vui lòng đăng nhập để tiếp tục điều hành hệ thống.',
      emailLabel: 'Email hoặc Admin ID',
      passwordLabel: 'Mật khẩu',
      rememberMe: 'Ghi nhớ phiên đăng nhập',
      forgotPassword: 'Quên mật khẩu?',
      loginBtn: 'Đăng nhập hệ thống',
      loggingIn: 'Đang đăng nhập...',
      contactSupport: 'Vui lòng liên hệ Bộ phận IT nếu gặp sự cố truy cập.',
      invalidEmail: 'Vui lòng nhập email hợp lệ'
    },
    en: {
      title: 'Master Administration System',
      subtitle: 'Please log in to continue system operations.',
      emailLabel: 'Email or Admin ID',
      passwordLabel: 'Password',
      rememberMe: 'Remember session',
      forgotPassword: 'Forgot password?',
      loginBtn: 'System Log In',
      loggingIn: 'Logging in...',
      contactSupport: 'Please contact the IT Department if you encounter access issues.',
      invalidEmail: 'Please enter a valid email address'
    },
    ja: {
      title: 'マスター管理システム',
      subtitle: 'システム運用を継続するにはログインしてください。',
      emailLabel: 'メールまたは管理者ID',
      passwordLabel: 'パスワード',
      rememberMe: 'セッションを記憶する',
      forgotPassword: 'パスワードをお忘れですか？',
      loginBtn: 'システムログイン',
      loggingIn: 'ログイン中...',
      contactSupport: 'アクセスに問題が発生した場合は、IT部門にお問い合わせください。',
      invalidEmail: '有効なメールアドレスを入力してください'
    }
  };

  const tLocal = (key: string) => {
    return translations[currentLang]?.[key] || translations['vi'][key];
  };

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((state) => state.adminAuth);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError('');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError(tLocal('invalidEmail'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      dispatch(clearAdminError());
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    const resultAction = await dispatch(adminLogin({ email, password }));
    if (adminLogin.fulfilled.match(resultAction)) {
      navigate('/admin/dashboard', { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center overflow-hidden font-body antialiased">
      {/* Background Graphic/Gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-slate-900 to-green-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,136,72,0.15),rgba(255,255,255,0))]" />
      
      {/* Animated Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <main className="relative z-10 w-full max-w-[480px] px-4 py-8">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-extrabold text-xs uppercase tracking-widest">Hệ thống quản trị</span>
          </div>
          <h1 className="text-white font-black text-4xl tracking-tight mb-2 uppercase drop-shadow-sm">
            Bách hóa <span className="text-emerald-400">Xanh</span>
          </h1>
          <p className="text-slate-300 text-sm font-semibold opacity-90">
            {tLocal('title')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] border border-white/20 p-8 md:p-10">
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center font-medium mb-6">
            {tLocal('subtitle')}
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs text-center font-bold">
                {error}
              </div>
            )}
            
            {/* Input Email/Admin ID */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                {tLocal('emailLabel')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <input
                  className={`w-full bg-slate-50 dark:bg-slate-800/50 border rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 dark:text-slate-100 text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none placeholder:text-slate-400 ${
                    emailError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                  placeholder="admin@lottemart.vn"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                    if (error) dispatch(clearAdminError());
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  required
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500 font-medium">{emailError}</p>
              )}
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                {tLocal('passwordLabel')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-12 text-slate-800 dark:text-slate-100 text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none placeholder:text-slate-400"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) dispatch(clearAdminError());
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  className="peer h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer"
                  type="checkbox"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  {tLocal('rememberMe')}
                </span>
              </label>
              <a href="#" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-all">
                {tLocal('forgotPassword')}
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {status === 'loading' ? tLocal('loggingIn') : tLocal('loginBtn')}
              <span className="material-symbols-outlined text-[20px]">{status === 'loading' ? 'hourglass_empty' : 'login'}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center space-y-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
            {tLocal('contactSupport')}
          </p>
          <div className="flex items-center justify-center gap-6 opacity-30 grayscale hover:opacity-60 transition-opacity">
            <img
              className="h-5 w-auto"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCev-ZA-MHmKBePJrx2eTF5MSatXftQ-T4XTev4OUMVHBtiA2XTsCCmD0G2acwNAxqwAWJSREzVagnCzIORG26mY8BA08-ylRa6grsVA0uDH8vCDStgFU2nmEyhxlTF-o47nAFewU1UVEioDkaq4hDMuzDhuH9pML2DjyB-q1yY0YOrnbQ13YyLb7BgGgv9Lwa01un_I3d9ua0h3acsyy9YiclXD0w8EiLtzOeTXttwvUFJH-sAP3ooJqa6rqOE3K8pPlwKGrs1BI"
              alt="Security badge"
            />
            <div className="h-4 w-[1px] bg-slate-700" />
            <img
              className="h-5 w-auto"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnJ0Oau7HqjA4RaWYWGSrkeGzW6626qotZF7vzt2Fvka5TN4VLWkaJx8KbW19RopFDHlqiELyOGFd1qZtD8mQ4-lp_1p3fFuSqyQHnhEJyish9INAKRVXv8HXcOXAc-Z8_4pattj_Eu2ovuGKE_bgRAdw7o93f1vKt_77ahV23JPyFyREHHD962ZfGOJW8HjOJR9Jbx8Xj3lpGbF2k_d-QsIPtmxfZYui6Di86Ui0_dCZAHdbwHOb24V-mxAZFkb4YJ6HJKhTZ9k4"
              alt="Enterprise badge"
            />
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-600 font-bold tracking-widest uppercase">
            © 2024 Bách hóa XANH Vietnam • Internal Security Protocol v4.2
          </p>
        </footer>
      </main>

      {/* Floating Support Button */}
      <div className="fixed bottom-8 right-8">
        <button type="button" className="h-14 w-14 bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:text-emerald-500 hover:shadow-xl transition-all cursor-pointer">
          <span className="material-symbols-outlined text-[24px]">contact_support</span>
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
