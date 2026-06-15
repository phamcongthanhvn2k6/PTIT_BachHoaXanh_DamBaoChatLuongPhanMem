import mongoose from 'mongoose';

const rewardItemSchema = new mongoose.Schema({
  reward_type: { 
    type: String, 
    required: true, 
    enum: ['points', 'coupon', 'free_shipping', 'discount_card', 'gift_item', 'coins', 'empty'] 
  },
  reward_name: { type: String, required: true },
  reward_name_en: { type: String, default: '' },
  reward_name_ja: { type: String, default: '' },
  reward_value: { type: mongoose.Schema.Types.Mixed, default: null }, // Points amount, Coupon ID, or Coupon Code
  reward_probability: { type: Number, default: 0 }, // Weight/odds
  reward_stock: { type: Number, default: null }, // Current stock (null = unlimited)
  total_limit: { type: Number, default: null }, // Total stock allowed
  daily_limit: { type: Number, default: null }, // Daily claim limit for this reward
  per_user_limit: { type: Number, default: null }, // Claim limit per user
  reward_status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  valid_from: { type: Date, default: null },
  valid_to: { type: Date, default: null },
  claimed_count: { type: Number, default: 0 }
});

const checkinScheduleSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format "YYYY-MM-DD"
  reward_type: { type: String, required: true, enum: ['points', 'coupon', 'free_shipping', 'discount_card', 'gift_item', 'coins', 'empty'] },
  reward_name: { type: String, required: true },
  reward_name_en: { type: String, default: '' },
  reward_name_ja: { type: String, default: '' },
  reward_value: { type: mongoose.Schema.Types.Mixed, default: null },
  is_special: { type: Boolean, default: false }
});

const streakBonusSchema = new mongoose.Schema({
  streak_days: { type: Number, required: true },
  reward_type: { type: String, required: true, enum: ['points', 'coupon', 'free_shipping', 'discount_card', 'gift_item', 'coins'] },
  reward_name: { type: String, required: true },
  reward_name_en: { type: String, default: '' },
  reward_name_ja: { type: String, default: '' },
  reward_value: { type: mongoose.Schema.Types.Mixed, default: null }
});

const gamificationCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, required: true, enum: ['spin', 'checkin'] },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  is_active: { type: Boolean, default: true },
  rewards: [rewardItemSchema],
  checkin_schedule: [checkinScheduleSchema],
  streak_bonuses: [streakBonusSchema],
  max_spins_per_user_day: { type: Number, default: 1 }, // Used for Lucky Spin
  max_spins_per_user_total: { type: Number, default: null }, // Total spin limit
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

gamificationCampaignSchema.index({ type: 1, is_active: 1, start_date: 1, end_date: 1 });

const gamificationLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GamificationCampaign', required: true },
  type: { type: String, required: true, enum: ['spin', 'checkin', 'streak'] },
  reward: {
    reward_type: { type: String, required: true },
    reward_name: { type: String, required: true },
    reward_name_en: { type: String, default: '' },
    reward_name_ja: { type: String, default: '' },
    reward_value: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  claimed_at: { type: Date, default: Date.now },
  date_str: { type: String, required: true }, // Local date "YYYY-MM-DD" in GMT+7
  ip: { type: String, default: '' },
  status: { type: String, default: 'delivered', enum: ['delivered', 'failed'] },
  error_message: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at' } });

gamificationLogSchema.index({ user_id: 1, campaign_id: 1, type: 1, date_str: 1 });
gamificationLogSchema.index({ campaign_id: 1, created_at: -1 });

const gamificationSpinGrantSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GamificationCampaign', required: true },
  granted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  spins_granted: { type: Number, required: true, default: 0 },
  spins_used: { type: Number, required: true, default: 0 },
  reason: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

gamificationSpinGrantSchema.index({ user_id: 1, campaign_id: 1 });

export const GamificationCampaign = mongoose.model('GamificationCampaign', gamificationCampaignSchema);
export const GamificationLog = mongoose.model('GamificationLog', gamificationLogSchema);
export const GamificationSpinGrant = mongoose.model('GamificationSpinGrant', gamificationSpinGrantSchema);
