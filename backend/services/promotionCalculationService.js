import Promotion from '../models/Promotion.js';
import { PromotionUsage } from '../models/PromotionUsage.js';
import { Coupon, CouponUsage } from '../models/Coupon.js';
import { computeCampaignLifecycle } from './campaignLifecycleService.js';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import { resolveEffectivePrice, resolveProductPricing } from './pricingResolverService.js';

const DEFAULT_SHIPPING_FEE = 30000;

const toNumber = (value, defaultValue = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const toIdString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const buildIdSet = (arr) => new Set(asArray(arr).map((item) => toIdString(item)));

const isInSet = (set, value) => set.has(toIdString(value));

const isDateWindowActive = (entity, now) => {
    if (!entity) return false;
    if (entity.start_date && now < new Date(entity.start_date)) return false;
    if (entity.end_date && now > new Date(entity.end_date)) return false;
    return true;
};

const isStatusActive = (entity) => {
    if (!entity?.is_active) return false;
    const status = String(entity.status || '').toLowerCase();
    if (!status || status === 'active') return true;
    if (status === 'scheduled') return true;
    return !['draft', 'paused', 'expired'].includes(status);
};

const isBelowLimit = (limit, used) => {
    const normalizedLimit = Number(limit);
    if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) return true;
    return toNumber(used, 0) < normalizedLimit;
};

const hasUsageQuota = (entity) => {
    const claimLikeUsed = toNumber(entity.claimed_count, toNumber(entity.used_count, toNumber(entity.usage_count, 0)));
    const usageLikeUsed = toNumber(entity.usage_count, toNumber(entity.used_count, 0));
    const claimLikeLimit = entity.total_quantity ?? entity.usage_limit;

    return (
        isBelowLimit(claimLikeLimit, claimLikeUsed)
        && isBelowLimit(entity.max_redemptions, usageLikeUsed)
    );
};

const isScopedToItem = (ruleLike, item, branchId) => {
    const excludedProducts = buildIdSet(ruleLike.excluded_product_ids);
    const excludedCategories = buildIdSet(ruleLike.excluded_category_ids);

    if (isInSet(excludedProducts, item.product_id)) return false;
    if (isInSet(excludedCategories, item.category_id)) return false;

    const scope = String(ruleLike.scope || 'all').toLowerCase();
    if (scope === 'all') return true;

    if (scope === 'product') {
        const targetProducts = buildIdSet(ruleLike.target_product_ids);
        return targetProducts.size > 0 && isInSet(targetProducts, item.product_id);
    }

    if (scope === 'category') {
        const targetCategories = buildIdSet(ruleLike.target_category_ids);
        return targetCategories.size > 0 && isInSet(targetCategories, item.category_id);
    }

    if (scope === 'branch') {
        const targetBranches = buildIdSet(ruleLike.target_branch_ids);
        return targetBranches.size > 0 && isInSet(targetBranches, branchId);
    }

    return false;
};

const meetsQuantityAndOrder = (ruleLike, item, orderSubtotal) => {
    const minQty = toNumber(ruleLike.min_quantity, 0);
    const minOrder = toNumber(ruleLike.min_order_amount, 0);
    if (minQty > 0 && toNumber(item.quantity, 0) < minQty) return false;
    if (minOrder > 0 && orderSubtotal < minOrder) return false;
    return true;
};

const calcDiscountByType = (ruleLike, lineSubtotal) => {
    const type = String(ruleLike.type || '').toLowerCase();
    const discountValue = toNumber(ruleLike.discount_value, 0);
    const maxDiscountAmount = toNumber(ruleLike.max_discount_amount, 0);

    if (type === 'percent' || type === 'flash_deal') {
        let discount = lineSubtotal * (discountValue / 100);
        if (maxDiscountAmount > 0) discount = Math.min(discount, maxDiscountAmount);
        return Math.max(0, discount);
    }

    if (type === 'fixed_amount') {
        return Math.max(0, Math.min(discountValue, lineSubtotal));
    }

    return 0;
};

const mergeGiftItems = (giftItems) => {
    const map = new Map();
    for (const gift of giftItems) {
        const key = `${toIdString(gift.product_id)}:${toIdString(gift.promotion_id)}`;
        if (!map.has(key)) {
            map.set(key, { ...gift });
        } else {
            const current = map.get(key);
            current.quantity += toNumber(gift.quantity, 0);
            map.set(key, current);
        }
    }
    return Array.from(map.values());
};

const normalizeCartItem = (item) => {
    const quantity = Math.max(1, toNumber(item.quantity, 1));
    const unitPrice = Math.max(0, toNumber(item.price ?? item.unit_price, 0));

    return {
        _id: item._id,
        branch_product_id: item.branch_product_id || item._id || null,
        product_id: item.product_id || item._id || null,
        category_id: item.category_id || null,
        name: item.name || item.product_name || 'Sản phẩm',
        product_name: item.product_name || item.name || 'Sản phẩm',
        product_image: item.product_image || item.image || '',
        quantity,
        price: unitPrice,
    };
};

export const normalizeCartItems = (cartItems) => asArray(cartItems).map(normalizeCartItem);

const getActivePromotionQuery = (now) => ({
    is_active: true,
    status: { $nin: ['draft', 'paused', 'expired'] },
    $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
    ],
});

const getActiveCouponQuery = (now) => ({
    is_active: true,
    $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
    ],
});

async function getPromotionUsageCountMap(promotionIds, userId, session = null) {
    if (!userId || promotionIds.length === 0) return new Map();
    const rows = await PromotionUsage.aggregate([
        {
            $match: {
                user_id: userId,
                promotion_id: { $in: promotionIds },
            },
        },
        {
            $group: {
                _id: '$promotion_id',
                count: { $sum: 1 },
            },
        },
    ]).session(session);

    const map = new Map();
    for (const row of rows) {
        map.set(toIdString(row._id), toNumber(row.count, 0));
    }
    return map;
}

export async function validateCouponForCart({
    code,
    voucher_id,
    branchId,
    cartItems,
    userId = null,
    now = new Date(),
    session = null,
}) {
    const normalizedItems = normalizeCartItems(cartItems);
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0);
    const subtotal = normalizedItems.reduce((sum, item) => sum + (toNumber(item.price, 0) * toNumber(item.quantity, 0)), 0);

    let coupon = null;
    let isPromotion = false;

    if (code) {
        coupon = await Coupon.findOne({
            code: String(code || '').trim().toUpperCase(),
            ...getActiveCouponQuery(now),
        }).session(session);
    } else if (voucher_id) {
        coupon = await Coupon.findOne({
            _id: voucher_id,
            ...getActiveCouponQuery(now),
        }).session(session);
        if (!coupon) {
            coupon = await Promotion.findOne({
                _id: voucher_id,
                ...getActivePromotionQuery(now),
            }).session(session);
            isPromotion = true;
        }
    }

    if (!coupon) {
        return { valid: false, message: 'Mã giảm giá/Khuyến mãi không tồn tại hoặc đã hết hạn.' };
    }

    if (!isDateWindowActive(coupon, now)) {
        return { valid: false, message: 'Mã giảm giá ngoài thời gian áp dụng.' };
    }

    if (isPromotion) {
        if (!hasUsageQuota(coupon)) {
            return { valid: false, message: 'Khuyến mãi đã hết lượt sử dụng.' };
        }
        if (userId && coupon.usage_per_user) {
            const usageMap = await getPromotionUsageCountMap([coupon._id], userId, session);
            if ((usageMap.get(toIdString(coupon._id)) || 0) >= toNumber(coupon.usage_per_user, 1)) {
                return { valid: false, message: 'Bạn đã dùng hết lượt cho khuyến mãi này.' };
            }
        }
    } else {
        if (!isBelowLimit(coupon.total_quantity, toNumber(coupon.used_count, 0))) {
            return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng.' };
        }

        if (coupon.usage_limit && toNumber(coupon.used_count, 0) >= toNumber(coupon.usage_limit, 0)) {
            return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng.' };
        }
        if (userId && coupon.usage_per_user) {
            const userUsageCount = await CouponUsage.countDocuments({ coupon_id: coupon._id, user_id: userId }).session(session);
            if (userUsageCount >= toNumber(coupon.usage_per_user, 1)) {
                return { valid: false, message: 'Bạn đã dùng hết lượt cho mã giảm giá này.' };
            }
        }
    }

    if (coupon.min_order_amount && subtotal < toNumber(coupon.min_order_amount, 0)) {
        return {
            valid: false,
            message: `Đơn tối thiểu ${toNumber(coupon.min_order_amount, 0).toLocaleString('vi-VN')}đ để dùng mã này.`,
        };
    }

    if (coupon.min_quantity && totalQuantity < toNumber(coupon.min_quantity, 0)) {
        return {
            valid: false,
            message: `Giỏ hàng cần ít nhất ${toNumber(coupon.min_quantity, 0)} sản phẩm để dùng mã này.`,
        };
    }

    const eligibleItems = normalizedItems.filter((item) => isScopedToItem(coupon, item, branchId));
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (toNumber(item.price, 0) * toNumber(item.quantity, 0)), 0);
    if (String(coupon.scope || 'all') !== 'all' && eligibleItems.length === 0) {
        return { valid: false, message: 'Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng hiện tại.' };
    }

    let couponDiscount = 0;

    // Support voucher_type = shipping
    const isShippingCoupon = String(coupon.voucher_type || '').toLowerCase() === 'shipping';
    if (isShippingCoupon) {
        // Shipping coupons can't provide product discounts
        // The free_shipping flag will negate the shipping fee later
        couponDiscount = 0;
        coupon.type = 'free_shipping';
    } else {
        if (coupon.type === 'percent') {
            couponDiscount = eligibleSubtotal * (toNumber(coupon.discount_value, 0) / 100);
            if (coupon.max_discount_amount) {
                couponDiscount = Math.min(couponDiscount, toNumber(coupon.max_discount_amount, 0));
            }
        }
        if (coupon.type === 'fixed_amount') {
            couponDiscount = Math.min(toNumber(coupon.discount_value, 0), eligibleSubtotal);
        }
    }

    return {
        valid: true,
        coupon,
        eligible_items: eligibleItems,
        eligible_subtotal: eligibleSubtotal,
        coupon_discount: Math.max(0, couponDiscount),
        free_shipping: coupon.type === 'free_shipping',
        points_multiplier: coupon.type === 'points' ? Math.max(1, toNumber(coupon.discount_value, 1)) : 1,
    };
}

export async function getApplicablePromotions({ cartItems, branchId, userId = null, now = new Date() }) {
    const normalizedItems = normalizeCartItems(cartItems);
    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const promotions = await Promotion.find(getActivePromotionQuery(now)).sort({ priority: -1, created_at: -1 });
    const usageMap = await getPromotionUsageCountMap(promotions.map((p) => p._id), userId);

    return promotions
        .filter((promo) => isStatusActive(promo) && isDateWindowActive(promo, now) && hasUsageQuota(promo))
        .map((promo) => {
            const usedByUser = usageMap.get(toIdString(promo._id)) || 0;
            const perUserLimitOk = !promo.usage_per_user || usedByUser < toNumber(promo.usage_per_user, 1);
            const eligibleItems = normalizedItems.filter((item) => isScopedToItem(promo, item, branchId) && meetsQuantityAndOrder(promo, item, subtotal));
            return {
                ...promo.toObject(),
                ...computeCampaignLifecycle(promo, {
                    limitKeys: ['total_quantity', 'max_redemptions', 'usage_limit'],
                    usedKeys: ['claimed_count', 'usage_count'],
                }),
                eligible_item_count: eligibleItems.length,
                user_usage_count: usedByUser,
                user_can_use: perUserLimitOk,
            };
        })
        .filter((promo) => promo.eligible_item_count > 0 && promo.user_can_use);
}

export async function calculateCheckoutTotals(input, branchIdArg, couponCodeArg = null, userIdArg = null, productVoucherIdArg = null, shippingVoucherIdArg = null) {
    const options = Array.isArray(input)
        ? {
            cartItems: input,
            branchId: branchIdArg,
            couponCode: couponCodeArg,
            userId: userIdArg,
            productVoucherId: productVoucherIdArg,
            shippingVoucherId: shippingVoucherIdArg,
        }
        : (input || {});

    const now = options.now ? new Date(options.now) : new Date();
    const shippingFeeBase = toNumber(options.shippingFeeBase, DEFAULT_SHIPPING_FEE);
    const branchId = options.branchId;
    const couponCode = options.couponCode || null;
    const productVoucherId = options.productVoucherId || options.product_voucher_id || null;
    const shippingVoucherId = options.shippingVoucherId || options.shipping_voucher_id || null;
    const userId = options.userId || null;
    const session = options.session || null;

    const normalizedItems = normalizeCartItems(options.cartItems || options.items || []);
    if (normalizedItems.length === 0) {
        return {
            price_changed: false,
            original_total: 0,
            subtotal: 0,
            item_discounts: 0,
            promotion_discount: 0,
            coupon_discount: 0,
            discount_amount: 0,
            shipping_fee: 0,
            free_shipping_applied: false,
            final_total: 0,
            total: 0,
            points_earned: 0,
            items: [],
            gift_items: [],
            promotions_applied: [],
            applied_promotions: [],
            coupon_applied: null,
            product_voucher_applied: null,
            shipping_voucher_applied: null,
            coupon_error: null,
            product_voucher_error: null,
            shipping_voucher_error: null,
            breakdown: {
                subtotal: 0,
                item_discounts: 0,
                promotion_discount: 0,
                coupon_discount: 0,
                product_voucher_discount: 0,
                shipping_voucher_discount: 0,
                shipping_fee: 0,
                free_shipping_applied: false,
                points_earned: 0,
                final_total: 0,
            },
        };
    }

    // Recalculate latest effective price for each item to prevent stale pricing
    let priceChanged = false;
    for (const item of normalizedItems) {
        const bpId = item.branch_product_id;
        let bp = null;
        let prod = null;

        if (bpId) {
            try {
                bp = await BranchProduct.findById(bpId).session(session).lean();
                if (bp) {
                    prod = await Product.findById(bp.product_id).session(session).lean();
                }
            } catch (e) {}
        }

        if (!bp && item.product_id && branchId) {
            try {
                bp = await BranchProduct.findOne({ product_id: item.product_id, branch_id: branchId }).session(session).lean();
                prod = await Product.findById(item.product_id).session(session).lean();
            } catch (e) {}
        }

        if (prod) {
            const pricing = await resolveProductPricing(prod, bp, branchId, { now });
            const clientPrice = toNumber(item.price, 0);
            if (Math.abs(pricing.effective_price - clientPrice) > 0.01) {
                priceChanged = true;
            }
            item.price = pricing.effective_price;
            item.original_price = pricing.original_price;
            item.discount_percent = pricing.discount_percent;
            item.effective_price = pricing.effective_price;
            item.pricing_source = pricing.pricing_source;
            item.active_hot_deal = pricing.active_hot_deal;
            item.active_promotion = pricing.active_promotion;
            item.hot_deal_id = pricing.active_hot_deal?.id || null;
            item.pricing = pricing;
        }
    }

    const originalSubtotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const activePromotions = await Promotion.find(getActivePromotionQuery(now)).sort({ priority: -1, created_at: -1 }).session(session);
    const userUsageMap = await getPromotionUsageCountMap(activePromotions.map((p) => p._id), userId, session);

    const promotionAccumulator = new Map();
    const lineItems = [];
    const pendingGiftItems = [];
    let freeShippingApplied = false;
    let pointsEarned = 0;
    let itemDiscounts = 0;

    for (const item of normalizedItems) {
        const lineSubtotal = item.price * item.quantity;
        const eligiblePromotions = activePromotions.filter((promo) => {
            if (!isStatusActive(promo) || !isDateWindowActive(promo, now) || !hasUsageQuota(promo)) return false;
            if (!isScopedToItem(promo, item, branchId)) return false;
            if (!meetsQuantityAndOrder(promo, item, originalSubtotal)) return false;

            const usedByUser = userUsageMap.get(toIdString(promo._id)) || 0;
            if (promo.usage_per_user && usedByUser >= toNumber(promo.usage_per_user, 1)) return false;
            return true;
        });

        const stackableDiscountPromos = [];
        let bestNonStackable = null;
        let bestNonStackableDiscount = 0;
        const appliedPromotionRefs = [];
        let linePointsMultiplier = 1;

        for (const promo of eligiblePromotions) {
            const promoId = toIdString(promo._id);
            const promoType = String(promo.type || '').toLowerCase();

            if (promoType === 'free_shipping') {
                freeShippingApplied = true;
            }

            if (promoType === 'points_multiplier') {
                linePointsMultiplier = Math.max(
                    linePointsMultiplier,
                    toNumber(promo.points_multiplier, 0) || toNumber(promo.discount_value, 0) || 1,
                );
            }

            if (promoType === 'bogo') {
                const buyQty = Math.max(1, toNumber(promo.min_quantity, 2));
                const giftQty = Math.max(1, toNumber(promo.gift_quantity, 1));
                const sets = Math.floor(item.quantity / buyQty);
                if (sets > 0) {
                    pendingGiftItems.push({
                        promotion_id: promoId,
                        product_id: promo.gift_product_id || item.product_id,
                        branch_product_id: item.branch_product_id,
                        name: `[Quà tặng] ${item.name}`,
                        quantity: sets * giftQty,
                        unit_price: 0,
                        total_price: 0,
                        is_gift: true,
                    });
                }
            }

            if (promoType === 'gift_item') {
                const giftQty = Math.max(1, toNumber(promo.gift_quantity, 1));
                pendingGiftItems.push({
                    promotion_id: promoId,
                    product_id: promo.gift_product_id || item.product_id,
                    branch_product_id: item.branch_product_id,
                    name: `[Quà tặng] ${promo.title || item.name}`,
                    quantity: giftQty,
                    unit_price: 0,
                    total_price: 0,
                    is_gift: true,
                });
            }

            let discount = 0;
            const isShippingPromotion = String(promo.voucher_type || '').toLowerCase() === 'shipping';

            if (isShippingPromotion) {
                freeShippingApplied = true;
                discount = 0;
            } else {
                discount = calcDiscountByType(promo, lineSubtotal);
            }

            if (discount > 0) {
                if (promo.stackable) {
                    stackableDiscountPromos.push({ promo, discount });
                } else if (discount > bestNonStackableDiscount) {
                    bestNonStackableDiscount = discount;
                    bestNonStackable = { promo, discount };
                }
            }

            if (!promotionAccumulator.has(promoId)) {
                promotionAccumulator.set(promoId, {
                    promotion_id: promo._id,
                    title: promo.title,
                    type: promo.type,
                    badge_text: promo.badge_text,
                    discount_amount: 0,
                    affected_items: 0,
                });
            }
        }

        let lineDiscount = 0;
        for (const entry of stackableDiscountPromos) {
            lineDiscount += entry.discount;
            appliedPromotionRefs.push({
                id: entry.promo._id,
                title: entry.promo.title,
                type: entry.promo.type,
            });
            const acc = promotionAccumulator.get(toIdString(entry.promo._id));
            acc.discount_amount += entry.discount;
            acc.affected_items += 1;
        }

        if (bestNonStackable) {
            lineDiscount += bestNonStackable.discount;
            appliedPromotionRefs.push({
                id: bestNonStackable.promo._id,
                title: bestNonStackable.promo.title,
                type: bestNonStackable.promo.type,
            });
            const acc = promotionAccumulator.get(toIdString(bestNonStackable.promo._id));
            acc.discount_amount += bestNonStackable.discount;
            acc.affected_items += 1;
        }

        lineDiscount = Math.min(lineSubtotal, Math.max(0, lineDiscount));
        const lineFinalTotal = Math.max(0, lineSubtotal - lineDiscount);
        const lineFinalPrice = item.quantity > 0 ? (lineFinalTotal / item.quantity) : lineFinalTotal;

        itemDiscounts += lineDiscount;
        const linePoints = Math.floor((lineFinalTotal / 1000) * Math.max(1, linePointsMultiplier));
        pointsEarned += Math.max(0, linePoints);

        lineItems.push({
            ...item,
            original_price: item.price,
            final_price: lineFinalPrice,
            total_price: lineFinalTotal,
            discount_amount: lineDiscount,
            points_multiplier_applied: Math.max(1, linePointsMultiplier),
            applied_promotions: appliedPromotionRefs,
            applied_promotion: appliedPromotionRefs[0] || null,
            purchased_price: lineFinalPrice,
            original_price_at_purchase: item.original_price,
            discount_percent_at_purchase: item.discount_percent,
            pricing_source_at_purchase: item.pricing_source || 'BASE_PRICE',
        });
    }

    let subtotalAfterPromotions = Math.max(0, originalSubtotal - itemDiscounts);
    let couponDiscount = 0;
    let couponApplied = null;
    let couponError = null;
    let couponPointsMultiplier = 1;

    let productVoucherDiscount = 0;
    let productVoucherApplied = null;
    let productVoucherError = null;

    let shippingVoucherDiscount = 0;
    let shippingVoucherApplied = null;
    let shippingVoucherError = null;

    if (couponCode) {
        const couponValidation = await validateCouponForCart({
            code: couponCode,
            branchId,
            cartItems: lineItems.map((item) => ({
                ...item,
                price: item.final_price,
                quantity: item.quantity,
            })),
            userId,
            now,
            session,
        });

        if (!couponValidation.valid) {
            couponError = couponValidation.message;
        } else {
            couponDiscount = Math.min(subtotalAfterPromotions, toNumber(couponValidation.coupon_discount, 0));
            if (couponValidation.free_shipping) freeShippingApplied = true;
            couponPointsMultiplier = Math.max(1, toNumber(couponValidation.points_multiplier, 1));

            couponApplied = {
                id: couponValidation.coupon._id,
                code: couponValidation.coupon.code,
                title: couponValidation.coupon.title,
                type: couponValidation.coupon.type,
                discount_amount: couponDiscount,
                ...computeCampaignLifecycle(couponValidation.coupon, {
                    limitKeys: ['total_quantity', 'usage_limit'],
                    usedKeys: ['used_count', 'claimed_count'],
                }),
            };
        }
    }

    if (productVoucherId) {
        const productVal = await validateCouponForCart({ voucher_id: productVoucherId, branchId, cartItems: lineItems, userId, now, session });
        if (!productVal.valid) {
            productVoucherError = productVal.message;
        } else {
            productVoucherDiscount = Math.min(Math.max(0, subtotalAfterPromotions - couponDiscount), toNumber(productVal.coupon_discount, 0));
            productVoucherApplied = {
                id: productVal.coupon._id, code: productVal.coupon.code, title: productVal.coupon.title, type: productVal.coupon.type, discount_amount: productVoucherDiscount
            };
        }
    }

    if (shippingVoucherId) {
        const shipVal = await validateCouponForCart({ voucher_id: shippingVoucherId, branchId, cartItems: lineItems, userId, now, session });
        if (!shipVal.valid) {
            shippingVoucherError = shipVal.message;
        } else {
            if (shipVal.free_shipping) freeShippingApplied = true;
            else shippingVoucherDiscount = Math.min(shippingFeeBase, toNumber(shipVal.coupon.discount_value, 0));

            shippingVoucherApplied = {
                id: shipVal.coupon._id, code: shipVal.coupon.code, title: shipVal.coupon.title, type: shipVal.coupon.type, discount_amount: shipVal.free_shipping ? shippingFeeBase : shippingVoucherDiscount
            };
        }
    }

    if (couponPointsMultiplier > 1) {
        pointsEarned = Math.floor(pointsEarned * couponPointsMultiplier);
    }

    const subtotalAfterVouchers = Math.max(0, subtotalAfterPromotions - couponDiscount - productVoucherDiscount);
    const shippingFee = freeShippingApplied ? 0 : Math.max(0, shippingFeeBase - shippingVoucherDiscount);
    const finalTotal = Math.max(0, subtotalAfterVouchers + shippingFee);
    const promotionDiscount = itemDiscounts;
    const promotionsApplied = Array.from(promotionAccumulator.values())
        .filter((promo) => promo.affected_items > 0 || promo.discount_amount > 0)
        .sort((a, b) => toNumber(b.discount_amount, 0) - toNumber(a.discount_amount, 0));

    return {
        price_changed: priceChanged,
        original_total: originalSubtotal,
        subtotal: subtotalAfterVouchers,
        item_discounts: itemDiscounts,
        promotion_discount: promotionDiscount,
        coupon_discount: couponDiscount,
        product_voucher_discount: productVoucherDiscount,
        shipping_voucher_discount: shippingVoucherDiscount,
        discount_amount: promotionDiscount + couponDiscount + productVoucherDiscount,
        shipping_fee: shippingFee,
        free_shipping_applied: freeShippingApplied,
        final_total: finalTotal,
        total: finalTotal,
        points_earned: Math.max(0, Math.floor(pointsEarned)),
        items: lineItems,
        gift_items: mergeGiftItems(pendingGiftItems),
        promotions_applied: promotionsApplied,
        applied_promotions: promotionsApplied,
        coupon_applied: couponApplied,
        product_voucher_applied: productVoucherApplied,
        shipping_voucher_applied: shippingVoucherApplied,
        coupon_error: couponError,
        product_voucher_error: productVoucherError,
        shipping_voucher_error: shippingVoucherError,
        breakdown: {
            subtotal: originalSubtotal,
            item_discounts: itemDiscounts,
            promotion_discount: promotionDiscount,
            coupon_discount: couponDiscount,
            product_voucher_discount: productVoucherDiscount,
            shipping_voucher_discount: shippingVoucherDiscount,
            shipping_fee: shippingFee,
            free_shipping_applied: freeShippingApplied,
            points_earned: Math.max(0, Math.floor(pointsEarned)),
            final_total: finalTotal,
        },
    };
}
