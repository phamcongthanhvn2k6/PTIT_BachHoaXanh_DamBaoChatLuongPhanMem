import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  user_name: { type: String, default: '' },
  user_avatar: { type: String, default: null },
  product_id: { type: mongoose.Schema.Types.Mixed, required: true },
  product_name: { type: String, default: '' },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  branch_name: { type: String, default: '' },
  order_id: { type: mongoose.Schema.Types.Mixed, default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  images: [String],
  status: { type: String, default: 'pending', enum: ['published', 'pending', 'hidden', 'deleted', 'reported', 'rejected', 'approved', 'active', 'flagged'] }, // kept legacy active/flagged
  is_verified_purchase: { type: Boolean, default: false },
  helpful_count: { type: Number, default: 0 },
  reported_count: { type: Number, default: 0 },
  is_featured: { type: Boolean, default: false },
  is_hidden: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
  admin_notes: { type: String, default: '' },
  moderation_reason: { type: String, default: '' },
  reply: {
    content: { type: String, default: null },
    admin_id: { type: mongoose.Schema.Types.Mixed, default: null },
    admin_name: { type: String, default: null },
    replied_at: { type: Date, default: null },
  },
  ai_sentiment: { type: String, default: null, enum: ['positive', 'neutral', 'negative', null] },
  ai_sentiment_score: { type: Number, default: null },
  ai_is_flagged: { type: Boolean, default: false },
  ai_flag_reason: { type: String, default: '' },
  ai_suggested_reply: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

reviewSchema.index({ status: 1, created_at: -1 });

export default mongoose.model('Review', reviewSchema);
