import React, { useEffect, useState } from 'react';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import type { DashboardSummary, RevenueSeries, RecentOrder, ProductItem, BranchPerformance, SupportOverview } from '../../services/adminAnalyticsService';
import { dataService } from '../../services/dataService';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { useTranslation } from 'react-i18next';

/* ─── Helpers ─── */

const fmtCurrency = (val: any): string => {
  if (val === undefined || val === null || val === '') return '--';
  const num = Number(val);
  if (isNaN(num)) return '--';
  return num.toLocaleString('vi-VN') + ' ₫';
};

/** Format a change value with correct sign and color class */
const trendInfo = (change: number) => {
  const isPositive = change >= 0;
  return {
    icon: isPositive ? 'trending_up' : 'trending_down',
    colorClass: isPositive ? 'text-emerald-600' : 'text-rose-600',
    label: (isPositive ? '+' : '') + change + '%',
  };
};

/* ─── Status color map ─── */
const statusColorMap: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PROCESSING: 'bg-indigo-50 text-indigo-600',
  SHIPPING: 'bg-cyan-50 text-cyan-600',
  DELIVERED: 'bg-emerald-50 text-emerald-600',
  COMPLETED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
  REFUNDED: 'bg-orange-50 text-orange-600',
  RETURNED: 'bg-slate-100 text-slate-600',
};

const statusDotColor: Record<string, string> = {
  PENDING: 'bg-amber-500',
  CONFIRMED: 'bg-blue-500',
  PROCESSING: 'bg-indigo-500',
  SHIPPING: 'bg-cyan-500',
  DELIVERED: 'bg-emerald-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
  REFUNDED: 'bg-orange-500',
  RETURNED: 'bg-slate-400',
};

const formatDuration = (isoString: string, referenceTime: number) => {
  if (!isoString) return '';
  const diffMs = referenceTime - new Date(isoString).getTime();
  if (diffMs < 0) return '0 phút';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ ${diffMins % 60} phút`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày ${diffHours % 24} giờ`;
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueSeries[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<ProductItem[]>([]);
  const [topBranches, setTopBranches] = useState<BranchPerformance[]>([]);
  const [support, setSupport] = useState<SupportOverview | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  
  // Operational Alerts state
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<any[]>([]);
  const [maintenanceStatus, setMaintenanceStatus] = useState<any>(null);
  const [now, setNow] = useState(Date.now());

  const [timeFilter, setTimeFilter] = useState('30d');

  const { adminBranchId } = useAppSelector((s) => s.adminAuth);
  const currentBranchId = adminBranchId === 'ALL' ? 'all' : adminBranchId;
  
  const { t } = useTranslation();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await adminAnalyticsService.getDashboardData(timeFilter, currentBranchId);
      
      // Fetch operational alerts based on branch
      const lowStock = await dataService.getLowStock(currentBranchId);
      const expiring = await dataService.getExpiringSoon(currentBranchId);
      let mStatus = null;
      try {
        mStatus = await dataService.getMaintenanceStatus();
      } catch (e) {
        console.warn('Failed to fetch maintenance status:', e);
      }

      setLowStockProducts(Array.isArray(lowStock) ? lowStock : []);
      setExpiringProducts(Array.isArray(expiring) ? expiring : []);
      setMaintenanceStatus(mStatus);
      setSummary(data.summary);
      setRevenue(data.revenueSeries);
      setRecentOrders(data.recentOrders);
      setTopProducts(data.topProducts);
      setTopBranches(data.topBranches);
      setSupport(data.support);
      setStatusCounts(data.statusCounts || {});
      setError(null);
    } catch (err: any) {
      setError(err.message || t('adminDash.systemError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter, currentBranchId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm font-bold text-slate-500">{t('adminDash.loadingReport')}</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-50 p-6 rounded-2xl w-full max-w-md">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
          <h3 className="text-lg font-bold text-on-surface">{t('adminDash.systemError')}</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button onClick={fetchData} className="mt-6 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:bg-primary-container">{t('adminDash.retry')}</button>
        </div>
      </div>
    );
  }

  const salesTrend = trendInfo(summary.sales.change);
  const ordersTrend = trendInfo(summary.orders.change);
  const crTrend = trendInfo(summary.cr.change);

  return (
    <div className="p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Dashboard Header Actions */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">{t('adminDash.title')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('adminDash.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-surface-container-high p-1 rounded-xl">
              <button onClick={() => setTimeFilter('today')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === 'today' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900'}`}>{t('adminDash.today')}</button>
              <button onClick={() => setTimeFilter('7d')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === '7d' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900'}`}>{t('adminDash.last7Days')}</button>
              <button onClick={() => setTimeFilter('30d')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === '30d' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900'}`}>{t('adminDash.last30Days')}</button>
            </div>
            <button
              onClick={() => {
                const escapeCSV = (val: any): string => {
                  if (val === null || val === undefined) return '';
                  let str = String(val);
                  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    str = `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                };

                const rows = [
                  [`Bách hóa XANH Dashboard Report - ${new Date().toLocaleDateString('vi-VN')}`],
                  [],
                  [t('adminDash.sales'), summary.sales.value, 'VND', `${summary.sales.change}%`],
                  [t('adminDash.orders'), summary.orders.value, '', `${summary.orders.change}%`],
                  [t('adminDash.customers'), summary.customers.value, '', summary.customers.newThisMonth],
                  ['CR', `${summary.cr.value}%`, '', `${summary.cr.change}%`],
                  [],
                  [t('adminDash.revenueOverview')],
                  ['Month', 'In-Store', 'Online'],
                  ...revenue.map(r => [r.month, r.inStore, r.online]),
                  [],
                  [t('adminDash.topSelling')],
                  ['Name', 'Price', 'Sold'],
                  ...topProducts.map(p => [p.name, p.price, p.soldCount]),
                ];
                const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-primary text-white px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              {t('adminDash.exportReport')}
            </button>
            <button onClick={fetchData} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors" title={t('adminDash.refresh')}>
              <span className="material-symbols-outlined text-slate-600">refresh</span>
            </button>
          </div>
        </div>

        {/* Maintenance Mode Status Card */}
        {maintenanceStatus && (
          <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
            maintenanceStatus.maintenance 
              ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100/50' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-emerald-100/50'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  maintenanceStatus.maintenance ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {maintenanceStatus.maintenance ? 'construction' : 'check_circle'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    Trạng thái hệ thống: {maintenanceStatus.maintenance ? 'ĐANG BẢO TRÌ (MAINTENANCE ACTIVE)' : 'HOẠT ĐỘNG (ONLINE)'}
                  </h3>
                  <p className={`text-xs mt-1 ${maintenanceStatus.maintenance ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {maintenanceStatus.maintenance 
                      ? 'Tất cả các tính năng mua sắm, thanh toán và đặt hàng từ phía khách hàng đã bị tạm khóa.' 
                      : 'Hệ thống Bách hóa XANH đang vận hành bình thường và ổn định.'}
                  </p>
                </div>
              </div>

              {maintenanceStatus.maintenance && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2 bg-white/50 border border-rose-100 p-4 rounded-xl text-xs md:text-sm font-medium">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Người kích hoạt</span>
                    <span className="text-rose-950 font-bold">{maintenanceStatus.updated_by}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Thời gian bắt đầu</span>
                    <span className="text-rose-950 font-bold">{new Date(maintenanceStatus.updated_at).toLocaleString('vi-VN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Thời gian đã qua</span>
                    <span className="text-rose-950 font-bold">{formatDuration(maintenanceStatus.updated_at, now)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sales */}
          <div onClick={() => navigate('/admin/orders')} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between h-40 cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-[100px]">payments</span>
            </div>
            <div className="flex justify-between items-start z-10">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('adminDash.sales')}</p>
              <span className="material-symbols-outlined text-red-600 bg-red-50 p-1.5 rounded-lg">payments</span>
            </div>
            <div className="z-10">
              <h3 className="text-2xl font-black text-on-surface whitespace-nowrap">{fmtCurrency(summary.sales.value)}</h3>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${salesTrend.colorClass} mt-1`}>
                <span className="material-symbols-outlined text-sm">{salesTrend.icon}</span>
                <span>{salesTrend.label}</span>
                <span className="text-slate-400 font-medium ml-1">{t('adminDash.vsLastPeriod')}</span>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div onClick={() => navigate('/admin/orders')} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between h-40 cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-[100px]">shopping_basket</span>
            </div>
            <div className="flex justify-between items-start z-10">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('adminDash.orders')}</p>
              <span className="material-symbols-outlined text-slate-600 bg-slate-100 p-1.5 rounded-lg">shopping_basket</span>
            </div>
            <div className="z-10">
              <h3 className="text-3xl font-black text-on-surface">{summary.orders.value.toLocaleString()}</h3>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${ordersTrend.colorClass} mt-1`}>
                <span className="material-symbols-outlined text-sm">{ordersTrend.icon}</span>
                <span>{ordersTrend.label}</span>
                <span className="text-slate-400 font-medium ml-1">{t('adminDash.vsYesterday')}</span>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div onClick={() => navigate('/admin/customers')} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between h-40 cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-[100px]">person_add</span>
            </div>
            <div className="flex justify-between items-start z-10">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('adminDash.customers')}</p>
              <span className="material-symbols-outlined text-slate-600 bg-slate-100 p-1.5 rounded-lg">person_add</span>
            </div>
            <div className="z-10">
              <h3 className="text-3xl font-black text-on-surface">{summary.customers.value.toLocaleString()}</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-1">
                <span className="material-symbols-outlined text-sm">group</span>
                <span className="text-emerald-600">+{summary.customers.newThisMonth}</span>
                <span className="font-medium ml-1">{t('adminDash.newThisMonth')}</span>
              </div>
            </div>
          </div>

          {/* CR */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between h-40 group relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-[100px]">ads_click</span>
            </div>
            <div className="flex justify-between items-start z-10">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('adminDash.conversionRate')}</p>
              <span className="material-symbols-outlined text-slate-600 bg-slate-100 p-1.5 rounded-lg">ads_click</span>
            </div>
            <div className="z-10">
              <h3 className="text-3xl font-black text-on-surface">{summary.cr.value}%</h3>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${crTrend.colorClass} mt-1`}>
                <span className="material-symbols-outlined text-sm">{crTrend.icon}</span>
                <span>{crTrend.label}</span>
                <span className="text-slate-400 font-medium ml-1">{t('adminDash.thresholdDrop')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Revenue Overview Chart */}
          <div className="xl:col-span-2 bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h4 className="text-xl font-bold text-on-surface">{t('adminDash.revenueOverview')}</h4>
                <p className="text-slate-500 text-sm">{t('adminDash.monthlyComparison')}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600"></span>
                  <span className="text-xs font-semibold text-slate-600">{t('adminDash.inStore')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                  <span className="text-xs font-semibold text-slate-600">{t('adminDash.online')}</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-4 relative">
              <div className="w-full flex items-end justify-between px-2 h-56 border-b border-slate-100 relative">
                {revenue.map((item, idx) => {
                  const maxVal = Math.max(...revenue.map(r => r.inStore + r.online));
                  const total = item.inStore + item.online;
                  const heightPct = total > 0 ? (total / maxVal) * 100 : 0;
                  const inStorePct = total > 0 ? (item.inStore / total) * 100 : 0;

                  return (
                    <div key={idx} className="h-full w-[8%] relative group flex flex-col justify-end">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-bold">
                         {fmtCurrency(total)}
                      </div>
                      
                      <div style={{ height: `${heightPct}%` }} className="w-full flex items-end relative rounded-t-lg bg-slate-100 overflow-hidden">
                        <div style={{ height: `${inStorePct}%` }} className="absolute bottom-0 w-full bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"></div>
                      </div>
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-bold">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="xl:col-span-1 bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold text-on-surface">{t('adminDash.recentOrders')}</h4>
              <button onClick={() => navigate('/admin/orders')} className="text-xs font-bold text-red-600 hover:underline">{t('adminDash.viewAll')}</button>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50 flex-1">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p className="text-sm">{t('adminDash.noOrders')}</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {recentOrders.map((order, i) => (
                  <div key={i} onClick={() => navigate('/admin/orders')} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2.5 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-white flex items-center justify-center text-slate-400 transition-colors flex-shrink-0">
                        <span className="material-symbols-outlined text-lg">receipt_long</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{order.id}</p>
                        <p className="text-[11px] text-slate-500 truncate">{order.customerName || t('adminDash.guest')}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-on-surface whitespace-nowrap">{fmtCurrency(order.amount)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${statusColorMap[order.status] || 'bg-slate-100 text-slate-600'}`}>
                        {t(`orderStatuses.${order.status}`, { defaultValue: order.status })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Row: Top Products + Status Breakdown + Branch + Support */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Top Selling Products */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
            <h4 className="text-lg font-bold text-on-surface mb-6">{t('adminDash.topSelling')}</h4>
            
            {topProducts.length === 0 ? (
               <div className="text-center py-8 opacity-50 text-sm">{t('adminDash.noData')}</div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                    <img className="w-11 h-11 rounded-xl object-cover bg-slate-100 flex-shrink-0" src={p.image || "https://placehold.co/100"} alt={p.name} />
                    <div className="flex-1 overflow-hidden min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{p.name || t('adminDash.product')}</p>
                      <p className="text-[11px] text-slate-500">{p.soldCount.toLocaleString()} {t('adminDash.sold')}</p>
                    </div>
                    <p className="text-sm font-bold text-red-600 whitespace-nowrap flex-shrink-0">{fmtCurrency(p.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Status Breakdown */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
            <h4 className="text-lg font-bold text-on-surface mb-6">{t('adminDash.orderStatusBreakdown')}</h4>
            {Object.keys(statusCounts).length === 0 ? (
              <div className="text-center py-8 opacity-50 text-sm">{t('adminDash.noData')}</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(statusCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const total = Object.values(statusCounts).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDotColor[status] || 'bg-slate-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-on-surface truncate">{t(`orderStatuses.${status}`, { defaultValue: status })}</span>
                            <span className="text-xs font-bold text-slate-500 ml-2">{count}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all ${statusDotColor[status] || 'bg-slate-300'}`} />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-8 text-right flex-shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Branch Performance */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
            <h4 className="text-lg font-bold text-on-surface mb-6">{t('adminDash.branchPerformance')}</h4>
            
            {topBranches.length === 0 ? (
               <div className="text-center py-8 opacity-50 text-sm">{t('adminDash.noData')}</div>
            ) : (
              <div className="space-y-4">
                {topBranches.map((b, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer ${i === 0 ? 'bg-surface' : 'hover:bg-surface'}`}>
                    <span className={`w-6 text-center font-black ${i === 0 ? 'text-red-600' : 'text-slate-300'}`}>{i + 1}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-on-surface truncate">{b.name}</p>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div style={{ width: `${b.score}%` }} className={`h-full rounded-full ${i === 0 ? 'bg-red-600' : 'bg-red-600 opacity-60'}`}></div>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500">{b.score}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Support Overview */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
            <h4 className="text-lg font-bold text-on-surface mb-6">{t('adminDash.supportOverview')}</h4>
            
            {support ? (
              <div className="flex flex-col items-center justify-center relative cursor-pointer group">
                <div className="w-28 h-28 rounded-full border-[12px] border-slate-100 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 w-full h-full rounded-full border-[12px] border-transparent border-t-red-600 border-r-red-600 rotate-45"></div>
                  <div className="text-center">
                    <p className="text-xl font-black text-on-surface">{support.open}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{t('adminDash.open')}</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-4 w-full justify-between px-2">
                  <div className="text-center transform hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-bold text-red-600">{support.urgent}</p>
                    <p className="text-[10px] text-slate-400">{t('adminDash.urgent')}</p>
                  </div>
                  <div className="text-center transform hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-bold text-emerald-600">{support.resolved}</p>
                    <p className="text-[10px] text-slate-400">{t('adminDash.resolved')}</p>
                  </div>
                  <div className="text-center transform hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-bold text-amber-500">{support.waiting}</p>
                    <p className="text-[10px] text-slate-400">{t('adminDash.waiting')}</p>
                  </div>
                </div>
              </div>
            ) : (
                <div className="text-center py-8 opacity-50 text-sm">{t('adminDash.noData')}</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
          <h4 className="text-lg font-bold text-on-surface mb-4">{t('adminDash.quickActions')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-colors group">
              <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-red-600 transition-colors">list_alt</span>
              <span className="text-sm font-bold">{t('adminDash.manageOrders')}</span>
            </button>
            <button onClick={() => navigate('/admin/products')} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-colors group">
              <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-red-600 transition-colors">inventory_2</span>
              <span className="text-sm font-bold">{t('adminDash.manageProducts')}</span>
            </button>
            <button onClick={() => navigate('/admin/customers')} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-colors group">
              <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-red-600 transition-colors">groups</span>
              <span className="text-sm font-bold">{t('adminDash.manageCustomers')}</span>
            </button>
            <button onClick={() => navigate('/admin/support')} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-colors group">
              <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-red-600 transition-colors">support_agent</span>
              <span className="text-sm font-bold">{t('adminDash.manageSupport')}</span>
            </button>
          </div>
        </div>

        {/* Operational Alerts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          {/* Low Stock Alerts */}
          <div className="bg-orange-50/50 p-6 rounded-2xl shadow-sm border border-orange-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600">inventory_2</span>
                {t('adminDash.lowStock')}
              </h4>
              <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg">{lowStockProducts.length} {t('adminDash.itemsUnit')}</span>
            </div>
            
            {lowStockProducts.length === 0 ? (
               <div className="text-center py-8 opacity-50 text-sm flex flex-col items-center">
                 <span className="material-symbols-outlined mb-2 text-3xl">check_circle</span>
                 {t('adminDash.allInStock')}
               </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((p, i) => (
                  <div key={p.id || p._id || `low-stock-${i}`} className="flex flex-col bg-white p-3 rounded-xl border border-orange-50/50 shadow-sm">
                    <div className="flex justify-between items-start">
                       <p className="text-sm font-bold text-on-surface truncate pr-4">{p.product?.name || p.batch_code || t('adminDash.product')}</p>
                       <span className="text-xs font-black text-red-600 flex-shrink-0">{t('adminDash.remaining', { count: p.quantity })}</span>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <button onClick={() => navigate('/admin/products')} className="w-full text-center text-xs font-bold text-orange-600 hover:text-orange-700 mt-2 py-2">
                    {t('adminDash.viewAllCount', { count: lowStockProducts.length })}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Expiring Soon Alerts */}
          <div className="bg-red-50/50 p-6 rounded-2xl shadow-sm border border-red-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">event_busy</span>
                {t('adminDash.expiringSoon')}
              </h4>
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">{expiringProducts.length} {t('adminDash.batchesUnit')}</span>
            </div>
            
            {expiringProducts.length === 0 ? (
               <div className="text-center py-8 opacity-50 text-sm flex flex-col items-center">
                 <span className="material-symbols-outlined mb-2 text-3xl">check_circle</span>
                 {t('adminDash.noExpiring')}
               </div>
            ) : (
              <div className="space-y-3">
                {expiringProducts.slice(0, 5).map((p, i) => {
                  const daysLeft = Math.ceil((new Date(p.expiration_date || p.exp_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  return (
                  <div key={p.id || p._id || `expiring-${i}`} className="flex flex-col bg-white p-3 rounded-xl border border-red-50/50 shadow-sm">
                    <div className="flex justify-between items-start">
                       <p className="text-sm font-bold text-on-surface truncate pr-4">{p.product?.name || p.batch_code || t('adminDash.product')}</p>
                       <span className={`text-xs font-black flex-shrink-0 ${daysLeft < 0 ? 'text-red-700' : 'text-red-500'}`}>
                         {daysLeft < 0 ? t('adminDash.expired') : t('adminDash.daysLeft', { days: daysLeft })}
                       </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{t('adminDash.batchLabel')} {p.batch_code} • {t('adminDash.stockLabel')} {p.quantity}</p>
                  </div>
                )})}
                {expiringProducts.length > 5 && (
                  <button onClick={() => navigate('/admin/products')} className="w-full text-center text-xs font-bold text-red-600 hover:text-red-700 mt-2 py-2">
                    {t('adminDash.viewAllCount', { count: expiringProducts.length })}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;