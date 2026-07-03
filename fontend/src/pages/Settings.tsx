// src/pages/Settings.tsx
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../store';
import { updateUserSettingsThunk, hydrateOAuthSession } from '../slices/authSlice';
import { dataService } from '../services/dataService';
import { toast } from '../components/Toast/toastEvent';
import type { User } from '../types';

// ─── Toggle component ────────────────────────────────────────────
const Toggle: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}> = ({ checked, onChange, disabled, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full relative flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      checked ? 'bg-primary' : 'bg-surface-dim'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute w-4 h-4 rounded-full transition-all ${
        checked ? 'right-1 bg-on-primary' : 'left-1 bg-on-surface-variant'
      }`}
    />
  </button>
);

// ─── Confirm Modal ───────────────────────────────────────────────
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
}> = ({ open, title, message, onConfirm, onCancel, loading, confirmText, cancelText }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-surface-container-lowest rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 font-bold text-on-surface hover:bg-surface-container-high rounded-full transition-all"
          >{cancelText || 'Cancel'}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? '...' : (confirmText || 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const userId = Number(user?.id);

  // ─── Password state ──────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwLoading, setPwLoading] = useState(false);

  // ─── Create password modal (for Google OAuth users) ─────────
  const [createPwOpen, setCreatePwOpen] = useState(false);
  const [createPwNew, setCreatePwNew] = useState('');
  const [createPwConfirm, setCreatePwConfirm] = useState('');
  const [createPwShowNew, setCreatePwShowNew] = useState(false);
  const [createPwShowConfirm, setCreatePwShowConfirm] = useState(false);
  const [createPwLoading, setCreatePwLoading] = useState(false);
  const [createPwErrors, setCreatePwErrors] = useState<Record<string, string>>({});

  // ─── Notification preferences ────────────────────────────────
  const prefs = user?.preferences || {};
  const security = user?.security || {};
  const settings = user?.settings || {};

  // ─── Modal ───────────────────────────────────────────────────
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ─── Saving indicator ────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ─── Auth provider detection ─────────────────────────────────
  const authProvider = user?.auth_provider || 'LOCAL';
  const loginProvider = user?.login_provider || 'local';
  const hasPassword = user?.has_password !== false; // default true for backward compat

  const isGoogleOnly = authProvider === 'GOOGLE' || (loginProvider === 'google' && !hasPassword);
  const isFacebookOnly = authProvider === 'FACEBOOK' || (loginProvider === 'facebook' && !hasPassword);
  const isPhoneOnly = authProvider === 'PHONE' || (loginProvider === 'phone' && !hasPassword);
  const isOAuthOrPhoneOnly = isGoogleOnly || isFacebookOnly || isPhoneOnly;
  const isHybrid = authProvider === 'LOCAL_GOOGLE_LINKED' || authProvider === 'LOCAL_FACEBOOK_LINKED';

  // ─── Loading state ───────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant animate-spin">progress_activity</span>
          <p className="text-on-surface-variant">{t('settings.loadingSettings')}</p>
        </div>
      </div>
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────
  const updatePreference = async (key: string, value: boolean) => {
    if (!Number.isFinite(userId)) {
      toast.error(t('settings.invalidUserId', 'ID người dùng không hợp lệ'));
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updateUserSettingsThunk({
          userId,
          patch: { preferences: { [key]: value } } as Partial<User>,
        })
      ).unwrap();
      toast.success(t('settings.prefUpdated', 'Đã cập nhật tùy chọn'));
    } catch (e: any) {
      toast.error(e?.message || t('settings.updateError', 'Lỗi khi cập nhật'));
    } finally {
      setSaving(false);
    }
  };

  const updateSecurity = async (key: string, value: any) => {
    if (!Number.isFinite(userId)) {
      toast.error(t('settings.invalidUserId', 'ID người dùng không hợp lệ'));
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updateUserSettingsThunk({
          userId,
          patch: { security: { [key]: value } } as Partial<User>,
        })
      ).unwrap();
      toast.success(t('settings.securityUpdated', 'Đã cập nhật bảo mật'));
    } catch (e: any) {
      toast.error(e?.message || t('settings.updateError', 'Lỗi khi cập nhật'));
    } finally {
      setSaving(false);
    }
  };

  const updateAccountSetting = async (key: string, value: any) => {
    if (!Number.isFinite(userId)) {
      toast.error(t('settings.invalidUserId', 'ID người dùng không hợp lệ'));
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updateUserSettingsThunk({
          userId,
          patch: { settings: { [key]: value } } as Partial<User>,
        })
      ).unwrap();
      if (key === 'language') {
        i18n.changeLanguage(value);
      }
      toast.success(t('settings.settingsUpdated', 'Đã cập nhật cài đặt'));
    } catch (e: any) {
      toast.error(e?.message || t('settings.updateError', 'Lỗi khi cập nhật'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Password change ────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // OAuth / Phone-only accounts should never reach here, but guard anyway
    if (isOAuthOrPhoneOnly) {
      toast.error(t('settings.cannotChangePassword', 'Tài khoản này không hỗ trợ đổi mật khẩu trực tiếp'));
      return;
    }

    if (!currentPassword.trim()) errors.current = t('settings.errCurrentRequired', 'Vui lòng nhập mật khẩu hiện tại');
    if (!newPassword.trim()) {
      errors.new = t('settings.errNewRequired', 'Vui lòng nhập mật khẩu mới');
    } else if (newPassword.length < 8) {
      errors.new = t('settings.errMinLength', 'Mật khẩu mới tối thiểu 8 ký tự');
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(newPassword)) {
      errors.new = t('settings.errWeakPassword', 'Cần có chữ hoa, chữ thường, số và ký tự đặc biệt');
    }
    if (!confirmPassword.trim()) {
      errors.confirm = t('settings.errConfirmRequired', 'Vui lòng xác nhận mật khẩu mới');
    } else if (newPassword !== confirmPassword) {
      errors.confirm = t('settings.errMismatch', 'Mật khẩu xác nhận không khớp');
    }

    if (Object.keys(errors).length > 0) {
      setPwErrors(errors);
      return;
    }

    setPwErrors({});
    setPwLoading(true);
    try {
      if (!Number.isFinite(userId)) throw new Error('ID người dùng không hợp lệ');
      await dataService.changePassword(userId, currentPassword, newPassword);
      toast.success(t('settings.pwChangeSuccess', 'Đổi mật khẩu thành công!'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || t('settings.pwChangeFail', 'Đổi mật khẩu thất bại'));
      if (err?.message?.includes('hiện tại')) {
        setPwErrors({ current: err.message });
      }
    } finally {
      setPwLoading(false);
    }
  };

  // ─── Logout all devices ──────────────────────────────────────
  const handleLogoutAllDevices = async () => {
    setLogoutLoading(true);
    try {
      if (!Number.isFinite(userId)) throw new Error(t('settings.invalidUserId', 'ID người dùng không hợp lệ'));
      const result = await dataService.logoutAllDevices(userId);
      if (result.data?.token && user) {
         dispatch(hydrateOAuthSession({
            token: result.data.token,
            refreshToken: result.data.refreshToken,
            user: user
         }));
      }
      toast.success(t('settings.logoutAllSuccess', 'Đã đăng xuất khỏi tất cả thiết bị khác'));
      setLogoutModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || t('settings.actionFailed', 'Thao tác thất bại'));
    } finally {
      setLogoutLoading(false);
    }
  };

  // ─── Create password for Google users ────────────────────────
  const handleCreatePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/;

    if (!createPwNew.trim()) {
      errors.new = t('settings.errNewRequired', 'Vui lòng nhập mật khẩu mới');
    } else if (createPwNew.length < 8) {
      errors.new = t('settings.errMinLength', 'Mật khẩu mới tối thiểu 8 ký tự');
    } else if (!strongRegex.test(createPwNew)) {
      errors.new = t('settings.errWeakPassword', 'Cần có chữ hoa, chữ thường, số và ký tự đặc biệt');
    }
    if (!createPwConfirm.trim()) {
      errors.confirm = t('settings.errConfirmRequired', 'Vui lòng xác nhận mật khẩu mới');
    } else if (createPwNew !== createPwConfirm) {
      errors.confirm = t('settings.errMismatch', 'Mật khẩu xác nhận không khớp');
    }

    if (Object.keys(errors).length > 0) {
      setCreatePwErrors(errors);
      return;
    }

    setCreatePwErrors({});
    setCreatePwLoading(true);
    try {
      // Backend changePassword supports no currentPassword for OAuth accounts
      await dataService.changePassword(userId, '', createPwNew);
      toast.success(t('settings.createPwSuccess', 'Tạo mật khẩu thành công! Bạn có thể đăng nhập bằng email.'));
      setCreatePwOpen(false);
      setCreatePwNew('');
      setCreatePwConfirm('');
      // Reload page to refresh user state
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || t('settings.createPwFail', 'Tạo mật khẩu thất bại'));
    } finally {
      setCreatePwLoading(false);
    }
  }, [createPwNew, createPwConfirm, userId, t]);

  // ─── Notification items config ───────────────────────────────
  const notificationItems = [
    {
      key: 'notification_email_promo',
      label: t('settings.notiEmailPromo', 'Nhận email khuyến mãi'),
      desc: t('settings.notiEmailPromoDesc', 'Gửi các ưu đãi đặc biệt qua email của bạn'),
      value: prefs.notification_email_promo ?? false,
    },
    {
      key: 'notification_sms_order',
      label: t('settings.notiSmsOrder', 'Nhận SMS cập nhật đơn hàng'),
      desc: t('settings.notiSmsOrderDesc', 'Thông báo trạng thái đơn hàng qua tin nhắn văn bản'),
      value: prefs.notification_sms_order ?? true,
    },
    {
      key: 'notification_push_order',
      label: t('settings.notiPushOrder', 'Nhận thông báo đơn hàng'),
      desc: t('settings.notiPushOrderDesc', 'Cập nhật ứng dụng khi đơn hàng đang được giao'),
      value: prefs.notification_push_order ?? true,
    },
    {
      key: 'notification_promo',
      label: t('settings.notiPromo', 'Nhận thông báo khuyến mãi'),
      desc: t('settings.notiPromoDesc', 'Thông báo đẩy về các sự kiện flash sale hàng ngày'),
      value: prefs.notification_promo ?? true,
    },
    {
      key: 'notification_system',
      label: t('settings.notiSystem', 'Nhận thông báo từ Bách hóa XANH'),
      desc: t('settings.notiSystemDesc', 'Tin tức hệ thống và các thay đổi quan trọng'),
      value: prefs.notification_system ?? false,
    },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return new Date(dateStr).toLocaleString(locale);
    } catch {
      return dateStr;
    }
  };

  const getAuthProviderLabel = () => {
    if (isGoogleOnly || authProvider === 'LOCAL_GOOGLE_LINKED') return 'Google';
    if (isFacebookOnly || authProvider === 'LOCAL_FACEBOOK_LINKED') return 'Facebook';
    if (isPhoneOnly) return t('settings.phoneOtp', 'Phone OTP');
    return t('settings.emailPassword');
  };

  const getBrowserName = () => {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    return null;
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header */}
      <header className="mb-2">
        <h1 className="text-3xl font-extrabold font-headline text-on-surface mb-2">{t('settings.title')}</h1>
        <p className="text-on-surface-variant text-lg">
          {t('settings.desc', 'Quản lý mật khẩu, bảo mật và tùy chọn thông báo của bạn')}
        </p>
      </header>

      {/* ════════════════ Security Section ════════════════ */}
      <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">lock</span>
          </div>
          <h2 className="text-xl font-bold font-headline">{t('settings.pwdSecurity')}</h2>
        </div>

        {/* ─── Provider-aware Security UI ─── */}
        {isGoogleOnly ? (
          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-blue-900/40 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                  {t('settings.googleSignInTitle')}
                </h3>
                <p className="text-sm text-blue-800/80 dark:text-blue-200/70 leading-relaxed mb-1">
                  {t('settings.googleSignInDesc')}
                </p>
                {user?.email && (
                  <p className="text-sm text-blue-700/60 dark:text-blue-300/50 mb-4">
                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">mail</span>
                    {user.email}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setCreatePwOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold text-sm rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">password</span>
                    {t('settings.createPassword')}
                  </button>
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 font-semibold text-sm rounded-full border border-blue-200 dark:border-blue-700 hover:shadow-md hover:translate-y-[-1px] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    {t('settings.manageGoogleAccount')}
                  </a>
                </div>
              </div>
            </div>
          </div>

        ) : isFacebookOnly ? (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-indigo-900/40 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
                  <path d="M16.671 15.47L17.203 12h-3.328V9.75c0-.949.465-1.875 1.956-1.875h1.514V4.922s-1.374-.234-2.686-.234c-2.741 0-4.533 1.66-4.533 4.668V12H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0V15.47h2.796z" fill="#fff"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-1">
                  {t('settings.facebookSignInTitle')}
                </h3>
                <p className="text-sm text-indigo-800/80 dark:text-indigo-200/70 leading-relaxed mb-4">
                  {t('settings.facebookSignInDesc')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setCreatePwOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold text-sm rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">password</span>
                    {t('settings.createPassword')}
                  </button>
                </div>
              </div>
            </div>
          </div>

        ) : isPhoneOnly ? (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-emerald-900/40 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-emerald-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>smartphone</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                  {t('settings.phoneSignInTitle')}
                </h3>
                <p className="text-sm text-emerald-800/80 dark:text-emerald-200/70 leading-relaxed mb-1">
                  {t('settings.phoneSignInDesc')}
                </p>
                {user?.phone && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{user.phone}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setCreatePwOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold text-sm rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">password</span>
                    {t('settings.createPassword')}
                  </button>
                </div>
              </div>
            </div>
          </div>

        ) : (
          <>
            {/* ─── Hybrid linked badge ─── */}
            {isHybrid && (
              <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  {authProvider === 'LOCAL_GOOGLE_LINKED'
                    ? t('settings.googleLinked')
                    : t('settings.facebookLinked', 'Tài khoản Facebook đã được liên kết')}
                </span>
              </div>
            )}

            {/* ─── Password Change Form (LOCAL / HYBRID) ─── */}
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current password */}
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label htmlFor="currentPw" className="text-sm font-semibold text-on-surface-variant px-1">
                    {t('settings.currentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="currentPw"
                      aria-label={t('settings.currentPassword')}
                      className={`w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 transition-all outline-none ${
                        pwErrors.current ? 'ring-2 ring-red-500' : ''
                      }`}
                      placeholder="••••••••"
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <span
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-on-surface"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                    >
                      {showCurrentPw ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                  {pwErrors.current && (
                    <p className="text-xs text-red-500 px-1">{pwErrors.current}</p>
                  )}
                </div>

                <div className="md:col-span-1"></div>

                {/* New password */}
                <div className="space-y-2">
                  <label htmlFor="newPw" className="text-sm font-semibold text-on-surface-variant px-1">
                    {t('settings.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="newPw"
                      aria-label={t('settings.newPassword')}
                      className={`w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 transition-all outline-none ${
                        pwErrors.new ? 'ring-2 ring-red-500' : ''
                      }`}
                      placeholder={t('settings.newPasswordPlaceholder')}
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <span
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-on-surface"
                      onClick={() => setShowNewPw(!showNewPw)}
                    >
                      {showNewPw ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                  {pwErrors.new && (
                    <p className="text-xs text-red-500 px-1">{pwErrors.new}</p>
                  )}
                  {/* Password strength meter */}
                  {newPassword && (
                    <div className="px-1 space-y-1">
                      <div className="flex gap-1 h-1.5">
                        {[
                          /[a-z]/.test(newPassword),
                          /[A-Z]/.test(newPassword),
                          /\d/.test(newPassword),
                          /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
                          newPassword.length >= 8,
                        ].map((ok, i) => (
                          <div key={i} className={`flex-1 rounded-full transition-colors ${ok ? 'bg-green-500' : 'bg-surface-dim'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        {t('settings.pwStrengthHint')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPw" className="text-sm font-semibold text-on-surface-variant px-1">
                    {t('settings.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPw"
                      aria-label={t('settings.confirmPassword')}
                      className={`w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 transition-all outline-none ${
                        pwErrors.confirm ? 'ring-2 ring-red-500' : ''
                      }`}
                      placeholder={t('settings.confirmPasswordPlaceholder')}
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <span
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-on-surface"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                    >
                      {showConfirmPw ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                  {pwErrors.confirm && (
                    <p className="text-xs text-red-500 px-1">{pwErrors.confirm}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-8 py-3 bg-signature-gradient text-on-primary font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-2px] transition-all active:scale-95 disabled:opacity-50"
                >
                  {pwLoading ? t('settings.saving') : t('settings.changePassword')}
                </button>
              </div>
            </form>
          </>
        )}

        {/* 2FA & Login Security */}
          <div className="pt-6 mt-8 space-y-6">
            {/* 2FA Toggle */}
            <div className="flex items-center justify-between py-4">
              <div className="flex gap-4 items-start">
                <div className="mt-1 w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified_user
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{t('settings.twoFactorAuth')}</h3>
                  <p className="text-sm text-on-surface-variant">
                    {t('settings.twoFactorDesc', 'Thêm một lớp bảo mật cho tài khoản của bạn')}
                  </p>
                </div>
              </div>
              <Toggle
                checked={security.two_factor_enabled ?? false}
                onChange={(val) => updateSecurity('two_factor_enabled', val)}
                disabled={saving}
                ariaLabel={t('settings.twoFactorToggle', 'Bật/tắt xác thực 2 yếu tố')}
              />
            </div>

            {/* Login info */}
            <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-on-surface">{t('settings.loginSecurity')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Auth Provider */}
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">shield_person</span>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{t('settings.loginMethod', 'Phương thức đăng nhập')}</p>
                    <p className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                      {getAuthProviderLabel()}
                      {isHybrid && <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">+{t('settings.emailPassword', 'Email / Mật khẩu')}</span>}
                    </p>
                  </div>
                </div>

                {/* Browser */}
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">language</span>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{t('settings.currentBrowser', 'Trình duyệt hiện tại')}</p>
                    <p className="text-sm font-semibold text-on-surface">{getBrowserName() || security.last_login_device || t('settings.currentSession', 'Phiên hiện tại')}</p>
                  </div>
                </div>

                {/* Last login */}
                {(security.last_login_at || user?.last_login_at) && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">schedule</span>
                    <div>
                      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{t('settings.lastLoginAt', 'Lần đăng nhập cuối')}</p>
                      <p className="text-sm font-semibold text-green-600">{formatDate(security.last_login_at as string || user?.last_login_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-surface-dim">
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(true)}
                  className="text-sm font-bold text-primary px-4 py-2 hover:bg-primary-fixed rounded-lg transition-colors"
                >
                  {t('settings.logoutAll', 'Đăng xuất khỏi tất cả thiết bị')}
                </button>
              </div>
            </div>
          </div>
      </section>

      {/* ════════════════ Notifications Section ════════════════ */}
      <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">notifications_active</span>
          </div>
          <h2 className="text-xl font-bold font-headline">{t('settings.notiOptions')}</h2>
        </div>

        <div className="space-y-2">
          {notificationItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-5 px-4 rounded-xl hover:bg-surface-container-low transition-colors"
            >
              <div>
                <h4 className="font-bold text-on-surface">{item.label}</h4>
                <p className="text-sm text-on-surface-variant">{item.desc}</p>
              </div>
              <Toggle
                checked={item.value}
                onChange={(val) => updatePreference(item.key, val)}
                disabled={saving}
                ariaLabel={item.label}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ Account Settings Section ════════════════ */}
      <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">tune</span>
          </div>
          <h2 className="text-xl font-bold font-headline">{t('settings.accountOptions')}</h2>
        </div>

        <div className="space-y-2">
          {/* Language */}
          <div className="flex items-center justify-between py-5 px-4 rounded-xl hover:bg-surface-container-low transition-colors">
            <div>
              <h4 className="font-bold text-on-surface">{t('settings.language')}</h4>
              <p className="text-sm text-on-surface-variant">{t('settings.chooseLanguage')}</p>
            </div>
            <select
              aria-label={t('settings.chooseLanguage', 'Chọn ngôn ngữ')}
              value={settings.language || 'vi'}
              onChange={(e) => updateAccountSetting('language', e.target.value)}
              disabled={saving}
              className="bg-surface-container-highest border-none rounded-lg px-4 py-2 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
            >
              <option value="vi">{t('settings.vietnamese')}</option>
              <option value="en">English</option>
              <option value="ko">한국어</option>
            </select>
          </div>

          {/* Profile visibility */}
          <div className="flex items-center justify-between py-5 px-4 rounded-xl hover:bg-surface-container-low transition-colors">
            <div>
              <h4 className="font-bold text-on-surface">{t('settings.profileVisibility')}</h4>
              <p className="text-sm text-on-surface-variant">{t('settings.allowViewProfile')}</p>
            </div>
            <Toggle
              checked={settings.privacy_profile_visible ?? true}
              onChange={(val) => updateAccountSetting('privacy_profile_visible', val)}
              disabled={saving}
              ariaLabel={t('settings.profileVisibility')}
            />
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between py-5 px-4 rounded-xl hover:bg-surface-container-low transition-colors">
            <div>
              <h4 className="font-bold text-on-surface">{t('settings.marketingOptIn')}</h4>
              <p className="text-sm text-on-surface-variant">{t('settings.marketingDesc')}</p>
            </div>
            <Toggle
              checked={settings.marketing_opt_in ?? true}
              onChange={(val) => updateAccountSetting('marketing_opt_in', val)}
              disabled={saving}
              ariaLabel={t('settings.marketingOptIn')}
            />
          </div>

          {/* SMS opt-in (phone visibility) */}
          <div className="flex items-center justify-between py-5 px-4 rounded-xl hover:bg-surface-container-low transition-colors">
            <div>
              <h4 className="font-bold text-on-surface">{t('settings.phoneVisibility')}</h4>
              <p className="text-sm text-on-surface-variant">
                {user.phone
                  ? `${t('settings.phoneLabel', 'SĐT')}: ${user.phone}`
                  : t('settings.noPhone', 'Chưa cập nhật số điện thoại')}
                {' — '}
                {t('settings.smsAds', 'Nhận SMS quảng cáo')}
              </p>
            </div>
            <Toggle
              checked={settings.sms_opt_in ?? true}
              onChange={(val) => updateAccountSetting('sms_opt_in', val)}
              disabled={saving}
              ariaLabel={t('settings.phoneVisibility')}
            />
          </div>
        </div>
      </section>

      {/* ─── Confirm logout modal ────────────────────────────── */}
      <ConfirmModal
        open={logoutModalOpen}
        title={t('settings.logoutAllTitle', 'Đăng xuất tất cả thiết bị?')}
        message={t('settings.logoutAllMessage', 'Bạn sẽ được giữ đăng nhập trên thiết bị hiện tại. Tất cả các phiên đăng nhập khác sẽ bị kết thúc.')}
        onConfirm={handleLogoutAllDevices}
        onCancel={() => setLogoutModalOpen(false)}
        loading={logoutLoading}
        confirmText={t('settings.logoutAll', 'Đăng xuất tất cả')}
        cancelText={t('common.cancel', 'Hủy')}
      />

      {/* ─── Create Password Modal (Google OAuth users) ───── */}
      {createPwOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCreatePwOpen(false)}>
          <div
            className="bg-surface-container-lowest rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">password</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">{t('settings.createPassword', 'Tạo mật khẩu')}</h3>
                <p className="text-xs text-on-surface-variant">{t('settings.createPwDesc', 'Kích hoạt đăng nhập bằng email cho tài khoản của bạn')}</p>
              </div>
            </div>

            <form onSubmit={handleCreatePassword} className="space-y-4">
              {/* New password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant px-1">
                  {t('settings.newPassword', 'Mật khẩu mới')}
                </label>
                <div className="relative">
                  <input
                    aria-label={t('settings.newPassword')}
                    className={`w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 transition-all outline-none ${createPwErrors.new ? 'ring-2 ring-red-500' : ''}`}
                    placeholder={t('settings.newPasswordPlaceholder', 'Nhập mật khẩu mới')}
                    type={createPwShowNew ? 'text' : 'password'}
                    value={createPwNew}
                    onChange={(e) => setCreatePwNew(e.target.value)}
                  />
                  <span
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-on-surface"
                    onClick={() => setCreatePwShowNew(!createPwShowNew)}
                  >
                    {createPwShowNew ? 'visibility_off' : 'visibility'}
                  </span>
                </div>
                {createPwErrors.new && <p className="text-xs text-red-500 px-1">{createPwErrors.new}</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant px-1">
                  {t('settings.confirmPassword', 'Xác nhận mật khẩu mới')}
                </label>
                <div className="relative">
                  <input
                    aria-label={t('settings.confirmPassword')}
                    className={`w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 transition-all outline-none ${createPwErrors.confirm ? 'ring-2 ring-red-500' : ''}`}
                    placeholder={t('settings.confirmPasswordPlaceholder', 'Xác nhận mật khẩu')}
                    type={createPwShowConfirm ? 'text' : 'password'}
                    value={createPwConfirm}
                    onChange={(e) => setCreatePwConfirm(e.target.value)}
                  />
                  <span
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer hover:text-on-surface"
                    onClick={() => setCreatePwShowConfirm(!createPwShowConfirm)}
                  >
                    {createPwShowConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </div>
                {createPwErrors.confirm && <p className="text-xs text-red-500 px-1">{createPwErrors.confirm}</p>}
              </div>

              <p className="text-[11px] text-on-surface-variant px-1">
                {t('settings.pwStrengthHint', 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt')}
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreatePwOpen(false); setCreatePwErrors({}); setCreatePwNew(''); setCreatePwConfirm(''); }}
                  disabled={createPwLoading}
                  className="px-5 py-2.5 font-bold text-on-surface hover:bg-surface-container-high rounded-full transition-all"
                >{t('common.cancel', 'Hủy')}</button>
                <button
                  type="submit"
                  disabled={createPwLoading}
                  className="px-6 py-2.5 bg-signature-gradient text-on-primary font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {createPwLoading ? t('settings.saving', 'Đang lưu...') : t('settings.setPassword', 'Tạo mật khẩu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;