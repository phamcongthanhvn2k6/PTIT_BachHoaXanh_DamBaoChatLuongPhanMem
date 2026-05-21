import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '../../components/Toast/toastEvent';
import flashDealService from '../../services/flashDealService';
import { productService } from '../../services/productService';
import {
  PageHeader,
  SearchBar,
  FilterBar,
  StatusBadge,
  EmptyState,
  PaginationControl,
  Modal,
  DetailDrawer,
  FormSection,
  FormField,
  StatCard,
  ConfirmDialog,
  LoadingOverlay,
  cls,
} from '../components/AdminUI';

type FlashDealFormState = {
  title: string;
  description: string;
  type: 'percent' | 'fixed_amount' | 'flash_deal';
  discount_value: number;
  discount_percent: number;
  deal_price: number;
  original_price: number;
  branch_product_id: string;
  product_id: string;
  total_quantity: number;
  remaining_quantity: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: 'active' | 'draft' | 'expired';
};

const PAGE_SIZE = 10;

const defaultForm: FlashDealFormState = {
  title: '',
  description: '',
  type: 'percent',
  discount_value: 0,
  discount_percent: 0,
  deal_price: 0,
  original_price: 0,
  branch_product_id: '',
  product_id: '',
  total_quantity: 0,
  remaining_quantity: 0,
  start_date: '',
  end_date: '',
  is_active: true,
  status: 'active',
};

const toDateTimeInput = (value: any): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getComputedStatus = (deal: any): 'active' | 'draft' | 'expired' => {
  if (deal?.status === 'expired') return 'expired';
  if (deal?.status === 'draft') return 'draft';
  const endDate = deal?.end_date ? new Date(deal.end_date) : null;
  if (endDate && endDate.getTime() <= Date.now()) return 'expired';
  if (deal?.is_active === false) return 'draft';
  return 'active';
};

const formatDealValue = (deal: any): string => {
  if (deal?.type === 'percent' || Number(deal?.discount_percent || 0) > 0) {
    return `${Number(deal?.discount_percent || deal?.discount_value || 0)}%`;
  }
  return `${Number(deal?.discount_value || 0).toLocaleString('vi-VN')}đ`;
};

const formatQuantityLabel = (deal: any): string => {
  const total = Number(deal?.total_quantity ?? 0);
  const remain = Number(deal?.remaining_quantity ?? 0);
  if (total <= 0 && remain <= 0) return 'Không giới hạn';
  return `${remain}/${total}`;
};

const AdminFlashDeals: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [branchProducts, setBranchProducts] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [form, setForm] = useState<FlashDealFormState>(defaultForm);

  const [detailDrawer, setDetailDrawer] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const branchProductOptions = useMemo(() => {
    return (branchProducts || [])
      .map((bp: any) => {
        const bpId = String(bp?.id || bp?._id || '');
        const productName = bp?.product?.name || bp?.name || `Branch Product ${bpId}`;
        const sku = bp?.sku || bp?.product?.sku || '';
        const stock = Number(bp?.stock || 0);
        return {
          id: bpId,
          product_id: String(bp?.product_id || bp?.product?.id || bp?.product?._id || ''),
          label: `${productName}${sku ? ` (${sku})` : ''} • stock ${stock}`,
        };
      })
      .filter((option: any) => option.id);
  }, [branchProducts]);

  const stats = useMemo(() => {
    const active = deals.filter((deal) => getComputedStatus(deal) === 'active').length;
    const draft = deals.filter((deal) => getComputedStatus(deal) === 'draft').length;
    const expired = deals.filter((deal) => getComputedStatus(deal) === 'expired').length;
    return { total: deals.length, active, draft, expired };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    let data = [...deals];

    if (statusFilter) {
      data = data.filter((deal) => getComputedStatus(deal) === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      data = data.filter((deal) => {
        const row = `${deal?.title || ''} ${deal?.description || ''} ${deal?.branch_product_id || ''} ${deal?.product_id || ''}`;
        return row.toLowerCase().includes(q);
      });
    }

    return data;
  }, [deals, search, statusFilter]);

  const paginatedDeals = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredDeals.slice(start, start + PAGE_SIZE);
  }, [filteredDeals, page]);

  useEffect(() => {
    if (page > 1) {
      const totalPages = Math.max(1, Math.ceil(filteredDeals.length / PAGE_SIZE));
      if (page > totalPages) setPage(1);
    }
  }, [filteredDeals.length, page]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealRes, bpRes] = await Promise.all([
        flashDealService.getFlashDeals({ include_inactive: true }, { forceRefresh: true, debug: true }),
        productService.getBranchProducts(),
      ]);

      const dealList = Array.isArray(dealRes?.data) ? dealRes.data : [];
      console.info('[AdminFlashDeals][loadData]', {
        total: dealList.length,
        active: dealList.filter((deal: any) => getComputedStatus(deal) === 'active').length,
        draft: dealList.filter((deal: any) => getComputedStatus(deal) === 'draft').length,
        expired: dealList.filter((deal: any) => getComputedStatus(deal) === 'expired').length,
      });

      setDeals(dealList);
      setBranchProducts(Array.isArray(bpRes) ? bpRes : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được dữ liệu flash deal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId('');
    setForm(defaultForm);
    setModalOpen(true);
  };

  const onSelectBranchProduct = (branchProductId: string) => {
    const selected = branchProductOptions.find((option: any) => option.id === branchProductId);
    setForm((prev) => ({
      ...prev,
      branch_product_id: branchProductId,
      product_id: selected?.product_id || prev.product_id,
    }));
  };

  const openEdit = (deal: any) => {
    setEditingId(String(deal?.id || deal?._id || ''));
    setForm({
      title: String(deal?.title || ''),
      description: String(deal?.description || ''),
      type: (deal?.type || 'percent') as FlashDealFormState['type'],
      discount_value: Number(deal?.discount_value || 0),
      discount_percent: Number(deal?.discount_percent || 0),
      deal_price: Number(deal?.deal_price || 0),
      original_price: Number(deal?.original_price || 0),
      branch_product_id: String(deal?.branch_product_id || ''),
      product_id: String(deal?.product_id || ''),
      total_quantity: Number(deal?.total_quantity || 0),
      remaining_quantity: Number(deal?.remaining_quantity || 0),
      start_date: toDateTimeInput(deal?.start_date),
      end_date: toDateTimeInput(deal?.end_date),
      is_active: deal?.is_active !== false,
      status: getComputedStatus(deal),
    });
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('Tên flash deal là bắt buộc');
      return false;
    }
    if (!form.product_id && !form.branch_product_id) {
      toast.error('Phải chọn sản phẩm áp dụng');
      return false;
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Phải có thời gian bắt đầu và kết thúc');
      return false;
    }
    if (new Date(form.start_date).getTime() >= new Date(form.end_date).getTime()) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      return false;
    }
    if (Number(form.total_quantity) < 0 || Number(form.remaining_quantity) < 0) {
      toast.error('Số lượng không hợp lệ');
      return false;
    }
    if (Number(form.total_quantity) > 0 && Number(form.remaining_quantity) > Number(form.total_quantity)) {
      toast.error('Số lượng còn lại không được lớn hơn tổng số lượng');
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const normalizedTotal = Number(form.total_quantity || 0);
    const normalizedRemaining = Number(form.remaining_quantity || 0);
    const totalQuantity = normalizedTotal > 0 ? normalizedTotal : null;
    const remainingQuantity = normalizedRemaining > 0
      ? normalizedRemaining
      : (totalQuantity !== null ? totalQuantity : null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      discount_value: Number(form.discount_value || 0),
      discount_percent: Number(form.discount_percent || 0),
      deal_price: Number(form.deal_price || 0),
      original_price: Number(form.original_price || 0),
      branch_product_id: form.branch_product_id || null,
      product_id: form.product_id || null,
      total_quantity: totalQuantity,
      remaining_quantity: remainingQuantity,
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: Boolean(form.is_active),
      status: form.is_active ? 'active' : 'draft',
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await flashDealService.updateFlashDeal(editingId, payload);
        toast.success('Đã cập nhật flash deal');
      } else {
        await flashDealService.createFlashDeal(payload);
        toast.success('Đã tạo flash deal');
      }

      setModalOpen(false);
      setEditingId('');
      setForm(defaultForm);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu flash deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (deal: any) => {
    try {
      setLoading(true);
      const toggled = await flashDealService.toggleFlashDeal(String(deal?.id || deal?._id || ''));
      console.info('[AdminFlashDeals][toggle]', {
        id: String(deal?.id || deal?._id || ''),
        is_active: toggled?.is_active,
        status: toggled?.status,
        start_date: toggled?.start_date,
        end_date: toggled?.end_date,
        remaining_quantity: toggled?.remaining_quantity,
      });
      toast.success('Đã đổi trạng thái flash deal');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đổi trạng thái');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setSubmitting(true);
    try {
      await flashDealService.deleteFlashDeal(String(confirmDelete?.id || confirmDelete?._id || ''));
      toast.success('Đã xóa flash deal');
      setConfirmDelete(null);
      setDetailDrawer(null);
      if (editingId === String(confirmDelete?.id || confirmDelete?._id || '')) {
        setModalOpen(false);
        setEditingId('');
        setForm(defaultForm);
      }
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa flash deal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <PageHeader
        title="Flash Deal"
        subtitle="Quản lý deal theo thời gian, trạng thái và số lượng tồn"
        icon="bolt"
        actions={
          <>
            <button onClick={loadData} className={cls.btnSecondary}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới
            </button>
            <button onClick={openCreate} className={cls.btnPrimary}>
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm flash deal
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tổng deal" value={stats.total} icon="sell" color="blue" />
        <StatCard label="Đang hoạt động" value={stats.active} icon="check_circle" color="emerald" />
        <StatCard label="Đang tạm dừng" value={stats.draft} icon="pause_circle" color="amber" />
        <StatCard label="Đã hết hạn" value={stats.expired} icon="timer_off" color="red" />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên deal, branch product, product id..."
          onSearch={() => setPage(1)}
        />
        <FilterBar
          filters={[
            {
              label: 'Tất cả trạng thái',
              value: statusFilter,
              options: [
                { value: 'active', label: 'Hoạt động' },
                { value: 'draft', label: 'Tạm dừng' },
                { value: 'expired', label: 'Hết hạn' },
              ],
              onChange: (value) => {
                setStatusFilter(value);
                setPage(1);
              },
            },
          ]}
        />
      </div>

      <div className={`${cls.card} overflow-hidden relative`}>
        <LoadingOverlay visible={loading} />
        {!loading && filteredDeals.length === 0 ? (
          <EmptyState
            icon="bolt"
            title="Chưa có flash deal"
            description="Thêm flash deal đầu tiên để hiển thị trên trang người dùng"
            action={
              <button onClick={openCreate} className={cls.btnPrimary}>
                <span className="material-symbols-outlined text-sm">add</span>
                Tạo flash deal
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
                    <th className={cls.thCell}>Tieu de</th>
                    <th className={cls.thCell}>San pham</th>
                    <th className={cls.thCell}>Gia deal</th>
                    <th className={cls.thCell}>Giam gia</th>
                    <th className={cls.thCell}>Khoang thoi gian</th>
                    <th className={cls.thCell}>So luong</th>
                    <th className={cls.thCell}>Trang thai</th>
                    <th className={`${cls.thCell} text-right`}>Thao tac</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDeals.map((deal: any, idx: number) => {
                    const id = String(deal?.id || deal?._id || `row-${idx}`);
                    const status = getComputedStatus(deal);
                    return (
                      <tr key={id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className={`${cls.tdCell} text-slate-400`}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className={cls.tdCell}>
                          <button onClick={() => setDetailDrawer(deal)} className="text-left font-semibold text-slate-900 hover:text-red-600 transition-colors">
                            {deal?.title || 'Flash deal'}
                          </button>
                          <div className="text-xs text-slate-400 mt-1 line-clamp-1">{deal?.description || 'Không có mô tả'}</div>
                        </td>
                        <td className={cls.tdCell}>
                          <div className="text-xs text-slate-600">BP: {String(deal?.branch_product_id || '--')}</div>
                          <div className="text-xs text-slate-400">P: {String(deal?.product_id || '--')}</div>
                        </td>
                        <td className={cls.tdCell}>
                          <div className="font-bold text-red-600">{Number(deal?.deal_price || 0).toLocaleString('vi-VN')}đ</div>
                          <div className="text-xs text-slate-400 line-through">{Number(deal?.original_price || 0).toLocaleString('vi-VN')}đ</div>
                        </td>
                        <td className={cls.tdCell}>{formatDealValue(deal)}</td>
                        <td className={cls.tdCell}>
                          <div className="text-xs text-slate-600">{deal?.start_date ? new Date(deal.start_date).toLocaleString('vi-VN') : '--'}</div>
                          <div className="text-xs text-slate-400">{deal?.end_date ? new Date(deal.end_date).toLocaleString('vi-VN') : '--'}</div>
                        </td>
                        <td className={cls.tdCell}>{formatQuantityLabel(deal)}</td>
                        <td className={cls.tdCell}>
                          <StatusBadge status={status} label={status} />
                        </td>
                        <td className={`${cls.tdCell} text-right`}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDetailDrawer(deal)} className={cls.btnGhost} title="Xem chi tiết">
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                            <button onClick={() => openEdit(deal)} className={cls.btnGhost} title="Sửa">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => handleToggle(deal)} className={cls.btnGhost} title="Bật/Tắt">
                              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                            </button>
                            <button onClick={() => setConfirmDelete(deal)} className={cls.btnGhost} title="Xóa">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControl page={page} pageSize={PAGE_SIZE} total={filteredDeals.length} onChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Cập nhật flash deal' : 'Tạo flash deal'}
        subtitle="0/0 cho tổng số lượng và số lượng còn lại sẽ được xem là không giới hạn"
        icon={editingId ? 'edit' : 'add'}
        size="xl"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className={cls.btnSecondary}>Hủy</button>
            <button type="submit" form="flash-deal-form" disabled={submitting} className={cls.btnPrimary}>
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {editingId ? 'Lưu thay đổi' : 'Tạo deal'}
            </button>
          </>
        }
      >
        <form id="flash-deal-form" onSubmit={submit}>
          <FormSection title="Thông tin cơ bản">
            <FormField label="Tên flash deal" required>
              <input
                className={cls.input}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="VD: Flash Deal 12h"
              />
            </FormField>



            <FormField label="Mô tả" colSpan={2}>
              <textarea
                className={`${cls.input} resize-none`}
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Mô tả ngắn về deal"
              />
            </FormField>

            <FormField label="Loại deal">
              <select
                className={`${cls.select} w-full`}
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FlashDealFormState['type'] }))}
              >
                <option value="percent">Phần trăm</option>
                <option value="fixed_amount">Giảm tiền</option>
                <option value="flash_deal">Flash deal</option>
              </select>
            </FormField>

            <FormField label="Đang kích hoạt">
              <select
                className={`${cls.select} w-full`}
                value={form.is_active ? '1' : '0'}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.value === '1' }))}
              >
                <option value="1">Hoạt động</option>
                <option value="0">Tạm dừng</option>
              </select>
            </FormField>
          </FormSection>

          <FormSection title="Sản phẩm áp dụng">
            <FormField label="Branch product" required colSpan={2}>
              <select
                className={`${cls.select} w-full`}
                value={form.branch_product_id}
                onChange={(event) => onSelectBranchProduct(event.target.value)}
              >
                <option value="">Chọn branch product</option>
                {branchProductOptions.map((option: any) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="product_id (tự động điền khi chọn BP)">
              <input
                className={cls.input}
                value={form.product_id}
                onChange={(event) => setForm((prev) => ({ ...prev, product_id: event.target.value }))}
                placeholder="product_id"
              />
            </FormField>
          </FormSection>

          <FormSection title="Giá và ưu đãi">
            <FormField label="discount_value">
              <input
                type="number"
                className={cls.input}
                min={0}
                value={form.discount_value}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_value: Number(event.target.value || 0) }))}
              />
            </FormField>

            <FormField label="discount_percent">
              <input
                type="number"
                className={cls.input}
                min={0}
                value={form.discount_percent}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_percent: Number(event.target.value || 0) }))}
              />
            </FormField>

            <FormField label="Giá gốc">
              <input
                type="number"
                className={cls.input}
                min={0}
                value={form.original_price}
                onChange={(event) => setForm((prev) => ({ ...prev, original_price: Number(event.target.value || 0) }))}
              />
            </FormField>

            <FormField label="Giá deal">
              <input
                type="number"
                className={cls.input}
                min={0}
                value={form.deal_price}
                onChange={(event) => setForm((prev) => ({ ...prev, deal_price: Number(event.target.value || 0) }))}
              />
            </FormField>
          </FormSection>

          <FormSection title="Số lượng và thời gian">
            <FormField label="Tổng số lượng">
              <input
                type="number"
                className={cls.input}
                min={0}
                value={form.total_quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, total_quantity: Number(event.target.value || 0) }))}
              />
            </FormField>

            <FormField label="Số lượng còn lại">
              <input
                type="number"
                className={cls.input}
                min={0}
                value={form.remaining_quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, remaining_quantity: Number(event.target.value || 0) }))}
              />
            </FormField>

            <FormField label="Bắt đầu" required>
              <input
                type="datetime-local"
                className={cls.input}
                value={form.start_date}
                onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
              />
            </FormField>

            <FormField label="Kết thúc" required>
              <input
                type="datetime-local"
                className={cls.input}
                value={form.end_date}
                onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))}
              />
            </FormField>
          </FormSection>
        </form>
      </Modal>

      <DetailDrawer
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        title={detailDrawer?.title || 'Chi tiết flash deal'}
        subtitle={String(detailDrawer?.id || detailDrawer?._id || '')}
        icon="bolt"
      >
        {detailDrawer && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <StatusBadge status={getComputedStatus(detailDrawer)} label={getComputedStatus(detailDrawer)} />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thông tin deal</h4>
              <div className="space-y-3">
                <InfoRow label="Tiêu đề" value={detailDrawer?.title} />
                <InfoRow label="Mô tả" value={detailDrawer?.description} />
                <InfoRow label="Loại" value={detailDrawer?.type} />
                <InfoRow label="Giảm giá" value={formatDealValue(detailDrawer)} />
                <InfoRow label="Giá deal" value={`${Number(detailDrawer?.deal_price || 0).toLocaleString('vi-VN')}đ`} />
                <InfoRow label="Giá gốc" value={`${Number(detailDrawer?.original_price || 0).toLocaleString('vi-VN')}đ`} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Phạm vi áp dụng</h4>
              <div className="space-y-3">
                <InfoRow label="branch_product_id" value={String(detailDrawer?.branch_product_id || '--')} />
                <InfoRow label="product_id" value={String(detailDrawer?.product_id || '--')} />
                <InfoRow label="Số lượng" value={formatQuantityLabel(detailDrawer)} />
                <InfoRow label="Bắt đầu" value={detailDrawer?.start_date ? new Date(detailDrawer.start_date).toLocaleString('vi-VN') : '--'} />
                <InfoRow label="Kết thúc" value={detailDrawer?.end_date ? new Date(detailDrawer.end_date).toLocaleString('vi-VN') : '--'} />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  openEdit(detailDrawer);
                  setDetailDrawer(null);
                }}
                className={`${cls.btnPrimary} flex-1 justify-center`}
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Chỉnh sửa
              </button>
              <button
                onClick={() => {
                  handleToggle(detailDrawer);
                  setDetailDrawer(null);
                }}
                className={`${cls.btnSecondary} flex-1 justify-center`}
              >
                <span className="material-symbols-outlined text-sm">power_settings_new</span>
                Bật/Tắt
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(detailDrawer);
                  setDetailDrawer(null);
                }}
                className={`${cls.btnDangerSoft} flex-1 justify-center`}
              >
                <span className="material-symbols-outlined text-sm">delete</span>Xóa</button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xóa flash deal"
        message={`Bạn có chắc chắn muốn xóa "${confirmDelete?.title || 'Flash deal'}"?`}
        confirmLabel="Xóa"
        danger
        loading={submitting}
      />
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex justify-between items-start py-2 border-b border-slate-50 gap-3">
    <span className="text-xs text-slate-500 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-800 text-right break-all">{value || '--'}</span>
  </div>
);

export default AdminFlashDeals;
