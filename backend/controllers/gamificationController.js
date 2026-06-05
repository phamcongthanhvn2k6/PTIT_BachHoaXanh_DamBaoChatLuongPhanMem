import mongoose from 'mongoose';
import { GamificationCampaign, GamificationLog } from '../models/Gamification.js';
import User from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import { Coupon, CouponClaim } from '../models/Coupon.js';
import { logActivity } from '../services/auditService.js';

// Helper to get local date string in Vietnam timezone (GMT+7)
function getLocalDateStr() {
  const offset = 7 * 60; // GMT+7 in minutes
  const now = new Date();
  const localTime = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
  return localTime.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────

// Get active campaign for spin or checkin
export const getActiveCampaign = async (req, res) => {
  try {
    const { type } = req.query; // 'spin' or 'checkin'
    if (!type || !['spin', 'checkin'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Loại chiến dịch không hợp lệ' });
    }

    const now = new Date();
    const campaign = await GamificationCampaign.findOne({
      type,
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now }
    }).lean();

    if (!campaign) {
      return res.json({ success: true, data: null, message: 'Không có chiến dịch nào đang diễn ra' });
    }

    // Clean sensitive odds or configurations for regular users if needed, or send complete active data
    return res.json({ success: true, data: campaign });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Daily Check-in state (is checked in today, current streak, history of this month)
export const getCheckinState = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    
    // Find active checkin campaign
    const campaign = await GamificationCampaign.findOne({
      type: 'checkin',
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now }
    });

    if (!campaign) {
      return res.json({ success: true, data: null, message: 'Không có chiến dịch điểm danh nào hoạt động' });
    }

    const todayStr = getLocalDateStr();
    
    // Check if checked in today
    const checkedInToday = await GamificationLog.findOne({
      user_id: userId,
      campaign_id: campaign._id,
      type: 'checkin',
      date_str: todayStr,
      status: 'delivered'
    });

    // Calculate current streak
    const offset = 7 * 60;
    let streak = 0;
    let checkDate = new Date(); // Start checking from today (if checked in) or yesterday
    
    if (!checkedInToday) {
      // If not checked in today, check from yesterday
      checkDate.setTime(checkDate.getTime() - 24 * 60 * 60 * 1000);
    }

    while (true) {
      const checkTime = new Date(checkDate.getTime() + (offset + checkDate.getTimezoneOffset()) * 60000);
      const checkDateStr = checkTime.toISOString().split('T')[0];
      const logged = await GamificationLog.findOne({
        user_id: userId,
        campaign_id: campaign._id,
        type: 'checkin',
        date_str: checkDateStr,
        status: 'delivered'
      });

      if (logged) {
        streak++;
        checkDate.setTime(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    // Add 1 if checked in today
    if (checkedInToday) {
      streak = streak || 1; 
    }

    // Retrieve last 30 days logs for calendar display
    const checkinHistory = await GamificationLog.find({
      user_id: userId,
      campaign_id: campaign._id,
      type: { $in: ['checkin', 'streak'] },
      status: 'delivered'
    }).sort({ claimed_at: -1 }).limit(30).lean();

    return res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        checkedInToday: !!checkedInToday,
        currentStreak: streak,
        checkinHistory: checkinHistory.map(log => ({
          date_str: log.date_str,
          claimed_at: log.claimed_at,
          reward: log.reward
        })),
        schedule: campaign.checkin_schedule || [],
        streak_bonuses: campaign.streak_bonuses || []
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Run Lucky Spin
export const spinWheel = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.userId;
    const now = new Date();
    const todayStr = getLocalDateStr();

    // 1. Fetch active spin campaign
    const campaign = await GamificationCampaign.findOne({
      type: 'spin',
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now }
    }).session(session);

    if (!campaign) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Không có chiến dịch Vòng Quay May Mắn nào hoạt động' });
    }

    // 2. Validate per-user claims limit
    // Check total claims
    if (campaign.max_spins_per_user_total !== null) {
      const totalSpins = await GamificationLog.countDocuments({
        user_id: userId,
        campaign_id: campaign._id,
        type: 'spin',
        status: 'delivered'
      }).session(session);

      if (totalSpins >= campaign.max_spins_per_user_total) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'Bạn đã hết tổng lượt quay cho chương trình này' });
      }
    }

    // Check daily claims
    const dailySpins = await GamificationLog.countDocuments({
      user_id: userId,
      campaign_id: campaign._id,
      type: 'spin',
      date_str: todayStr,
      status: 'delivered'
    }).session(session);

    if (dailySpins >= campaign.max_spins_per_user_day) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Bạn đã hết lượt quay hôm nay. Vui lòng quay lại vào ngày mai!' });
    }

    // 3. Find eligible rewards from reward pool
    // To count daily reward limits, query GamificationLog for today
    const logsToday = await GamificationLog.find({
      campaign_id: campaign._id,
      date_str: todayStr,
      status: 'delivered'
    }).session(session);

    const eligibleRewards = [];
    for (const r of campaign.rewards) {
      if (r.reward_status !== 'active') continue;
      
      // Time window checks
      if (r.valid_from && now < new Date(r.valid_from)) continue;
      if (r.valid_to && now > new Date(r.valid_to)) continue;

      // Stock check
      if (r.reward_stock !== null && r.reward_stock <= 0) continue;

      // Total claim limit check
      if (r.total_limit !== null && r.claimed_count >= r.total_limit) continue;

      // Daily limit check
      if (r.daily_limit !== null) {
        const rewardClaimsToday = logsToday.filter(
          log => log.reward.reward_type === r.reward_type && String(log.reward.reward_value) === String(r.reward_value)
        ).length;
        if (rewardClaimsToday >= r.daily_limit) continue;
      }

      // Per user limit check
      if (r.per_user_limit !== null) {
        const userClaimsOfReward = await GamificationLog.countDocuments({
          user_id: userId,
          campaign_id: campaign._id,
          type: 'spin',
          'reward.reward_type': r.reward_type,
          'reward.reward_value': r.reward_value,
          status: 'delivered'
        }).session(session);

        if (userClaimsOfReward >= r.per_user_limit) continue;
      }

      eligibleRewards.push(r);
    }

    // Fallback reward (empty / try again) if no reward is eligible
    let selectedReward = campaign.rewards.find(r => r.reward_type === 'empty');
    if (!selectedReward) {
      selectedReward = {
        reward_type: 'empty',
        reward_name: 'Chúc bạn may mắn lần sau!',
        reward_name_en: 'Better luck next time!',
        reward_name_ja: '次回に期待しましょう！',
        reward_value: null,
        reward_probability: 0
      };
    }

    // 4. Run Selection (Weighted Random)
    if (eligibleRewards.length > 0) {
      const totalWeight = eligibleRewards.reduce((sum, r) => sum + r.reward_probability, 0);
      if (totalWeight > 0) {
        let randomVal = Math.random() * totalWeight;
        for (const r of eligibleRewards) {
          randomVal -= r.reward_probability;
          if (randomVal <= 0) {
            selectedReward = r;
            break;
          }
        }
      }
    }

    // 5. Deliver Reward safely
    let status = 'delivered';
    let errorMessage = '';

    if (selectedReward.reward_type !== 'empty') {
      try {
        if (selectedReward.reward_type === 'points') {
          const pointsVal = Number(selectedReward.reward_value || 0);
          if (pointsVal > 0) {
            const user = await User.findById(userId).session(session);
            if (user) {
              user.lotte_points = (user.lotte_points || 0) + pointsVal;
              await user.save({ session });

              await LoyaltyTransaction.create([{
                user_id: userId,
                type: 'earn',
                points: pointsVal,
                source: 'lucky_spin',
                description: `Vòng quay may mắn: ${selectedReward.reward_name}`,
                balance_after: user.lotte_points
              }], { session });
            } else {
              throw new Error('User not found');
            }
          }
        } else if (['coupon', 'free_shipping', 'discount_card'].includes(selectedReward.reward_type)) {
          // reward_value stores the coupon code or coupon ID
          let coupon = await Coupon.findOne({ code: String(selectedReward.reward_value).toUpperCase() }).session(session);
          if (!coupon) {
            coupon = await Coupon.findById(selectedReward.reward_value).session(session);
          }

          if (coupon) {
            // Validate coupon limits
            const existingClaimCount = await CouponClaim.countDocuments({
              coupon_id: coupon._id,
              user_id: userId,
              status: { $in: ['claimed', 'used'] }
            }).session(session);

            const perUserLimit = Number(coupon.usage_per_user || 1);
            if (perUserLimit > 0 && existingClaimCount >= perUserLimit) {
              throw new Error('Bạn đã nhận tối đa số lượng voucher này');
            }

            const inventoryLimit = Number(coupon.total_quantity || coupon.usage_limit || 0);
            if (inventoryLimit > 0 && coupon.claimed_count >= inventoryLimit) {
              throw new Error('Mã giảm giá này đã hết lượt nhận');
            }

            // Increment claimed_count on coupon
            await Coupon.findByIdAndUpdate(coupon._id, { $inc: { claimed_count: 1 } }).session(session);

            // Create Coupon Claim
            await CouponClaim.create([{
              coupon_id: coupon._id,
              user_id: userId,
              status: 'claimed'
            }], { session });
          } else {
            throw new Error(`Coupon ${selectedReward.reward_value} không tồn tại hoặc đã bị xóa`);
          }
        }
      } catch (err) {
        status = 'failed';
        errorMessage = err.message;
      }
    }

    // 6. Update Campaign Reward count/stock
    if (status === 'delivered' && selectedReward._id) {
      await GamificationCampaign.updateOne(
        { _id: campaign._id, 'rewards._id': selectedReward._id },
        { 
          $inc: { 'rewards.$.claimed_count': 1 },
          ...(selectedReward.reward_stock !== null ? { $inc: { 'rewards.$.reward_stock': -1 } } : {})
        }
      ).session(session);
    }

    // 7. Record spin attempt in GamificationLog
    const spinLog = await GamificationLog.create([{
      user_id: userId,
      campaign_id: campaign._id,
      type: 'spin',
      reward: {
        reward_type: selectedReward.reward_type,
        reward_name: selectedReward.reward_name,
        reward_name_en: selectedReward.reward_name_en || '',
        reward_name_ja: selectedReward.reward_name_ja || '',
        reward_value: selectedReward.reward_value
      },
      date_str: todayStr,
      ip: req.ip || '',
      status,
      error_message: errorMessage
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Map selected index for frontend wheel alignment
    const rewardIndex = campaign.rewards.findIndex(r => String(r._id) === String(selectedReward._id));

    return res.json({
      success: status === 'delivered',
      message: status === 'delivered' ? 'Quay số thành công' : errorMessage,
      data: {
        reward: selectedReward,
        rewardIndex: rewardIndex >= 0 ? rewardIndex : 0,
        log: spinLog[0]
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Run Daily Check-in
export const dailyCheckin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.userId;
    const now = new Date();
    const todayStr = getLocalDateStr();

    // 1. Fetch active checkin campaign
    const campaign = await GamificationCampaign.findOne({
      type: 'checkin',
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now }
    }).session(session);

    if (!campaign) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Không có chiến dịch Điểm Danh nào hoạt động' });
    }

    // 2. Prevent duplicate same-day checkin
    const alreadyCheckedIn = await GamificationLog.findOne({
      user_id: userId,
      campaign_id: campaign._id,
      type: 'checkin',
      date_str: todayStr,
      status: 'delivered'
    }).session(session);

    if (alreadyCheckedIn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Bạn đã điểm danh hôm nay rồi!' });
    }

    // 3. Determine Reward: Check Schedule vs Random Pool
    let selectedReward = null;
    const scheduledDay = campaign.checkin_schedule.find(s => s.date === todayStr);

    if (scheduledDay) {
      selectedReward = {
        reward_type: scheduledDay.reward_type,
        reward_name: scheduledDay.reward_name,
        reward_name_en: scheduledDay.reward_name_en,
        reward_name_ja: scheduledDay.reward_name_ja,
        reward_value: scheduledDay.reward_value
      };
    } else {
      // Use random pool
      const eligibleRewards = campaign.rewards.filter(r => r.reward_status === 'active');
      const totalWeight = eligibleRewards.reduce((sum, r) => sum + r.reward_probability, 0);
      if (totalWeight > 0) {
        let randomVal = Math.random() * totalWeight;
        for (const r of eligibleRewards) {
          randomVal -= r.reward_probability;
          if (randomVal <= 0) {
            selectedReward = {
              reward_type: r.reward_type,
              reward_name: r.reward_name,
              reward_name_en: r.reward_name_en,
              reward_name_ja: r.reward_name_ja,
              reward_value: r.reward_value,
              _id: r._id
            };
            break;
          }
        }
      }
    }

    // Fallback if no reward configured
    if (!selectedReward) {
      selectedReward = {
        reward_type: 'points',
        reward_name: 'Đã điểm danh thành công!',
        reward_name_en: 'Checked in successfully!',
        reward_name_ja: 'チェックインに成功しました！',
        reward_value: 10 // default 10 points
      };
    }

    // 4. Calculate Streak & Streak Bonus
    const offset = 7 * 60;
    let streak = 1; // including today
    let checkDate = new Date();
    // Check from yesterday
    checkDate.setTime(checkDate.getTime() - 24 * 60 * 60 * 1000);

    while (true) {
      const checkTime = new Date(checkDate.getTime() + (offset + checkDate.getTimezoneOffset()) * 60000);
      const checkDateStr = checkTime.toISOString().split('T')[0];
      const logged = await GamificationLog.findOne({
        user_id: userId,
        campaign_id: campaign._id,
        type: 'checkin',
        date_str: checkDateStr,
        status: 'delivered'
      }).session(session);

      if (logged) {
        streak++;
        checkDate.setTime(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    // Check if streak bonus applies
    let streakBonusReward = null;
    const bonusConfig = campaign.streak_bonuses.find(b => b.streak_days === streak);
    if (bonusConfig) {
      streakBonusReward = {
        reward_type: bonusConfig.reward_type,
        reward_name: bonusConfig.reward_name,
        reward_name_en: bonusConfig.reward_name_en,
        reward_name_ja: bonusConfig.reward_name_ja,
        reward_value: bonusConfig.reward_value
      };
    }

    // 5. Deliver base reward
    let status = 'delivered';
    let errorMessage = '';

    const deliverRewardObj = async (reward) => {
      if (reward.reward_type === 'points') {
        const pointsVal = Number(reward.reward_value || 0);
        const user = await User.findById(userId).session(session);
        if (user) {
          user.lotte_points = (user.lotte_points || 0) + pointsVal;
          await user.save({ session });

          await LoyaltyTransaction.create([{
            user_id: userId,
            type: 'earn',
            points: pointsVal,
            source: 'daily_checkin',
            description: `Điểm danh: ${reward.reward_name}`,
            balance_after: user.lotte_points
          }], { session });
        }
      } else if (['coupon', 'free_shipping', 'discount_card'].includes(reward.reward_type)) {
        let coupon = await Coupon.findOne({ code: String(reward.reward_value).toUpperCase() }).session(session);
        if (!coupon) coupon = await Coupon.findById(reward.reward_value).session(session);

        if (coupon) {
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { claimed_count: 1 } }).session(session);
          await CouponClaim.create([{
            coupon_id: coupon._id,
            user_id: userId,
            status: 'claimed'
          }], { session });
        } else {
          throw new Error(`Mã giảm giá ${reward.reward_value} không hợp lệ`);
        }
      }
    };

    try {
      await deliverRewardObj(selectedReward);
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
    }

    // 6. Deliver streak bonus reward if any and base was successful
    let streakBonusDelivered = false;
    if (status === 'delivered' && streakBonusReward) {
      try {
        await deliverRewardObj(streakBonusReward);
        streakBonusDelivered = true;

        // Log the streak bonus reward claim
        await GamificationLog.create([{
          user_id: userId,
          campaign_id: campaign._id,
          type: 'streak',
          reward: streakBonusReward,
          date_str: todayStr,
          ip: req.ip || '',
          status: 'delivered'
        }], { session });
      } catch (err) {
        console.error('[CheckinStreak] Failed to deliver streak bonus:', err.message);
      }
    }

    // 7. Update Campaign stock if randomized reward was selected and has stock count
    if (status === 'delivered' && selectedReward._id) {
      await GamificationCampaign.updateOne(
        { _id: campaign._id, 'rewards._id': selectedReward._id },
        { 
          $inc: { 'rewards.$.claimed_count': 1 },
          ...(selectedReward.reward_stock !== null ? { $inc: { 'rewards.$.reward_stock': -1 } } : {})
        }
      ).session(session);
    }

    // 8. Create GamificationLog for base check-in
    const checkinLog = await GamificationLog.create([{
      user_id: userId,
      campaign_id: campaign._id,
      type: 'checkin',
      reward: selectedReward,
      date_str: todayStr,
      ip: req.ip || '',
      status,
      error_message: errorMessage
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: status === 'delivered',
      message: status === 'delivered' ? 'Điểm danh thành công' : errorMessage,
      data: {
        reward: selectedReward,
        streak,
        streakBonusApplied: streakBonusDelivered,
        streakBonusReward,
        log: checkinLog[0]
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get user's own gamification history / logs
export const getMyLogs = async (req, res) => {
  try {
    const userId = req.userId;
    const { campaign_id, type, limit = 50, skip = 0 } = req.query;
    const query = { user_id: userId };
    if (campaign_id) query.campaign_id = campaign_id;
    if (type) query.type = type;

    const logs = await GamificationLog.find(query)
      .sort({ claimed_at: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const total = await GamificationLog.countDocuments(query);

    return res.json({ success: true, data: logs, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ─────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────

// List all campaigns (Admin only)
export const listCampaigns = async (req, res) => {
  try {
    const campaigns = await GamificationCampaign.find().sort({ created_at: -1 }).lean();
    return res.json({ success: true, data: campaigns });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create a new campaign (Admin only)
export const createCampaign = async (req, res) => {
  try {
    const campaignData = req.body;
    if (req.user) {
      campaignData.created_by = req.user._id || req.user.id;
    }

    const campaign = await GamificationCampaign.create(campaignData);

    // Audit log
    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'CREATE',
      entity: 'gamification_campaign',
      entityId: campaign._id,
      details: { name: campaign.name, type: campaign.type },
      ip: req.ip
    });

    return res.status(201).json({ success: true, data: campaign, message: 'Tạo chiến dịch game thành công!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update an existing campaign (Admin only)
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaignData = req.body;

    const campaign = await GamificationCampaign.findByIdAndUpdate(id, campaignData, { new: true });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại' });
    }

    // Audit log
    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'UPDATE',
      entity: 'gamification_campaign',
      entityId: campaign._id,
      details: { name: campaign.name, type: campaign.type, is_active: campaign.is_active },
      ip: req.ip
    });

    return res.json({ success: true, data: campaign, message: 'Cập nhật chiến dịch thành công!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a campaign (Admin only)
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await GamificationCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại' });
    }

    await GamificationCampaign.findByIdAndDelete(id);

    // Audit log
    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'DELETE',
      entity: 'gamification_campaign',
      entityId: id,
      details: { name: campaign.name, type: campaign.type },
      ip: req.ip
    });

    return res.json({ success: true, message: 'Xóa chiến dịch thành công!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// View detailed history / logs of claims (Admin only)
export const getLogs = async (req, res) => {
  try {
    const { campaign_id, type, user_id, limit = 50, skip = 0 } = req.query;
    const query = {};
    if (campaign_id) query.campaign_id = campaign_id;
    if (type) query.type = type;
    if (user_id) query.user_id = user_id;

    const logs = await GamificationLog.find(query)
      .sort({ claimed_at: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const total = await GamificationLog.countDocuments(query);

    return res.json({ success: true, data: logs, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// View simple campaign analytics (Admin only)
export const getAnalytics = async (req, res) => {
  try {
    const { campaign_id } = req.params;
    
    const totalParticipation = await GamificationLog.countDocuments({ campaign_id });
    const successfulClaims = await GamificationLog.countDocuments({ campaign_id, status: 'delivered' });
    const failedClaims = await GamificationLog.countDocuments({ campaign_id, status: 'failed' });

    // Group wins by reward type
    const winsByType = await GamificationLog.aggregate([
      { $match: { campaign_id: new mongoose.Types.ObjectId(campaign_id), status: 'delivered' } },
      { $group: { _id: '$reward.reward_type', count: { $sum: 1 } } }
    ]);

    // Daily participations
    const dailyShares = await GamificationLog.aggregate([
      { $match: { campaign_id: new mongoose.Types.ObjectId(campaign_id) } },
      { $group: { _id: '$date_str', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 15 }
    ]);

    return res.json({
      success: true,
      data: {
        totalParticipation,
        successfulClaims,
        failedClaims,
        winsByType: winsByType.map(w => ({ type: w._id, count: w.count })),
        dailyParticipation: dailyShares.map(d => ({ date: d._id, count: d.count }))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
