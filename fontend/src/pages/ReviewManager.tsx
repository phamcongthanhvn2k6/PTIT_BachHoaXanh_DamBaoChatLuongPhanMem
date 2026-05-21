import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { loadUserReviews } from '../slices/reviewSlice';
import { dataService } from '../services/dataService';
import { reviewService } from '../services/reviewService';
import { toast } from '../components/Toast/toastEvent';
import { resolveImageUrl, fallbackProductImage } from '../utils/imageUrl';

const ReviewManager: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  const { userReviews, status } = useAppSelector(state => state.review);

  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [editingReviewId, setEditingReviewId] = useState<string | number | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(loadUserReviews(undefined));
    }
  }, [dispatch, currentUser?.id]);

  const handleDelete = async (reviewId: string | number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá đánh giá này?")) return;
    try {
      await dataService.deleteReview(reviewId);
      toast.success("Đã xoá đánh giá");
      if (currentUser?.id) {
         dispatch(loadUserReviews(undefined));
      }
    } catch {
      toast.error("Lỗi khi xoá");
    }
  };

  const handleOpenEdit = (review: any) => {
    setEditingReviewId(review.id);
    setEditComment(review.comment || '');
    setEditRating(Number(review.rating) || 5);
  };

  const handleSaveEdit = async () => {
    if (!editingReviewId || !currentUser) return;
    if (!editComment.trim()) {
      toast.error('Nội dung đánh giá không được để trống');
      return;
    }

    try {
      setIsSavingEdit(true);
      await reviewService.update(editingReviewId, {
        comment: editComment.trim(),
        rating: editRating
      });
      toast.success('Đã cập nhật đánh giá');
      setEditingReviewId(null);
      dispatch(loadUserReviews(undefined));
    } catch {
      toast.error('Lỗi khi cập nhật đánh giá');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleReply = async (reviewId: string | number) => {
    const text = window.prompt("Nhập nội dung phản hồi:");
    if (!text || !currentUser) return;
    try {
      await dataService.replyToReview(reviewId, {
        text
      });
      toast.success("Đã thêm phản hồi");
      dispatch(loadUserReviews(undefined));
    } catch {
      toast.error("Lỗi khi phản hồi");
    }
  };

  if (status === 'loading') {
    return <div className="text-center py-20"><span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span><p>{t('reviews.loading')}</p></div>;
  }

  const averageRating = userReviews.length > 0 
     ? (userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1)
     : '0.0';

  return (
    <main className="max-w-5xl mx-auto px-0 py-4 w-full">
        {/* Dashboard Header & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-primary/5 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Chào mừng trở lại, {currentUser?.full_name || currentUser?.username}!</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Bạn đã giúp cộng đồng đưa ra quyết định mua sắm tốt hơn.
              </p>
            </div>
            <div className="mt-6 flex gap-8">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{userReviews.length}</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{t('reviews.totalReviews')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{userReviews.reduce((sum, r) => sum + (r.likes || 0), 0)}</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{t('reviews.likes')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{averageRating}</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{t('reviews.avgScore')}</span>
              </div>
            </div>
          </div>

          <div className="bg-primary p-6 rounded-xl shadow-lg text-white flex flex-col justify-center items-center text-center">
            <span className="material-symbols-outlined text-4xl mb-2">military_tech</span>
            <h3 className="font-bold text-lg">Elite Reviewer</h3>
            <p className="text-white/80 text-sm mt-1">
              Top đóng góp nổi bật
            </p>
            <div className="w-full bg-white/20 h-2 rounded-full mt-4">
              <div className="bg-white h-full rounded-full" style={{ width: '85%' }}></div>
            </div>
            <span className="text-xs mt-2 font-medium">Còn 150 điểm để đạt huy hiệu tiếp theo</span>
          </div>
        </div>

        {/* Tab System */}
        <div className="flex border-b border-primary/10 mb-6 gap-8">
          <button 
             onClick={() => setFilter('all')}
             className={`pb-4 text-sm font-bold border-b-2 transition-all ${filter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            Đánh giá của tôi ({userReviews.length})
          </button>
          <button 
             onClick={() => setFilter('pending')}
             className={`pb-4 text-sm font-medium transition-all flex items-center gap-2 border-b-2 ${filter === 'pending' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            Đánh giá đang chờ
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">0</span>
          </button>
        </div>

        {/* Review List */}
        <div className="space-y-4">
          {filter === 'pending' ? (
             <div className="p-8 text-center text-slate-500">
                Không có đánh giá nào đang chờ.
             </div>
          ) : userReviews.length === 0 ? (
             <div className="p-8 text-center text-slate-500">
                Bạn chưa viết đánh giá nào.
             </div>
          ) : userReviews.map(review => (
            <div key={review.id} className="bg-white dark:bg-slate-900 rounded-xl border border-primary/5 shadow-sm overflow-hidden flex flex-col group p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-32 h-32 sm:h-auto overflow-hidden relative rounded-lg shrink-0">
                  {(() => {
                    const imageSrc = resolveImageUrl((review as any).product_image || (review as any).images?.[0] || '');
                    return (
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={imageSrc || fallbackProductImage}
                        alt={(review as any).product_name || 'Product'}
                      />
                    );
                  })()}
                  {review.status === 'VERIFIED' && (
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-slate-800 shadow-sm uppercase tracking-tighter">{t('reviews.verified')}</div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          {(review as any).product_name || `Sản phẩm #${review.product_id}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex text-amber-400">
                            {[1,2,3,4,5].map(star => (
                               <span key={star} className={`material-symbols-outlined text-sm ${star <= review.rating ? 'fill-1' : ''}`}>star</span>
                            ))}
                          </div>
                          <span className="text-xs text-slate-400 font-medium">Đánh giá ngày {new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleOpenEdit(review)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all" title="Chỉnh sửa đánh giá">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button onClick={() => handleDelete(review.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Xóa">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-sm italic mt-2">
                       "{review.comment}"
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-primary/5 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-semibold">{t('reviews.yourScore')}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold">{review.rating}</span>
                          <span className="material-symbols-outlined text-xs text-amber-400 fill-1">star</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleReply(review.id)} className="text-primary text-xs font-bold hover:underline">{t('reviews.feedback')}</button>
                  </div>
                </div>
              </div>

              {/* Nested Replies */}
              {review.replies && review.replies.length > 0 && (
                <div className="mt-4 pl-4 sm:pl-36 space-y-3">
                   {review.replies.map((reply: any) => (
                      <div key={reply.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-3">
                         <div className="size-8 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-sm">support_agent</span>
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs font-bold">{reply.user_id === currentUser?.id ? (currentUser?.full_name || currentUser?.username) : 'Người bán'}</span>
                               <span className="text-[10px] text-slate-400">{new Date(reply.created_at).toLocaleString('vi-VN')}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{reply.text}</p>
                         </div>
                      </div>
                   ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {editingReviewId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
              <h3 className="text-lg font-bold mb-4">{t('reviews.editReview')}</h3>

              <label className="block text-sm font-medium mb-2">{t('reviews.reviewScore')}</label>
              <select
                value={editRating}
                onChange={(e) => setEditRating(Number(e.target.value))}
                className="w-full mb-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <option value={5}>5 sao</option>
                <option value={4}>4 sao</option>
                <option value={3}>3 sao</option>
                <option value={2}>2 sao</option>
                <option value={1}>1 sao</option>
              </select>

              <label className="block text-sm font-medium mb-2">{t('reviews.reviewContent')}</label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mb-5"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReviewId(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  disabled={isSavingEdit}
                >{t('common.cancel')}</button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-60"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
};

export default ReviewManager;