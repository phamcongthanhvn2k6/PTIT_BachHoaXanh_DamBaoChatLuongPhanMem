import mongoose from 'mongoose';
import { Coupon, CouponUsage, CouponClaim } from '../models/Coupon.js';
import { validateCouponForCart } from '../services/promotionCalculationService.js';
import { attachCampaignLifecycle } from '../services/campaignLifecycleService.js';
import { broadcastCampaignCreated } from '../services/notificationBroadcastService.js';

const normalizeCoupon = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id;
  return obj;
};

const isPrivilegedRequest = (req) => {
  const roleId = Number(req.user?.role_id);
  return Boolean(req.user && roleId !== 3 && req.user?.role_key !== 'customer');
};

const decorateCoupon = (doc) => {
  const normalized = normalizeCoupon(doc);
  return attachCampaignLifecycle(normalized, {
    limitKeys: ['total_quantity', 'usage_limit'],
    usedKeys: ['used_count', 'claimed_count'],
  });
};

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeIdArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
};

const normalizeCouponPayload = (body = {}) => {
  const normalized = { ...body };
  normalized.target_product_ids = sanitizeIdArray(body.target_product_ids);
  normalized.target_category_ids = sanitizeIdArray(body.target_category_ids);
  normalized.target_branch_ids = sanitizeIdArray(body.target_branch_ids);
  normalized.excluded_product_ids = sanitizeIdArray(body.excluded_product_ids);
  normalized.excluded_category_ids = sanitizeIdArray(body.excluded_category_ids);

  normalized.discount_value = toNumberOrNull(body.discount_value) ?? 0;
  normalized.min_order_amount = toNumberOrNull(body.min_order_amount) ?? 0;
  normalized.min_quantity = toNumberOrNull(body.min_quantity) ?? 0;
  normalized.max_discount_amount = toNumberOrNull(body.max_discount_amount);
  normalized.total_quantity = toNumberOrNull(body.total_quantity);
  normalized.usage_limit = toNumberOrNull(body.usage_limit);
  normalized.usage_per_user = toNumberOrNull(body.usage_per_user) ?? 1;
  normalized.hide_after_expired_hours = toNumberOrNull(body.hide_after_expired_hours) ?? 24;
  normalized.claim_campaign = Boolean(body.claim_campaign);

  // Normalize voucher_type
  if (body.voucher_type && ['product', 'shipping'].includes(body.voucher_type)) {
    normalized.voucher_type = body.voucher_type;
  }

  return normalized;
};

const validateCouponPayload = (body = {}, { isUpdate = false } = {}) => {
  if (!isUpdate && !String(body.code || '').trim()) return 'Coupon code is required';
  if (body.code && !String(body.code).trim()) return 'Coupon code is required';

  const type = String(body.type || '').trim();
  if (type && !['percent', 'fixed_amount', 'free_shipping', 'points'].includes(type)) {
    return 'Invalid coupon type';
  }

  const scope = String(body.scope || 'all').trim();
  if (scope === 'product' && (!Array.isArray(body.target_product_ids) || body.target_product_ids.length === 0)) {
    return 'At least one product must be selected for product scope';
  }
  if (scope === 'category' && (!Array.isArray(body.target_category_ids) || body.target_category_ids.length === 0)) {
    return 'At least one category must be selected for category scope';
  }
  if (scope === 'branch' && (!Array.isArray(body.target_branch_ids) || body.target_branch_ids.length === 0)) {
    return 'At least one branch must be selected for branch scope';
  }

  if (body.start_date && body.end_date) {
    const start = new Date(body.start_date).getTime();
    const end = new Date(body.end_date).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
      return 'start_date must be earlier than end_date';
    }
  }

  if (body.total_quantity !== null && body.total_quantity !== undefined && Number(body.total_quantity) <= 0) {
    return 'total_quantity must be > 0 when provided';
  }
  if (body.usage_per_user !== null && body.usage_per_user !== undefined && Number(body.usage_per_user) <= 0) {
    return 'usage_per_user must be > 0';
  }

  return null;
};

// ─────────────────────────────────────────────
// GET /api/coupons
// ─────────────────────────────────────────────
export const list = async (req, res) => {
  try {
    const { is_active, search, voucher_type } = req.query;
    const isPrivileged = isPrivilegedRequest(req);
    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (voucher_type && ['product', 'shipping'].includes(voucher_type)) filter.voucher_type = voucher_type;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const rows = await Coupon.find(filter).sort('-created_at');
    const mapped = rows.map(decorateCoupon);

    if (!isPrivileged) {
      const visible = mapped.filter((coupon) => coupon.is_active && coupon.is_visible_public);
      return res.json({ success: true, data: visible });
    }

    return res.json({ success: true, data: mapped });
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ─────────────────────────────────────────────
// GET /api/coupons/my-wallet
// Returns only coupons the current user has claimed
// ─────────────────────────────────────────────
export const myWallet = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const claims = await CouponClaim.find({
      user_id: userId,
      status: { $in: ['claimed', 'used'] },
    }).sort({ created_at: -1 }).lean();

    const couponIds = [...new Set(claims.map((c) => String(c.coupon_id)))];

    if (couponIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const coupons = await Coupon.find({ _id: { $in: couponIds } });
    const mapped = coupons.map((c) => {
      const decorated = decorateCoupon(c);
      const userClaim = claims.find((cl) => String(cl.coupon_id) === String(c._id));
      decorated.user_claim_status = userClaim?.status || 'claimed';
      decorated.user_claimed_at = userClaim?.claimed_at || userClaim?.created_at;
      return decorated;
    });

    return res.json({ success: true, data: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/coupons/:id/claim
// User claims a coupon into their wallet
// ─────────────────────────────────────────────
export const claimCoupon = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để nhận voucher' });
    }

    const coupon = await Coupon.findById(req.params.id).session(session);
    if (!coupon) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Voucher không tồn tại' });
    }

    // Check active status
    const now = new Date();
    const status = String(coupon.status || 'active').toLowerCase();
    if (!coupon.is_active || ['draft', 'paused', 'expired'].includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Voucher hiện không khả dụng' });
    }

    // Check time window
    if (coupon.start_date && now < new Date(coupon.start_date)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Voucher chưa tới thời gian nhận' });
    }
    if (coupon.end_date && now > new Date(coupon.end_date)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Voucher đã hết hạn' });
    }

    // Check per-user limit
    const perUserLimit = Number(coupon.usage_per_user || 1);
    const existingClaimCount = await CouponClaim.countDocuments({
      coupon_id: coupon._id,
      user_id: userId,
      status: { $in: ['claimed', 'used'] },
    }).session(session);

    if (perUserLimit > 0 && existingClaimCount >= perUserLimit) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Bạn đã nhận đủ lượt cho voucher này' });
    }

    // Check total inventory
    const inventoryLimit = Number(coupon.total_quantity || coupon.usage_limit || 0);
    const updateFilter = { _id: coupon._id };
    if (inventoryLimit > 0) {
      updateFilter.claimed_count = { $lt: inventoryLimit };
    }

    const updatedCoupon = await Coupon.findOneAndUpdate(
      updateFilter,
      { $inc: { claimed_count: 1 } },
      { new: true, session },
    );

    if (!updatedCoupon) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Voucher đã hết lượt nhận' });
    }

    const claimDocs = await CouponClaim.create([{
      coupon_id: coupon._id,
      user_id: userId,
      status: 'claimed',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      data: claimDocs[0],
      coupon: decorateCoupon(updatedCoupon),
      message: 'Nhận voucher thành công!',
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const c = await Coupon.findOne({ code: req.params.code ? req.params.code.toUpperCase() : null });
    if (!c) {
      const byId = await Coupon.findById(req.params.code).catch(() => null);
      if (byId) return res.json({ success: true, data: decorateCoupon(byId) });
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    return res.json({ success: true, data: decorateCoupon(c) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const validate = async (req, res) => {
  try {
    const { code, branchId, cartItems = [], total = 0 } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const fallbackItems = Array.isArray(cartItems) && cartItems.length > 0
      ? cartItems
      : [{ product_id: 'ORDER_TOTAL', category_id: null, quantity: 1, price: Number(total) || 0 }];

    const result = await validateCouponForCart({
      code,
      branchId,
      cartItems: fallbackItems,
      userId: req.user?._id || req.userId || null,
    });

    if (!result.valid) {
      return res.json({ success: false, message: result.message });
    }

    const lifecycle = attachCampaignLifecycle(result.coupon, {
      limitKeys: ['total_quantity', 'usage_limit'],
      usedKeys: ['used_count', 'claimed_count'],
    });
    if (lifecycle.is_sold_out) {
      return res.json({ success: false, message: 'Ma giam gia da het luot su dung' });
    }

    return res.json({
      success: true,
      data: {
        coupon: decorateCoupon(result.coupon),
        discount_amount: result.coupon_discount,
        eligible_subtotal: result.eligible_subtotal,
        free_shipping: result.free_shipping,
        points_multiplier: result.points_multiplier,
      },
      message: 'Mã giảm giá hợp lệ',
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const apply = async (req, res) => {
  try {
    const { code, branchId, cartItems = [] } = req.body;
    const result = await validateCouponForCart({
      code,
      branchId,
      cartItems,
      userId: req.user?._id || req.userId || null,
    });

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const lifecycle = attachCampaignLifecycle(result.coupon, {
      limitKeys: ['total_quantity', 'usage_limit'],
      usedKeys: ['used_count', 'claimed_count'],
    });
    if (lifecycle.is_sold_out) {
      return res.status(400).json({ success: false, message: 'Ma giam gia da het luot su dung' });
    }

    return res.json({
      success: true,
      data: {
        coupon: decorateCoupon(result.coupon),
        discount_amount: result.coupon_discount,
        eligible_subtotal: result.eligible_subtotal,
        free_shipping: result.free_shipping,
        points_multiplier: result.points_multiplier,
      },
      message: 'Áp dụng coupon thành công',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  return res.json({ success: true, message: 'Đã bỏ coupon khỏi giỏ hàng' });
};

export const removeCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    await Coupon.findByIdAndDelete(req.params.id);

    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Admin',
        action: 'DELETE',
        entity: 'coupon',
        entityId: req.params.id,
        details: { code: coupon?.code, title: coupon?.title },
        ip: req.ip
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log coupon deletion:', auditErr.message);
    }

    return res.json({ success: true, message: 'Xóa mã thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const usage = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role_id !== 3 && req.query.user_id) filter.user_id = req.query.user_id;
    else if (req.userId) filter.user_id = req.userId;
    return res.json({ success: true, data: await CouponUsage.find(filter).sort('-created_at') });
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const create = async (req, res) => {
  try {
    const body = normalizeCouponPayload(req.body);
    if (body.code) body.code = String(body.code).toUpperCase();
    if (req.user) body.created_by = req.user._id || req.user.id;

    const validationError = validateCouponPayload(body, { isUpdate: false });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if ((body.total_quantity === undefined || body.total_quantity === null || body.total_quantity === '') && body.usage_limit) {
      body.total_quantity = Number(body.usage_limit) || null;
    }
    if (body.total_quantity !== undefined && body.total_quantity !== null && body.total_quantity !== '') {
      body.total_quantity = Math.max(0, Number(body.total_quantity) || 0);
    }

    const c = await Coupon.create(body);

    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Admin',
        action: 'CREATE',
        entity: 'coupon',
        entityId: c._id,
        details: { code: c.code, title: c.title },
        ip: req.ip
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log coupon creation:', auditErr.message);
    }

    if (c.is_active) {
      try {
        await broadcastCampaignCreated({
          campaignType: 'coupon',
          campaignId: c._id,
          title: c.title || c.code,
          description: c.description,
          link: '/promotions',
          createdBy: req.user?._id || req.user?.id || null,
        });
      } catch (broadcastErr) {
        console.error('[CouponCreate] Broadcast failed:', broadcastErr.message);
      }
    }

    return res.status(201).json({ success: true, data: decorateCoupon(c), message: 'Tạo mã thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const update = async (req, res) => {
  try {
    const body = normalizeCouponPayload(req.body);
    if (body.code) body.code = String(body.code).toUpperCase();

    const validationError = validateCouponPayload(body, { isUpdate: true });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (body.total_quantity !== undefined && body.total_quantity !== null && body.total_quantity !== '') {
      body.total_quantity = Math.max(0, Number(body.total_quantity) || 0);
    }

    // Check if this update is activating the coupon
    const previousDoc = body.is_active === true ? await Coupon.findById(req.params.id).lean() : null;
    const wasInactive = previousDoc && !previousDoc.is_active;

    const c = await Coupon.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!c) return res.status(404).json({ success: false, message: 'Coupon not found' });

    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Admin',
        action: 'UPDATE',
        entity: 'coupon',
        entityId: c._id,
        details: { code: c.code, title: c.title },
        ip: req.ip
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log coupon update:', auditErr.message);
    }

    // Broadcast when coupon transitions from inactive → active
    if (wasInactive && c.is_active) {
      try {
        await broadcastCampaignCreated({
          campaignType: 'coupon',
          campaignId: c._id,
          title: c.title || c.code,
          description: c.description,
          link: '/promotions',
          createdBy: req.user?._id || req.user?.id || null,
        });
      } catch (broadcastErr) {
        console.error('[CouponActivate] Broadcast failed:', broadcastErr.message);
      }
    }

    return res.json({ success: true, data: decorateCoupon(c), message: 'Cập nhật thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
