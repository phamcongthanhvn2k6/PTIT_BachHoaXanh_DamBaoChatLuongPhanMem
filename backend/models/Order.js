import mongoose from 'mongoose';

const appliedPromotionSchema = new mongoose.Schema({
  promotion_id: { type: mongoose.Schema.Types.Mixed, default: null },
  title: { type: String, default: '' },
  type: { type: String, default: '' },
  badge_text: { type: String, default: '' },
  discount_amount: { type: Number, default: 0 },
  affected_items: { type: Number, default: 0 },
}, { _id: false });

const appliedCouponSchema = new mongoose.Schema({
  coupon_id: { type: mongoose.Schema.Types.Mixed, default: null },
  code: { type: String, default: '' },
  title: { type: String, default: '' },
  type: { type: String, default: '' },
  discount_amount: { type: Number, default: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  items: [{
    branch_product_id: mongoose.Schema.Types.Mixed,
    product_id: mongoose.Schema.Types.Mixed,
    product_name: String,
    product_image: String,
    sku: String,
    category_name: String,
    supplier_name: String,
    expiry_date: Date,
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    original_price: { type: Number, default: 0 },
    unit_price: { type: Number, default: 0 },
    final_price: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    discount_applied: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    is_gift: { type: Boolean, default: false },
    hot_deal_id: { type: mongoose.Schema.Types.Mixed, default: null },
    purchased_price: { type: Number },
    original_price_at_purchase: { type: Number },
    discount_percent_at_purchase: { type: Number },
    pricing_source_at_purchase: { type: String },
    pricing: { type: mongoose.Schema.Types.Mixed, default: null }
  }],
  order_address: {
    receiver_name: String,
    phone: String,
    full_address: String,
    city: String,
    district: String,
    ward: String,
    note: String,
  },
  status: { type: String, default: 'PENDING', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'] },
  subtotal: { type: Number, default: 0 },
  shipping_fee: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  coupon_code: { type: String, default: null },
  points_earned: { type: Number, default: 0 },
  payment: {
    method: { type: String, default: 'COD' },
    status: { type: String, default: 'PENDING' },
    transaction_id: { type: String, default: null },
  },
  tracking: {
    tracking_number: { type: String, default: null },
    carrier: { type: String, default: null },
    estimated_delivery: { type: Date, default: null },
    dispatch_branch: { type: mongoose.Schema.Types.Mixed, default: null },
    dispatch_branch_name: { type: String, default: null },
    history: [{
      timestamp: { type: Date, default: Date.now },
      status: String,
      note: String,
      by: mongoose.Schema.Types.Mixed,
      meta: { type: mongoose.Schema.Types.Mixed, default: null },
    }],
  },
  delivery_slot: { type: mongoose.Schema.Types.Mixed, default: null },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  branch_name: { type: String, default: '' },
  pricing_breakdown: {
    subtotal: { type: Number, default: 0 },
    item_discounts: { type: Number, default: 0 },
    promotion_discount: { type: Number, default: 0 },
    coupon_discount: { type: Number, default: 0 },
    shipping_fee: { type: Number, default: 0 },
    free_shipping_applied: { type: Boolean, default: false },
    points_earned: { type: Number, default: 0 },
    final_total: { type: Number, default: 0 },
  },
  applied_promotions: [appliedPromotionSchema],
  applied_coupon: { type: appliedCouponSchema, default: null },
  gift_items: [{
    promotion_id: mongoose.Schema.Types.Mixed,
    product_id: mongoose.Schema.Types.Mixed,
    branch_product_id: mongoose.Schema.Types.Mixed,
    name: String,
    quantity: { type: Number, default: 0 },
    is_gift: { type: Boolean, default: true },
  }],
  note: { type: String, default: '' },
  cancel_reason: { type: String, default: null },
  generated_invoice_url: { type: String, default: null },
  email_notification_status: { type: String, default: 'PENDING', enum: ['PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'] },
  email_notification_sent_at: { type: Date, default: null },
  email_notification_error: { type: String, default: null },
  idempotency_key: { type: String, default: null, index: true },
  is_deleted: { type: Boolean, default: false },
  // Voucher snapshots for rollback
  product_voucher_applied: { type: mongoose.Schema.Types.Mixed, default: null },
  shipping_voucher_applied: { type: mongoose.Schema.Types.Mixed, default: null },
  // ── Idempotency flags for cancel / refund rollback ──
  is_inventory_restored: { type: Boolean, default: false },
  is_coupon_restored: { type: Boolean, default: false },
  is_promotion_restored: { type: Boolean, default: false },
  is_hot_deal_restored: { type: Boolean, default: false },
  is_wallet_refunded: { type: Boolean, default: false },
  is_points_reversed: { type: Boolean, default: false },
  timeline: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Soft Delete Middleware
orderSchema.pre('find', function() {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});
orderSchema.pre('findOne', function() {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});
orderSchema.pre('countDocuments', function() {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});

// NOTE: timeline auto-push removed to prevent duplicates.
// tracking.history is the single source of truth for status events.
// The timeline field is kept in schema for backward compatibility only.

export default mongoose.model('Order', orderSchema);
