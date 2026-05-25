import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../store';
import { logout } from '../../slices/authSlice';
import type { User } from '../../types';

interface AccountSidebarProps {
  currentUser: User;
  activeRoute?: string;
  onNavigate?: (path: string) => void;
  compact?: boolean;
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  exact?: boolean;
  currentPath: string;
  isShrunk: boolean;
  onNavigate: (path: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, exact = false, currentPath, isShrunk, onNavigate }) => {
  const isActive = exact ? currentPath === to : currentPath.includes(to);
  const activeClass = isActive
    ? 'bg-primary/10 text-primary font-bold'
    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';

  return (
    <Link
      to={to}
      onClick={() => onNavigate(to)}
      className={`flex items-center ${isShrunk ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all ${activeClass}`}
      title={isShrunk ? label : undefined}
      data-route={to}
    >
      <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>{icon}</span>
      {!isShrunk && <span>{label}</span>}
    </Link>
  );
};

const AccountSidebar: React.FC<AccountSidebarProps> = ({ 
  currentUser, 
  activeRoute, 
  onNavigate,
  compact = false 
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('account_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('account_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/login');
    if (onNavigate) onNavigate('/login');
  }, [dispatch, navigate, onNavigate]);

  const handleNavClick = useCallback((path: string) => {
    if (onNavigate) onNavigate(path);
    setMobileOpen(false);
  }, [onNavigate]);

  const currentPath = activeRoute || location.pathname;

  const isShrunk = compact || collapsed;

  return (
    <>
      {/* Mobile Off-canvas Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Hamburger button for mobile */}
      <div className="md:hidden flex items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <button 
           onClick={() => setMobileOpen(true)}
           className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl mr-3"
           aria-label={t('accountSidebar.openMenu')}
        >
           <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="font-bold text-lg">{t('accountSidebar.myAccount')}</h2>
      </div>

      <aside 
        className={`
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
          flex flex-col p-6 shrink-0
          transition-transform duration-300 ease-in-out relative
          ${isShrunk ? 'w-24' : 'w-72'}
          
          /* Mobile behavior using fixed positioning */
          fixed md:sticky z-50 md:z-auto top-0
          h-[100dvh] md:h-auto md:max-h-[100dvh] md:overflow-y-auto
          ${mobileOpen ? 'left-0 translate-x-0' : '-left-full -translate-x-full md:left-auto md:translate-x-0'}
        `}
      >
        <button 
           onClick={() => setMobileOpen(false)}
           className="md:hidden absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-full"
           title={t('accountSidebar.close')}
        >
           <span className="material-symbols-outlined">close</span>
        </button>

        <div className={`flex items-center ${isShrunk ? 'justify-center' : 'gap-3 px-2'} mb-10`}>
          <div className="bg-primary rounded-xl p-2 shrink-0">
            <span className="material-symbols-outlined text-white">shopping_cart</span>
          </div>
          {!isShrunk && <h2 className="text-xl font-bold text-primary italic">LOTTE Mart</h2>}
        </div>

        {!isShrunk ? (
          <div className="flex flex-col items-center mb-6 px-2 text-center">
              <img 
                 src={currentUser.avatar || "https://i.pravatar.cc/100?img=12"} 
                 alt={currentUser.full_name || currentUser.username} 
                 className="w-20 h-20 rounded-full mb-3 border-2 border-primary/20 object-cover" 
              />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{currentUser.full_name || currentUser.username}</h3>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-[14px] fill-1">stars</span>
                {currentUser.membership_level}
              </span>
              <div className="flex gap-2 mt-4 w-full">
                <Link to="/account" className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">{t('accountSidebar.profileBtn')}</Link>
                <Link to="/account/settings" className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">{t('accountSidebar.settingsBtn')}</Link>
              </div>
          </div>
        ) : (
           <div className="flex justify-center mb-8">
              <img 
                 src={currentUser.avatar || "https://i.pravatar.cc/100?img=12"} 
                 alt={currentUser.full_name || currentUser.username} 
                 className="w-10 h-10 rounded-full border-2 border-primary/20 object-cover" 
                 title={currentUser.full_name || currentUser.username}
              />
           </div>
        )}

        <nav className="flex-1 space-y-1 w-full overflow-y-auto" role="navigation" aria-label="Account Sidebar Navigation">
          <NavItem to="/account" icon="dashboard" label={t('accountSidebar.overview')} exact currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/orders" icon="shopping_bag" label={t('accountSidebar.orders')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/returns" icon="assignment_return" label={t('accountSidebar.returns')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/wishlist" icon="favorite" label={t('accountSidebar.wishlist')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/viewed-history" icon="history" label={t('accountSidebar.viewed')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/addresses" icon="location_on" label={t('accountSidebar.addresses')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/payments" icon="credit_card" label={t('accountSidebar.payment')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/coupons" icon="sell" label={t('accountSidebar.coupons')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/loyalty" icon="military_tech" label={t('accountSidebar.loyalty')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/notifications" icon="notifications" label={t('accountSidebar.notifications')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/reviews" icon="star" label={t('accountSidebar.reviews')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/support" icon="chat_bubble" label={t('accountSidebar.support')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/account/settings" icon="settings" label={t('accountSidebar.settings')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/family-cart" icon="family_restroom" label={t('accountSidebar.familyCart')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
          <NavItem to="/smart-shopping?tab=pricewatch" icon="notifications_active" label={t('accountSidebar.priceWatch')} currentPath={currentPath} isShrunk={isShrunk} onNavigate={handleNavClick} />
        </nav>

        <button 
          onClick={handleLogout}
          className={`flex items-center justify-center ${isShrunk ? 'px-0 border-none' : 'gap-2 px-4 border'} mt-auto w-full py-3 rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors shrink-0`}
          title={t('accountSidebar.logout')}
        >
          <span className="material-symbols-outlined">logout</span>
          {!isShrunk && <span>{t('accountSidebar.logout')}</span>}
        </button>

        {/* Desktop Collapse Toggle */}
        {!compact && (
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex absolute -right-3 top-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-full p-1 shadow-sm hover:text-primary z-50 hover:bg-slate-50 transition-colors"
            title={collapsed ? t('accountSidebar.expand') : t('accountSidebar.collapse')}
          >
            <span className="material-symbols-outlined text-[16px]">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        )}
      </aside>
    </>
  );
};

export default AccountSidebar;
