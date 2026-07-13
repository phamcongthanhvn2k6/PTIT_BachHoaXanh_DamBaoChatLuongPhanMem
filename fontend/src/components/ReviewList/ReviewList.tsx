import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchReviewsForProduct, addReview, replyToReview } from '../../slices/reviewSlice';
import ReviewCard from '../ReviewCard/ReviewCard';
import { toast } from '../Toast/toastEvent';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';

interface ReviewListProps {
  productId: number | string;
}

const ReviewList: React.FC<ReviewListProps> = ({ productId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const reviewsState = useAppSelector(state => state.review.data[String(productId)]);
  const status = useAppSelector(state => state.review.status);
  const { user, isAuthenticated } = useAppSelector(state => state.auth);

  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  useEffect(() => {
    dispatch(fetchReviewsForProduct(productId));
  }, [dispatch, productId]);

  const reviews = reviewsState || [];
  
  const avgRating = reviews.length > 0 
    ? Number((reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1))
    : 0;
  
  // Sort reviews: newest first
  const sortedReviews = [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);
  const paginatedReviews = sortedReviews.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

  const canReply = user?.role_id === 1 || user?.role_id === 2;

  const handleReplyReview = async (reviewId: string | number, text: string) => {
    try {
      await dispatch(replyToReview({ reviewId, payload: { text } })).unwrap();
      toast.success("Đã gửi phản hồi đánh giá");
    } catch {
      toast.error("Gửi phản hồi thất bại");
    }
  };

  const submitReview = async () => {
    if (isSubmitting) return;
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để viết đánh giá");
      localStorage.setItem('pending_review', newReview.comment);
      navigate('/login');
      return;
    }

    if (newReview.comment.trim().length < 2) {
      toast.warning("Vui lòng nhập đánh giá ít nhất 2 ký tự!");
      return;
    }

    try {
      setIsSubmitting(true);

      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await dataService.uploadReviewImages(imageFiles);
      }

      await dispatch(addReview({ 
        productId: productId, 
        payload: {
          user_id: user?.id,
          user_name: user?.full_name || user?.username,
          avatar: user?.avatar,
          rating: newReview.rating,
          content: newReview.comment,
          comment: newReview.comment,
          images: imageUrls,
        }
      })).unwrap();
      
      setNewReview({ rating: 5, comment: '' });
      setImageFiles([]);
      toast.success("Cảm ơn bạn đã chia sẻ đánh giá!");
    } catch {
      toast.error("Gửi đánh giá thất bại. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-black mb-6 text-slate-800 dark:text-white">Đánh giá sản phẩm</h3>

      {/* Review Summary UI (Shopee/Lazada style) */}
      <div className="bg-orange-50/50 dark:bg-slate-900 border border-orange-100 dark:border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex flex-col items-center justify-center min-w-[150px]">
          <div className="text-5xl font-black text-orange-500 mb-1">
            {avgRating.toFixed(1)}
          </div>
          <div className="flex gap-1 text-orange-500 mb-2">
            {[1, 2, 3, 4, 5].map(star => {
              const fillAmount = Math.max(0, Math.min(1, avgRating - (star - 1)));
              return (
                <div key={star} className="relative text-xl inline-block w-[20px] h-[20px]">
                  {/* Background Empty Star */}
                  <span 
                    className="material-symbols-outlined text-transparent [-webkit-text-stroke:1px_currentColor] select-none absolute top-0 left-0"
                    style={{ fontSize: '20px' }}
                  >
                    star
                  </span>
                  {/* Foreground Fill Star */}
                  {fillAmount > 0 && (
                    <div 
                      className="absolute top-0 left-0 overflow-hidden select-none"
                      style={{ width: `${fillAmount * 100}%`, height: '100%' }}
                    >
                      <span 
                        className="material-symbols-outlined text-orange-500" 
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                      >
                        star
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm font-medium text-slate-500">{reviews.length} đánh giá</p>
        </div>

        <div className="flex-1 w-full space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{star}</span>
                  <span className="material-symbols-outlined text-[14px] text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <div className="h-2 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
                <div className="w-10 shrink-0 text-right text-xs font-medium text-slate-500">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {status === 'loading' && <div className="py-4 text-center">Đang tải đánh giá...</div>}
      
      {paginatedReviews.length === 0 && status !== 'loading' ? (
        <div className="py-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl mb-8">Chưa có đánh giá nào cho sản phẩm này.</div>
      ) : (
        <>
          <div className="space-y-8 mb-8">
            {paginatedReviews.map((review) => (
              <ReviewCard 
                key={review.id} 
                review={review} 
                canReply={canReply} 
                onReply={handleReplyReview} 
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mb-12">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Trang trước
              </button>
              <div className="px-3 py-1">
                Trang {currentPage} / {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Trang tiếp
              </button>
            </div>
          )}
        </>
      )}

      {/* Write Review Form */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
        <h4 className="font-bold mb-4">Viết đánh giá của bạn</h4>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setNewReview((prev) => ({ ...prev, rating: star }))}
              className={`text-4xl transition-colors ${newReview.rating >= star ? 'text-yellow-500' : 'text-slate-300'}`}
              aria-label={`Rate ${star} stars`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={newReview.comment}
          onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm (tối thiểu 2 ký tự)..."
          className="w-full h-32 p-4 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary resize-y bg-slate-50 dark:bg-slate-800"
        />

        <div className="mt-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Hình ảnh thực tế (tối đa 5 ảnh)</label>
          <div className="flex flex-wrap gap-3">
            {imageFiles.map((file, idx) => {
              const fileUrl = URL.createObjectURL(file);
              return (
                <div key={`${file.name}-${idx}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group shadow-sm bg-white">
                  <img src={fileUrl} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="w-8 h-8 bg-white/20 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                      title="Xóa ảnh"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
            
            {imageFiles.length < 5 && (
              <label className="w-24 h-24 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary animate-bounce_slow text-2xl mb-1 mt-2">add_photo_alternate</span>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-primary">Thêm ảnh</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setImageFiles(prev => [...prev, ...files].slice(0, 5));
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <button
          onClick={submitReview}
          disabled={isSubmitting}
          className="mt-4 w-full py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-60"
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </div>
    </div>
  );
};

export default ReviewList;
