import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import httpClient from '../../api/httpClient';
import { toast } from '../../components/Toast/toastEvent';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import {
  PageHeader,
  SearchBar,
  FilterBar,
  StatusBadge,
  EmptyState,
  LoadingOverlay,
  PaginationControl,
  DetailDrawer,
  FormSection,
  StatCard,
  cls,
  AdminErrorBoundary,
} from '../components/AdminUI';

const PAGE_SIZE = 15;

const AdminReturnRequests: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  // Query state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail drawer
  const [detailRequest, setDetailRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');
  const [timelineNote, setTimelineNote] = useState('');

  const statusOptions = useMemo(() => ([
    { value: '', label: t('adminReturns.filterAll') },
    { value: 'pending', label: t('adminReturns.status.pending') },
    { value: 'approved', label: t('adminReturns.status.approved') },
    { value: 'rejected', label: t('adminReturns.status.rejected') },
    { value: 'picked_up', label: t('adminReturns.status.picked_up') },
    { value: 'refunded', label: t('adminReturns.status.refunded') },
    { value: 'closed', label: t('adminReturns.status.closed') },
    { value: 'cancelled', label: t('adminReturns.status.cancelled') },
  ]), [t]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await httpClient.get('/return-requests', { params });
      const data = res?.data?.data || res?.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('adminReturns.loadError'));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when status filter changes
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return requests;
    return requests.filter((req) => {
      const hay = [
        req.id || req._id,
        req.order_id,
        req.user_id,
        req.reason,
        req.status,
      ]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase())
        .join(' ');
      return hay.includes(keyword);
    });
  }, [requests, search]);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pagedRequests = filteredRequests.slice(pageStart, pageStart + PAGE_SIZE);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const refunded = requests.filter((r) => r.status === 'refunded').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { total, pending, approved, refunded, rejected };
  }, [requests]);

  const statusLabel = (status: string) => {
    const key = String(status || 'pending').toLowerCase();
    return t(`adminReturns.status.${key}`, key);
  };

  const statusColor = (status: string) => {
    switch (String(status || '').toLowerCase()) {
      case 'approved':
        return 'primary';
      case 'rejected':
        return 'danger';
      case 'picked_up':
        return 'warning';
      case 'refunded':
        return 'success';
      case 'closed':
      case 'cancelled':
        return 'slate';
      default:
        return 'warning';
    }
  };

  const openDetail = async (req: any) => {
    const id = String(req.id || req._id);
    try {
      const res = await httpClient.get(`/return-requests/${id}`);
      const doc = res?.data?.data || res?.data || null;
      if (doc) {
        setDetailRequest(doc);
        setAdminNote(String(doc.admin_note || ''));
        setTimelineNote('');
      }
    } catch {
      toast.error(t('adminReturns.detailError'));
    }
  };

  const updateStatus = async (nextStatus: string) => {
    if (!detailRequest) return;
    const id = String(detailRequest.id || detailRequest._id);
    try {
      const res = await httpClient.put(`/return-requests/${id}/status`, {
        status: nextStatus,
        admin_note: adminNote,
        note: timelineNote,
      });
      const doc = res?.data?.data || res?.data || null;
      if (doc) setDetailRequest(doc);
      toast.success(t('adminReturns.updateSuccess'));
      setTimelineNote('');
      await loadData();
    } catch {
      toast.error(t('adminReturns.updateError'));
    }
  };

  const drawerFooter = useMemo(() => {
    if (!detailRequest) return null;
    const currentStatus = detailRequest.status;

    return (
      <div className="flex items-center justify-between w-full">
        {/* Left Side: Rejection or Clarification (only if pending) */}
        <div className="flex gap-1.5 flex-wrap">
          {currentStatus === 'pending' && (
            <>
              <button
                onClick={() => updateStatus('rejected')}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-200 transition text-xs"
              >
                {t('adminReturns.reject', 'Từ chối')}
              </button>
              <button
                onClick={() => updateStatus('pending')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
              >
                {t('adminReturns.requestMoreInfo', 'Cần thêm thông tin')}
              </button>
            </>
          )}
          {currentStatus !== 'closed' && currentStatus !== 'cancelled' && currentStatus !== 'pending' && (
            <button
              onClick={() => updateStatus('closed')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
            >
              {t('adminReturns.closeRequest', 'Đóng yêu cầu')}
            </button>
          )}
        </div>

        {/* Right Side: Primary Next Action & Cancel */}
        <div className="flex gap-2">
          <button
            onClick={() => setDetailRequest(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
          >
            Đóng
          </button>
          
          {currentStatus === 'pending' && (
            <button
              onClick={() => updateStatus('approved')}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-black rounded-xl shadow-md shadow-primary/10 transition text-xs"
            >
              {t('adminReturns.approve', 'Phê duyệt')}
            </button>
          )}
          {currentStatus === 'approved' && (
            <button
              onClick={() => updateStatus('picked_up')}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-black rounded-xl shadow-md shadow-primary/10 transition text-xs"
            >
              {t('adminReturns.markPickedUp', 'Đã lấy hàng')}
            </button>
          )}
          {currentStatus === 'picked_up' && (
            <button
              onClick={() => updateStatus('refunded')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/10 transition text-xs"
            >
              {t('adminReturns.markRefunded', 'Đã hoàn tiền')}
            </button>
          )}
          {currentStatus === 'refunded' && (
            <button
              onClick={() => updateStatus('closed')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl shadow-md transition text-xs"
            >
              {t('adminReturns.closeRequest', 'Hoàn tất')}
            </button>
          )}
        </div>
      </div>
    );
  }, [detailRequest, adminNote, timelineNote, t]);

  return (
    <AdminErrorBoundary>
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title={t('adminReturns.title')}
            subtitle={t('adminReturns.subtitle')}
            breadcrumbs={[t('adminReturns.breadcrumbAdmin'), t('adminReturns.breadcrumbReturns')]}
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title={t('adminReturns.stats.total')} value={stats.total} icon="assignment_return" color="slate" />
            <StatCard title={t('adminReturns.stats.pending')} value={stats.pending} icon="hourglass_empty" color="warning" />
            <StatCard title={t('adminReturns.stats.approved')} value={stats.approved} icon="task_alt" color="primary" />
            <StatCard title={t('adminReturns.stats.refunded')} value={stats.refunded} icon="paid" color="success" />
            <StatCard title={t('adminReturns.stats.rejected')} value={stats.rejected} icon="block" color="danger" />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <SearchBar value={search} onChange={setSearch} placeholder={t('adminReturns.searchPlaceholder')} />
            <FilterBar
              filters={[
                {
                  label: t('adminReturns.filterStatus'),
                  value: statusFilter,
                  options: statusOptions,
                  onChange: setStatusFilter,
                },
              ]}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 min-h-[400px] relative">
            {loading && <LoadingOverlay visible={loading} />}

            {pagedRequests.length === 0 && !loading ? (
              <EmptyState icon="assignment_return" title={t('adminReturns.emptyTitle')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">{t('adminReturns.table.request')}</th>
                      <th className="px-6 py-4">{t('adminReturns.table.order')}</th>
                      <th className="px-6 py-4">{t('adminReturns.table.reason')}</th>
                      <th className="px-6 py-4">{t('adminReturns.table.amount')}</th>
                      <th className="px-6 py-4 text-right">{t('adminReturns.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {pagedRequests.map((req) => (
                      <tr key={req.id || req._id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-bold text-slate-800 mb-1">
                            #{String(req.id || req._id).slice(-8).toUpperCase()}
                          </div>
                          <StatusBadge status={statusColor(req.status)} label={statusLabel(req.status)} />
                        </td>
                        <td className="px-6 py-4 text-slate-650">
                          <div className="font-bold text-slate-850">#{req.order_id}</div>
                          <div className="text-[11px] text-slate-400 font-semibold">{t('adminReturns.userLabel')}: {req.user_id || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 truncate max-w-[240px]">{req.reason}</div>
                          {req.description && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{req.description}</div>}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {Number(req.amount_requested || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openDetail(req)} 
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-primary font-bold rounded-lg transition text-xs"
                          >
                            {t('adminReturns.viewDetails')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <PaginationControl page={page} total={filteredRequests.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>

        {detailRequest && (
          <DetailDrawer
            open={!!detailRequest}
            onClose={() => setDetailRequest(null)}
            title={`${t('adminReturns.detailTitle')} #${String(detailRequest.id || detailRequest._id).slice(-8).toUpperCase()}`}
            subtitle={`${t('adminReturns.detailCreatedAt')}: ${detailRequest.created_at ? new Date(detailRequest.created_at).toLocaleString('vi-VN') : 'N/A'}`}
            width="max-w-2xl"
            footer={drawerFooter}
          >
            <div className="space-y-6">
              {/* Profile Card & Context info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Profile Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex gap-3 items-center">
                  <UserAvatar 
                    name={String(detailRequest.user_id || 'Customer')} 
                    userId={detailRequest.user_id} 
                    size={48} 
                    className="rounded-full border border-slate-200 shadow-xs" 
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminReturns.userLabel')}</div>
                    <div className="text-sm font-extrabold text-slate-800 truncate">{detailRequest.user_id || 'Unknown User'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Customer ID: {String(detailRequest.user_id).slice(-8)}</div>
                  </div>
                </div>

                {/* Return Meta Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-center space-y-1.5">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Return Info</div>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    <StatusBadge status={statusColor(detailRequest.status)} label={statusLabel(detailRequest.status)} />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-primary bg-primary/10 border border-primary/20">
                      Refund Amount: {Number(detailRequest.amount_requested || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    Order Ref: <span className="font-mono text-blue-600">#{detailRequest.order_id}</span>
                  </div>
                </div>
              </div>

              {/* Reason Form section */}
              <FormSection title={t('adminReturns.detailReason')}>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
                  <p className="text-slate-850 font-bold text-sm leading-relaxed">"{detailRequest.reason}"</p>
                  {detailRequest.description && (
                    <p className="text-xs text-slate-500 font-semibold italic whitespace-pre-wrap">{detailRequest.description}</p>
                  )}
                </div>
              </FormSection>

              {/* Evidence Images */}
              {Array.isArray(detailRequest.evidence_images) && detailRequest.evidence_images.length > 0 && (
                <FormSection title={t('adminReturns.detailEvidence')}>
                  <div className="flex flex-wrap gap-2.5 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                    {detailRequest.evidence_images.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="block relative hover:scale-105 transition">
                        <img src={url} alt="evidence" className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-2xs" />
                      </a>
                    ))}
                  </div>
                </FormSection>
              )}

              {/* Items returning */}
              {Array.isArray(detailRequest.items) && detailRequest.items.length > 0 && (
                <FormSection title={t('adminReturns.detailItems')}>
                  <div className="space-y-2.5">
                    {detailRequest.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-center bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs hover:shadow-xs transition">
                        <img src={item.product_image || 'https://via.placeholder.com/80'} alt={item.product_name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate">{item.product_name}</div>
                          <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                            {t('adminReturns.detailQuantity')}: {item.quantity}
                          </div>
                          {item.reason_detail && <div className="text-[10px] text-slate-400 font-medium italic truncate mt-0.5">Note: {item.reason_detail}</div>}
                        </div>
                        <div className="text-sm font-extrabold text-primary shrink-0">{Number(item.price || 0).toLocaleString('vi-VN')}đ</div>
                      </div>
                    ))}
                  </div>
                </FormSection>
              )}

              {/* Timeline status track */}
              <FormSection title={t('adminReturns.detailTimeline')}>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 max-h-[160px] overflow-y-auto">
                  {Array.isArray(detailRequest.timeline) && detailRequest.timeline.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {detailRequest.timeline.map((step: any, idx: number) => (
                        <div key={idx} className="flex gap-4 relative pl-5">
                          <span className="absolute left-1 top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-800 leading-none">{statusLabel(step.status)}</div>
                            {step.note && <div className="text-[11px] text-slate-500 font-medium mt-1 leading-normal italic">{step.note}</div>}
                            <div className="text-[9px] text-slate-400 font-semibold mt-1">
                              {step.timestamp ? new Date(step.timestamp).toLocaleString('vi-VN') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic font-semibold">{t('adminReturns.detailTimelineEmpty')}</div>
                  )}
                </div>
              </FormSection>

              {/* Admin note actions panel */}
              <FormSection title={t('adminReturns.detailAdminNote')}>
                <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Ghi chú nội bộ Admin</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className={cls.input + ' min-h-[80px] text-xs focus:ring-2 focus:ring-primary/20'}
                      placeholder={t('adminReturns.adminNotePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tin nhắn gửi khách (Cập nhật lịch trình)</label>
                    <textarea
                      value={timelineNote}
                      onChange={(e) => setTimelineNote(e.target.value)}
                      className={cls.input + ' min-h-[60px] text-xs focus:ring-2 focus:ring-primary/20'}
                      placeholder={t('adminReturns.timelineNotePlaceholder')}
                    />
                  </div>
                </div>
              </FormSection>
            </div>
          </DetailDrawer>
        )}
      </div>
    </AdminErrorBoundary>
  );
};

export default AdminReturnRequests;
