import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, default: '' },
  description: { type: String, default: '' },
  short_description: { type: String, default: '' },
  eco_label: { type: mongoose.Schema.Types.Mixed, default: null },
  category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  category_name: { type: String, default: '' },
  supplier_id: { type: mongoose.Schema.Types.Mixed, default: null },
  supplier_name: { type: String, default: '' },
  master_id: { type: String, default: '' },
  brand: { type: String, default: '' },
  origin: { type: String, default: '' },
  origin_country: { type: String, default: '' },
  origin_flag: { type: String, default: '' },
  unit: { type: String, default: 'cái' },
  weight: { type: String, default: '' },
  barcode: { type: String, default: '' },
  sku: { type: String, default: '' },
  price: { type: Number, required: true, default: 0 },
  original_price: { type: Number, default: 0 },
  import_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  images: [String],
  gallery: [String],
  ar_model_url: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  tags: [String],
  vat_included: { type: Boolean, default: true },
  shipping_excluded: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false },
  is_best_seller: { type: Boolean, default: false },
  is_new: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  review_count: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
  rating_breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  stock: { type: Number, default: 0 },
  sold_count: { type: Number, default: 0 },
  manufacture_date: { type: Date, default: null },
  expiry_date: { type: Date, default: null },
  expiry_warning_days: { type: Number, default: 7 },
  batch_code: { type: String, default: '' },
  is_expiring_soon: { type: Boolean, default: false },
  is_expired: { type: Boolean, default: false },
  highlights: [String],
  product_details: [String],
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  nutrition_info: { type: mongoose.Schema.Types.Mixed, default: null },
  usage_guide: { type: String, default: '' },
  storage_instructions: { type: String, default: '' },
  storage_guide: { type: String, default: '' },
  notes: { type: String, default: '' },
  recipe_suggestions: [String],
  related_product_ids: [{ type: mongoose.Schema.Types.Mixed }],
  frequently_bought_together: [{ type: mongoose.Schema.Types.Mixed }],
  created_by: { type: mongoose.Schema.Types.Mixed, default: null },
  is_deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Soft Delete Middleware
productSchema.pre('find', function () {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});
productSchema.pre('findOne', function () {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});
productSchema.pre('countDocuments', function () {
  if (this.getQuery().is_deleted === undefined) {
    this.where({ is_deleted: { $ne: true } });
  }
});

// Cache invalidation
productSchema.post('save', async function () {
  try {
    const { deleteCachePattern } = await import('../services/redisService.js');
    await deleteCachePattern('cache:*/api*products*');
  } catch (err) { }
});
productSchema.post('findOneAndUpdate', async function () {
  try {
    const { deleteCachePattern } = await import('../services/redisService.js');
    await deleteCachePattern('cache:*/api*products*');
  } catch (err) { }
});

productSchema.index({ name: 'text', description: 'text', brand: 'text' });

export default mongoose.model('Product', productSchema);
