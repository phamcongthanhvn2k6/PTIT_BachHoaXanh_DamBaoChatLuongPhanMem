import mongoose from 'mongoose';

const popupAdSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  image_url: { type: String, required: true },
  cta_text: { type: String, default: '' },
  cta_link: { type: String, default: '' },
  campaign_type: { type: String, default: 'general' }, // e.g., product, coupon, url
  target_branch: { type: String, default: 'all' }, // branch ID or 'all'
  target_audience: { type: String, default: 'all' }, // e.g., all, member, non-member
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  priority: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'scheduled', 'expired'], default: 'active' },
  show_once_per_day: { type: Boolean, default: true },
  display_limit: { type: Number, default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const PopupAd = mongoose.model('PopupAd', popupAdSchema);
