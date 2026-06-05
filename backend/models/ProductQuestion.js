import mongoose from 'mongoose';

const productQuestionSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  user_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  user_name: { type: String, default: 'Khach hang' },
  question: { type: String, required: true, trim: true },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'answered', 'hidden'],
    index: true,
  },
  is_pinned: { type: Boolean, default: false },
  is_official_answer: { type: Boolean, default: false },
  answer: {
    content: { type: String, default: '' },
    admin_id: { type: mongoose.Schema.Types.Mixed, default: null },
    admin_name: { type: String, default: '' },
    answered_at: { type: Date, default: null },
  },
  // AI specific fields
  answer_source: {
    type: String,
    default: 'admin',
    enum: ['ai', 'admin', 'mixed'],
    index: true,
  },
  ai_model_used: { type: String, default: '' },
  ai_status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'answered', 'rejected', 'needs_review'],
    index: true,
  },
  confidence_score: { type: Number, default: 1.0 },
  reviewed_at: { type: Date, default: null },
  reviewed_by: { type: mongoose.Schema.Types.Mixed, default: null },
  moderated_flag: { type: Boolean, default: false },
  qa_mode: {
    type: String,
    enum: ['ai', 'admin'],
    default: 'ai',
    index: true,
  },
  ai_attempt_count: { type: Number, default: 0 },
  published_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

productQuestionSchema.index({ product_id: 1, created_at: -1 });

export default mongoose.model('ProductQuestion', productQuestionSchema);

