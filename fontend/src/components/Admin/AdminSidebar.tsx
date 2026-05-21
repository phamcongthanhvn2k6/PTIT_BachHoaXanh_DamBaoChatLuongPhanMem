import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store';
import { hasPermission, isSuperAdmin } from '../../admin/utils/permission';

type MenuItem = {
  to: string;
  icon: string;
  labelKey: string;
  fallbackLabel: string;
  permission?: string;
  superAdminOnly?: boolean;
  section?: string;
};

const menuClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 transition-colors ${
    isActive
      ? 'bg-red-700/10 text-red-500 border-r-4 border-red-600 font-semibold'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
  }`;

const menuItems: MenuItem[] = [
  { to: '/admin/dashboard', icon: 'dashboard', labelKey: 'sidebar.dashboard', fallbackLabel: 'Bảng điều khiển', permission: 'dashboard.read' },
  { to: '/admin/events', icon: 'event_note', labelKey: 'sidebar.posts', fallbackLabel: 'Quản lý bài viết', permission: 'posts.read' },
  { to: '/admin/products', icon: 'inventory_2', labelKey: 'sidebar.inventory', fallbackLabel: 'Quản lý kho', permission: 'products.read' },
  { to: '/admin/orders', icon: 'receipt_long', labelKey: 'sidebar.orders', fallbackLabel: 'Đơn hàng', permission: 'orders.read' },
  { to: '/admin/customers', icon: 'group', labelKey: 'sidebar.customers', fallbackLabel: 'Khách hàng', permission: 'customers.read' },
  { to: '/admin/coupons', icon: 'local_activity', labelKey: 'sidebar.coupons', fallbackLabel: 'Khuyến mãi & Coupon', permission: 'coupons.read' },
  { to: '/admin/settings', icon: 'settings', labelKey: 'sidebar.settings', fallbackLabel: 'Cấu hình hệ thống', permission: 'settings.read' },

  // Enterprise Inventory
  { to: '/admin/suppliers', icon: 'business', labelKey: 'sidebar.suppliers', fallbackLabel: 'Nhà cung cấp', permission: 'suppliers.read', section: 'Enterprise' },
  { to: '/admin/import-orders', icon: 'shopping_cart', labelKey: 'sidebar.importOrders', fallbackLabel: 'Đơn nhập hàng', permission: 'imports.read', section: 'Enterprise' },
  { to: '/admin/import-receipts', icon: 'inventory', labelKey: 'sidebar.importReceipts', fallbackLabel: 'Phiếu nhận hàng', permission: 'imports.read', section: 'Enterprise' },
  { to: '/admin/inventory-batches', icon: 'calendar_month', labelKey: 'sidebar.batches', fallbackLabel: 'Batch & Hạn dùng', permission: 'inventory.read', section: 'Enterprise' },
  { to: '/admin/stock-movements', icon: 'swap_vert', labelKey: 'sidebar.stockMovements', fallbackLabel: 'Luân chuyển tồn kho', permission: 'inventory.read', section: 'Enterprise' },
  { to: '/admin/roles', icon: 'admin_panel_settings', labelKey: 'sidebar.roles', fallbackLabel: 'Vai trò & Quyền', superAdminOnly: true, section: 'Enterprise' },
  { to: '/admin/audit-logs', icon: 'history', labelKey: 'sidebar.auditLogs', fallbackLabel: 'Nhật ký hệ thống', permission: 'audit.read', section: 'Enterprise' },
  { to: '/admin/branch-locations', icon: 'location_on', labelKey: 'sidebar.branches', fallbackLabel: 'Vị trí chi nhánh', permission: 'branches.read', section: 'Enterprise' },

  // CSKH
  { to: '/admin/reviews', icon: 'reviews', labelKey: 'sidebar.reviews', fallbackLabel: 'Quản lý đánh giá', permission: 'reviews.read', section: 'CSKH & Trải nghiệm' },
  { to: '/admin/questions', icon: 'forum', labelKey: 'sidebar.questions', fallbackLabel: 'Hỏi Đáp Sản Phẩm', permission: 'reviews.read', section: 'CSKH & Trải nghiệm' },
  { to: '/admin/support', icon: 'support_agent', labelKey: 'sidebar.support', fallbackLabel: 'Hỗ trợ khách hàng', permission: 'support.read', section: 'CSKH & Trải nghiệm' },
  { to: '/admin/returns', icon: 'assignment_return', labelKey: 'sidebar.returns', fallbackLabel: 'Yêu cầu đổi trả', permission: 'returns.read', section: 'CSKH & Trải nghiệm' },
];

const AdminSidebar: React.FC = () => {
  const { t } = useTranslation();
  const admin = useAppSelector((s) => s.adminAuth.admin);
  const profileName = admin?.name || admin?.full_name || admin?.username || 'Admin';
  const roleLabel = admin?.role_key || admin?.role || 'admin';
  const [settings, setSettings] = React.useState<any>(null);

  React.useEffect(() => {
    import('../../services/dataService').then(({ dataService }) => {
      dataService.getAdminSettings().then(setSettings).catch(() => {});
    });
  }, []);

  const canShow = (item: MenuItem) => {
    if (item.superAdminOnly) return isSuperAdmin(admin);
    if (!item.permission) return true;
    return hasPermission(admin, item.permission);
  };

  const baseItems = menuItems.filter((m) => !m.section && canShow(m));
  const enterpriseItems = menuItems.filter((m) => m.section === 'Enterprise' && canShow(m));
  const cskhItems = menuItems.filter((m) => m.section === 'CSKH & Trải nghiệm' && canShow(m));

  const roleBadge = isSuperAdmin(admin) ? 'Super Admin' : String(roleLabel).replace(/_/g, ' ');

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-slate-900 dark:bg-slate-950 border-r border-slate-800 dark:border-slate-800 shadow-2xl flex flex-col py-6 z-50">
      <div className="px-6 mb-10 flex items-center gap-3">
        {settings?.brand_logo_url ? (
          <img
            src={settings.brand_logo_url}
            alt="Logo"
            className="w-9 h-9 object-contain rounded-full bg-white p-0.5 shadow-md flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md">
            L
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-md font-black text-white tracking-tight uppercase truncate">
            {settings?.brand_name || 'Lotte Mart'}
          </h1>
          <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-0.5 truncate">
            {settings?.system_name || 'Master Admin Portal'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {baseItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={menuClass}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-medium">{t(item.labelKey, item.fallbackLabel)}</span>
          </NavLink>
        ))}

        {enterpriseItems.length > 0 && (
          <div className="pt-4 mt-2 border-t border-slate-800">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{t('sidebar.sectionEnterprise', 'Enterprise Inventory')}</p>
            {enterpriseItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={menuClass}>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-medium">{t(item.labelKey, item.fallbackLabel)}</span>
              </NavLink>
            ))}
          </div>
        )}

        {cskhItems.length > 0 && (
          <div className="pt-4 mt-2 border-t border-slate-800">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{t('sidebar.sectionCSKH', 'CSKH & Trải nghiệm')}</p>
            {cskhItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={menuClass}>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-medium">{t(item.labelKey, item.fallbackLabel)}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="px-6 mt-auto pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-xs">
            {String(profileName).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{profileName}</p>
            <p className="text-[10px] text-slate-500 truncate">{admin?.email}</p>
            <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
              isSuperAdmin(admin) ? 'bg-red-600/20 text-red-400' : 'bg-slate-700/50 text-slate-400'
            }`}>
              {roleBadge}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
