import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import httpClient from '../../api/httpClient';
import { toast } from '../../components/Toast/toastEvent';
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

  return (
    <AdminErrorBoundary>
      <div className="p-8 bg-surface min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title={t('adminReturns.title')}
            subtitle={t('adminReturns.subtitle')}
            breadcrumbs={[t('adminReturns.breadcrumbAdmin'), t('adminReturns.breadcrumbReturns')]}
          />

          <div className="grid grid-cols-5 gap-4">
            <StatCard title={t('adminReturns.stats.total')} value={stats.total} icon="assignment_return" color="slate" />
            <StatCard title={t('adminReturns.stats.pending')} value={stats.pending} icon="hourglass_empty" color="warning" />
            <StatCard title={t('adminReturns.stats.approved')} value={stats.approved} icon="task_alt" color="primary" />
            <StatCard title={t('adminReturns.stats.refunded')} value={stats.refunded} icon="paid" color="success" />
            <StatCard title={t('adminReturns.stats.rejected')} value={stats.rejected} icon="block" color="danger" />
          </div>

          <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
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
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10">
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
                    <tr key={req.id || req._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-bold text-slate-800 mb-1">
                          #{String(req.id || req._id).slice(-8).toUpperCase()}
                        </div>
                        <StatusBadge status={statusColor(req.status)} label={statusLabel(req.status)} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        #{req.order_id}
                        <div className="text-[11px] text-slate-400">{t('adminReturns.userLabel')}: {req.user_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 truncate max-w-[240px]">{req.reason}</div>
                        {req.description && <div className="text-xs text-slate-500 line-clamp-2 mt-1">{req.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {Number(req.amount_requested || 0).toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openDetail(req)} className="text-primary font-bold hover:underline">
                          {t('adminReturns.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <PaginationControl page={page} total={filteredRequests.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>

        <DetailDrawer
          open={!!detailRequest}
          onClose={() => setDetailRequest(null)}
          title={detailRequest ? `${t('adminReturns.detailTitle')} #${String(detailRequest.id || detailRequest._id).slice(-8).toUpperCase()}` : t('adminReturns.detailTitle')}
          width="max-w-3xl"
        >
          {detailRequest && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={statusColor(detailRequest.status)} label={statusLabel(detailRequest.status)} />
                  <span className="text-xs text-slate-500">
                    {t('adminReturns.detailCreatedAt')}: {detailRequest.created_at ? new Date(detailRequest.created_at).toLocaleString('vi-VN') : 'N/A'}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {t('adminReturns.detailOrder')}: <span className="font-semibold">#{detailRequest.order_id}</span>
                </div>
                <div className="text-sm text-slate-600">
                  {t('adminReturns.userLabel')}: <span className="font-semibold">{detailRequest.user_id || 'N/A'}</span>
                </div>
              </div>

              <FormSection title={t('adminReturns.detailReason')}>
                <p className="text-sm text-slate-700 font-semibold">{detailRequest.reason}</p>
                {detailRequest.description && <p className="text-sm text-slate-500 mt-1">{detailRequest.description}</p>}
              </FormSection>

              {Array.isArray(detailRequest.evidence_images) && detailRequest.evidence_images.length > 0 && (
                <FormSection title={t('adminReturns.detailEvidence')}>
                  <div className="flex flex-wrap gap-3">
                    {detailRequest.evidence_images.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="evidence" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                      </a>
                    ))}
                  </div>
                </FormSection>
              )}

              {Array.isArray(detailRequest.items) && detailRequest.items.length > 0 && (
                <FormSection title={t('adminReturns.detailItems')}>
                  <div className="space-y-3">
                    {detailRequest.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-center bg-slate-50 rounded-xl p-3">
                        <img src={item.product_image || 'https://via.placeholder.com/80'} alt={item.product_name} className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{item.product_name}</div>
                          <div className="text-xs text-slate-500">{t('adminReturns.detailQuantity')}: {item.quantity}</div>
                          {item.reason_detail && <div className="text-xs text-slate-500">{item.reason_detail}</div>}
                        </div>
                        <div className="text-sm font-bold text-primary">{Number(item.price || 0).toLocaleString('vi-VN')}đ</div>
                      </div>
                    ))}
                  </div>
                </FormSection>
              )}

              <FormSection title={t('adminReturns.detailTimeline')}>
                {Array.isArray(detailRequest.timeline) && detailRequest.timeline.length > 0 ? (
                  <div className="space-y-3">
                    {detailRequest.timeline.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="mt-1 size-2 rounded-full bg-primary" />
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{statusLabel(step.status)}</div>
                          {step.note && <div className="text-xs text-slate-500 mt-0.5">{step.note}</div>}
                          <div className="text-[11px] text-slate-400 mt-1">
                            {step.timestamp ? new Date(step.timestamp).toLocaleString('vi-VN') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">{t('adminReturns.detailTimelineEmpty')}</div>
                )}
              </FormSection>

              <FormSection title={t('adminReturns.detailAdminNote')}>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className={cls.input + ' min-h-[90px]'}
                  placeholder={t('adminReturns.adminNotePlaceholder')}
                />
                <textarea
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                  className={cls.input + ' mt-3 min-h-[70px]'}
                  placeholder={t('adminReturns.timelineNotePlaceholder')}
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => updateStatus('pending')} className={cls.btnSecondary + ' !py-1 !text-xs'}>
                    {t('adminReturns.requestMoreInfo')}
                  </button>
                  <button onClick={() => updateStatus('approved')} className={cls.btnSecondary + ' !py-1 !text-xs'}>
                    {t('adminReturns.approve')}
                  </button>
                  <button onClick={() => updateStatus('rejected')} className={cls.btnSecondary + ' !py-1 !text-xs !text-red-600'}>
                    {t('adminReturns.reject')}
                  </button>
                  <button onClick={() => updateStatus('picked_up')} className={cls.btnSecondary + ' !py-1 !text-xs'}>
                    {t('adminReturns.markPickedUp')}
                  </button>
                  <button onClick={() => updateStatus('refunded')} className={cls.btnSecondary + ' !py-1 !text-xs !text-emerald-600'}>
                    {t('adminReturns.markRefunded')}
                  </button>
                  <button onClick={() => updateStatus('closed')} className={cls.btnSecondary + ' !py-1 !text-xs !text-slate-600'}>
                    {t('adminReturns.closeRequest')}
                  </button>
                </div>
              </FormSection>
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminErrorBoundary>
  );
};

export default AdminReturnRequests;
