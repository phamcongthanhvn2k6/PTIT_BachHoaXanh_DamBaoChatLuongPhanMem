import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { reviewService } from '../../services/reviewService';
import { toast } from '../../components/Toast/toastEvent';
import { 
  PageHeader, SearchBar, FilterBar, StatusBadge, EmptyState, 
  LoadingOverlay, PaginationControl, Modal, DetailDrawer, 
  FormSection, FormField, StatCard, cls, AdminErrorBoundary 
} from '../components/AdminUI';
import { format } from 'date-fns';
import UserAvatar from '../../components/UserAvatar/UserAvatar';

const AdminReviewsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // Query state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  // Detail & Modals
  const [detailReview, setDetailReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [statusChangeModal, setStatusChangeModal] = useState<{ id: string, status: string, label: string } | null>(null);

  const getSentimentBadge = (sentiment: string, score?: number) => {
    const pct = score ? ` (${Math.round(score * 100)}%)` : '';
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1">
            <span className="material-symbols-outlined text-[11px] font-bold">sentiment_very_satisfied</span>
            Tích cực{pct}
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-50 text-slate-600 border border-slate-200 mt-1">
            <span className="material-symbols-outlined text-[11px] font-bold">sentiment_neutral</span>
            Trung lập{pct}
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-750 border border-red-100 mt-1">
            <span className="material-symbols-outlined text-[11px] font-bold">sentiment_very_dissatisfied</span>
            Tiêu cực{pct}
          </span>
        );
      default:
        return null;
    }
  };

  const statusOptions = [
    { value: '', label: t('adminSupport.filterAll', 'Tất cả') },
    { value: 'published', label: t('adminReviews.status.published', 'Đã duyệt') },
    { value: 'pending', label: t('adminReviews.status.pending', 'Chờ duyệt') },
    { value: 'hidden', label: t('adminReviews.status.hidden', 'Đã ẩn') },
    { value: 'reported', label: t('adminReviews.status.reported', 'Bị báo cáo') }
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        reviewService.stats(),
        reviewService.listAll({ page, limit: 15, search, status: statusFilter })
      ]);
      setStats(statsRes || {});
      setReviews(listRes?.data || []);
      setTotal(listRes?.meta?.total || 0);
    } catch {
      toast.error(t('adminReviews.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, t]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeModal) return;
    try {
      await reviewService.updateStatus(statusChangeModal.id, { 
        status: statusChangeModal.status,
        moderation_reason: moderationReason
      });
      toast.success(t('adminReviews.updateStatusSuccess', { defaultValue: 'Cập nhật trạng thái thành công' }));
      setStatusChangeModal(null);
      setModerationReason('');
      if (detailReview) {
        setDetailReview((prev: any) => ({ ...prev, status: statusChangeModal.status, moderation_reason: moderationReason }));
      }
      loadData();
    } catch {
      toast.error(t('adminReviews.updateStatusError', 'Lỗi cập nhật trạng thái'));
    }
  };

  const submitReply = async () => {
    if (!detailReview || !replyText.trim()) return;
    try {
      const res = await reviewService.reply(detailReview._id || detailReview.id, { content: replyText });
      toast.success(t('adminReviews.replySuccess', 'Đã gửi phản hồi'));
      setDetailReview(res.data);
      setReplyText('');
      loadData();
    } catch {
      toast.error(t('adminReviews.replyError', 'Lỗi phản hồi'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': case 'active': return 'success';
      case 'pending': return 'warning';
      case 'hidden': return 'slate';
      case 'reported': case 'flagged': return 'danger';
      default: return 'primary';
    }
  };

  return (
    <AdminErrorBoundary>
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader 
            title={t('adminReviews.title')} 
            subtitle={t('adminReviews.subtitle')}
            breadcrumbs={['Quản trị', 'Đánh giá']}
          />

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title={t('adminReviews.stats.total')} value={stats.total || 0} icon="rate_review" color="primary" />
            <StatCard title={t('adminReviews.stats.avgRating', 'Điểm Trung Bình')} value={stats.avgRating || 0} icon="star" color="amber" />
            <StatCard title={t('adminReviews.stats.pending')} value={stats.pending || 0} icon="pending_actions" color="warning" />
            <StatCard title={t('adminReviews.stats.flagged', 'Đã Báo Cáo')} value={stats.flagged || 0} icon="flag" color="danger" />
            <StatCard title={t('adminReviews.stats.published')} value={stats.published || 0} icon="check_circle" color="success" />
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <SearchBar 
              value={search} 
              onChange={setSearch} 
              placeholder="Tìm theo sản phẩm, nội dung..." 
            />
            <FilterBar 
              filters={[
                {
                  label: t('adminReviews.filterStatus', 'Trạng thái'),
                  value: statusFilter,
                  options: statusOptions,
                  onChange: setStatusFilter
                }
              ]}
            />
          </div>

          {/* LIST */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 relative min-h-[400px]">
            {loading && <LoadingOverlay visible={loading} />}
            
            {reviews.length === 0 && !loading ? (
              <EmptyState icon="reviews" title={t('adminReviews.emptyTitle', 'Chưa có đánh giá nào')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Sản Phẩm / Khách</th>
                      <th className="px-6 py-4">Đánh Giá</th>
                      <th className="px-6 py-4">Trạng Thái</th>
                      <th className="px-6 py-4">Thời Gian</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                     {reviews.map(r => (
                       <tr key={r._id || r.id} className="hover:bg-slate-50/50 transition">
                         <td className="px-6 py-4 max-w-[200px]">
                            <div className="font-bold text-slate-800 truncate">{r.product_name || `SP #${r.product_id}`}</div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">{r.user_name || r.user_id}</div>
                         </td>
                          <td className="px-6 py-4 max-w-[250px] truncate">
                             <div className="flex items-center gap-1.5 flex-wrap mb-1">
                               <div className="flex text-amber-400">
                                 {Array.from({length: 5}).map((_, i) => (
                                   <span 
                                     key={i} 
                                     className="material-symbols-outlined text-[14px]"
                                     style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}
                                   >
                                     star
                                   </span>
                                 ))}
                               </div>
                               {r.ai_sentiment && getSentimentBadge(r.ai_sentiment, r.ai_sentiment_score)}
                               {r.ai_is_flagged && (
                                 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse" title={r.ai_flag_reason}>
                                   <span className="material-symbols-outlined text-[11px] font-bold">warning</span>
                                   AI Flagged
                                 </span>
                               )}
                             </div>
                             <div className="truncate text-slate-600 font-semibold text-xs" title={r.content}>{r.content}</div>
                          </td>
                         <td className="px-6 py-4">
                            <StatusBadge status={getStatusColor(r.status)} label={t(`adminReviews.status.${r.status}`, r.status) as string} />
                            {r.reported_count > 0 && <span className="ml-2 text-xs text-red-500 font-bold">({r.reported_count} reports)</span>}
                         </td>
                         <td className="px-6 py-4 text-slate-500 font-medium">
                            {format(new Date(r.created_at || new Date()), 'dd/MM/yyyy HH:mm')}
                         </td>
                         <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => setDetailReview(r)} 
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-primary font-bold rounded-lg transition text-xs"
                            >
                              Chi tiết
                            </button>
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationControl page={page} total={total} pageSize={15} onChange={setPage} />
        </div>

        {/* DETAIL DRAWER */}
        {detailReview && (
          <DetailDrawer
            open={!!detailReview}
            onClose={() => setDetailReview(null)}
            title={t('adminReviews.detailTitle')}
            subtitle={detailReview.product_name || `SP #${detailReview.product_id}`}
            width="max-w-2xl"
            footer={
              <div className="flex items-center justify-between w-full">
                {/* Left side: Delete action */}
                <button 
                  onClick={() => setStatusChangeModal({ id: detailReview._id || detailReview.id, status: 'deleted', label: t('adminReviews.deleteReview') })} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-xl transition text-xs border border-red-200"
                >
                  <span className="material-symbols-outlined text-base">delete</span> 
                  {t('adminReviews.deleteReview')}
                </button>

                {/* Right side: Approve, Hide, Close */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailReview(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs"
                  >
                    Đóng
                  </button>
                  {detailReview.status !== 'published' && (
                    <button 
                      onClick={() => setStatusChangeModal({ id: detailReview._id || detailReview.id, status: 'published', label: t('adminReviews.approveReview') })} 
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/10 transition text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span> 
                      {t('adminReviews.approveReview')}
                    </button>
                  )}
                  {detailReview.status !== 'hidden' && (
                    <button 
                      onClick={() => setStatusChangeModal({ id: detailReview._id || detailReview.id, status: 'hidden', label: t('adminReviews.hideReview') })} 
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl shadow-md transition text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">visibility_off</span> 
                      {t('adminReviews.hideReview')}
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Context Block: User Profile & review summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Profile Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex gap-3 items-center">
                  <UserAvatar
                    src={detailReview.user_avatar}
                    name={detailReview.user_name || 'Customer'}
                    size={48}
                    userId={detailReview.user_id}
                    className="rounded-full border border-slate-200 shrink-0 shadow-xs"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminReviews.customerInfo')}</div>
                    <div className="text-sm font-extrabold text-slate-800 truncate">{detailReview.user_name || detailReview.user_id}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {String(detailReview.user_id).slice(-8)}</div>
                  </div>
                </div>

                {/* Review Meta Info Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-center space-y-1.5">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminReviews.ratingLabel')}</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                     <div className="flex text-amber-400">
                       {Array.from({length: 5}).map((_, i) => (
                         <span 
                           key={i} 
                           className="material-symbols-outlined text-base"
                           style={{ fontVariationSettings: i < detailReview.rating ? "'FILL' 1" : "'FILL' 0" }}
                         >
                           star
                         </span>
                       ))}
                     </div>
                    <StatusBadge status={getStatusColor(detailReview.status)} label={t(`adminReviews.status.${detailReview.status}`, detailReview.status) as string} />
                  </div>
                  {detailReview.created_at && (
                    <div className="text-[10px] text-slate-400 font-semibold">
                      Submitted: {format(new Date(detailReview.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  )}
                  {detailReview.is_verified_buyer !== undefined && (
                    <div className="text-[10px] font-bold mt-0.5 text-blue-600">
                      {detailReview.is_verified_buyer ? t('adminReviews.verifiedBuyer') : t('adminReviews.unverifiedBuyer')}
                    </div>
                  )}
                </div>
              </div>

              {/* Review Content Card */}
              <div className="p-5 bg-white border border-slate-250/50 rounded-2xl shadow-2xs space-y-2">
                {detailReview.title && <h4 className="text-sm font-black text-slate-800">"{detailReview.title}"</h4>}
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('adminReviews.reviewContent')}</div>
                <div className="p-3 bg-slate-50 rounded-xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed border border-slate-100 font-semibold">
                  {detailReview.content}
                </div>
                
                {detailReview.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {detailReview.images.map((img: string, i: number) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                        <img src={img} alt="review attachment" className="w-16 h-16 object-cover rounded-xl border border-slate-200 hover:scale-105 transition" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Analysis Card */}
              {(detailReview.ai_sentiment || detailReview.ai_is_flagged) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phân tích từ trợ lý AI</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailReview.ai_sentiment && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase ${
                        detailReview.ai_sentiment === 'positive' ? 'bg-emerald-105/10 text-emerald-600 border border-emerald-200/50' :
                        detailReview.ai_sentiment === 'negative' ? 'bg-red-105/10 text-red-600 border border-red-200/50' :
                        'bg-slate-105/10 text-slate-600 border border-slate-200/50'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {detailReview.ai_sentiment === 'positive' ? 'sentiment_very_satisfied' :
                           detailReview.ai_sentiment === 'negative' ? 'sentiment_very_dissatisfied' : 'sentiment_neutral'}
                        </span>
                        Cảm xúc: {detailReview.ai_sentiment === 'positive' ? 'Tích cực' : detailReview.ai_sentiment === 'negative' ? 'Tiêu cực' : 'Trung lập'}
                        {detailReview.ai_sentiment_score ? ` (${Math.round(detailReview.ai_sentiment_score * 100)}%)` : ''}
                      </span>
                    )}
                    {detailReview.ai_is_flagged && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase bg-red-600 text-white animate-pulse">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        AI Cảnh báo: Vi phạm kiểm duyệt
                      </span>
                    )}
                  </div>
                  {detailReview.ai_is_flagged && detailReview.ai_flag_reason && (
                    <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl p-2.5">
                      <b>Lý do gắn cờ:</b> {detailReview.ai_flag_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Store Response Section */}
              <FormSection title={t('adminReviews.storeReply')}>
                {detailReview.reply?.content ? (
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-3xs">
                    <div className="text-xs text-blue-600 font-bold mb-3 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">account_circle</span>
                      {detailReview.reply.admin_name || 'Admin'} • {detailReview.reply.replied_at ? format(new Date(detailReview.reply.replied_at), 'dd/MM/yyyy HH:mm') : ''}
                    </div>
                    <div className="text-slate-850 font-semibold text-sm leading-relaxed">{detailReview.reply.content}</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detailReview.ai_suggested_reply && (
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            Gợi ý phản hồi từ AI
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplyText(detailReview.ai_suggested_reply)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                          >
                            Áp dụng gợi ý
                          </button>
                        </div>
                        <p className="text-xs text-slate-650 italic font-semibold">"{detailReview.ai_suggested_reply}"</p>
                      </div>
                    )}
                    <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
                      <textarea 
                        className={cls.input + ' min-h-[100px] text-sm focus:ring-2 focus:ring-primary/20'} 
                        value={replyText} 
                        onChange={e => setReplyText(e.target.value)} 
                        placeholder={t('adminReviews.replyPlaceholder')}
                      />
                      <div className="flex justify-end">
                        <button onClick={submitReply} className={cls.btnPrimary + ' text-xs px-4 py-2'}>
                          {t('adminReviews.sendReply')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </FormSection>
            </div>
          </DetailDrawer>
        )}

        {/* STATUS CHANGE MODAL */}
        {statusChangeModal && (
          <Modal
            open={!!statusChangeModal}
            onClose={() => { setStatusChangeModal(null); setModerationReason(''); }}
            title={t('adminReviews.confirmTitle')}
            size="sm"
            footer={
              <div className="flex gap-2 justify-end w-full">
                <button onClick={() => { setStatusChangeModal(null); setModerationReason(''); }} className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs">
                  {t('adminProducts.modalDeleteCancel', 'Hủy')}
                </button>
                <button type="submit" form="change-status-form" className="py-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition text-xs shadow-md shadow-primary/10">
                  {t('adminProducts.confirmBtn', 'Xác nhận')}
                </button>
              </div>
            }
          >
            <form id="change-status-form" onSubmit={handleUpdateStatus} className="space-y-4">
              <p className="text-slate-605 text-sm font-medium">{t('adminReviews.confirmMsg')}</p>
              <FormField label="Lý do / Ghi chú (không bắt buộc)">
                 <textarea 
                   className={cls.input + ' text-xs focus:ring-2 focus:ring-primary/20'} 
                   value={moderationReason} 
                   onChange={e => setModerationReason(e.target.value)} 
                   placeholder="Nhập lý do kiểm duyệt nếu cần..."
                   rows={3}
                 />
              </FormField>
            </form>
          </Modal>
        )}

      </div>
    </AdminErrorBoundary>
  );
};

export default AdminReviewsManagement;
