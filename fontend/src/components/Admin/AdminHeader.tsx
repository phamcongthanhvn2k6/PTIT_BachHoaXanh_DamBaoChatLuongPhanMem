import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import AdminBranchFilter from '../../admin/components/AdminBranchFilter';
import { adminLogout, setAdminBranch } from '../../admin/slices/adminAuthSlice';
import { toast } from '../Toast/toastEvent';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../component/Header/LanguageSwitcher';
import { AdminNotificationDropdown } from './AdminNotificationDropdown';
import { hasPermission, isSuperAdmin } from '../../admin/utils/permission';

interface MenuGroup {
  key: string;
  label: string;
  type: string;
  to?: string;
  icon?: string;
  items?: {
    to: string;
    icon: string;
    label: string;
    permission?: string;
    superAdminOnly?: boolean;
  }[];
}

const AdminHeader: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, adminBranchId } = useAppSelector(state => state.adminAuth);
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
    // Fetch brand settings
    import('../../services/dataService').then(({ dataService }) => {
      dataService.getAdminSettings().then(setSettings).catch(() => {});
    });

    // Close dropdown on click outside
    const handleOutsideClick = () => {
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      toast.info(t('admin.searching', { query: search.trim() }));
    }
  };

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
  };

  const canShow = (item: any) => {
    if (item.superAdminOnly) return isSuperAdmin(admin);
    if (!item.permission) return true;
    return hasPermission(admin, item.permission);
  };

  // Define Horizontal Menu Groups
  const menuGroups: MenuGroup[] = [
    {
      key: 'overview',
      label: t('sidebar.dashboard', 'Tổng quan'),
      type: 'link',
      to: '/admin/dashboard',
      icon: 'dashboard',
    },
    {
      key: 'management',
      label: 'Quản lý',
      type: 'dropdown',
      items: [
        { to: '/admin/events', icon: 'event_note', label: t('sidebar.posts', 'Quản lý bài viết'), permission: 'posts.read' },
        { to: '/admin/orders', icon: 'receipt_long', label: t('sidebar.orders', 'Đơn hàng'), permission: 'orders.read' },
        { to: '/admin/customers', icon: 'group', label: t('sidebar.customers', 'Khách hàng'), permission: 'customers.read' },
      ],
    },
    {
      key: 'inventory',
      label: 'Kho & Danh mục',
      type: 'dropdown',
      items: [
        { to: '/admin/products', icon: 'inventory_2', label: t('sidebar.inventory', 'Quản lý kho'), permission: 'products.read' },
        { to: '/admin/suppliers', icon: 'business', label: t('sidebar.suppliers', 'Nhà cung cấp'), permission: 'suppliers.read' },
        { to: '/admin/import-orders', icon: 'shopping_cart', label: t('sidebar.importOrders', 'Đơn nhập hàng'), permission: 'imports.read' },
        { to: '/admin/import-receipts', icon: 'inventory', label: t('sidebar.importReceipts', 'Phiếu nhận hàng'), permission: 'imports.read' },
        { to: '/admin/inventory-batches', icon: 'calendar_month', label: t('sidebar.batches', 'Batch & Hạn dùng'), permission: 'inventory.read' },
        { to: '/admin/roles', icon: 'admin_panel_settings', label: t('sidebar.roles', 'Vai trò & Quyền'), superAdminOnly: true },
        { to: '/admin/audit-logs', icon: 'history', label: t('sidebar.auditLogs', 'Nhật ký hệ thống'), permission: 'audit.read' },
        { to: '/admin/branch-locations', icon: 'location_on', label: t('sidebar.branches', 'Vị trí chi nhánh'), permission: 'branches.read' },
      ],
    },
    {
      key: 'cx',
      label: 'Trải nghiệm Khách hàng',
      type: 'dropdown',
      items: [
        { to: '/admin/reviews', icon: 'reviews', label: t('sidebar.reviews', 'Quản lý đánh giá'), permission: 'reviews.read' },
        { to: '/admin/questions', icon: 'forum', label: t('sidebar.questions', 'Hỏi Đáp Sản Phẩm'), permission: 'reviews.read' },
        { to: '/admin/support', icon: 'support_agent', label: t('sidebar.support', 'Hỗ trợ khách hàng'), permission: 'support.read' },
        { to: '/admin/returns', icon: 'assignment_return', label: t('sidebar.returns', 'Yêu cầu đổi trả'), permission: 'returns.read' },
        { to: '/admin/gamification', icon: 'sports_esports', label: t('sidebar.gamification', 'Bách hóa XANH Fun Zone'), permission: 'settings.read' },
        { to: '/admin/coupons', icon: 'local_activity', label: t('sidebar.coupons', 'Trung tâm Marketing'), permission: 'coupons.read' },
      ],
    },
    {
      key: 'settings',
      label: 'Cấu hình',
      type: 'dropdown',
      items: [
        { to: '/admin/settings', icon: 'settings', label: t('sidebar.settings', 'Cấu hình hệ thống'), permission: 'settings.read' },
      ],
    },
  ];

  return (
    <header className="fixed top-0 right-0 left-0 h-20 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex justify-between items-center px-6 transition-colors shadow-sm">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3 mr-4 flex-shrink-0">
        {settings?.brand_logo_url ? (
          <img
            src={settings.brand_logo_url}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-full bg-white p-0.5 shadow-sm"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-sm shadow-sm">
            B
          </div>
        )}
        <div className="hidden xl:block min-w-0">
          <h1 className="text-sm font-black text-primary dark:text-white tracking-tight uppercase leading-none">
            {settings?.brand_name || 'Bách hóa XANH'}
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1.5 leading-none">
            {settings?.system_name || 'WEMEDIA ADMIN PORTAL'}
          </p>
        </div>
      </div>

      {/* Horizontal Menu ngang đa tầng - no overflow clip to allow dropdowns */}
      <nav className="hidden md:flex items-center h-full gap-1 flex-1 px-4">
        {menuGroups.map((group) => {
          if (group.type === 'link') {
            const isActive = location.pathname === group.to;
            return (
              <Link
                key={group.key}
                to={group.to || ''}
                className={`h-full flex items-center px-4 border-b-2 text-[15px] font-semibold transition-all relative ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {group.label}
              </Link>
            );
          }

          // Filter visible dropdown items
          const visibleItems = group.items?.filter(canShow) || [];
          if (visibleItems.length === 0) return null;

          const isGroupActive = visibleItems.some((item) => location.pathname === item.to);
          const isDropdownOpen = activeDropdown === group.key;

          return (
            <div key={group.key} className="h-full relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(isDropdownOpen ? null : group.key);
                }}
                className={`h-full flex items-center gap-1 px-4 border-b-2 text-[15px] font-semibold transition-all cursor-pointer outline-none ${
                  isGroupActive || isDropdownOpen
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {group.label}
                <span className="material-symbols-outlined text-xs leading-none">keyboard_arrow_down</span>
              </button>

              {/* Dropdown Menu - State driven and visible outside navbar boundaries */}
              {isDropdownOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full -mt-[2px] w-64 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn"
                >
                  {visibleItems.map((item) => {
                    const isItemActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setActiveDropdown(null)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          isItemActive
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Right side actions */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Compact Search Bar */}
        <div className="relative hidden xl:flex items-center w-36 lg:w-44">
          <input
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs outline-none dark:text-white"
            placeholder={t('admin.searchPlaceholder', 'Tìm kiếm...')}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
          <span className="absolute left-2.5 material-symbols-outlined text-slate-400 text-sm pointer-events-none">search</span>
        </div>

        {/* Branch Filter */}
        <div className="w-36 lg:w-44">
          <AdminBranchFilter
            value={adminBranchId || 'ALL'}
            onChange={(bId) => dispatch(setAdminBranch(bId))}
            className="w-full text-xs py-1.5 px-3 rounded-full"
          />
        </div>

        {/* Icons */}
        <div className="flex items-center gap-1">
          <AdminNotificationDropdown />
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
            title={isDarkMode ? t('admin.darkModeOff', { defaultValue: 'Trang sáng' }) : t('admin.darkModeOn', { defaultValue: 'Trang tối' })}
          >
            <span className="material-symbols-outlined leading-none block">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <LanguageSwitcher variant={isDarkMode ? 'dark' : 'light'} />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-sm leading-none">storefront</span>
            Xem trang User
          </button>

          <button
            onClick={handleLogout}
            className="bg-primary hover:bg-primary-container text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-primary/10"
          >
            <span className="material-symbols-outlined text-sm leading-none">logout</span>
            {t('admin.logout')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
