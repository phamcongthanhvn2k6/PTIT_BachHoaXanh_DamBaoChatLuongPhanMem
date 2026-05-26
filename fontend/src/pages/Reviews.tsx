import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { toast } from '../components/Toast/toastEvent';
import { resolveImageUrl } from '../utils/imageUrl';
import { getProductUrl } from '../utils/productUrl';

const Reviews: React.FC = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await dataService.getReviews();
        setReviews(res || []);
      } catch (err: any) {
        toast.error(t('reviews.loadError', 'Lỗi tải đánh giá'));
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t('reviews.myReviews')}</h1>
      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-primary/10">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">rate_review</span>
          <p className="text-slate-500 font-medium">{t('reviews.noReviewsAlt')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => {
            const productId = review.product_id ?? review.branch_product_id;
            const productName = review.product_name || t('common.product');
            const productImage = review.product_image || '';

            return (
              <div key={review.id || review._id} className="p-5 bg-white dark:bg-slate-900 border border-primary/10 rounded-xl shadow-sm">
                <div className="flex gap-4">
                  {/* Product thumbnail */}
                  <Link to={getProductUrl({ id: productId, name: productName })} className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {productImage ? (
                      <img
                        src={resolveImageUrl(productImage)}
                        alt={productName}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center text-slate-400 ${productImage ? 'hidden' : ''}`}>
                      <span className="material-symbols-outlined text-2xl">image</span>
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <Link to={getProductUrl({ id: productId, name: productName })} className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs hover:text-primary transition-colors">
                        {productName}
                      </Link>
                      <div className="flex text-yellow-400 shrink-0">
                        {Array.from({ length: Math.min(review.rating ?? 0, 5) }).map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                        {Array.from({ length: Math.max(0, 5 - (review.rating ?? 0)) }).map((_, i) => (
                          <span key={`e-${i}`} className="material-symbols-outlined text-sm text-slate-200">star</span>
                        ))}
                      </div>
                    </div>

                    {review.title && (
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{review.title}</p>
                    )}

                    <p className="text-slate-700 dark:text-slate-300 text-sm">{review.content || review.comment}</p>

                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {review.images.slice(0, 3).map((img: string, i: number) => (
                          <img key={i} src={resolveImageUrl(img)} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-slate-400">{new Date(review.created_at).toLocaleString('vi-VN')}</p>
                      {review.status && review.status !== 'published' && review.status !== 'active' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                          {review.status === 'pending' ? t('reviews.pending', 'Chờ duyệt') : review.status}
                        </span>
                      )}
                    </div>

                    {/* Admin reply */}
                    {review.reply?.content && (
                      <div className="mt-3 bg-primary/5 border border-primary/10 p-3 rounded-lg">
                        <p className="text-xs font-bold text-primary mb-1">
                          {review.reply.admin_name || 'Admin'} {t('reviews.replied', 'đã phản hồi')}:
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{review.reply.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Reviews;
