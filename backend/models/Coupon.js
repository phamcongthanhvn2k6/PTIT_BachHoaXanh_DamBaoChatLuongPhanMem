import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },

  // Discount mechanic type
  type: { type: String, default: 'percent', enum: ['percent', 'fixed_amount', 'free_shipping', 'points'] },

  // NEW: Voucher category — product discount vs shipping discount
  voucher_type: { type: String, enum: ['product', 'shipping'], default: 'product' },

  discount_value: { type: Number, default: 0 },
  min_order_amount: { type: Number, default: 0 },
  min_quantity: { type: Number, default: 0 },
  max_discount_amount: { type: Number, default: null },
  total_quantity: { type: Number, default: null },
  remaining_quantity: { type: Number, default: null },
  claimed_count: { type: Number, default: 0 },
  hide_after_expired_hours: { type: Number, default: 24 },
  auto_hide_after_expired: { type: Boolean, default: true },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  usage_limit: { type: Number, default: null },
  usage_per_user: { type: Number, default: 1 },
  used_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'active', 'scheduled', 'expired', 'paused'], default: 'active' },
  claim_campaign: { type: Boolean, default: false },
  badge_text: { type: String, default: '' },
  banner_image: { type: String, default: '' },

  scope: { 
    type: String, 
    enum: ['product', 'category', 'branch', 'all'], 
    default: 'all' 
  },
  target_product_ids: [{ type: mongoose.Schema.Types.Mixed }],
  target_category_ids: [{ type: mongoose.Schema.Types.Mixed }],
  target_branch_ids: [{ type: mongoose.Schema.Types.Mixed }],
  
  excluded_product_ids: [{ type: mongoose.Schema.Types.Mixed }],
  excluded_category_ids: [{ type: mongoose.Schema.Types.Mixed }],
  
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

couponSchema.index({ is_active: 1, start_date: 1, end_date: 1 });
couponSchema.index({ scope: 1 });
couponSchema.index({ voucher_type: 1 });

// Usage tracking (when coupon is used in an order)
const couponUsageSchema = new mongoose.Schema({
  coupon_id: { type: mongoose.Schema.Types.Mixed, required: true },
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  order_id: { type: mongoose.Schema.Types.Mixed, default: null },
  discount_amount: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'used_at', updatedAt: false } });

couponUsageSchema.index({ coupon_id: 1, user_id: 1, used_at: -1 });

// Claim tracking (user claims coupon into their wallet)
const couponClaimSchema = new mongoose.Schema({
  coupon_id: { type: mongoose.Schema.Types.Mixed, required: true },
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  claimed_at: { type: Date, default: Date.now },
  status: { type: String, enum: ['claimed', 'used', 'expired', 'cancelled', 'refunded'], default: 'claimed' },
  used_order_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

couponClaimSchema.index({ coupon_id: 1, user_id: 1, created_at: -1 });
couponClaimSchema.index({ user_id: 1, status: 1 });

export const Coupon = mongoose.model('Coupon', couponSchema);
export const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);
export const CouponClaim = mongoose.model('CouponClaim', couponClaimSchema);
