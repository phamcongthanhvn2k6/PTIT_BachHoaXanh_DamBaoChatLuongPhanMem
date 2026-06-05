import mongoose from 'mongoose';

const membershipTierSchema = new mongoose.Schema({
  level: { type: String, required: true, unique: true },
  min_points: { type: Number, required: true },
  discount_rate: { type: Number, default: 0 },
  benefits: [String],
}, {
  timestamps: true
});

export default mongoose.model('MembershipTier', membershipTierSchema);
