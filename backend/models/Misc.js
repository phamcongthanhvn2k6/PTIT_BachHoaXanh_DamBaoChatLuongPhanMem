import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  image: { type: String, default: '' }, // Keep for backwards compatibility
  image_url: { type: String, default: '' },
  mobile_image_url: { type: String, default: '' },
  alt_text: { type: String, default: '' },
  link: { type: String, default: '' },
  link_type: { type: String, default: 'url' }, // url, product, category
  position: { type: String, default: 'home' },
  sort_order: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  product_id: { type: mongoose.Schema.Types.Mixed, default: null },
  text_color: { type: String, default: "#ffffff" },
  overlay_color: { type: String, default: "rgba(0,0,0,0.3)" },
  text_shadow: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const hotDealSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  image_url: { type: String, default: '' },
  badge_text: { type: String, default: '' },
  product_id: { type: mongoose.Schema.Types.Mixed, required: true }, // Keep for compatibility
  branch_product_id: { type: mongoose.Schema.Types.Mixed, default: null },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  type: { type: String, default: 'percent' },
  discount_value: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 }, // Compatibility
  deal_price: { type: Number, default: 0 },
  original_price: { type: Number, default: 0 },
  target_product_ids: [{ type: mongoose.Schema.Types.Mixed }],
  target_category_ids: [{ type: mongoose.Schema.Types.Mixed }],
  target_branch_ids: [{ type: mongoose.Schema.Types.Mixed }],
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  stock_limit: { type: Number, default: 0 }, // Compatibility
  total_quantity: { type: Number, default: null },
  remaining_quantity: { type: Number, default: null },
  sold_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'active', 'expired'], default: 'active' },
  priority: { type: Number, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const featuredCollectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  product_ids: [mongoose.Schema.Types.Mixed],
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

const deliverySlotSchema = new mongoose.Schema({
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  date: { type: String, default: '' },
  time_start: { type: String, default: '' },
  time_end: { type: String, default: '' },
  capacity: { type: Number, default: 0 },
  booked: { type: Number, default: 0 },
  is_available: { type: Boolean, default: true },
}, { timestamps: true });

const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
  user_name: { type: String, default: '' },
  action: { type: String, required: true },
  entity: { type: String, default: '' },
  entity_id: { type: mongoose.Schema.Types.Mixed, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at' } });

const adminSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  label: { type: String, default: '' },
  group: { type: String, default: 'general' },
}, { timestamps: true });

const notificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  type: { type: String, default: 'email' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// NOTE: StockMovement schema is defined in models/StockMovement.js (canonical source).
// Do NOT re-declare it here — the standalone model has the correct, richer schema.

export const Banner = mongoose.model('Banner', bannerSchema);
export const HotDeal = mongoose.model('HotDeal', hotDealSchema);
export const FeaturedCollection = mongoose.model('FeaturedCollection', featuredCollectionSchema);
export const DeliverySlot = mongoose.model('DeliverySlot', deliverySlotSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const AdminSetting = mongoose.model('AdminSetting', adminSettingSchema);
export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
