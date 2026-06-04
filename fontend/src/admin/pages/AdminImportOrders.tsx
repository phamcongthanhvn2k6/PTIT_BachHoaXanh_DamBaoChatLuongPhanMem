import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import enterpriseService from '../services/enterpriseService';
import { dataService } from '../../services/dataService';
import { productService } from '../../services/productService';
import { useAppSelector } from '../../store';
import { toast } from '../../components/Toast/toastEvent';
import { useTranslation } from 'react-i18next';
import {
  PageHeader, SearchBar, FilterBar, StatusBadge, EmptyState,
  LoadingOverlay, PaginationControl, Modal, DetailDrawer,
  FormSection, FormField, StatCard, cls, InfoRow
} from '../components/AdminUI';
import { InlineCreateProductModal } from '../components/InlineCreateProductModal';
import { exportImportOrderPDF, exportImportOrderWord } from '../utils/exportUtils';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp' },
  { value: 'ordered', label: 'Đã đặt' },
  { value: 'partially_received', label: 'Nhận một phần' },
  { value: 'received', label: 'Đã nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
];

/* ============================================================
   PRODUCT SEARCH SELECTOR (Searchable Combobox)
   ============================================================ */
interface ProductSearchSelectorProps {
  branchId: string;
  supplierId?: string;
  value: string;
  onChange: (value: string, bp: any) => void;
  onInlineCreate: () => void;
  disabled?: boolean;
  t: any;
  setFetchedProducts: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fetchedProducts: Record<string, any>;
}

export const ProductSearchSelector: React.FC<ProductSearchSelectorProps> = ({
  branchId,
  supplierId,
  value,
  onChange,
  onInlineCreate,
  disabled,
  t,
  setFetchedProducts,
  fetchedProducts
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Close dropdown on click outside
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // Fetch initial/searched products from backend
  const fetchProducts = useCallback(async (query: string, pageNum: number, append = false) => {
    if (!branchId) return;
    setLoading(true);
    try {
      const limit = 15;
      const res = await productService.getBranchProducts({
        branch_id: branchId,
        supplier_id: supplierId || undefined,
        search: query || undefined,
        limit,
        page: pageNum
      });
      const data = Array.isArray(res) ? res : [];
      setHasMore(data.length === limit);

      setOptions(prev => {
        const next = append ? [...prev, ...data] : data;
        // Deduplicate
        const unique: any[] = [];
        const seen = new Set();
        next.forEach(x => {
          const id = String(x._id || x.id);
          if (!seen.has(id)) {
            seen.add(id);
            unique.push(x);
          }
        });
        return unique;
      });

      // Update fetchedProducts dictionary in parent
      setFetchedProducts(prev => {
        const next = { ...prev };
        data.forEach(bp => {
          next[String(bp._id || bp.id)] = bp;
        });
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [branchId, supplierId, setFetchedProducts]);

  // Debounced search trigger
  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    const timer = setTimeout(() => {
      fetchProducts(search, 1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOpen, fetchProducts]);

  // Load more trigger
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(search, nextPage, true);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        const selected = options[highlightedIndex];
        onChange(String(selected._id || selected.id), selected);
        setIsOpen(false);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const selectedBP = fetchedProducts[value];
  const selectedLabel = selectedBP
    ? `${selectedBP.product?.name || selectedBP.name || t('importOrders.unnamed', 'Chưa cập nhật tên')} | SKU: ${selectedBP.sku || '—'}`
    : '';

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2 border rounded-xl text-sm bg-white cursor-pointer select-none transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' : 'hover:border-slate-300 border-slate-200'
        } ${isOpen ? 'ring-2 ring-red-500/20 border-red-400' : ''}`}
      >
        <span className={selectedLabel ? 'text-slate-800 font-semibold truncate' : 'text-slate-400 truncate'}>
          {selectedLabel || t('importOrders.selectAvailable', 'Chọn sản phẩm...')}
        </span>
        <span className="material-symbols-outlined text-slate-400 text-[18px]">
          {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col max-h-[360px] animate-fade-in min-w-[320px] md:min-w-[400px]">
          {/* Search bar inside Dropdown */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-none focus:outline-none text-sm placeholder:text-slate-400 py-1"
              placeholder={t('importOrders.searchPlaceholder', 'Tìm theo tên, SKU, barcode...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="flex-1 overflow-y-auto max-h-[240px] divide-y divide-slate-100">
            {options.map((opt, idx) => {
              const optId = String(opt._id || opt.id);
              const isSelected = optId === value;
              const isHighlighted = idx === highlightedIndex;
              const stock = opt.stock || 0;
              const isLowStock = stock <= (opt.min_stock || 5);
              const isOOS = stock === 0;

              return (
                <div
                  key={optId}
                  onClick={() => {
                    onChange(optId, opt);
                    setIsOpen(false);
                  }}
                  className={`p-3 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                    isHighlighted ? 'bg-slate-100' : isSelected ? 'bg-red-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 pr-3 flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-xs">{opt.product?.name || opt.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold">
                        SKU: {opt.sku || '—'}
                      </span>
                      {opt.category_name && (
                        <span className="text-slate-500">
                          📁 {opt.category_name}
                        </span>
                      )}
                      {opt.supplier_name && (
                        <span className="text-slate-500 truncate max-w-[120px]">
                          🏢 {opt.supplier_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        isOOS
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : isLowStock
                          ? 'bg-orange-50 text-orange-700 border border-orange-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {isOOS ? t('common.outOfStock', 'Hết hàng') : `${t('common.stock', 'Tồn')}: ${stock}`}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                {t('importOrders.loadingProducts', 'Đang tải...')}
              </div>
            )}

            {!loading && options.length === 0 && (
              <div className="p-4 text-center text-slate-400">
                {t('importOrders.noProductsFound', 'Không tìm thấy sản phẩm')}
              </div>
            )}

            {hasMore && !loading && (
              <button
                type="button"
                onClick={loadMore}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition-colors border-t border-slate-100 cursor-pointer"
              >
                {t('common.loadMore', 'Tải thêm sản phẩm...')}
              </button>
            )}
          </div>

          {/* Inline Action Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onInlineCreate();
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              {t('importOrders.createNew', '+ Tạo sản phẩm nhập mới')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
const AdminImportOrders: React.FC = () => {
  const { t } = useTranslation();
  const { adminBranchId } = useAppSelector((s) => s.adminAuth);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Searchable combobox pre-fetched dictionary
  const [fetchedProducts, setFetchedProducts] = useState<Record<string, any>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  /* Create modal */
  const [createOpen, setCreateOpen] = useState(false);
  const [createBranchId, setCreateBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<any[]>([{ branch_product_id: '', quantity_ordered: 1, unit_cost: 0 }]);

  /* Inline Product Creation */
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);

  /* Detail drawer */
  const [detailOrder, setDetailOrder] = useState<any>(null);

  /* Confirm status change */
  const [statusAction, setStatusAction] = useState<{ id: string; status: string; label: string } | null>(null);

  const currentBranchId = adminBranchId === 'ALL' ? '' : adminBranchId;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, supplierRes, branchRes] = await Promise.all([
        enterpriseService.getImportOrders({ branch_id: currentBranchId || undefined, status: statusFilter || undefined, limit: 500 }),
        enterpriseService.getSuppliers({ is_active: true, limit: 200 }),
        dataService.getBranches(),
      ]);
      setRows(ordersRes.data || []);
      setSuppliers(supplierRes.data || []);
      setBranches(Array.isArray(branchRes) ? branchRes : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset line items when branch changes to avoid cross-branch selections
  useEffect(() => {
    if (!createOpen) return;
    setLines([{ branch_product_id: '', quantity_ordered: 1, unit_cost: 0 }]);
  }, [createBranchId, createOpen]);

  const selectedBranchName = useMemo(() => {
    if (!createBranchId) return '';
    const matched = branches.find((b: any) => String(b._id || b.id) === String(createBranchId));
    return matched?.name || '';
  }, [branches, createBranchId]);

  /* Filtered + paginated */
  const filteredRows = useMemo(() => {
    let data = [...rows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) =>
        (r.order_code || '').toLowerCase().includes(q) ||
        (r.supplier_id?.name || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [rows, search]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const stats = useMemo(() => ({
    total: rows.length,
    ordered: rows.filter((r) => r.status === 'ordered').length,
    received: rows.filter((r) => r.status === 'received').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  }), [rows]);

  /* Line operations */
  const addLine = () => setLines((prev) => [...prev, { branch_product_id: '', quantity_ordered: 1, unit_cost: 0 }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: any) => {
    setLines((prev) => prev.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  };

  /* Create order */
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return toast.error(t('importOrders.errorSelectSupplier'));
    if (!createBranchId) return toast.error(t('importOrders.errorSelectBranch'));

    // Enforce row-level validations
    const seenBpIds = new Set<string>();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.branch_product_id) {
        return toast.error(`Dòng #${i + 1}: Vui lòng chọn sản phẩm.`);
      }
      if (seenBpIds.has(line.branch_product_id)) {
        return toast.error(`Dòng #${i + 1}: Sản phẩm bị trùng lặp trong đơn hàng.`);
      }
      seenBpIds.add(line.branch_product_id);

      if (Number(line.quantity_ordered || 0) <= 0) {
        return toast.error(`Dòng #${i + 1}: Số lượng phải lớn hơn 0.`);
      }
      if (Number(line.unit_cost || 0) < 0) {
        return toast.error(`Dòng #${i + 1}: Giá nhập không được âm.`);
      }
    }

    const items = lines
      .map((line) => {
        const bp = fetchedProducts[line.branch_product_id];
        return {
          product_id: bp?.product_id,
          product_name: bp?.product?.name || bp?.name,
          branch_product_id: line.branch_product_id,
          quantity_ordered: Number(line.quantity_ordered || 0),
          unit_cost: Number(line.unit_cost || 0),
        };
      })
      .filter((line) => line.product_id && line.branch_product_id && line.quantity_ordered > 0);

    if (items.length === 0) return toast.error(t('importOrders.errorInvalidItems'));

    try {
      setSubmitting(true);
      await enterpriseService.createImportOrder({
        supplier_id: supplierId,
        branch_id: createBranchId,
        expected_date: expectedDate || undefined,
        note,
        status: 'draft',
        items,
      });
      toast.success(t('importOrders.createOrderSuccess'));
      setCreateOpen(false);
      resetCreateForm();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t('importOrders.createOrderError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineSuccess = async (newBpId: string, price: number) => {
      // Refresh backend list
      await loadData();
      
      // Fetch details of this new BP to add it to fetchedProducts dictionary
      try {
        const bpDetail = await dataService.getBranchProduct(newBpId);
        if (bpDetail) {
          setFetchedProducts(prev => ({ ...prev, [String(newBpId)]: bpDetail }));
        }
      } catch (e) {
        console.error('Failed to pre-fetch new inline branch product details', e);
      }
      
      // Auto-assign newly created product to the line that triggered the modal
      if (newBpId) {
        setLines((prev) => {
          if (activeLineIdx !== null && activeLineIdx >= 0 && activeLineIdx < prev.length) {
            return prev.map((l, i) => i === activeLineIdx ? { ...l, branch_product_id: String(newBpId), unit_cost: price || 0 } : l);
          }
          const idx = prev.findIndex((l) => !l.branch_product_id);
          if (idx >= 0) {
            return prev.map((l, i) => i === idx ? { ...l, branch_product_id: String(newBpId), unit_cost: price || 0 } : l);
          }
          return [...prev, { branch_product_id: String(newBpId), quantity_ordered: 1, unit_cost: price || 0 }];
        });
      }
      setActiveLineIdx(null);
  };

  const resetCreateForm = () => {
    setCreateBranchId('');
    setSupplierId('');
    setExpectedDate('');
    setNote('');
    setLines([{ branch_product_id: '', quantity_ordered: 1, unit_cost: 0 }]);
  };

  /* Update status */
  const updateStatus = async () => {
    if (!statusAction) return;
    try {
      setLoading(true);
      await enterpriseService.updateImportOrderStatus(statusAction.id, statusAction.status);
      toast.success('Đã cập nhật trạng thái');
      setStatusAction(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  /* Export Action */
  const handleExportAction = async (type: 'pdf' | 'word', order: any) => {
    try {
      setLoading(true);
      if (type === 'pdf') {
        exportImportOrderPDF(order);
      } else {
        await exportImportOrderWord(order);
      }
      toast.success(`Đã xuất ${type.toUpperCase()}`);
    } catch (error) {
      toast.error(`Lỗi khi xuất file ${type.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  /* Total for a line */
  const lineTotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.quantity_ordered || 0) * Number(l.unit_cost || 0)), 0);
  }, [lines]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Đơn nhập hàng"
        subtitle="Quản lý đơn đặt hàng nhập kho từ nhà cung cấp"
        icon="inventory"
        actions={
          <button onClick={() => {
            setCreateOpen(true);
            if (currentBranchId && !createBranchId) {
              setCreateBranchId(currentBranchId);
            }
          }} className={cls.btnPrimary}>
            <span className="material-symbols-outlined text-sm">add</span>
            Tạo đơn nhập
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tổng đơn nhập" value={stats.total} icon="receipt_long" color="blue" />
        <StatCard label="Đang xử lý" value={stats.ordered} icon="pending" color="amber" />
        <StatCard label="Đã nhận" value={stats.received} icon="check_circle" color="emerald" />
        <StatCard label="Đã hủy" value={stats.cancelled} icon="cancel" color="red" />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo mã đơn, NCC..." />
        <FilterBar filters={[{
          label: 'Tất cả trạng thái', value: statusFilter,
          options: STATUS_OPTIONS,
          onChange: (v) => { setStatusFilter(v); setPage(1); },
        }]} />
        <button onClick={loadData} className={cls.btnSecondary}>
          <span className="material-symbols-outlined text-sm">refresh</span> Làm mới
        </button>
      </div>

      {/* Table */}
      <div className={`${cls.card} overflow-hidden relative`}>
        <LoadingOverlay visible={loading} />
        {!loading && filteredRows.length === 0 ? (
          <EmptyState
            icon="inventory"
            title="Chưa có đơn nhập hàng"
            description="Tạo đơn nhập hàng đầu tiên để bắt đầu"
            action={
              <button onClick={() => {
                setCreateOpen(true);
                if (currentBranchId && !createBranchId) setCreateBranchId(currentBranchId);
              }} className={cls.btnPrimary}>
                <span className="material-symbols-outlined text-sm">add</span> Tạo đơn nhập
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className={cls.thCell}>#</th>
                    <th className={cls.thCell}>Mã đơn</th>
                    <th className={cls.thCell}>Nhà cung cấp</th>
                    <th className={cls.thCell}>Chi nhánh</th>
                    <th className={cls.thCell}>Trạng thái</th>
                    <th className={cls.thCell}>Ngày dự kiến</th>
                    <th className={cls.thCell}>Tổng tiền</th>
                    <th className={cls.thCell}>Ngày tạo</th>
                    <th className={`${cls.thCell} text-right`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row, idx) => (
                    <tr key={String(row._id)} className="hover:bg-slate-50/60 transition-colors group">
                      <td className={`${cls.tdCell} text-slate-400`}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className={cls.tdCell}>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">{row.order_code || '—'}</span>
                      </td>
                      <td className={cls.tdCell}>
                        <span className="font-semibold text-slate-800">{row.supplier_id?.name || '—'}</span>
                      </td>
                      <td className={cls.tdCell}>{typeof row.branch_id === 'object' ? row.branch_id?.name : String(row.branch_id || '—')}</td>
                      <td className={cls.tdCell}>
                        <StatusBadge status={row.status || 'draft'} />
                      </td>
                      <td className={cls.tdCell}>
                        <span className="text-xs text-slate-500">
                          {row.expected_date ? new Date(row.expected_date).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </td>
                      <td className={cls.tdCell}>
                        <span className="font-semibold">{Number(row.total_amount || 0).toLocaleString('vi-VN')} đ</span>
                      </td>
                      <td className={cls.tdCell}>
                        <span className="text-xs text-slate-500">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </td>
                      <td className={`${cls.tdCell} text-right`}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDetailOrder(row)} className={cls.btnGhost} title="Xem chi tiết">
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          {row.status === 'draft' && (
                            <button
                              onClick={() => setStatusAction({ id: String(row._id), status: 'ordered', label: t('importOrders.confirmOrder', 'Xác nhận đặt hàng') })}
                              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              {t('importOrders.confirmBtn', 'Xác nhận đơn')}
                            </button>
                          )}
                          {row.status !== 'cancelled' && row.status !== 'received' && (
                            <button
                              onClick={() => setStatusAction({ id: String(row._id), status: 'cancelled', label: 'Hủy đơn nhập' })}
                              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControl page={page} pageSize={PAGE_SIZE} total={filteredRows.length} onChange={setPage} />
          </>
        )}
      </div>

      {/* ========== CREATE MODAL ========== */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo đơn nhập hàng mới"
        subtitle="Nhập thông tin đơn đặt hàng từ nhà cung cấp"
        icon="add_shopping_cart"
        size="xl"
        footer={
          <>
            <div className="flex-1 text-sm font-bold text-slate-600">
              Tổng: <span className="text-red-600">{lineTotal.toLocaleString('vi-VN')} đ</span>
            </div>
            <button type="button" onClick={() => setCreateOpen(false)} className={cls.btnSecondary}>Hủy</button>
            <button type="submit" form="import-order-form" disabled={submitting} className={cls.btnPrimary}>
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Tạo đơn nhập
            </button>
          </>
        }
      >
        <form id="import-order-form" onSubmit={save}>
          <FormSection title="Thông tin đơn hàng">
            <FormField label="Chi nhánh nhập hàng" required>
              <select className={cls.select + ' w-full'} value={createBranchId} onChange={(e) => setCreateBranchId(e.target.value)}>
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map((b: any) => <option key={String(b._id || b.id)} value={String(b._id || b.id)}>{b.name}</option>)}
              </select>
            </FormField>
            <FormField label="Nhà cung cấp" required>
              <select className={cls.select + ' w-full'} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((s: any) => <option key={String(s._id)} value={String(s._id)}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Ngày dự kiến nhận">
              <input type="date" className={cls.input} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </FormField>
            <FormField label="Ghi chú" colSpan={2}>
              <input className={cls.input} placeholder="Ghi chú cho đơn nhập..." value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
          </FormSection>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách sản phẩm</h4>
              <button type="button" onClick={addLine} className={cls.btnSecondary + ' !py-1.5 !px-3 !text-xs'}>
                <span className="material-symbols-outlined text-sm">add</span> Thêm dòng
              </button>
            </div>

            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <div className="col-span-6">Sản phẩm</div>
                <div className="col-span-2">Số lượng</div>
                <div className="col-span-3">Giá nhập (đ)</div>
                <div className="col-span-1"></div>
              </div>

              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/50 rounded-xl p-2">
                  <div className="col-span-6 flex items-center gap-1">
                    <ProductSearchSelector
                      branchId={createBranchId}
                      supplierId={supplierId}
                      value={line.branch_product_id}
                      onChange={(val, bp) => {
                        updateLine(idx, 'branch_product_id', val);
                        if (bp) {
                          updateLine(idx, 'unit_cost', bp.import_price || bp.price || 0);
                        }
                      }}
                      onInlineCreate={() => {
                        if (!createBranchId) {
                          toast.error(t('importOrders.errorSelectBranch'));
                          return;
                        }
                        setActiveLineIdx(idx);
                        setInlineCreateOpen(true);
                      }}
                      disabled={!createBranchId}
                      t={t}
                      setFetchedProducts={setFetchedProducts}
                      fetchedProducts={fetchedProducts}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min={1} value={line.quantity_ordered}
                      onChange={(e) => updateLine(idx, 'quantity_ordered', Number(e.target.value))}
                      className={cls.input + ' !py-2'}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min={0} value={line.unit_cost}
                      onChange={(e) => updateLine(idx, 'unit_cost', Number(e.target.value))}
                      className={cls.input + ' !py-2'}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(idx)} title="Xóa dòng" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* ========== DETAIL DRAWER ========== */}
      <DetailDrawer
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={`Đơn nhập ${detailOrder?.order_code || ''}`}
        subtitle={detailOrder?.supplier_id?.name || ''}
        icon="inventory"
        width="max-w-2xl"
      >
        {detailOrder && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={detailOrder.status || 'draft'} />
                <span className="text-xs text-slate-500">
                  {detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportAction('word', detailOrder)}
                  disabled={loading}
                  className="px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  {t('importOrders.exportWord', 'Xuất Word')}
                </button>
                <button
                  onClick={() => handleExportAction('pdf', detailOrder)}
                  disabled={loading}
                  className="px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  {t('importOrders.exportPdf', 'Xuất PDF')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Mã đơn" value={detailOrder.order_code} />
              <InfoRow label="Nhà cung cấp" value={detailOrder.supplier_id?.name} />
              <InfoRow label="Chi nhánh" value={typeof detailOrder.branch_id === 'object' ? detailOrder.branch_id?.name : String(detailOrder.branch_id || '—')} />
              <InfoRow label="Tổng tiền" value={`${Number(detailOrder.total_amount || 0).toLocaleString('vi-VN')} đ`} />
              <InfoRow label="Ngày dự kiến" value={detailOrder.expected_date ? new Date(detailOrder.expected_date).toLocaleDateString('vi-VN') : '—'} />
              <InfoRow label="Ghi chú" value={detailOrder.note} />
            </div>

            {/* Line items */}
            {detailOrder.items && detailOrder.items.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Chi tiết sản phẩm ({detailOrder.items.length})</h4>
                <div className="space-y-2">
                  {detailOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-50/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.product_name || item.product_id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          SL đặt: {item.quantity_ordered} | Đã nhận: {item.quantity_received || 0} | Giá: {Number(item.unit_cost || 0).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        {(Number(item.quantity_ordered || 0) * Number(item.unit_cost || 0)).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* ========== INLINE CREATE PRODUCT MODAL ========== */}
      <InlineCreateProductModal
        open={inlineCreateOpen}
        onClose={() => {
          setInlineCreateOpen(false);
          setActiveLineIdx(null);
        }}
        branchId={createBranchId}
        branchName={selectedBranchName}
        defaultSupplierId={supplierId}
        suppliers={suppliers}
        onSuccess={handleInlineSuccess}
      />

      {/* ========== CONFIRM STATUS CHANGE ========== */}
      <Modal
        open={!!statusAction}
        onClose={() => setStatusAction(null)}
        title={statusAction?.label || 'Xác nhận'}
        icon="warning"
        size="sm"
        footer={
          <>
            <button onClick={() => setStatusAction(null)} className={cls.btnSecondary}>Hủy</button>
            <button onClick={updateStatus} disabled={loading} className={statusAction?.status === 'cancelled' ? cls.btnDanger : cls.btnPrimary}>
              {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Xác nhận
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Bạn có chắc chắn muốn <strong>{statusAction?.label?.toLowerCase()}</strong> đơn nhập này?
        </p>
      </Modal>
    </div>
  );
};

export default AdminImportOrders;
