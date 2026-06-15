import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import enterpriseService from '../services/enterpriseService';
import { useAppSelector } from '../../store';
import { toast } from '../../components/Toast/toastEvent';
import {
  PageHeader, SearchBar, FilterBar, StatusBadge, EmptyState,
  LoadingOverlay, PaginationControl, Modal, DetailDrawer,
  FormSection, FormField, StatCard, cls,
} from '../components/AdminUI';

const PAGE_SIZE = 12;

const EXPIRY_FILTER_OPTIONS = [
  { value: 'expired', label: 'Đã hết hạn' },
  { value: 'critical', label: 'Sắp hết hạn (<7 ngày)' },
  { value: 'warning', label: 'Cảnh báo (<30 ngày)' },
  { value: 'safe', label: 'Còn hạn' },
];

const AdminInventoryBatches: React.FC = () => {
  const navigate = useNavigate();
  const { adminBranchId } = useAppSelector((s) => s.adminAuth);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentBranchId = adminBranchId === 'ALL' ? '' : adminBranchId;

  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [page, setPage] = useState(1);

  /* Edit modal */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);

  /* Detail drawer */
  const [detailItem, setDetailItem] = useState<any>(null);

  /* Reconciliation / Drift states */
  const [activeTab, setActiveTab] = useState<'batches' | 'reconciliation'>('batches');
  const [driftRows, setDriftRows] = useState<any[]>([]);
  const [driftSummary, setDriftSummary] = useState<any>({ totalChecked: 0, totalDrifts: 0, healthScore: 100 });
  const [loadingDrift, setLoadingDrift] = useState(false);

  const loadDriftReport = useCallback(async () => {
    try {
      setLoadingDrift(true);
      const res = await enterpriseService.getDriftReport({ branch_id: currentBranchId || undefined });
      setDriftRows(res?.data || []);
      setDriftSummary(res?.summary || { totalChecked: 0, totalDrifts: 0, healthScore: 100 });
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được báo cáo lệch kho');
    } finally {
      setLoadingDrift(false);
    }
  }, [currentBranchId]);

  const handleHealProduct = async (bpId: string) => {
    try {
      setLoadingDrift(true);
      await enterpriseService.autoHealProduct(bpId);
      toast.success('Đã tự động sửa lệch kho cho sản phẩm');
      loadDriftReport();
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi sửa lệch kho');
      setLoadingDrift(false);
    }
  };

  const handleHealAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn tự động sửa lệch kho cho tất cả sản phẩm bị lệch ở chi nhánh hiện tại không?')) return;
    try {
      setLoadingDrift(true);
      const res = await enterpriseService.autoHealAll(currentBranchId || undefined);
      toast.success(res?.message || 'Đã sửa lệch kho thành công');
      loadDriftReport();
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi sửa lệch kho hàng loạt');
      setLoadingDrift(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseService.getInventoryBatches({ limit: 500, branch_id: currentBranchId || undefined });
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data);
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được danh sách kho');
    } finally {
      setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    loadData();
    enterpriseService.getDriftReport({ branch_id: currentBranchId || undefined })
      .then(res => {
        setDriftSummary(res?.summary || { totalChecked: 0, totalDrifts: 0, healthScore: 100 });
      })
      .catch(() => {});
  }, [currentBranchId, loadData]);

  useEffect(() => {
    if (activeTab === 'reconciliation') {
      loadDriftReport();
    }
  }, [activeTab, loadDriftReport]);

  /* Filtered + paginated */
  const filteredRows = useMemo(() => {
    let data = [...rows];
    if (currentBranchId) {
      data = data.filter((r) => String(r.branch_id) === String(currentBranchId));
    }
    if (expiryFilter) {
      data = data.filter((r) => r.expiry_status === expiryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) =>
        (r.product_name || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.batch_code || '').toLowerCase().includes(q) ||
        (r.supplier_name || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [rows, currentBranchId, expiryFilter, search]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const stats = useMemo(() => {
    const expired = rows.filter((r) => r.expiry_status === 'expired').length;
    const critical = rows.filter((r) => r.expiry_status === 'critical').length;
    const warning = rows.filter((r) => r.expiry_status === 'warning').length;
    const lowStock = rows.filter((r) => {
      const badges = Array.isArray(r.badges) ? r.badges : [];
      return badges.some((b: any) => b.type === 'stock' && b.color === 'red');
    }).length;
    return { total: rows.length, expired, critical, warning, lowStock };
  }, [rows]);

  const filteredDriftRows = useMemo(() => {
    let data = [...driftRows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) =>
        (r.product_name || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.branch_name || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [driftRows, search]);

  /* Edit handlers */
  const handleEdit = (row: any) => {
    setEditBatch({
      id: row._id,
      batch_code: row.batch_code || '',
      manufacture_date: row.manufacture_date ? new Date(row.manufacture_date).toISOString().split('T')[0] : '',
      exp_date: row.exp_date ? new Date(row.exp_date).toISOString().split('T')[0] : '',
      quantity: row.quantity || row.bp_stock || 0,
      cost_price: row.cost_price || 0,
      supplier_name: row.supplier_name || '',
      note: row.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editBatch.id) {
        await enterpriseService.updateInventoryBatch(editBatch.id, editBatch);
        toast.success('Đã cập nhật thông tin lô hàng');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật: ' + err.toString());
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDraftPromotion = (item: any) => {
    const daysLeft = item.days_until_expiry ?? getDaysLeft(item.exp_date);
    // Smart discount: closer to expiry → deeper discount
    let discountValue = '50';
    if (daysLeft !== null && daysLeft <= 3) discountValue = '70';
    else if (daysLeft !== null && daysLeft <= 7) discountValue = '50';
    else if (daysLeft !== null && daysLeft <= 14) discountValue = '30';

    const stock = item.bp_stock || item.quantity || 0;
    const price = item.bp_price || item.product_price || 0;
    const originalPrice = item.bp_original_price || item.product_original_price || price;

    const payload = {
      // ===== STEP 1: Thông tin chiến dịch =====
      title: `⚠️ Xả hàng sắp hết hạn: ${item.product_name}`,
      description: [
        `🔔 Xả hàng lô ${item.batch_code || 'N/A'}`,
        `📦 Sản phẩm: ${item.product_name}`,
        `🏷️ SKU: ${item.sku || 'N/A'}`,
        `🏢 Nhà cung cấp: ${item.supplier_name || 'N/A'}`,
        `📅 Hạn sử dụng: ${item.exp_date ? new Date(item.exp_date).toLocaleDateString('vi-VN') : 'N/A'}`,
        `⏳ Còn lại: ${daysLeft ?? '?'} ngày`,
        `📊 Tồn kho hiện tại: ${stock} sản phẩm`,
        `💰 Giá bán: ${Number(price).toLocaleString('vi-VN')}đ`,
      ].join('\n'),
      imageUrl: item.product_thumbnail || 'https://via.placeholder.com/800x400.png?text=Clearance+Sale',
      badge_text: 'Giải phóng hàng sắp hết hạn',
      banner_url: '/promotions',

      // ===== STEP 2: Quy tắc giảm giá =====
      type: 'percent',
      discount_value: discountValue,

      // ===== STEP 3: Phạm vi áp dụng =====
      scope: 'product',
      target_product_ids: item.product_id ? [String(item.product_id)] : [],
      target_category_ids: item.category_id ? [String(item.category_id)] : [],
      target_branch_ids: currentBranchId ? [String(currentBranchId)] : (item.branch_id ? [String(item.branch_id)] : []),

      // ===== STEP 4: Giới hạn & Coupon =====
      start_date: new Date().toISOString(),
      end_date: item.exp_date || '',
      total_quantity: String(stock),
      per_user_limit: '1',

      // ===== META: Full product context for all steps =====
      source: 'expiry_alert',
      is_auto_generated: true,
      autoOpenDraft: true,
      product_id: item.product_id || '',
      product_name: item.product_name || '',
      sku: item.sku || '',
      master_id: item.master_id || '',
      category_id: item.category_id || '',
      category_name: item.category_name || '',
      supplier_id: item.supplier_id || '',
      supplier_name: item.supplier_name || '',
      branch_id: currentBranchId || item.branch_id || '',
      branch_name: item.branch_name || '',
      batch_code: item.batch_code || '',
      expiry_date: item.exp_date || '',
      days_to_expiry: daysLeft,
      stock: stock,
      sold_count: item.bp_sold_count || 0,
      price: price,
      original_price: originalPrice,
      cost_price: item.cost_price || 0,
    };
    navigate('/admin/coupons', { state: { draftPromotion: payload } });
  };

  const getDaysLeft = (expDate: string) => {
    if (!expDate) return null;
    return Math.ceil((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  };

  const getExpiryColor = (status: string) => {
    if (status === 'expired') return 'text-red-600';
    if (status === 'critical') return 'text-orange-600';
    if (status === 'warning') return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Quản lý Kho & Hạn Sử Dụng"
        subtitle="Theo dõi tồn kho, cảnh báo hạn dùng và gợi ý khuyến mãi thông minh"
        icon="inventory_2"
        actions={
          <button onClick={activeTab === 'reconciliation' ? loadDriftReport : loadData} disabled={loading || loadingDrift} className={cls.btnSecondary}>
            <span className={`material-symbols-outlined text-sm ${loading || loadingDrift ? 'animate-spin' : ''}`}>refresh</span>
            Làm mới
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => { setActiveTab('batches'); setPage(1); }}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'batches' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <span className="material-symbols-outlined text-base">calendar_month</span>
          Danh Sách Lô Hàng ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 relative cursor-pointer ${activeTab === 'reconciliation' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <span className="material-symbols-outlined text-base">balance</span>
          Đối Soát & Sửa Lệch Kho
          {driftSummary.totalDrifts > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      {activeTab === 'reconciliation' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${driftSummary.healthScore > 90 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <span className="material-symbols-outlined text-2xl">health_and_safety</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sức khỏe đồng bộ kho</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{driftSummary.healthScore}%</h3>
            </div>
          </div>
          <StatCard label="Tổng sản phẩm kiểm tra" value={driftSummary.totalChecked} icon="inventory" color="blue" />
          <StatCard label="Sản phẩm bị lệch kho" value={driftSummary.totalDrifts} icon="warning" color="red" />
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Công cụ sửa lỗi nhanh</p>
              <p className="text-xs text-slate-500 mt-1">Đồng bộ tự động tất cả</p>
            </div>
            <button
              onClick={handleHealAll}
              disabled={driftSummary.totalDrifts === 0 || loadingDrift}
              className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs shadow-lg shadow-primary/20 hover:bg-primary/95 disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">auto_fix</span> Sửa tất cả
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Tổng lô hàng" value={stats.total} icon="inventory_2" color="blue" />
          <StatCard label="Đã hết hạn" value={stats.expired} icon="event_busy" color="red" onClick={() => { setExpiryFilter('expired'); setPage(1); }} />
          <StatCard label="Sắp hết hạn" value={stats.critical} icon="warning" color="amber" onClick={() => { setExpiryFilter('critical'); setPage(1); }} />
          <StatCard label="Cảnh báo" value={stats.warning} icon="notification_important" color="violet" onClick={() => { setExpiryFilter('warning'); setPage(1); }} />
          <StatCard label="Tồn thấp" value={stats.lowStock} icon="trending_down" color="red" />
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder={activeTab === 'reconciliation' ? "Tìm theo tên sản phẩm, SKU, chi nhánh..." : "Tìm theo sản phẩm, SKU, batch, NCC..."} />
        {activeTab === 'batches' && (
          <FilterBar filters={[{
            label: 'Tất cả hạn sử dụng', value: expiryFilter,
            options: EXPIRY_FILTER_OPTIONS,
            onChange: (v) => { setExpiryFilter(v); setPage(1); },
          }]} />
        )}
      </div>

      {/* Table */}
      <div className={`${cls.card} overflow-hidden relative`}>
        <LoadingOverlay visible={loading || loadingDrift} />
        {activeTab === 'reconciliation' ? (
          !loadingDrift && filteredDriftRows.length === 0 ? (
            <EmptyState
              icon="check_circle"
              title="Kho hàng hoàn toàn đồng bộ!"
              description="Không phát hiện bất kỳ sự lệch pha nào giữa BranchProduct.stock và các lô hàng unexpired."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className={cls.thCell}>#</th>
                    <th className={cls.thCell + ' min-w-[250px]'}>Sản phẩm & SKU</th>
                    <th className={cls.thCell}>Chi nhánh</th>
                    <th className={cls.thCell}>Tổng tồn (ERP)</th>
                    <th className={cls.thCell}>Tổng lô (FIFO)</th>
                    <th className={cls.thCell}>Chênh lệch</th>
                    <th className={cls.thCell}>Reserved / Sellable</th>
                    <th className={cls.thCell}>Kiểu lỗi</th>
                    <th className={`${cls.thCell} text-right`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDriftRows.map((row, idx) => (
                    <tr key={row.branch_product_id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className={`${cls.tdCell} text-slate-400`}>{idx + 1}</td>
                      <td className={cls.tdCell}>
                        <div className="flex items-center gap-3">
                          {row.thumbnail ? (
                            <img src={row.thumbnail} alt="" className="w-10 h-10 rounded-lg border object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 text-sm line-clamp-2">{row.product_name}</p>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">SKU: {row.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className={cls.tdCell}>
                        <span className="text-sm font-medium text-slate-600">{row.branch_name}</span>
                      </td>
                      <td className={cls.tdCell}>
                        <span className="font-bold text-slate-900">{row.stock}</span>
                      </td>
                      <td className={cls.tdCell}>
                        <span className="font-semibold text-slate-700">{row.batchSum}</span>
                      </td>
                      <td className={cls.tdCell}>
                        <span className={`font-bold ${row.diff > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </span>
                      </td>
                      <td className={cls.tdCell}>
                        <div className="flex flex-col text-xs text-slate-500">
                          <span>Giữ hàng: <b className="text-slate-700">{row.reserved}</b></span>
                          <span>Bán được: <b className="text-emerald-600">{row.sellable}</b></span>
                        </div>
                      </td>
                      <td className={cls.tdCell}>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.type === 'no_batches' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {row.type === 'no_batches' ? 'Mất lô hàng' : 'Lệch số lượng'}
                        </span>
                      </td>
                      <td className={`${cls.tdCell} text-right`}>
                        <button
                          onClick={() => handleHealProduct(row.branch_product_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all border border-emerald-200 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">build</span> Sửa lỗi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          !loading && filteredRows.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="Chưa có lô hàng / sản phẩm nào"
              description="Dữ liệu kho sẽ hiển thị khi có sản phẩm được nhập vào hệ thống"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className={cls.thCell}>#</th>
                      <th className={cls.thCell + ' min-w-[250px]'}>Sản phẩm & SKU</th>
                      <th className={cls.thCell}>Nhà cung cấp</th>
                      <th className={cls.thCell}>Tồn kho</th>
                      <th className={cls.thCell}>Giá bán / Nhập</th>
                      <th className={cls.thCell + ' min-w-[180px]'}>Hạn sử dụng</th>
                      <th className={cls.thCell}>Trạng thái</th>
                      <th className={`${cls.thCell} text-right`}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRows.map((row, idx) => {
                      const badges = Array.isArray(row.badges) ? row.badges : [];
                      const daysLeft = getDaysLeft(row.exp_date);

                      return (
                        <tr key={String(row._id)} className="hover:bg-slate-50/60 transition-colors group">
                          <td className={`${cls.tdCell} text-slate-400`}>{(page - 1) * PAGE_SIZE + idx + 1}</td>

                          {/* Product */}
                          <td className={cls.tdCell}>
                            <div className="flex items-start gap-3">
                              {row.product_thumbnail ? (
                                <img src={row.product_thumbnail} alt="" className="w-10 h-10 rounded-lg border object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg border bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <button
                                  onClick={() => setDetailItem(row)}
                                  className="font-semibold text-slate-900 hover:text-red-600 transition-colors text-left text-sm line-clamp-2"
                                >
                                  {row.product_name || '—'}
                                </button>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">SKU: {row.sku || '—'}</span>
                                  {row.batch_code && (
                                    <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Lô: {row.batch_code}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className={cls.tdCell}>
                            {row.supplier_name ? (
                              <div>
                                <p className="font-medium text-slate-700 text-sm truncate max-w-[140px]">{row.supplier_name}</p>
                                {row.supplier_code && <p className="text-[10px] text-slate-400 font-mono">{row.supplier_code}</p>}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Stock */}
                          <td className={cls.tdCell}>
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-900">{row.bp_stock || row.quantity || 0}</span>
                              <span className="text-[10px] text-slate-500">Đã bán: {row.bp_sold_count || 0}</span>
                              {badges.filter((b: any) => b.type === 'stock' || b.type === 'sales').map((badge: any, bi: number) => (
                                <StatusBadge key={bi} status={badge.color === 'red' ? 'low_stock' : 'active'} label={badge.text} />
                              ))}
                            </div>
                          </td>

                          {/* Price */}
                          <td className={cls.tdCell}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-red-600">{Number(row.bp_price || row.product_price || 0).toLocaleString('vi-VN')}đ</span>
                              <span className="text-[10px] text-slate-500">Nhập: {Number(row.cost_price || 0).toLocaleString('vi-VN')}đ</span>
                            </div>
                          </td>

                          {/* Expiry */}
                          <td className={cls.tdCell}>
                            <div className="flex flex-col gap-1">
                              {row.manufacture_date && (
                                <span className="text-[10px] text-slate-500">
                                  NSX: {new Date(row.manufacture_date).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                              <span className={`font-semibold text-sm ${getExpiryColor(row.expiry_status)}`}>
                                {row.exp_date ? new Date(row.exp_date).toLocaleDateString('vi-VN') : 'Không có hạn'}
                              </span>
                              {daysLeft !== null && (
                                <span className={`text-[10px] font-bold ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-orange-600' : daysLeft < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {daysLeft < 0 ? `Hết hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status badges */}
                          <td className={cls.tdCell}>
                            <div className="flex flex-wrap gap-1">
                              {badges.filter((b: any) => b.type === 'expiry').map((badge: any, bi: number) => (
                                <StatusBadge
                                  key={bi}
                                  status={badge.color === 'red' ? 'expired' : badge.color === 'orange' ? 'warning' : 'expiring_soon'}
                                  label={badge.text}
                                />
                              ))}
                              {badges.filter((b: any) => b.type === 'category').map((badge: any, bi: number) => (
                                <span key={`cat-${bi}`} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                  {badge.text}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className={`${cls.tdCell} text-right`}>
                            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(row)} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-300 text-red-600 rounded-lg text-xs font-bold transition-all">
                                <span className="material-symbols-outlined text-sm">edit</span> Sửa
                              </button>
                              {(row.expiry_status === 'critical' || row.expiry_status === 'warning') && (
                                <button onClick={() => handleCreateDraftPromotion(row)} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
                                  <span className="material-symbols-outlined text-sm">sell</span> Tạo sale
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationControl page={page} pageSize={PAGE_SIZE} total={filteredRows.length} onChange={setPage} />
            </>
          )
        )}
      </div>

      {/* ========== EDIT MODAL ========== */}
      <Modal
        open={isModalOpen && !!editBatch}
        onClose={() => setIsModalOpen(false)}
        title="Chỉnh sửa Lô Kho"
        subtitle="Cập nhật thông tin batch, hạn sử dụng, tồn kho"
        icon="edit"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setIsModalOpen(false)} className={cls.btnSecondary}>Hủy</button>
            <button type="submit" form="batch-edit-form" disabled={submitting} className={cls.btnPrimary}>
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Lưu lô hàng
            </button>
          </>
        }
      >
        {editBatch && (
          <form id="batch-edit-form" onSubmit={handleSave}>
            <FormSection title="Thông tin lô hàng">
              <FormField label="Batch Code / Lot">
                <input className={cls.input} value={editBatch.batch_code} onChange={e => setEditBatch({ ...editBatch, batch_code: e.target.value })} />
              </FormField>
              <FormField label="Ngày sản xuất">
                <input type="date" className={cls.input} value={editBatch.manufacture_date} onChange={e => setEditBatch({ ...editBatch, manufacture_date: e.target.value })} />
              </FormField>
              <FormField label="Hạn sử dụng">
                <input type="date" className={cls.input} value={editBatch.exp_date} onChange={e => setEditBatch({ ...editBatch, exp_date: e.target.value })} />
              </FormField>
              <FormField label="Tồn kho (thực)">
                <input type="number" className={cls.input} value={editBatch.quantity} onChange={e => setEditBatch({ ...editBatch, quantity: e.target.value })} />
              </FormField>
            </FormSection>
            <FormSection title="Giá & Nhà cung cấp">
              <FormField label="Giá nhập">
                <input type="number" className={cls.input} value={editBatch.cost_price} onChange={e => setEditBatch({ ...editBatch, cost_price: e.target.value })} />
              </FormField>
              <FormField label="Nhà cung cấp">
                <input className={cls.input} value={editBatch.supplier_name} onChange={e => setEditBatch({ ...editBatch, supplier_name: e.target.value })} />
              </FormField>
              <FormField label="Ghi chú" colSpan={2}>
                <textarea className={cls.input + ' resize-none'} rows={2} value={editBatch.note} onChange={e => setEditBatch({ ...editBatch, note: e.target.value })} />
              </FormField>
            </FormSection>
          </form>
        )}
      </Modal>

      {/* ========== DETAIL DRAWER ========== */}
      <DetailDrawer
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.product_name || 'Chi tiết lô hàng'}
        subtitle={detailItem?.sku ? `SKU: ${detailItem.sku}` : ''}
        icon="inventory_2"
      >
        {detailItem && (
          <div className="space-y-6">
            {detailItem.product_thumbnail && (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img src={detailItem.product_thumbnail} alt="" className="w-full h-48 object-cover" />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(Array.isArray(detailItem.badges) ? detailItem.badges : []).map((b: any, i: number) => (
                <StatusBadge key={i} status={b.color === 'red' ? 'expired' : b.color === 'orange' ? 'warning' : b.type === 'category' ? 'approved' : 'active'} label={b.text} />
              ))}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thông tin sản phẩm</h4>
              <div className="space-y-2">
                <InfoRow label="Tên" value={detailItem.product_name} />
                <InfoRow label="SKU" value={detailItem.sku} />
                <InfoRow label="Batch Code" value={detailItem.batch_code} />
                <InfoRow label="Master ID" value={detailItem.master_id?.slice(-8)} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tồn kho & Giá</h4>
              <div className="space-y-2">
                <InfoRow label="Tồn kho" value={String(detailItem.bp_stock || detailItem.quantity || 0)} />
                <InfoRow label="Đã bán" value={String(detailItem.bp_sold_count || 0)} />
                <InfoRow label="Giá bán" value={`${Number(detailItem.bp_price || detailItem.product_price || 0).toLocaleString('vi-VN')} đ`} />
                <InfoRow label="Giá nhập" value={`${Number(detailItem.cost_price || 0).toLocaleString('vi-VN')} đ`} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hạn sử dụng</h4>
              <div className="space-y-2">
                <InfoRow label="NSX" value={detailItem.manufacture_date ? new Date(detailItem.manufacture_date).toLocaleDateString('vi-VN') : '—'} />
                <InfoRow label="HSD" value={detailItem.exp_date ? new Date(detailItem.exp_date).toLocaleDateString('vi-VN') : 'Không có hạn'} />
                {detailItem.exp_date && (
                  <InfoRow label="Còn lại" value={(() => {
                    const d = getDaysLeft(detailItem.exp_date);
                    return d !== null ? (d < 0 ? `Hết hạn ${Math.abs(d)} ngày` : `${d} ngày`) : '—';
                  })()} />
                )}
                <InfoRow label="NCC" value={detailItem.supplier_name} link="/admin/suppliers" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Truy xuất nguồn gốc</h4>
              <div className="space-y-2">
                <InfoRow label="Đơn nhập" value={detailItem.purchase_order_id ? `#${String(detailItem.purchase_order_id).substring(0, 8)}` : '—'} link={detailItem.purchase_order_id ? `/admin/import-orders` : undefined} />
                <InfoRow label="Phiếu nhận" value={detailItem.import_receipt_id ? `#${String(detailItem.import_receipt_id).substring(0, 8)}` : '—'} link={detailItem.import_receipt_id ? `/admin/import-receipts` : undefined} />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => { handleEdit(detailItem); setDetailItem(null); }} className={cls.btnPrimary + ' flex-1 justify-center'}>
                <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa
              </button>
              {(detailItem.expiry_status === 'critical' || detailItem.expiry_status === 'warning') && (
                <button onClick={() => { handleCreateDraftPromotion(detailItem); setDetailItem(null); }} className={cls.btnDanger + ' flex-1 justify-center'}>
                  <span className="material-symbols-outlined text-sm">sell</span> Tạo sale
                </button>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string; link?: string }> = ({ label, value, link }) => (
  <div className="flex justify-between items-start py-2 border-b border-slate-50">
    <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
    {link ? (
      <Link to={link} className="text-sm font-semibold text-blue-600 hover:text-blue-800 text-right underline decoration-blue-300 underline-offset-2">
        {value || '—'}
      </Link>
    ) : (
      <span className="text-sm font-medium text-slate-800 text-right">{value || '—'}</span>
    )}
  </div>
);

export default AdminInventoryBatches;
