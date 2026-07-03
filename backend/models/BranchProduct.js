import mongoose from 'mongoose';

const branchProductSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.Mixed, required: true },
  master_id: { type: String, default: '' },
  sku: { type: String, default: '' },
  category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  category_name: { type: String, default: '' },
  supplier_id: { type: mongoose.Schema.Types.Mixed, default: null },
  supplier_name: { type: String, default: '' },
  branch_id: { type: mongoose.Schema.Types.Mixed, required: true },
  price: { type: Number, default: 0 },
  original_price: { type: Number, default: 0 },
  import_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  reserved_quantity: { type: Number, default: 0 },
  min_stock: { type: Number, default: 0 },
  max_purchase_limit: { type: Number, default: 0 },
  is_available: { type: Boolean, default: true },
  sold_count: { type: Number, default: 0 },
  manufacture_date: { type: Date, default: null },
  expiry_date: { type: Date, default: null },
  batch_code: { type: String, default: '' },
  is_expiring_soon: { type: Boolean, default: false },
  is_expired: { type: Boolean, default: false },
  promotion_tag: { type: String, default: '' },
  promotion_end_date: { type: Date, default: null },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

branchProductSchema.virtual('quantity_on_hand').get(function() {
  return this.stock;
});

branchProductSchema.virtual('available_quantity').get(function() {
  return Math.max(0, this.stock - (this.reserved_quantity || 0));
});

branchProductSchema.index({ branch_id: 1, product_id: 1 });
branchProductSchema.index({ product_id: 1 });
branchProductSchema.index({ category_id: 1 });
branchProductSchema.index({ is_available: 1, stock: 1 });

export default mongoose.model('BranchProduct', branchProductSchema);
