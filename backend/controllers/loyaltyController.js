import { LoyaltyTransaction, LoyaltyRule } from '../models/Loyalty.js';
import User from '../models/User.js';

export const transactions = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role_id !== 3 && req.query.user_id) filter.user_id = req.query.user_id;
    else if (req.userId) filter.user_id = req.userId;
    return res.json({ success: true, data: await LoyaltyTransaction.find(filter).sort('-created_at') });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const rules = async (req, res) => {
  try { return res.json({ success: true, data: await LoyaltyRule.find() }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateRules = async (req, res) => {
  try {
    const { rules: rulesData } = req.body;
    if (Array.isArray(rulesData)) {
      for (const r of rulesData) {
        if (r._id) await LoyaltyRule.findByIdAndUpdate(r._id, r);
        else await LoyaltyRule.create(r);
      }
    }
    return res.json({ success: true, data: await LoyaltyRule.find() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const redeemPoints = async (req, res) => {
  try {
    const { points, rewardId, rewardTitle } = req.body;
    const cost = Math.abs(Number(points || 0));

    if (!cost || cost <= 0) {
      return res.status(400).json({ success: false, message: 'Số điểm không hợp lệ' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if ((user.lotte_points || 0) < cost) {
      return res.status(400).json({ success: false, message: 'Không đủ điểm để đổi phần thưởng này' });
    }

    // Deduct points
    user.lotte_points = Math.max(0, (user.lotte_points || 0) - cost);
    await user.save();

    // Record transaction
    await LoyaltyTransaction.create({
      user_id: user._id,
      type: 'redeem',
      points: -cost,
      source: 'reward_redeem',
      description: rewardTitle || `Đổi phần thưởng ${rewardId || ''}`.trim(),
      balance_after: user.lotte_points,
    });

    return res.json({
      success: true,
      data: {
        balance: user.lotte_points,
        redeemed: cost,
      },
      message: `Đã đổi ${cost} điểm thành công`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
