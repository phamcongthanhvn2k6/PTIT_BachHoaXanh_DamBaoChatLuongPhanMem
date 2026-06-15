import React, { useState } from 'react';
import type { Review } from '../../types';
import StarRating from '../StarRating/StarRating';
import ReviewReplyForm from '../ReviewReplyForm/ReviewReplyForm';
import UserAvatar from '../UserAvatar/UserAvatar';

interface ReviewCardProps {
  review: Review;
  canReply: boolean;
  onReply: (reviewId: string | number, text: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, canReply, onReply }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleSubmitReply = (text: string) => {
    onReply(review.id, text);
    setShowReplyForm(false);
  };

  return (
    <div className="flex gap-4">
      <UserAvatar
        src={review.user_avatar || review.avatar}
        name={review.user_name || 'Khách hàng'}
        size={48}
        userId={review.user_id}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm">{review.user_name || 'Khách hàng'}</h4>
            {review.status === 'pending' && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Chờ duyệt
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {new Date(review.created_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
        
        <div className="flex mb-2">
          <StarRating rating={review.rating} maxStars={5} />
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400">{review.content || review.comment || 'Chưa có nội dung đánh giá'}</p>
        
        {/* Images */}
        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 mt-3">
            {review.images.map((img, idx) => (
              <img key={idx} src={img} alt={`Review pic ${idx+1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
            ))}
          </div>
        )}

        {/* Replies List */}
        {review.replies && review.replies.length > 0 && (
          <div className="mt-4 space-y-3">
            {review.replies.map(reply => (
              <div key={reply.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-[3px] border-primary">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 border bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm">
                    Phản hồi từ Người bán
                  </span>
                  <span className="text-xs text-slate-400">{new Date(reply.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{reply.text || (reply as any).content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Single Admin Reply (New Backend Schema) */}
        {review.reply && review.reply.content && (
          <div className="mt-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-[3px] border-primary">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 border bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm">
                  Phản hồi từ {review.reply.admin_name || 'Người bán'}
                </span>
                <span className="text-xs text-slate-400">
                  {review.reply.replied_at ? new Date(review.reply.replied_at).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{review.reply.content}</p>
            </div>
          </div>
        )}

        {/* Reply Action */}
        {canReply && !showReplyForm && (
          <button 
            onClick={() => setShowReplyForm(true)}
            className="mt-3 text-xs font-bold text-primary hover:underline"
          >
            Trả lời đánh giá
          </button>
        )}

        {/* Reply Form */}
        {showReplyForm && (
          <ReviewReplyForm onSubmit={handleSubmitReply} onCancel={() => setShowReplyForm(false)} />
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
