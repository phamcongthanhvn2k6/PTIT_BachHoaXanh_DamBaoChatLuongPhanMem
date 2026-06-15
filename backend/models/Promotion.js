import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { 
    type: String, 
    enum: ['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'], 
    required: true 
  },
  // Voucher category — product discount vs shipping discount
  voucher_type: { type: String, enum: ['product', 'shipping'], default: 'product' },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'scheduled', 'expired', 'paused'], 
    default: 'active' 
  },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  is_active: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  scope: { type: String, enum: ['all', 'product', 'category', 'branch'], default: 'all' },
  target_product_ids: [{ type: mongoose.Schema.Types.Mixed }],
  target_category_ids: [{ type: mongoose.Schema.Types.Mixed }],
  target_branch_ids: [{ type: mongoose.Schema.Types.Mixed }],
  is_auto_generated: { type: Boolean, default: false },
  source: { type: String, enum: ['manual', 'expiry_alert', 'admin_tool'], default: 'manual' },
  suggested_by_system: { type: Boolean, default: false },
  total_quantity: { type: Number, default: null },
  remaining_quantity: { type: Number, default: null },
  claimed_count: { type: Number, default: 0 },
  hide_after_expired_hours: { type: Number, default: 24 },
  auto_hide_after_expired: { type: Boolean, default: true },
  notification_sent: { type: Boolean, default: false },
  usage_limit: { type: Number, default: null },
  max_redemptions: { type: Number, default: null },
  usage_count: { type: Number, default: 0 },
  usage_per_user: { type: Number, default: 1 },
  min_order_amount: { type: Number, default: 0 },
  min_quantity: { type: Number, default: 0 },
  gift_quantity: { type: Number, default: 0 }, // For bogo: "Get Y"
  discount_value: { type: Number, default: 0 }, // Percent or Fixed amount
  max_discount_amount: { type: Number, default: null },
  gift_product_id: { type: mongoose.Schema.Types.Mixed, default: null },
  points_multiplier: { type: Number, default: 1 },
  badge_text: { type: String, default: '' },
  banner_image: { type: String, default: '' },
  image: { type: String, default: '' },
  banner_url: { type: String, default: '' },
  claim_campaign: { type: Boolean, default: false },
  stackable: { type: Boolean, default: false },
  
  excluded_product_ids: [{ type: mongoose.Schema.Types.Mixed }],
  excluded_category_ids: [{ type: mongoose.Schema.Types.Mixed }],
  
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

promotionSchema.index({ is_active: 1, status: 1, start_date: 1, end_date: 1, priority: -1 });
promotionSchema.index({ scope: 1 });

promotionSchema.pre('save', function (next) {
  if (this.type === 'percent' || this.type === 'flash_deal') {
    if (this.discount_value > 100) {
      this.discount_value = 100;
    }
    if (this.discount_value < 0) {
      this.discount_value = 0;
    }
  }
  next();
});

promotionSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.type === 'percent' || update.type === 'flash_deal') {
      if (update.discount_value !== undefined && update.discount_value !== null) {
        if (update.discount_value > 100) update.discount_value = 100;
        if (update.discount_value < 0) update.discount_value = 0;
      }
    }
  }
  next();
});

export default mongoose.model('Promotion', promotionSchema);

