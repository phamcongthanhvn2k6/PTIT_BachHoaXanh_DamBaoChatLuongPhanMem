import mongoose from 'mongoose';
import Promotion from '../models/Promotion.js';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import { PromotionClaim, PromotionUsage } from '../models/PromotionUsage.js';
import { calculateCheckoutTotals, getApplicablePromotions } from '../services/promotionCalculationService.js';
import { attachCampaignLifecycle } from '../services/campaignLifecycleService.js';
import { broadcastCampaignCreated } from '../services/notificationBroadcastService.js';

const normalizePromotion = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    obj.id = obj._id;
    return obj;
};

const isPrivilegedRequest = (req) => {
    const roleId = Number(req.user?.role_id);
    return Boolean(req.user && roleId !== 3 && req.user?.role_key !== 'customer');
};

const decoratePromotion = (doc) => {
    const normalized = normalizePromotion(doc);
    return attachCampaignLifecycle(normalized, {
        limitKeys: ['total_quantity', 'max_redemptions', 'usage_limit'],
        usedKeys: ['claimed_count', 'usage_count'],
    });
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const sanitizeIdArray = (value) => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value === 'string') {
        return value.split(',').map((v) => v.trim()).filter(Boolean);
    }
    return [];
};

const normalizePromotionPayload = (body = {}) => {
    const normalized = { ...body };

    normalized.target_product_ids = sanitizeIdArray(body.target_product_ids);
    normalized.target_category_ids = sanitizeIdArray(body.target_category_ids);
    normalized.target_branch_ids = sanitizeIdArray(body.target_branch_ids);
    normalized.excluded_product_ids = sanitizeIdArray(body.excluded_product_ids);
    normalized.excluded_category_ids = sanitizeIdArray(body.excluded_category_ids);

    normalized.usage_per_user = toNumberOrNull(body.usage_per_user) ?? 1;
    normalized.total_quantity = toNumberOrNull(body.total_quantity);
    normalized.usage_limit = toNumberOrNull(body.usage_limit);
    normalized.max_redemptions = toNumberOrNull(body.max_redemptions);
    normalized.min_order_amount = toNumberOrNull(body.min_order_amount) ?? 0;
    normalized.min_quantity = toNumberOrNull(body.min_quantity) ?? 0;
    normalized.gift_quantity = toNumberOrNull(body.gift_quantity) ?? 0;
    normalized.discount_value = toNumberOrNull(body.discount_value) ?? 0;
    normalized.max_discount_amount = toNumberOrNull(body.max_discount_amount);
    normalized.hide_after_expired_hours = toNumberOrNull(body.hide_after_expired_hours) ?? 24;
    normalized.claim_campaign = Boolean(body.claim_campaign);

    if (!normalized.banner_image && normalized.image) {
        normalized.banner_image = normalized.image;
    }
    if (!normalized.image && normalized.banner_image) {
        normalized.image = normalized.banner_image;
    }

    return normalized;
};
const validatePromotionPayload = (body = {}) => {
    const type = String(body.type || '').trim();
    const scope = String(body.scope || 'all').trim();
    if (!String(body.title || '').trim()) return 'Promotion title is required';
    if (!type) return 'Promotion type is required';
    if (!['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'].includes(type)) {
        return 'Invalid promotion type';
    }

    if ((type === 'percent' || type === 'flash_deal') && (Number(body.discount_value) < 0 || Number(body.discount_value) > 100)) {
        return 'Discount value for percentage promotions must be between 0 and 100';
    }

    if (type === 'bogo') {
        if (!(Number(body.min_quantity) > 0 && Number(body.gift_quantity) > 0)) {
            return 'BOGO promotion requires min_quantity and gift_quantity > 0';
        }
    }

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

// GET /api/promotions
export const list = async (req, res) => {
    try {
        const { status, type, scope, is_active, search, page, limit, sort } = req.query;
        const isPrivileged = isPrivilegedRequest(req);
        const filter = {};
        
        if (type) filter.type = type;
        if (scope) filter.scope = scope;
        
        if (is_active !== undefined) {
            filter.is_active = is_active === 'true';
        }
        
        if (status && status !== 'all') {
            const now = new Date();
            if (status === 'active') {
                filter.is_active = true;
            } else if (status === 'inactive') {
                filter.is_active = false;
            } else if (status === 'expired') {
                filter.end_date = { $lt: now };
            } else {
                filter.status = status;
            }
        }
        
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { badge_text: { $regex: search, $options: 'i' } },
            ];
        }

        let sortQuery = { priority: -1, created_at: -1 };
        if (sort === 'expiring') {
            sortQuery = { end_date: 1 };
        } else if (sort === 'newest') {
            sortQuery = { created_at: -1 };
        }

        if (page !== undefined || limit !== undefined) {
            const pageNum = Math.max(1, Number(page || 1));
            const limitNum = Math.min(100, Math.max(1, Number(limit || 10)));
            const [total, rows] = await Promise.all([
                Promotion.countDocuments(filter),
                Promotion.find(filter).sort(sortQuery).skip((pageNum - 1) * limitNum).limit(limitNum)
            ]);
            const mapped = rows.map(decoratePromotion);
            const data = isPrivileged ? mapped : mapped.filter((promo) => {
                const statusLower = String(promo.status || 'active').toLowerCase();
                if (!promo.is_active) return false;
                if (['draft', 'paused'].includes(statusLower)) return false;
                return promo.is_visible_public;
            });
            return res.json({
                success: true,
                data,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum) || 1
                }
            });
        }

        const promos = await Promotion.find(filter).sort(sortQuery);
        const mapped = promos.map(decoratePromotion);

        if (!isPrivileged) {
            const visible = mapped.filter((promo) => {
                const statusLower = String(promo.status || 'active').toLowerCase();
                if (!promo.is_active) return false;
                if (['draft', 'paused'].includes(statusLower)) return false;
                return promo.is_visible_public;
            });
            return res.json({ success: true, data: visible });
        }

        return res.json({ success: true, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/promotions/:id
export const detail = async (req, res) => {
    try {
        const promo = await Promotion.findById(req.params.id);
        if (!promo) return res.status(404).json({ success: false, message: 'Promotion not found' });
        return res.json({ success: true, data: decoratePromotion(promo) });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/promotions
export const create = async (req, res) => {
    try {
        const body = normalizePromotionPayload(req.body);
        if (req.user) body.created_by = req.user._id || req.user.id;

        const validationError = validatePromotionPayload(body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        if ((body.total_quantity === undefined || body.total_quantity === null || body.total_quantity === '') && body.usage_limit) {
            body.total_quantity = Number(body.usage_limit) || null;
        }
        if (body.total_quantity !== undefined && body.total_quantity !== null && body.total_quantity !== '') {
            body.total_quantity = Math.max(0, Number(body.total_quantity) || 0);
        }
        if (body.claimed_count !== undefined && body.claimed_count !== null && body.claimed_count !== '') {
            body.claimed_count = Math.max(0, Number(body.claimed_count) || 0);
        }

        if (!body.status) {
            const now = new Date();
            const start = body.start_date ? new Date(body.start_date) : null;
            const end = body.end_date ? new Date(body.end_date) : null;
            if (!body.is_active) body.status = 'paused';
            else if (start && start > now) body.status = 'scheduled';
            else if (end && end < now) body.status = 'expired';
            else body.status = 'active';
        }

        const promo = await Promotion.create(body);

        try {
            const { logActivity } = await import('../services/auditService.js');
            await logActivity({
                userId: req.userId,
                userName: req.user?.full_name || req.user?.username || 'Admin',
                action: 'CREATE',
                entity: 'promotion',
                entityId: promo._id,
                details: { title: promo.title, type: promo.type },
                ip: req.ip
            });
        } catch (auditErr) {
            console.error('[Audit] Failed to log promotion creation:', auditErr.message);
        }

        if (promo.status === 'active' || promo.status === 'scheduled') {
            try {
                await broadcastCampaignCreated({
                    campaignType: 'promotion',
                    campaignId: promo._id,
                    title: promo.title,
                    description: promo.description,
                    link: '/promotions',
                    createdBy: req.user?._id || req.user?.id || null,
                });
            } catch (broadcastErr) {
                console.error('[PromotionCreate] Broadcast failed:', broadcastErr.message);
            }
        }

        return res.status(201).json({ success: true, data: decoratePromotion(promo), message: 'Tạo khuyến mãi thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/promotions/:id
export const update = async (req, res) => {
    try {
        const body = normalizePromotionPayload(req.body);

        const validationError = validatePromotionPayload({ ...body, title: body.title || 'Existing promotion' });
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }
        if (body.total_quantity !== undefined && body.total_quantity !== null && body.total_quantity !== '') {
            body.total_quantity = Math.max(0, Number(body.total_quantity) || 0);
        }
        if (body.claimed_count !== undefined && body.claimed_count !== null && body.claimed_count !== '') {
            body.claimed_count = Math.max(0, Number(body.claimed_count) || 0);
        }

        // Check if this update is activating a previously-inactive promotion
        const previousDoc = body.is_active === true ? await Promotion.findById(req.params.id).lean() : null;
        const wasInactive = previousDoc && !previousDoc.is_active;

        const promo = await Promotion.findByIdAndUpdate(req.params.id, body, { new: true });
        if (!promo) return res.status(404).json({ success: false, message: 'Promotion not found' });

        try {
            const { logActivity } = await import('../services/auditService.js');
            await logActivity({
                userId: req.userId,
                userName: req.user?.full_name || req.user?.username || 'Admin',
                action: 'UPDATE',
                entity: 'promotion',
                entityId: promo._id,
                details: { title: promo.title, type: promo.type },
                ip: req.ip
            });
        } catch (auditErr) {
            console.error('[Audit] Failed to log promotion update:', auditErr.message);
        }

        // Broadcast when promotion transitions from inactive → active
        if (wasInactive && promo.is_active) {
            try {
                await broadcastCampaignCreated({
                    campaignType: 'promotion',
                    campaignId: promo._id,
                    title: promo.title,
                    description: promo.description,
                    link: '/promotions',
                    createdBy: req.user?._id || req.user?.id || null,
                });
            } catch (broadcastErr) {
                console.error('[PromotionUpdate] Broadcast failed:', broadcastErr.message);
            }
        }

        return res.json({ success: true, data: decoratePromotion(promo), message: 'Cập nhật thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/promotions/:id
export const remove = async (req, res) => {
    try {
        const promo = await Promotion.findById(req.params.id);
        await Promotion.findByIdAndDelete(req.params.id);

        try {
            const { logActivity } = await import('../services/auditService.js');
            await logActivity({
                userId: req.userId,
                userName: req.user?.full_name || req.user?.username || 'Admin',
                action: 'DELETE',
                entity: 'promotion',
                entityId: req.params.id,
                details: { title: promo?.title },
                ip: req.ip
            });
        } catch (auditErr) {
            console.error('[Audit] Failed to log promotion deletion:', auditErr.message);
        }

        return res.json({ success: true, message: 'Xóa khuyến mãi thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/promotions/:id/activate
export const activate = async (req, res) => {
    try {
        const promo = await Promotion.findByIdAndUpdate(
            req.params.id,
            { is_active: true, status: 'active' },
            { new: true },
        );
        if (!promo) return res.status(404).json({ success: false, message: 'Promotion not found' });

        // Broadcast notification to all active users when promotion goes live
        try {
            await broadcastCampaignCreated({
                campaignType: 'promotion',
                campaignId: promo._id,
                title: promo.title,
                description: promo.description,
                link: '/promotions',
                createdBy: req.user?._id || req.user?.id || null,
            });
        } catch (broadcastErr) {
            console.error('[PromotionActivate] Broadcast failed:', broadcastErr.message);
        }

        return res.json({ success: true, data: normalizePromotion(promo), message: 'Đã kích hoạt khuyến mãi' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/promotions/:id/pause
export const pause = async (req, res) => {
    try {
        const promo = await Promotion.findByIdAndUpdate(
            req.params.id,
            { is_active: false, status: 'paused' },
            { new: true },
        );
        if (!promo) return res.status(404).json({ success: false, message: 'Promotion not found' });
        return res.json({ success: true, data: normalizePromotion(promo), message: 'Đã tạm dừng khuyến mãi' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/promotions/applicable?branchId=...&cart=...
export const applicable = async (req, res) => {
    try {
        const branchId = req.query.branchId || req.query.branch_id || null;
        const cartItems = req.query.cart ? JSON.parse(req.query.cart) : [];
        const data = await getApplicablePromotions({
            cartItems,
            branchId,
            userId: req.user ? (req.user._id || req.user.id) : null,
        });
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message || 'Invalid cart payload' });
    }
};

// POST /api/promotions/calculate
// body = { cartItems: [], branchId: '...', couponCode: '...' }
export const calculate = async (req, res) => {
    try {
        const { cartItems, branchId, couponCode, shippingFeeBase } = req.body;
        const userId = req.user ? (req.user._id || req.user.id) : null;

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.json({
                success: true,
                data: {
                    total: 0,
                    subtotal: 0,
                    discount_amount: 0,
                    items: [],
                    gift_items: [],
                    promotions_applied: [],
                    points_earned: 0,
                },
            });
        }

        const data = await calculateCheckoutTotals({
            cartItems,
            branchId,
            couponCode,
            product_voucher_id: req.body.product_voucher_id,
            shipping_voucher_id: req.body.shipping_voucher_id,
            shippingFeeBase,
            userId,
        });
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/promotions/claims
export const claims = async (req, res) => {
    try {
        const filter = {};
        if (req.query.promotion_id) filter.promotion_id = req.query.promotion_id;
        if (req.query.user_id) filter.user_id = req.query.user_id;
        if (req.query.status) filter.status = req.query.status;

        const data = await PromotionClaim.find(filter).sort({ created_at: -1 }).limit(500);
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/promotions/:id/claim
export const claim = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const promo = await Promotion.findById(req.params.id).session(session);
        if (!promo) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Promotion not found' });
        }

        const now = new Date();
        const status = String(promo.status || 'active').toLowerCase();
        if (!promo.is_active || ['draft', 'paused', 'expired'].includes(status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Khuyến mãi hiện không khả dụng để nhận' });
        }
        if (promo.start_date && now < new Date(promo.start_date)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Khuyến mãi chưa tới thời gian nhận' });
        }
        if (promo.end_date && now > new Date(promo.end_date)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Khuyến mãi đã hết hạn nhận' });
        }

        const perUserLimit = Number(promo.usage_per_user || 1);
        const existingClaimCount = await PromotionClaim.countDocuments({
            promotion_id: promo._id,
            user_id: userId,
            status: { $in: ['claimed', 'used'] },
        }).session(session);

        if (perUserLimit > 0 && existingClaimCount >= perUserLimit) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Bạn đã dùng hết lượt nhận cho khuyến mãi này' });
        }

        const inventoryLimit = Number(promo.total_quantity || promo.max_redemptions || promo.usage_limit || 0);
        const updateFilter = { _id: promo._id };
        if (inventoryLimit > 0) {
            updateFilter.claimed_count = { $lt: inventoryLimit };
        }

        const updatedPromo = await Promotion.findOneAndUpdate(
            updateFilter,
            { $inc: { claimed_count: 1 } },
            { new: true, session },
        );

        if (!updatedPromo) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Khuyen mai da het luot nhan' });
        }

        const claimDocs = await PromotionClaim.create([{
            promotion_id: promo._id,
            user_id: userId,
            branch_id: req.body?.branch_id || req.query?.branchId || null,
            status: 'claimed',
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            data: claimDocs[0],
            promotion: decoratePromotion(updatedPromo),
            message: 'Nhận khuyến mãi thành công',
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/promotions/my-wallet
// Returns only promotions the current user has claimed
export const myWallet = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const claims = await PromotionClaim.find({
            user_id: userId,
            status: { $in: ['claimed', 'used'] },
        }).sort({ created_at: -1 }).lean();

        const promoIds = [...new Set(claims.map((c) => String(c.promotion_id)))];

        if (promoIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const promos = await Promotion.find({ _id: { $in: promoIds } });
        const mapped = promos.map((p) => {
            const decorated = decoratePromotion(p);
            const userClaim = claims.find((cl) => String(cl.promotion_id) === String(p._id));
            decorated.user_claim_status = userClaim?.status || 'claimed';
            decorated.user_claimed_at = userClaim?.claimed_at || userClaim?.created_at;
            return decorated;
        });

        return res.json({ success: true, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/promotions/:id/usage
export const usage = async (req, res) => {
    try {
        const data = await PromotionUsage.find({ promotion_id: req.params.id }).sort({ created_at: -1 }).limit(500);
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/promotions/bulk-expiring
export const bulkCreateExpiringPromotions = async (req, res) => {
    try {
        const productsDoc = await Product.find({
            is_active: true,
            expiry_date: { $ne: null }
        }).lean();

        const activePromotions = await Promotion.find({
            is_active: true,
            status: 'active',
            end_date: { $gte: new Date() }
        }).lean();

        const promotedProductIds = new Set();
        activePromotions.forEach(promo => {
            if (promo.scope === 'product' && Array.isArray(promo.target_product_ids)) {
                promo.target_product_ids.forEach(id => promotedProductIds.add(String(id)));
            }
        });

        const newPromotions = [];
        const now = new Date();

        for (const product of productsDoc) {
            if (promotedProductIds.has(String(product._id))) continue;

            const expDate = new Date(product.expiry_date);
            const diffMs = expDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays < 0) continue; // expired
            if (product.stock <= 0) continue; // required stock

            const warningDays = product.expiry_warning_days ?? 7;

            if (diffDays <= warningDays) {
                let discountValue = 50;
                if (diffDays <= 3) discountValue = 70;
                else if (diffDays <= 7) discountValue = 50;
                else if (diffDays <= 14) discountValue = 30;

                const start = new Date(now);
                const end = new Date(expDate);

                newPromotions.push({
                    title: `⚠️ Xả hàng: ${product.name}`,
                    description: `Sale xả hàng sắp hết hạn. SKU: ${product.sku || 'N/A'}. HSD: ${expDate.toLocaleDateString('vi-VN')}. Còn ${diffDays} ngày.`,
                    type: 'percent',
                    discount_value: discountValue,
                    scope: 'product',
                    target_product_ids: [String(product._id)],
                    start_date: start,
                    end_date: end,
                    total_quantity: Math.max(1, Number(product.stock)),
                    status: 'active',
                    is_active: true,
                    badge_text: 'Giải phóng hàng',
                    created_by: req.user?._id || req.user?.id || null,
                    image: (product.images && product.images[0]) || product.thumbnail || 'https://via.placeholder.com/800x400.png?text=Clearance+Sale',
                    banner_image: (product.images && product.images[0]) || product.thumbnail || 'https://via.placeholder.com/800x400.png?text=Clearance+Sale',
                });
            }
        }

        if (newPromotions.length > 0) {
            await Promotion.insertMany(newPromotions);
        }

        return res.json({ success: true, count: newPromotions.length, message: 'Tạo khuyến mãi hàng loạt thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
