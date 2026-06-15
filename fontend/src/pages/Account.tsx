import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store';
import UserAvatar from '../components/UserAvatar/UserAvatar';

const Account: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAppSelector(state => state.auth);

  if (!user) return null;

  const quickLinks = [
    { to: '/account/orders', icon: 'shopping_bag', label: t('account.orders'), desc: t('account.ordersDesc') },
    { to: '/account/addresses', icon: 'location_on', label: t('account.addresses'), desc: t('account.addressesDesc') },
    { to: '/account/payments', icon: 'credit_card', label: t('account.payment'), desc: t('account.paymentDesc') },
    { to: '/account/coupons', icon: 'sell', label: t('account.voucher'), desc: t('account.voucherDesc') },
    { to: '/account/loyalty', icon: 'military_tech', label: t('account.loyalty'), desc: t('account.loyaltyDesc', { points: (user.lotte_points || 0).toLocaleString('vi-VN') }) },
    { to: '/account/reviews', icon: 'star', label: t('account.reviews'), desc: t('account.reviewsDesc') },
    { to: '/account/notifications', icon: 'notifications', label: t('account.notifications'), desc: t('account.notificationsDesc') },
    { to: '/account/support', icon: 'chat_bubble', label: t('account.support'), desc: t('account.supportDesc') },
    { to: '/account/settings', icon: 'settings', label: t('account.settings'), desc: t('account.settingsDesc') },
  ];

  return (
    <div className="space-y-8">
      {/* User summary card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <UserAvatar
          src={user.avatar}
          name={user.full_name || user.username}
          size={96}
          className="border-4 border-primary/20 shrink-0"
        />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {user.full_name || user.username}
          </h2>
          <p className="text-slate-500 mt-1">{user.email}</p>
          <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              <span className="material-symbols-outlined text-[14px] fill-1">stars</span>
              {user.membership_level}
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">military_tech</span>
              {(user.lotte_points || 0).toLocaleString('vi-VN')} {t('account.points')}
            </span>
          </div>
          <div className="mt-4 flex gap-3 justify-center sm:justify-start">
            <Link to="/account/profile" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
              {t('account.editProfile')}
            </Link>
            <Link to="/account/settings" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              {t('account.settingsBtn')}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div>
        <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{t('account.manageAccount')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {quickLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[24px]">{link.icon}</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{link.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Account;
