import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../store';
import { loadOrders } from '../slices/orderSlice';
import { loadAddresses } from '../slices/addressSlice';
import { dataService } from '../services/dataService';
import { couponService } from '../services/couponService';
import ProfileEditForm from './Account/ProfileEditForm';
import UserAvatar from '../components/UserAvatar/UserAvatar';

interface ProfileSummaryData {
  totalOrders: number;
  processingOrders: number;
  shippingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  addressCount: number;
  paymentMethodCount: number;
  unreadNotifications: number;
  reviewCount: number;
  openTickets: number;
  totalLoyaltyPoints: number;
  couponUsageCount: number;
}

/** Mini wallet widget showing claimed vouchers */
const WalletWidget: React.FC = () => {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      couponService.getMyWallet(),
      import('../services/promotionService').then(m => m.promotionService.getMyPromotionWallet()),
    ]).then(([couponRes, promoRes]) => {
      const couponItems = (couponRes.data || []).map((w: any) => ({ ...w, id: w.id || w._id }));
      const promoItems = (promoRes.data || []).map((w: any) => ({ ...w, id: w.id || w._id }));
      setVouchers([...couponItems, ...promoItems]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-4 text-sm text-slate-400">{t('profilePage.loading')}</div>;

  const productCount = vouchers.filter(v => v.voucher_type !== 'shipping').length;
  const shippingCount = vouchers.filter(v => v.voucher_type === 'shipping').length;

  if (vouchers.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-slate-500 mb-2">{t('profilePage.noVouchers')}</p>
        <p className="text-xs text-slate-400">{t('profilePage.goToPromotions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-100">
          {t('profilePage.discountCount', { count: productCount })}
        </span>
        <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold border border-teal-100">
          {t('profilePage.shippingCount', { count: shippingCount })}
        </span>
      </div>
      {vouchers.slice(0, 3).map((v: any) => {
        const id = v.id || v._id;
        const isShipping = v.voucher_type === 'shipping';
        const discVal = Number(v.discount_value || 0);
        const discLabel = String(v.type || '').toLowerCase() === 'percent' ? `${discVal}%` : `${discVal.toLocaleString('vi-VN')}đ`;
        return (
          <div key={id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${isShipping ? 'bg-teal-100 text-teal-600' : 'bg-red-100 text-red-600'}`}>
              <span className="material-symbols-outlined text-base">{isShipping ? 'local_shipping' : 'card_giftcard'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{v.title || v.code}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-green-600">-{discLabel}</span>
                {v.end_date && <span className="text-[10px] text-slate-400">{t('profilePage.expiryLabel', { date: new Date(v.end_date).toLocaleDateString('vi-VN') })}</span>}
              </div>
            </div>
          </div>
        );
      })}
      {vouchers.length > 3 && (
        <p className="text-xs text-center text-slate-400">{t('profilePage.andMoreVouchers', { count: vouchers.length - 3 })}</p>
      )}
    </div>
  );
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { data: orders, status: orderStatus } = useAppSelector(state => state.order);
  const { data: addresses } = useAppSelector(state => state.address);

  // Profile summary from backend (user-specific counts)
  const [summary, setSummary] = useState<ProfileSummaryData | null>(null);

  useEffect(() => {
    if (user) {
      // Load user's orders and addresses
      if (orderStatus === 'idle') {
        dispatch(loadOrders(undefined));
      }
      dispatch(loadAddresses());

      // Fetch profile summary from backend (user-specific)
      dataService.getProfileSummary().then((data: ProfileSummaryData | null) => {
        if (data) setSummary(data);
      });
    }
  }, [user, dispatch, orderStatus]);

  if (!user) return null;

  // Use backend summary for accurate counts, fall back to local order data
  const processingOrders = summary?.processingOrders ?? orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;
  const shippingOrders = summary?.shippingOrders ?? orders.filter(o => o.status === 'SHIPPING').length;
  const deliveredOrders = summary?.deliveredOrders ?? orders.filter(o => o.status === 'DELIVERED').length;
  const cancelledOrders = summary?.cancelledOrders ?? orders.filter(o => o.status === 'CANCELLED').length;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);

  // Find user's default address
  const defaultAddress = addresses.find(a => a.is_default) || addresses[0];

  return (
    <>
        <div className="space-y-8">
          {/* Header Section with Profile Card */}
          {isEditing ? (
            <ProfileEditForm onClose={() => setIsEditing(false)} />
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl soft-shadow flex flex-col md:flex-row items-center gap-8 border border-slate-100 dark:border-slate-800">
            <div className="relative">
              <div className="size-32 rounded-full border-4 border-primary/10 overflow-hidden shadow-xl">
                <UserAvatar
                  src={user.avatar}
                  name={user.full_name || user.username}
                  size={128}
                />
              </div>
              <div 
                onClick={() => setIsEditing(true)}
                className="absolute bottom-1 right-1 bg-primary text-white p-1.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              >
                <span className="material-symbols-outlined text-xs">edit</span>
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user.full_name || user.username}</h1>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 self-center md:self-auto shadow-sm border border-primary/20">
                  <span className="material-symbols-outlined text-sm fill-1">stars</span>
                  {user.membership_level} Member
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">{t('profilePage.memberSince', { date: '05, 2023' })}</p>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <span className="material-symbols-outlined text-primary">mail</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <span className="material-symbols-outlined text-primary">phone</span>
                  <span className="font-medium">{user.phone || t('profilePage.noPhone')}</span>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Center Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 soft-shadow">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('profilePage.processing')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{processingOrders}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 soft-shadow">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('profilePage.shipping')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{shippingOrders}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 soft-shadow">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('profilePage.delivered')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{deliveredOrders}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 soft-shadow">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('profilePage.cancelled')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{cancelledOrders}</p>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white dark:bg-slate-900 rounded-xl soft-shadow border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('profilePage.recentOrders')}</h3>
                  <Link to="/account/orders" className="text-primary text-sm font-bold hover:underline">
                    {t('profilePage.viewAll')}
                  </Link>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentOrders.length > 0 ? recentOrders.map((order) => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-xl flex items-center justify-center ${
                          order.status === 'DELIVERED' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                        }`}>
                          <span className="material-symbols-outlined">
                            {order.status === 'DELIVERED' ? 'package_2' : 'local_shipping'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t('profilePage.orderNumber', { id: order.id })}</p>
                          <p className="text-sm text-slate-500">
                            {new Date(order.created_at).toLocaleDateString('vi-VN')} • {(order.total_amount || 0).toLocaleString()}đ • {t('profilePage.productsCount', { count: (order.items || []).length })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                          order.status === 'DELIVERED' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                        }`}>
                          {t(`orderStatuses.${order.status}`, order.status)}
                        </span>
                        <Link to={`/account/orders/${order.id}`}>
                           <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </Link>
                      </div>
                    </div>
                  )) : (
                    <div className="p-10 text-center text-slate-500">{t('profilePage.noOrders')}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column Widgets */}
            <div className="space-y-6">
              {/* Points Widget */}
              <div className="p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #C1121F 0%, #E63946 100%)', color: '#fff' }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('profilePage.lottePoints')}</p>
                    <h4 className="text-3xl font-bold" style={{ color: '#fff' }}>{(user.lotte_points || 0).toLocaleString()}</h4>
                  </div>
                  <span className="material-symbols-outlined text-4xl" style={{ color: 'rgba(255,255,255,0.5)' }}>military_tech</span>
                </div>
                <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <div className="h-full rounded-full" style={{ backgroundColor: '#fff', width: `${Math.min(((user.lotte_points || 0) / 200) * 100, 100)}%` }} />
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {(user.lotte_points || 0) < 200 ? t('profilePage.pointsToUpgrade', { points: 200 - (user.lotte_points || 0) }) : t('profilePage.maxRank')}
                </p>
              </div>

              {/* Vouchers Widget — Real Wallet Data */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl soft-shadow border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">sell</span>
                    {t('profilePage.myVouchers')}
                  </h4>
                  <Link to="/promotions" className="text-primary text-xs font-bold hover:underline">
                    {t('profilePage.getMore')}
                  </Link>
                </div>
                <WalletWidget />
              </div>

              {/* Address Widget — uses actual user address data */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl soft-shadow border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    {t('profilePage.defaultAddress')}
                  </h4>
                  <Link to="/account/addresses">
                    <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-primary transition-colors">edit</span>
                  </Link>
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{defaultAddress?.name || user.full_name || user.username}</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {defaultAddress
                      ? `${defaultAddress.street || ''}, ${defaultAddress.ward || ''}, ${defaultAddress.district || ''}, ${defaultAddress.city || ''}`
                      : t('profilePage.noAddress')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">{t('profilePage.phoneLabel')} {defaultAddress?.phone || user.phone}</p>
                </div>
              </div>

              {/* Quick Settings */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl soft-shadow border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">tune</span>
                  {t('profilePage.quickSettings')}
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('profilePage.orderNotifications')}</span>
                    <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${user.preferences?.sms_alerts ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${user.preferences?.sms_alerts ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('profilePage.ecoSystem')}</span>
                    <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${user.preferences?.eco_prefer ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${user.preferences?.eco_prefer ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default Profile;