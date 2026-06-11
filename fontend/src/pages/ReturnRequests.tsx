import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dataService } from '../services/dataService';
import { toast } from '../components/Toast/toastEvent';

const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-700',
  picked_up: 'bg-indigo-100 text-indigo-700',
  refunded: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

const ReturnRequests: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const initialOrderId = useMemo(() => new URLSearchParams(location.search).get('orderId') || '', [location.search]);

  const [requests, setRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [reason, setReason] = useState('Hàng bị lỗi/không đúng mô tả');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const eligibleOrders = useMemo(() => {
    return orders.filter((order: any) => ['DELIVERED', 'COMPLETED', 'RETURNED'].includes(String(order.status || '').toUpperCase()));
  }, [orders]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestRows, orderRows] = await Promise.all([
        dataService.getReturnRequests(),
        dataService.getOrders(),
      ]);
      setRequests(Array.isArray(requestRows) ? requestRows : []);
      setOrders(Array.isArray(orderRows) ? orderRows : []);
    } catch {
      toast.error(t('returns.loadError'));
      setRequests([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialOrderId) setSelectedOrderId(initialOrderId);
  }, [initialOrderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.warning(t('returns.selectOrderWarning'));
      return;
    }

    setSubmitting(true);
    try {
      let evidence_images: string[] = [];
      if (evidenceFiles.length > 0) {
        evidence_images = await dataService.uploadEvidenceImages(evidenceFiles);
      }
      
      await dataService.createReturnRequest({
        order_id: selectedOrderId,
        reason,
        description,
        evidence_images,
      });
      toast.success(t('returns.submitSuccess'));
      setDescription('');
      setEvidenceFiles([]);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || t('returns.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm(t('returns.cancelConfirm'))) return;
    try {
      await dataService.cancelReturnRequest(requestId, 'Khách hàng hủy yêu cầu');
      toast.success(t('returns.cancelSuccess'));
      await loadData();
    } catch {
      toast.error(t('returns.cancelError'));
    }
  };

  if (loading) {
    return <div className="py-12 text-center font-bold">{t('returns.loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{t('returns.title')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('returns.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
        <h3 className="font-bold">{t('returns.createNew')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">{t('returns.orderLabel')}</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3"
            >
              <option value="">{t('returns.selectOrderPlaceholder')}</option>
              {eligibleOrders.map((order: any) => (
                <option key={String(order.id)} value={String(order.id)}>
                  #{order.id} - {Number(order.total_amount || 0).toLocaleString('vi-VN')}đ - {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">{t('returns.reasonLabel')}</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3"
            >
              <option value="Hàng bị lỗi/không đúng mô tả">{t('returns.reasons.faulty')}</option>
              <option value="Thiếu sản phẩm trong đơn">{t('returns.reasons.missing')}</option>
              <option value="Giao nhầm sản phẩm">{t('returns.reasons.wrong')}</option>
              <option value="Tôi đổi ý không muốn nhận hàng">{t('returns.reasons.changeMind')}</option>
              <option value="Lý do khác">{t('returns.reasons.other')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">{t('returns.descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3"
            placeholder={t('returns.descriptionPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">{t('returns.evidenceLabel')}</label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => {
              if (e.target.files) {
                setEvidenceFiles(Array.from(e.target.files).slice(0, 5));
              }
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          {evidenceFiles.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {evidenceFiles.map((file, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                  {file.type.startsWith('video/') ? (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white">play_circle</span>
                    </div>
                  ) : (
                    <img src={URL.createObjectURL(file)} alt="evidence" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? t('returns.submitting') : t('returns.submitBtn')}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('returns.yourRequests', { count: requests.length })}</h3>

        {requests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-10 text-center text-slate-500">
            {t('returns.emptyState')}
          </div>
        ) : (
          requests.map((request: any) => {
            const statusKey = String(request.status || 'pending').toLowerCase();
            const statusClass = STATUS_CLASSES[statusKey] || 'bg-slate-100 text-slate-700';
            return (
              <div key={String(request.id || request._id)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-bold">{t('adminReturns.title')} #{String(request.id || request._id).slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-slate-500">
                      {t('returns.orderLabel')} <Link className="text-primary hover:underline" to={`/account/orders/${request.order_id}`}>#{request.order_id}</Link>
                    </p>
                    <p className="text-sm text-slate-500">{t('adminReturns.detailCreatedAt')}: {request.created_at ? new Date(request.created_at).toLocaleString('vi-VN') : 'N/A'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}>{String(t(`returns.status.${statusKey}`, { defaultValue: request.status }))}</span>
                </div>

                <div className="mt-3 text-sm">
                  <p><span className="font-semibold">{t('returns.reasonLabel')}:</span> {request.reason}</p>
                  {request.description && <p className="mt-1 text-slate-600">{request.description}</p>}
                  {Number(request.amount_requested || 0) > 0 && (
                    <p className="mt-1 font-semibold text-primary">{t('adminReturns.table.amount')}: {Number(request.amount_requested).toLocaleString('vi-VN')}đ</p>
                  )}
                  {request.evidence_images && request.evidence_images.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {request.evidence_images.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative w-12 h-12 rounded-md overflow-hidden border border-slate-200 block">
                           {url.match(/\.(mp4|webm|ogg)$/i) ? (
                             <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                               <span className="material-symbols-outlined text-white text-xs">play_circle</span>
                             </div>
                           ) : (
                             <img src={url} alt="evidence" className="w-full h-full object-cover" />
                           )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {statusKey === 'pending' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleCancelRequest(String(request.id || request._id))}
                      className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold"
                    >
                      {t('returns.cancelBtn')}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReturnRequests;
