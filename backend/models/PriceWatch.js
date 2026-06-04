import mongoose from 'mongoose';

const PriceWatchSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  branch_product_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  target_price: { type: Number, required: true },
  initial_price: { type: Number, required: true },
  current_price: { type: Number, required: true },
  notification_preference: { type: String, enum: ['in_app', 'email', 'both'], default: 'both' },
  status: { type: String, enum: ['active', 'triggered', 'cancelled'], default: 'active' },
  last_notified_at: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Ensure a user can watch a product only once
PriceWatchSchema.index({ user_id: 1, branch_product_id: 1 }, { unique: true });

const PriceWatch = mongoose.model('PriceWatch', PriceWatchSchema);
export default PriceWatch;
