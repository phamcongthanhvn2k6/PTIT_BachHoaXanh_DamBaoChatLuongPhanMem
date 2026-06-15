import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, default: '' },
  icon: { type: String, default: '' },
  icon_type: { type: String, enum: ['image', 'material_icon', 'emoji'], default: 'material_icon' },
  icon_url: { type: String, default: '' },
  icon_name: { type: String, default: '' },
  icon_emoji: { type: String, default: '' },
  image: { type: String, default: '' },
  banner: { type: String, default: '' },
  description: { type: String, default: '' },
  parent_id: { type: mongoose.Schema.Types.Mixed, default: null },
  sort_order: { type: Number, default: 0 },
  display_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  product_count: { type: Number, default: 0 },
  created_by: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
