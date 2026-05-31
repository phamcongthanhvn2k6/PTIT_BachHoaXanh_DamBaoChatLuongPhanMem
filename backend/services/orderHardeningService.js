import mongoose from 'mongoose';
import { Coupon, CouponUsage, CouponClaim } from '../models/Coupon.js';
import { PromotionUsage, PromotionClaim } from '../models/PromotionUsage.js';
import Promotion from '../models/Promotion.js';
import { HotDeal } from '../models/Misc.js';
import User from '../models/User.js';
import { AuditLog } from '../models/Misc.js';

const toObjectIdIfValid = (id) => {
  if (!id) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

/**
 * Restore a single voucher's usage counter.
 * A voucher info object can be a coupon (has .code) or a promotion (has .id).
 */
async function restoreSingleVoucherCounter(voucherInfo, session) {
  if (!voucherInfo) return;

  if (voucherInfo.code) {
    // It's a coupon — decrement used_count / claimed_count
    const normalizedCode = String(voucherInfo.code).toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode }).session(session);
    if (coupon) {
      await Coupon.updateOne(
        { _id: coupon._id },
        { $inc: { used_count: -1, claimed_count: -1 } },
        { session }
      );
    }
  } else if (voucherInfo.id || voucherInfo.promotion_id || voucherInfo.coupon_id) {
    // Could be a promotion or a coupon referenced by id
    const refId = toObjectIdIfValid(voucherInfo.id || voucherInfo.promotion_id || voucherInfo.coupon_id);
    if (!refId) return;

    // Try promotion first
    const promo = await Promotion.findById(refId).session(session);
    if (promo) {
      await Promotion.updateOne(
        { _id: promo._id },
        { $inc: { usage_count: -1, claimed_count: -1 } },
        { session }
      );
    } else {
      // Might be a coupon referenced by id
      const coupon = await Coupon.findById(refId).session(session);
      if (coupon) {
        await Coupon.updateOne(
          { _id: coupon._id },
          { $inc: { used_count: -1, claimed_count: -1 } },
          { session }
        );
      }
    }
  }
}

/**
 * Restore coupon, promotion usage, claims, and usage records.
 * Covers: coupon_code, applied_coupon, applied_promotions,
 *         product_voucher_applied, shipping_voucher_applied.
 */
export async function restorePromotionsAndCoupons(order, session) {
  // 1. Revert primary coupon used_count and claimed_count
  if (order.coupon_code) {
    const coupon = await Coupon.findOne({ code: order.coupon_code.toUpperCase() }).session(session);
    if (coupon) {
      await Coupon.updateOne(
        { _id: coupon._id },
        { $inc: { used_count: -1, claimed_count: -1 } },
        { session }
      );
    }
  } else if (order.applied_coupon && order.applied_coupon.coupon_id) {
    await Coupon.updateOne(
      { _id: order.applied_coupon.coupon_id },
      { $inc: { used_count: -1, claimed_count: -1 } },
      { session }
    );
  }

  // 2. Revert applied promotions usage_count / claimed_count
  if (Array.isArray(order.applied_promotions)) {
    for (const promo of order.applied_promotions) {
      if (promo.promotion_id) {
        await Promotion.updateOne(
          { _id: promo.promotion_id },
          { $inc: { usage_count: -1, claimed_count: -1 } },
          { session }
        );
      }
    }
  }

  // 3. Restore product_voucher_applied counter (if it differs from primary coupon)
  if (order.product_voucher_applied) {
    await restoreSingleVoucherCounter(order.product_voucher_applied, session);
  }

  // 4. Restore shipping_voucher_applied counter (if it differs from primary coupon)
  if (order.shipping_voucher_applied) {
    await restoreSingleVoucherCounter(order.shipping_voucher_applied, session);
  }

  // 5. Delete CouponUsage records for this order
  await CouponUsage.deleteMany({ order_id: order._id }).session(session);

  // 6. Delete PromotionUsage records for this order
  await PromotionUsage.deleteMany({ order_id: order._id }).session(session);

  // 7. Restore CouponClaims back to 'claimed' status
  await CouponClaim.updateMany(
    { used_order_id: order._id },
    { $set: { status: 'claimed' }, $unset: { used_order_id: 1 } }
  ).session(session);

  // 8. Restore PromotionClaims back to 'claimed' status
  await PromotionClaim.updateMany(
    { used_order_id: order._id },
    { $set: { status: 'claimed' }, $unset: { used_order_id: 1 } }
  ).session(session);
}

/**
 * Restore hot deal remaining quantity and decrement sold count.
 */
export async function restoreHotDealsForOrderItems(items, session) {
  for (const item of items) {
    if (item.hot_deal_id) {
      const q = Number(item.quantity) || 1;
      await HotDeal.updateOne(
        { _id: item.hot_deal_id },
        { $inc: { remaining_quantity: q, sold_count: -q } },
        { session }
      );
    }
  }
}
