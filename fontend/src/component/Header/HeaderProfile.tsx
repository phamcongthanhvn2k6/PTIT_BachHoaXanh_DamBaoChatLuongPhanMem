import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../store';
import { logout } from '../../slices/authSlice';
import { resetOrders } from '../../slices/orderSlice';
import { loadNotifications } from '../../slices/notificationSlice';
import { selectCurrentBranchItems } from '../../slices/cartSlice';

const HeaderProfile: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const { data: notifications } = useAppSelector(state => state.notification);
  const { currentBranch } = useAppSelector(state => state.branch);
  const currentBranchId = currentBranch ? String(currentBranch.id || (currentBranch as any)?._id || '') : '';
  const currentCartItems = useAppSelector(state => selectCurrentBranchItems(state as any, String(currentBranchId)));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const cartCount = currentCartItems?.reduce((total, item) => total + item.quantity, 0) || 0;

  useEffect(() => {
    if (user) {
      dispatch(loadNotifications());
    }
  }, [dispatch, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetOrders());
    setIsOpen(false);
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    const currentPath = encodeURIComponent(location.pathname + location.search);
    return (
      <div className="flex items-center gap-3">
        <Link 
          to={`/login?redirect=${currentPath}`}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/20"
        >
          {t('userMenu.login')}
        </Link>
        <Link 
          to={`/register?redirect=${currentPath}`}
          className="bg-[#FFD60A] hover:bg-[#FFC300] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-bold transition-all"
        >
          {t('userMenu.register')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 lg:gap-6">
      {/* Notifications and Cart Icons */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link 
          to="/account/notifications" 
          aria-label={`${unreadNotifs} ${t('userMenu.notifications')}`}
          className="size-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white relative transition-all group"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FFD60A] text-[#C1121F] text-[10px] font-black size-5 flex items-center justify-center rounded-full border-2 border-[#C1121F] shadow-sm">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-white group-hover:w-1/2 transition-all"></span>
        </Link>

        {/* Cart */}
        <Link 
          to="/cart" 
          aria-label={`${cartCount} ${t('userMenu.cartItems')}`}
          className="size-10 flex items-center justify-center rounded-xl bg-[#FFD60A] hover:bg-[#FFC300] text-[#C1121F] relative transition-all group shadow-lg shadow-black/10"
        >
          <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#C1121F] text-white text-[10px] font-black size-5 flex items-center justify-center rounded-full border-2 border-[#FFD60A] shadow-sm">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* User Profile Summary & Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-1 rounded-full lg:rounded-2xl hover:bg-white/10 transition-all text-left group"
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <div className="size-10 rounded-full border-2 border-white/30 overflow-hidden shadow-sm group-hover:border-white transition-all">
            <img
              src={user.avatar || 'https://i.pravatar.cc/100?img=12'}
              alt={user.full_name || user.username}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="hidden lg:block">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white leading-none">
                {user.full_name || user.username}
              </span>
              <span className="bg-[#FFD60A]/20 text-[#FFD60A] text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#FFD60A]/30 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px] fill-1">stars</span>
                {user.membership_level}
              </span>
            </div>
            <div className="text-[11px] text-white/70 font-bold mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-[#FFD60A]">military_tech</span>
              {(user.lotte_points || 0).toLocaleString()} {t('userMenu.points')}
            </div>
          </div>
          
          <span className={`material-symbols-outlined text-white transition-transform duration-300 hidden lg:block ${isOpen ? 'rotate-180' : ''}`}>
            keyboard_arrow_down
          </span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-[200] animate-in fade-in zoom-in duration-200 origin-top-right max-h-[80vh] overflow-y-auto">
            {/* User Quick Info (Mobile shows this more prominently) */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 lg:hidden">
              <p className="font-black text-slate-900 dark:text-white">{user.full_name || user.username}</p>
              <p className="text-xs text-slate-500 font-bold">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/20">
                  {user.membership_level}
                </span>
                <span className="text-[10px] text-slate-500 font-bold">{(user.lotte_points || 0).toLocaleString()} {t('userMenu.points')}</span>
              </div>
            </div>

            <nav className="p-2 space-y-1">
              <Link
                to="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">person</span>
                <span className="text-sm font-bold">{t('userMenu.viewProfile')}</span>
              </Link>
              
              <Link
                to="/account/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">shopping_bag</span>
                <span className="text-sm font-bold">{t('userMenu.myOrders')}</span>
              </Link>

              <Link
                to="/account/support"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">support_agent</span>
                <span className="text-sm font-bold">{t('userMenu.support')}</span>
              </Link>
              
              <Link
                to="/family-cart"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px]">family_restroom</span>
                <span className="text-sm font-bold">{t('userMenu.familyCart')}</span>
              </Link>

              <Link
                to="/smart-shopping?tab=pricewatch"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                <span className="text-sm font-bold">{t('userMenu.priceWatch')}</span>
              </Link>

              <Link
                to="/account/returns"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">assignment_return</span>
                <span className="text-sm font-bold">{t('userMenu.returns')}</span>
              </Link>

              <Link
                to="/account/wishlist"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">favorite</span>
                <span className="text-sm font-bold">{t('userMenu.wishlist')}</span>
              </Link>

              <Link
                to="/account/viewed-history"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">history</span>
                <span className="text-sm font-bold">{t('userMenu.viewedHistory')}</span>
              </Link>
              
              <Link
                to="/account/addresses"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">location_on</span>
                <span className="text-sm font-bold">{t('userMenu.addresses')}</span>
              </Link>
              
              <Link
                to="/account/coupons"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">sell</span>
                <span className="text-sm font-bold">{t('userMenu.coupons')}</span>
              </Link>
              
              <Link
                to="/account/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">settings</span>
                <span className="text-sm font-bold">{t('userMenu.settings')}</span>
              </Link>
            </nav>

            <div className="p-2 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="text-sm font-bold">{t('userMenu.logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderProfile;
