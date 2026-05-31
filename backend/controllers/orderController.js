import mongoose from 'mongoose';
import Order from '../models/Order.js';
import IdempotencyKey from '../models/IdempotencyKey.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import Branch from '../models/Branch.js';
import Promotion from '../models/Promotion.js';
import { Coupon, CouponUsage, CouponClaim } from '../models/Coupon.js';
import { PromotionUsage } from '../models/PromotionUsage.js';
import { paginateMeta } from '../utils/helpers.js';
import inventoryService from '../services/inventoryService.js';
import { calculateCheckoutTotals } from '../services/promotionCalculationService.js';
import { queueOrderSuccessEmail } from '../services/orderEmailService.js';
import { isValidVietnamPhone, normalizeVietnamPhone } from '../utils/validatePhone.js';
import { notifyOrderStatusChanged } from '../services/userNotificationService.js';
import { resolveEffectivePrice, resolveProductPricing } from '../services/pricingResolverService.js';
import { HotDeal } from '../models/Misc.js';
import { acquireLock, releaseLock } from '../services/redisService.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';

// ─── Normalize helper: MongoDB _id → id ───
const normalizeOrder = (order) => {
  if (!order) return null;
  const o = order.toObject ? order.toObject() : { ...order };
  o.id = o._id ? String(o._id) : o.id;
  return o;
};

const toObjectIdIfValid = (id) => {
  if (!id) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const notifyOrderStatusSafely = async ({ userId, orderId, status, note = '' }) => {
  try {
    await notifyOrderStatusChanged({ userId, orderId, status, note });
  } catch (err) {
    console.warn('[OrderNotification] notify failed:', err.message);
  }
};

const recordPromotionAndCouponUsage = async ({
  appliedPromotions = [],
  couponCode = null,
  couponApplied = null,
  productVoucherApplied = null,
  shippingVoucherApplied = null,
  userId,
  orderId,
  session,
}) => {
  // 1. Process active promotions
  for (const promo of appliedPromotions) {
    if (!promo?.promotion_id) continue;
    const promoId = toObjectIdIfValid(promo.promotion_id);

    // Write lock the Promotion document
    const promotion = await Promotion.findOneAndUpdate(
      { _id: promoId },
      { $inc: { __v: 0 } },
      { session, new: true }
    );

    if (!promotion || !promotion.is_active || (promotion.status && promotion.status === 'paused')) {
      throw new Error(`Khuyến mãi ${promotion?.title || 'này'} hiện không hoạt động.`);
    }

    if (promotion.end_date && new Date() > new Date(promotion.end_date)) {
      throw new Error(`Khuyến mãi ${promotion.title} đã hết hạn.`);
    }

    const usageCount = Number(promotion.usage_count || 0);
    const limit = Number(promotion.usage_limit || promotion.total_quantity || 0);
    if (limit > 0 && usageCount >= limit) {
      throw new Error(`Khuyến mãi ${promotion.title} đã hết lượt sử dụng.`);
    }

    if (userId && promotion.usage_per_user) {
      const userUsageCount = await PromotionUsage.countDocuments({ promotion_id: promoId, user_id: userId }).session(session);
      if (userUsageCount >= Number(promotion.usage_per_user)) {
        throw new Error(`Bạn đã dùng hết lượt cho chương trình khuyến mãi ${promotion.title}`);
      }
    }

    // Increment global counters
    promotion.usage_count = (promotion.usage_count || 0) + 1;
    promotion.claimed_count = (promotion.claimed_count || 0) + 1;
    await promotion.save({ session });

    await PromotionUsage.create([{
      promotion_id: promoId,
      user_id: userId || null,
      order_id: orderId,
      discount_amount: Number(promo.discount_amount || 0),
    }], { session });
  }

  // 2. Process Coupons (Global Coupon, Product Voucher, Shipping Voucher)
  const couponsToProcess = [couponApplied];
  if (productVoucherApplied) couponsToProcess.push(productVoucherApplied);
  if (shippingVoucherApplied) couponsToProcess.push(shippingVoucherApplied);

  for (const cInfo of couponsToProcess) {
    if (!cInfo) continue;
    if (cInfo.code || cInfo.id) {
      const query = cInfo.code ? { code: String(cInfo.code).toUpperCase() } : { _id: toObjectIdIfValid(cInfo.id) };
      
      // Acquire exclusive write lock on Coupon
      const coupon = await Coupon.findOneAndUpdate(
        query,
        { $inc: { __v: 0 } },
        { session, new: true }
      );

      if (!coupon) {
        throw new Error(`Mã giảm giá/Voucher không tồn tại.`);
      }

      if (!coupon.is_active || coupon.status === 'paused') {
        throw new Error(`Mã giảm giá ${coupon.code} hiện không hoạt động.`);
      }

      if (coupon.end_date && new Date() > new Date(coupon.end_date)) {
        throw new Error(`Mã giảm giá ${coupon.code} đã hết hạn.`);
      }

      const usedCount = Number(coupon.used_count || 0);
      const limit = Number(coupon.usage_limit || coupon.total_quantity || 0);
      if (limit > 0 && usedCount >= limit) {
        throw new Error(`Mã giảm giá ${coupon.code} đã hết lượt sử dụng.`);
      }

      if (userId && coupon.usage_per_user) {
        const userUsageCount = await CouponUsage.countDocuments({ coupon_id: coupon._id, user_id: userId }).session(session);
        if (userUsageCount >= Number(coupon.usage_per_user)) {
          throw new Error(`Bạn đã dùng hết lượt sử dụng cho mã giảm giá ${coupon.code}`);
        }
      }

      // Check wallet claim state machine transition (claimed -> used)
      const claim = await CouponClaim.findOne({
        coupon_id: coupon._id,
        user_id: userId,
        status: 'claimed'
      }).session(session);

      if (coupon.claim_campaign && !claim) {
        throw new Error(`Mã giảm giá ${coupon.code} cần phải lưu vào ví trước khi sử dụng.`);
      }

      if (claim) {
        claim.status = 'used';
        claim.used_order_id = orderId;
        await claim.save({ session });
      }

      // Increment Coupon usage
      coupon.used_count = (coupon.used_count || 0) + 1;
      coupon.claimed_count = (coupon.claimed_count || 0) + 1;
      await coupon.save({ session });

      await CouponUsage.create([{
        coupon_id: coupon._id,
        user_id: userId || null,
        order_id: orderId,
        discount_amount: Number(cInfo.discount_amount || 0),
      }], { session });
    }
  }
};

export const create = async (req, res) => {
  console.log('[ORDER BODY]', JSON.stringify({
    source: req.body.source || 'unknown',
    items_count: req.body.items?.length || 0,
    branch_id: req.body.branch_id,
    total_amount: req.body.total_amount,
    user_id: req.body.user_id || req.userId,
  }));

  const userId = req.body.user_id || req.userId;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'user_id is required' });
  }

  // Acquire checkout lock for user to prevent concurrent checkout attempts
  const userLockKey = `lock:checkout_user:${userId}`;
  const lockAcquired = await acquireLock(userLockKey, 30); // 30s TTL
  if (!lockAcquired) {
    return res.status(409).json({ success: false, message: 'Yêu cầu đặt hàng của bạn đang được xử lý, vui lòng không gửi yêu cầu liên tục.' });
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (idempotencyKey) {
    try {
      await IdempotencyKey.create({
        key: idempotencyKey,
        status: 202,
        response: { success: false, message: 'Đơn hàng đang được xử lý, vui lòng đợi.' }
      });
    } catch (err) {
      if (err.code === 11000) {
        const existingKey = await IdempotencyKey.findOne({ key: idempotencyKey });
        if (existingKey) {
          console.log(`[OrderCreate] Idempotency match for key ${idempotencyKey}`);
          if (existingKey.status === 202) {
            await releaseLock(userLockKey);
            return res.status(409).json({ success: false, message: 'Yêu cầu đang được xử lý (Concurrent request detected).' });
          }
          await releaseLock(userLockKey);
          return res.status(existingKey.status || 200).json(existingKey.response);
        }
      }
      await releaseLock(userLockKey);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi kiểm tra Idempotency' });
    }
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    console.warn('[OrderCreate] Could not start transaction. Running without ACID guarantees.', err.message);
    session = null;
  }

  try {
    const {
      branch_id,
      items: rawItems = [],
      order_address = null,
      payment_method = 'COD',
      payment_status = 'PENDING',
      subtotal = 0,
      shipping_fee = 0,
      discount_amount = 0,
      total_amount = 0,
      applied_promotions = [],
      applied_coupon = null
    } = req.body;

    const branch_id_val = branch_id;
    const checkoutUser = await User.findById(userId).session(session);
    if (!checkoutUser) {
      throw new Error('User not found for checkout');
    }

    if (!checkoutUser.email || checkoutUser.email_verified !== true) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(403).json({
        success: false,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Vui long bo sung va xac thuc email truoc khi dat hang',
        requires_email_binding: !checkoutUser.email,
        email_verified: checkoutUser.email_verified === true,
      });
    }

    const normalizedUserPhone = normalizeVietnamPhone(checkoutUser.phone || '');
    if (!normalizedUserPhone || !isValidVietnamPhone(normalizedUserPhone)) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        code: 'PHONE_REQUIRED',
        message: 'Số điện thoại không hợp lệ hoặc chưa cập nhật',
      });
    }

    if (!branch_id_val) throw new Error("branch_id is required");
    if (!rawItems || rawItems.length === 0) throw new Error("Cart is empty");

    // Normalize items: auto mapping branch_product_id
    const items = rawItems.map(item => ({
      ...item,
      branch_product_id: item.branch_product_id || item.product_id
    }));


    // ── 1. Ensure order_address is properly set ──
    let orderAddress = order_address;
    if (!orderAddress) {
      orderAddress = {
        receiver_name: 'Test User',
        phone: normalizedUserPhone,
        full_address: 'Default Address'
      };
    } else if (orderAddress && orderAddress.city && !orderAddress.full_address) {
      const parts = [orderAddress.street, orderAddress.ward, orderAddress.district, orderAddress.city].filter(Boolean);
      orderAddress.full_address = parts.join(', ');
    }

    if (!orderAddress.phone) {
      orderAddress.phone = normalizedUserPhone;
    }

    let branchName = req.body.branch_name || '';
    if (!branchName && branch_id_val) {
      try {
        let branch = null;
        if (mongoose.Types.ObjectId.isValid(branch_id_val)) {
          branch = await Branch.findById(branch_id_val).session(session);
        }
        if (!branch) {
          branch = await Branch.findOne({ name: { $regex: branch_id_val, $options: 'i' } }).session(session);
        }
        if (branch) branchName = branch.name;
      } catch (e) {
        console.warn('[OrderCreate] Could not resolve branch name:', e.message);
      }
    }

    const orderId = new mongoose.Types.ObjectId();

    try {
      if (items.length > 0) {
        const deductResult = await inventoryService.deductInventoryForOrder(branch_id_val, items, session, orderId);
        // We ensure deductStockFIFO throws if not enough stock.
      }
    } catch (invErr) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      // Write checkout failed audit log
      try {
        const { logActivity } = await import('../services/auditService.js');
        await logActivity({
          userId: userId,
          userName: checkoutUser.full_name || checkoutUser.username || 'Customer',
          action: 'CHECKOUT_FAILED',
          entity: 'order',
          entityId: null,
          details: { error: invErr.message, items: items.map(i => ({ branch_product_id: i.branch_product_id, quantity: i.quantity })) },
          ip: req.ip
        });
      } catch (logErr) {
        console.error('[Audit] Failed to log checkout failure:', logErr.message);
      }
      return res.status(409).json({ success: false, message: 'Không đủ số lượng tồn kho để đặt hàng.', error: invErr.message });
    }

    // ── 3. Resolve product_id and snapshot metadata for each item from BranchProduct/Product ──
    for (const item of items) {
      if (item.branch_product_id) {
        try {
          const bp = await BranchProduct.findById(item.branch_product_id).session(session);
          if (bp) {
            item.product_id = item.product_id || bp.product_id;
            item.sku = item.sku || bp.sku;
            item.category_name = item.category_name || bp.category_name;
            item.supplier_name = item.supplier_name || bp.supplier_name;
            item.expiry_date = item.expiry_date || bp.expiry_date;

            const p = await Product.findById(bp.product_id).session(session);
            if (p) {
              item.sku = item.sku || p.sku;
              item.category_name = item.category_name || p.category_name;
              item.supplier_name = item.supplier_name || p.supplier_name;
              item.expiry_date = item.expiry_date || p.expiry_date;
              item.product_name = p.name || p.product_name || item.product_name || item.name;
              item.name = item.product_name; // Normalize for calculation service
              item.product_image = p.thumbnail || p.image || p.product_image || item.product_image || item.image;

              // Dynamically resolve pricing
              const pricingResolved = await resolveProductPricing(p, bp, branch_id_val, { now: new Date() });
              item.price = pricingResolved.effective_price;
              item.unit_price = pricingResolved.effective_price;
              item.original_price = pricingResolved.original_price;
              item.discount_percent = pricingResolved.discount_percent;
              item.effective_price = pricingResolved.effective_price;
              item.pricing_source = pricingResolved.pricing_source;
              item.active_hot_deal = pricingResolved.active_hot_deal;
              item.active_promotion = pricingResolved.active_promotion;
              item.hot_deal_id = pricingResolved.active_hot_deal?.id || null;
              item.pricing = pricingResolved;
            } else {
              item.price = bp.price;
              item.unit_price = bp.price;
              item.original_price = bp.original_price || bp.price;
            }
          }
        } catch (e) { console.warn('Snapshot logic error:', e.message); }
      }
      item.discount_applied = item.discount_applied || item.discount_amount || 0;
    }

    // ── 4. Build the payload ensuring payment is a proper sub-document ──
    const safeMethod = ['COD', 'QR_TRANSFER'].includes(payment_method) ? payment_method : 'COD';
    const payment = {
      method: req.body.payment?.method || safeMethod,
      status: req.body.payment?.status || payment_status || 'PENDING',
      transaction_id: req.body.payment?.transaction_id || null,
    };

    // 🔥 SECURITY FIX: Calculate all totals server-side (inside transaction session)
    const serverPricing = await calculateCheckoutTotals({
      cartItems: items,
      branchId: branch_id_val,
      couponCode: req.body.coupon_code || null,
      userId: userId,
      productVoucherId: req.body.product_voucher_id || null,
      shippingVoucherId: req.body.shipping_voucher_id || null,
      session: session
    });

    if (serverPricing.price_changed) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(409).json({
        success: false,
        code: 'PRICE_CHANGED',
        message: 'Giá sản phẩm đã thay đổi. Vui lòng kiểm tra lại giỏ hàng và đặt hàng lại.',
        data: serverPricing
      });
    }

    const orderData = {
      _id: orderId,
      user_id: userId,
      branch_id: branch_id_val,
      branch_name: branchName,
      items: serverPricing.items,
      order_address: orderAddress,
      subtotal: serverPricing.subtotal,
      shipping_fee: serverPricing.shipping_fee,
      discount_amount: serverPricing.discount_amount,
      total_amount: serverPricing.final_total,
      coupon_code: req.body.coupon_code || null,
      points_earned: serverPricing.points_earned,
      payment,
      status: req.body.status || 'PENDING',
      note: req.body.note || '',
      tracking: req.body.tracking || { history: [{ status: 'PENDING', note: 'Đơn hàng đã được tạo', timestamp: new Date() }] },
      delivery_slot: req.body.delivery_slot || null,
      pricing_breakdown: serverPricing.breakdown,
      applied_promotions: serverPricing.applied_promotions,
      applied_coupon: serverPricing.coupon_applied,
      product_voucher_applied: serverPricing.product_voucher_applied,
      shipping_voucher_applied: serverPricing.shipping_voucher_applied,
      gift_items: serverPricing.gift_items,
      idempotency_key: idempotencyKey || null,
    };

    // Order.create is an array when used with session
    const [order] = await Order.create([orderData], { session });

    // ── 5. Tăng sold_count sau khi đặt hàng thành công ──
    for (const item of items) {
      if (!item.branch_product_id) continue;
      const q = Number(item.quantity) || 1;
      try {
        const bp = await BranchProduct.findById(item.branch_product_id).session(session);
        if (bp) {
          bp.sold_count = (Number(bp.sold_count) || 0) + q;
          await bp.save({ session });
          // Also update master product sold_count
          if (bp.product_id) {
            const p = await Product.findById(bp.product_id).session(session);
            if (p) {
              p.sold_count = (Number(p.sold_count) || 0) + q;
              await p.save({ session });
            }
          }
        }
      } catch (e) {
        console.warn('[OrderCreate] sold_count update error for item:', item.branch_product_id, e.message);
      }
    }
    // Decrement Hot Deal remaining_quantity if the item was bought under an active Hot Deal
    for (const item of orderData.items) {
      if (item.hot_deal_id) {
        const dealId = toObjectIdIfValid(item.hot_deal_id);
        const q = Number(item.quantity) || 1;
        const hdResult = await HotDeal.updateOne(
          { _id: dealId, remaining_quantity: { $gte: q } },
          { $inc: { remaining_quantity: -q, sold_count: q } },
          { session }
        );
        if (hdResult.modifiedCount === 0) {
          throw new Error(`Sản phẩm ${item.name || item.product_name} trong chương trình Hot Deal đã hết hoặc không đủ số lượng.`);
        }
      }
    }

    await recordPromotionAndCouponUsage({
      appliedPromotions: orderData.applied_promotions,
      couponCode: orderData.coupon_code,
      couponApplied: orderData.applied_coupon,
      productVoucherApplied: orderData.product_voucher_applied,
      shippingVoucherApplied: orderData.shipping_voucher_applied,
      userId,
      orderId: order._id,
      session,
    });

    if (req.body.from_cart) {
      await Cart.updateOne(
        { user_id: userId, branch_id: branch_id_val },
        { $set: { items: [] } },
        { session }
      );
    }

    const responsePayload = { success: true, data: normalizeOrder(order), message: 'Đặt hàng thành công' };

    // Log order creation to AuditLog
    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({
        userId: userId,
        userName: checkoutUser.full_name || checkoutUser.username || 'Customer',
        action: 'CREATE',
        entity: 'order',
        entityId: order._id,
        details: { total_amount: orderData.total_amount },
        ip: req.ip
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log order creation:', auditErr.message);
    }

    if (idempotencyKey && session) {
      await IdempotencyKey.updateOne(
        { key: idempotencyKey },
        { response: responsePayload, status: 201 },
        { session }
      );
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    const paymentMethod = String(orderData?.payment?.method || payment_method || '').toUpperCase();
    if (paymentMethod === 'COD' || String(orderData?.payment?.status || '').toUpperCase() === 'PAID') {
      queueOrderSuccessEmail(order._id);
    }

    await notifyOrderStatusSafely({
      userId,
      orderId: String(order._id),
      status: orderData.status || 'PENDING',
      note: 'Đơn hàng đã được tạo thành công',
    });

    console.log('[OrderCreate] ✅ Order created:', order._id, 'branch:', branch_id_val, 'total:', orderData.total_amount);

    return res.status(201).json(responsePayload);
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    if (idempotencyKey) {
      await IdempotencyKey.deleteOne({ key: idempotencyKey });
    }
    console.error('[OrderCreate] ❌ Error:', err.message);
    if (err.errors) console.error('[OrderCreate] Validation Errors:', err.errors);
    return res.status(400).json({ success: false, message: err.message, errors: err.errors });
  } finally {
    await releaseLock(userLockKey);
  }
};

// POST /api/orders/create-from-cart
export const createFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const branchId = req.body.branch_id;
    const couponCode = req.body.coupon_code || null;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'branch_id is required' });
    }

    const cart = await Cart.findOne({ user_id: userId, branch_id: branchId });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống, không thể tạo đơn' });
    }

    const detailedItems = [];
    for (const item of cart.items) {
      const branchProduct = await BranchProduct.findById(item.branch_product_id);
      if (!branchProduct) continue;
      const product = await Product.findById(branchProduct.product_id);
      if (!product) continue;

      detailedItems.push({
        branch_product_id: String(branchProduct._id),
        product_id: product._id,
        category_id: product.category_id,
        name: product.name,
        quantity: Number(item.quantity || 1),
        price: Number(branchProduct.price || item.unit_price || item.price || 0),
      });
    }

    if (detailedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy sản phẩm hợp lệ trong giỏ hàng' });
    }

    const pricing = await calculateCheckoutTotals({
      cartItems: detailedItems,
      branchId,
      couponCode,
      userId,
      shippingFeeBase: req.body.shipping_fee_base,
    });

    const orderItems = [
      ...pricing.items.map((line) => ({
        product_id: line.product_id,
        branch_product_id: line.branch_product_id,
        quantity: line.quantity,
        price: line.original_price,
        unit_price: line.original_price,
        original_price: line.original_price,
        final_price: line.final_price,
        discount_amount: line.discount_amount,
        product_name: line.name,
        product_image: '',
        is_gift: false,
      })),
      ...(Array.isArray(pricing.gift_items) ? pricing.gift_items : []).map((gift) => ({
        product_id: gift.product_id,
        branch_product_id: gift.branch_product_id,
        quantity: gift.quantity,
        price: 0,
        unit_price: 0,
        original_price: 0,
        final_price: 0,
        discount_amount: 0,
        product_name: gift.name,
        product_image: '',
        is_gift: true,
      })),
    ];

    req.body = {
      ...req.body,
      user_id: userId,
      branch_id: branchId,
      items: orderItems,
      subtotal: pricing.original_total,
      shipping_fee: pricing.shipping_fee,
      discount_amount: pricing.discount_amount,
      total_amount: pricing.final_total,
      points_earned: pricing.points_earned,
      coupon_code: pricing.coupon_applied?.code || couponCode || null,
      pricing_breakdown: pricing.breakdown,
      applied_promotions: pricing.applied_promotions,
      applied_coupon: pricing.coupon_applied,
      gift_items: pricing.gift_items,
      promotion_discount: pricing.promotion_discount,
      coupon_discount: pricing.coupon_discount,
      item_discounts: pricing.item_discounts,
      free_shipping_applied: pricing.free_shipping_applied,
      from_cart: true,
    };

    return create(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders
export const list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id, branch_id } = req.query;
    const filter = {};

    // Admin/superadmin (role_id 1 or 2) can query all orders or filter by user_id
    // Regular users (role_id 3) always see only their own
    const roleId = Number(req.user?.role_id);
    if (roleId === 1 || roleId === 2) {
      // Admin — optionally filter by user_id or branch_id
      if (user_id) filter.user_id = user_id;
      if (branch_id && branch_id !== 'ALL') {
        // Match branch_id as string OR ObjectId
        filter.branch_id = branch_id;
      }
    } else {
      // Regular user — only own orders
      filter.user_id = req.userId;
    }

    if (status && status !== 'ALL') filter.status = status;

    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const total = await Order.countDocuments(filter);
    const rawData = await Order.find(filter).sort('-created_at').skip((p - 1) * l).limit(l);
    const data = rawData.map(normalizeOrder);

    console.log('[OrderList] filter:', JSON.stringify(filter), 'total:', total, 'returned:', data.length);

    return res.json({ success: true, data, meta: paginateMeta(total, { page: p, limit: l }) });
  } catch (err) {
    console.error('[OrderList] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/:id
export const detail = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Regular users can only see their own orders
    if (req.user?.role_id === 3 && String(order.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({ success: true, data: normalizeOrder(order) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/orders/:id/cancel
export const cancel = async (req, res) => {
  let session = null;
  let lockKey = null;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });

    // C4: Distributed lock per order to prevent race conditions
    lockKey = `order_mutation:${req.params.id}`;
    const locked = await acquireLock(lockKey, 30);
    if (!locked) {
      return res.status(409).json({ success: false, message: 'Đơn hàng đang được xử lý bởi yêu cầu khác, vui lòng thử lại.' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (req.user?.role_id === 3 && String(order.user_id) !== String(req.userId)) {
      await session.abortTransaction(); session.endSession();
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng ở trạng thái này' });
    }
    order.status = 'CANCELLED';
    order.tracking.history.push({ status: 'CANCELLED', note: req.body.reason || 'Hủy bởi khách hàng', timestamp: new Date() });

    // 1. Restore inventory (idempotent via flag)
    if (!order.is_inventory_restored) {
      await inventoryService.restoreInventoryFromOrder(order.items, session, order._id);
      for (const item of order.items) {
        try {
          const bp = await BranchProduct.findById(item.branch_product_id).session(session);
          if (bp) {
            bp.sold_count = Math.max(0, (bp.sold_count || 0) - item.quantity);
            await bp.save({ session });
            if (bp.product_id) {
              const p = await Product.findById(bp.product_id).session(session);
              if (p) { p.sold_count = Math.max(0, (p.sold_count || 0) - item.quantity); await p.save({ session }); }
            }
          }
        } catch (e) { console.warn('[OrderCancel] sold_count revert error:', e.message); }
      }
      order.is_inventory_restored = true;
    }

    // 2. Restore Hot Deal remaining stock (idempotent via flag)
    if (!order.is_hot_deal_restored) {
      for (const item of order.items) {
        if (item.hot_deal_id) {
          const dealId = toObjectIdIfValid(item.hot_deal_id);
          const q = Number(item.quantity) || 1;
          await HotDeal.updateOne({ _id: dealId }, { $inc: { remaining_quantity: q, sold_count: -q } }, { session });
        }
      }
      order.is_hot_deal_restored = true;
    }

    // 3. Restore coupon and promotion usages (idempotent via flags)
    if (!order.is_coupon_restored || !order.is_promotion_restored) {
      const { restorePromotionsAndCoupons } = await import('../services/orderHardeningService.js');
      await restorePromotionsAndCoupons(order, session);
      order.is_coupon_restored = true;
      order.is_promotion_restored = true;
    }

    // 4. Reverse loyalty points (idempotent via flag)
    if (!order.is_points_reversed && order.payment && order.payment.status === 'PAID') {
      const user = await User.findById(order.user_id).session(session);
      if (user && order.points_earned > 0) {
        user.lotte_points = Math.max(0, (user.lotte_points || 0) - order.points_earned);
        await user.save({ session });
        await LoyaltyTransaction.create([{ user_id: order.user_id, type: 'adjust', points: -order.points_earned, source: 'order_cancel', description: `Thu hồi điểm do hủy đơn #${order._id}`, order_id: order._id, balance_after: user.lotte_points }], { session });
      }
      order.is_points_reversed = true;
    }

    await order.save({ session });

    // 5. Audit Log
    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({ userId: req.userId, userName: req.user?.full_name || req.user?.username || 'Customer', action: 'CANCEL', entity: 'order', entityId: order._id, details: { reason: req.body.reason || 'Hủy bởi khách hàng' }, ip: req.ip });
    } catch (auditErr) {
      console.error('[Audit] Failed to log order cancellation:', auditErr.message);
    }

    await session.commitTransaction();
    session.endSession();

    await notifyOrderStatusSafely({ userId: order.user_id, orderId: String(order._id), status: 'CANCELLED', note: req.body.reason || 'Hủy bởi khách hàng' });
    return res.json({ success: true, data: normalizeOrder(order), message: 'Đã hủy đơn hàng' });
  } catch (err) {
    if (session) { await session.abortTransaction(); session.endSession(); }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    if (lockKey) await releaseLock(lockKey);
  }
};

// GET /api/orders/:id/tracking
export const tracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Regular users can only track their own orders
    if (req.user?.role_id === 3 && String(order.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const trackingData = {
      ...(order.tracking?.toObject ? order.tracking.toObject() : order.tracking || {}),
      status: order.status,
      order_id: String(order._id),
    };
    return res.json({ success: true, data: trackingData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Valid status transitions map
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: ['REFUNDED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [], // terminal
};

// PUT /api/orders/:id/status
export const updateStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Regular users can only view status, only admin/staff can update
    if (req.user?.role_id === 3) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { status, note, tracking_number, carrier, dispatch_branch, dispatch_branch_name, internal_note } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${order.status}" sang "${status}". Trạng thái hợp lệ: ${allowed.join(', ') || 'không có'}`,
      });
    }

    const oldStatus = order.status;

    // ── When transitioning to SHIPPING, require shipping data ──
    if (status === 'SHIPPING') {
      if (!tracking_number || !String(tracking_number).trim()) {
        return res.status(400).json({ success: false, message: 'Mã vận đơn (tracking_number) là bắt buộc khi chuyển sang trạng thái Đang giao hàng' });
      }
      if (!dispatch_branch && !dispatch_branch_name) {
        return res.status(400).json({ success: false, message: 'Kho xuất hàng (dispatch_branch) là bắt buộc khi chuyển sang trạng thái Đang giao hàng' });
      }
      // Persist shipping data into the tracking sub-document
      order.tracking.tracking_number = String(tracking_number).trim();
      order.tracking.carrier = carrier ? String(carrier).trim() : order.tracking.carrier;
      order.tracking.dispatch_branch = dispatch_branch || null;
      order.tracking.dispatch_branch_name = dispatch_branch_name || null;
    }

    order.status = status;
    if (status === 'DELIVERED') order.payment.status = 'PAID';

    // Build history entry with optional shipping metadata
    const historyEntry = {
      status,
      note: note || internal_note || '',
      by: req.userId,
      timestamp: new Date(),
      meta: null,
    };
    if (status === 'SHIPPING') {
      historyEntry.meta = {
        tracking_number: order.tracking.tracking_number,
        carrier: order.tracking.carrier || null,
        dispatch_branch: order.tracking.dispatch_branch || null,
        dispatch_branch_name: order.tracking.dispatch_branch_name || null,
      };
      // Auto-generate a human-readable note if none provided
      if (!historyEntry.note) {
        const parts = [`Xuất kho: ${order.tracking.dispatch_branch_name || 'N/A'}`];
        if (order.tracking.carrier) parts.push(`Vận chuyển: ${order.tracking.carrier}`);
        parts.push(`Mã vận đơn: ${order.tracking.tracking_number}`);
        historyEntry.note = parts.join(' • ');
      }
    }
    order.tracking.history.push(historyEntry);
    await order.save();

    // Write Audit Log
    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Staff',
        action: 'STATUS_CHANGE',
        entity: 'order',
        entityId: order._id,
        details: { from_status: oldStatus, to_status: status, note: historyEntry.note || '' },
        ip: req.ip
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log order status update:', auditErr.message);
    }

    await notifyOrderStatusSafely({
      userId: order.user_id,
      orderId: String(order._id),
      status,
      note: historyEntry.note || '',
    });

    return res.json({ success: true, data: normalizeOrder(order), message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/orders/:id/tracking-number (admin)
export const assignTracking = async (req, res) => {
  try {
    const { tracking_number, carrier, estimated_delivery } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.tracking.tracking_number = tracking_number;
    order.tracking.carrier = carrier || order.tracking.carrier;
    if (estimated_delivery) order.tracking.estimated_delivery = estimated_delivery;
    await order.save();
    return res.json({ success: true, data: normalizeOrder(order), message: 'Đã gán mã vận đơn' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/orders/:id/refund (admin)
export const refund = async (req, res) => {
  let session = null;
  let lockKey = null;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });

    // C4: Distributed lock per order
    lockKey = `order_mutation:${req.params.id}`;
    const locked = await acquireLock(lockKey, 30);
    if (!locked) {
      return res.status(409).json({ success: false, message: 'Đơn hàng đang được xử lý bởi yêu cầu khác, vui lòng thử lại.' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const allowedRefundStatuses = ['DELIVERED', 'RETURNED', 'CANCELLED'];
    if (!allowedRefundStatuses.includes(order.status)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: `Không thể hoàn tiền đơn hàng ở trạng thái ${order.status}` });
    }

    const oldStatus = order.status;
    order.status = 'REFUNDED';
    order.payment.status = 'REFUNDED';
    order.tracking.history.push({ status: 'REFUNDED', note: req.body.reason || 'Hoàn tiền', by: req.userId, timestamp: new Date() });

    // 1. Restore inventory (idempotent)
    if (!order.is_inventory_restored) {
      await inventoryService.restoreInventoryFromOrder(order.items, session, order._id);
      for (const item of order.items) {
        try {
          const bp = await BranchProduct.findById(item.branch_product_id).session(session);
          if (bp) {
            bp.sold_count = Math.max(0, (bp.sold_count || 0) - item.quantity);
            await bp.save({ session });
            if (bp.product_id) {
              const p = await Product.findById(bp.product_id).session(session);
              if (p) { p.sold_count = Math.max(0, (p.sold_count || 0) - item.quantity); await p.save({ session }); }
            }
          }
        } catch (e) { console.warn('[OrderRefund] sold_count revert error:', e.message); }
      }
      order.is_inventory_restored = true;
    }

    // 2. Wallet refund (idempotent)
    if (!order.is_wallet_refunded) {
      const user = await User.findById(order.user_id).session(session);
      if (user) {
        user.wallet_balance = (user.wallet_balance || 0) + (order.total_amount || 0);
        await user.save({ session });
      }
      order.is_wallet_refunded = true;
    }

    // 3. Reverse loyalty points (idempotent)
    if (!order.is_points_reversed) {
      const pointsToDeduct = order.points_earned || 0;
      if (pointsToDeduct > 0) {
        const user = await User.findById(order.user_id).session(session);
        if (user) {
          user.lotte_points = Math.max(0, (user.lotte_points || 0) - pointsToDeduct);
          await user.save({ session });
          await LoyaltyTransaction.create([{ user_id: order.user_id, type: 'adjust', points: -pointsToDeduct, source: 'order_refund', description: `Thu hồi điểm do hoàn tiền đơn #${order._id}`, order_id: order._id, balance_after: user.lotte_points }], { session });
        }
      }
      order.is_points_reversed = true;
    }

    // 4. Restore Hot Deal (idempotent)
    if (!order.is_hot_deal_restored) {
      const { restoreHotDealsForOrderItems } = await import('../services/orderHardeningService.js');
      await restoreHotDealsForOrderItems(order.items, session);
      order.is_hot_deal_restored = true;
    }

    // 5. Restore coupons and promotions (idempotent)
    if (!order.is_coupon_restored || !order.is_promotion_restored) {
      const { restorePromotionsAndCoupons } = await import('../services/orderHardeningService.js');
      await restorePromotionsAndCoupons(order, session);
      order.is_coupon_restored = true;
      order.is_promotion_restored = true;
    }

    await order.save({ session });

    // 6. Audit Log
    try {
      const { logActivity } = await import('../services/auditService.js');
      await logActivity({ userId: req.userId, userName: req.user?.full_name || req.user?.username || 'Admin', action: 'REFUND', entity: 'order', entityId: order._id, details: { from_status: oldStatus, reason: req.body.reason || 'Hoàn tiền', total_refunded: order.total_amount }, ip: req.ip });
    } catch (auditErr) {
      console.error('[Audit] Failed to log order refund:', auditErr.message);
    }

    await session.commitTransaction();
    session.endSession();

    await notifyOrderStatusSafely({ userId: order.user_id, orderId: String(order._id), status: 'REFUNDED', note: req.body.reason || 'Đã hoàn tiền đơn hàng' });
    return res.json({ success: true, data: normalizeOrder(order), message: 'Đã hoàn tiền và nhập lại kho' });
  } catch (err) {
    if (session) { await session.abortTransaction(); session.endSession(); }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    if (lockKey) await releaseLock(lockKey);
  }
};

// POST /api/orders/:id/reorder
export const reorder = async (req, res) => {
  try {
    const original = await Order.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Order not found' });
    // Regular users can only reorder their own orders
    if (req.user?.role_id === 3 && String(original.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const targetUserId = (req.user?.role_id !== 3 && req.body?.user_id) ? req.body.user_id : req.userId;
    const branchId = String(original.branch_id || '');
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Đơn gốc thiếu thông tin chi nhánh' });
    }

    let cart = await Cart.findOne({ user_id: targetUserId, branch_id: branchId });
    if (!cart) {
      cart = await Cart.create({ user_id: targetUserId, branch_id: branchId, items: [] });
    }

    const unavailableItems = [];
    const repricedItems = [];
    const adjustedItems = [];
    const addedItems = [];

    for (const item of original.items || []) {
      const requestedQty = Math.max(1, Number(item.quantity || 1));
      const oldPrice = Number(item.final_price || item.unit_price || item.price || 0);

      let branchProduct = null;
      const rawBranchProductId = item.branch_product_id ? String(item.branch_product_id) : '';

      if (rawBranchProductId && mongoose.Types.ObjectId.isValid(rawBranchProductId)) {
        branchProduct = await BranchProduct.findById(rawBranchProductId);
      }

      if (!branchProduct && item.product_id) {
        branchProduct = await BranchProduct.findOne({
          branch_id: original.branch_id,
          product_id: item.product_id,
          is_available: true,
        }).sort('-stock -updated_at');
      }

      if (!branchProduct) {
        unavailableItems.push({
          product_id: item.product_id || null,
          branch_product_id: item.branch_product_id || null,
          product_name: item.product_name || 'Sản phẩm',
          requested_qty: requestedQty,
          reason: 'Sản phẩm không còn kinh doanh tại chi nhánh này',
        });
        continue;
      }

      if (branchProduct.is_available === false || Number(branchProduct.stock || 0) <= 0) {
        unavailableItems.push({
          product_id: branchProduct.product_id || null,
          branch_product_id: branchProduct._id,
          product_name: item.product_name || 'Sản phẩm',
          requested_qty: requestedQty,
          reason: 'Sản phẩm đang hết hàng',
        });
        continue;
      }

      const maxPurchaseLimit = Number(branchProduct.max_purchase_limit || 0);
      const stockAvailable = Number(branchProduct.stock || 0);

      let addQty = Math.min(requestedQty, stockAvailable);
      if (maxPurchaseLimit > 0) {
        addQty = Math.min(addQty, maxPurchaseLimit);
      }

      if (addQty <= 0) {
        unavailableItems.push({
          product_id: branchProduct.product_id || null,
          branch_product_id: branchProduct._id,
          product_name: item.product_name || 'Sản phẩm',
          requested_qty: requestedQty,
          reason: 'Vượt quá giới hạn mua hiện tại',
        });
        continue;
      }

      const newPrice = Number(branchProduct.price || 0);
      if (newPrice !== oldPrice) {
        repricedItems.push({
          product_id: branchProduct.product_id || null,
          branch_product_id: branchProduct._id,
          product_name: item.product_name || 'Sản phẩm',
          old_price: oldPrice,
          new_price: newPrice,
        });
      }

      if (addQty < requestedQty) {
        adjustedItems.push({
          product_id: branchProduct.product_id || null,
          branch_product_id: branchProduct._id,
          product_name: item.product_name || 'Sản phẩm',
          requested_qty: requestedQty,
          accepted_qty: addQty,
          reason: maxPurchaseLimit > 0 && addQty === maxPurchaseLimit
            ? 'Giới hạn mua mỗi sản phẩm đã thay đổi'
            : 'Số lượng tồn kho hiện tại không đủ',
        });
      }

      const existingIdx = cart.items.findIndex((line) => String(line.branch_product_id) === String(branchProduct._id));
      if (existingIdx >= 0) {
        const currentQty = Number(cart.items[existingIdx].quantity || 0);
        let mergedQty = currentQty + addQty;
        mergedQty = Math.min(mergedQty, stockAvailable);
        if (maxPurchaseLimit > 0) {
          mergedQty = Math.min(mergedQty, maxPurchaseLimit);
        }

        const realAdded = Math.max(0, mergedQty - currentQty);
        if (realAdded <= 0) {
          adjustedItems.push({
            product_id: branchProduct.product_id || null,
            branch_product_id: branchProduct._id,
            product_name: item.product_name || 'Sản phẩm',
            requested_qty: requestedQty,
            accepted_qty: 0,
            reason: 'Giỏ hàng đã đạt mức tối đa cho sản phẩm này',
          });
          continue;
        }

        cart.items[existingIdx].quantity = mergedQty;
        cart.items[existingIdx].price = newPrice;
        cart.items[existingIdx].unit_price = newPrice;
        cart.items[existingIdx].product_name = item.product_name || cart.items[existingIdx].product_name || '';
        cart.items[existingIdx].product_image = item.product_image || cart.items[existingIdx].product_image || '';

        if (realAdded < addQty) {
          adjustedItems.push({
            product_id: branchProduct.product_id || null,
            branch_product_id: branchProduct._id,
            product_name: item.product_name || 'Sản phẩm',
            requested_qty: requestedQty,
            accepted_qty: realAdded,
            reason: 'Số lượng thực thêm vào giỏ bị điều chỉnh theo tồn kho/giới hạn',
          });
        }

        addedItems.push({
          product_id: branchProduct.product_id || null,
          branch_product_id: branchProduct._id,
          product_name: item.product_name || 'Sản phẩm',
          added_qty: realAdded,
          price: newPrice,
        });
      } else {
        cart.items.push({
          branch_product_id: branchProduct._id,
          quantity: addQty,
          price: newPrice,
          unit_price: newPrice,
          product_name: item.product_name || '',
          product_image: item.product_image || '',
        });

        addedItems.push({
          product_id: branchProduct.product_id || null,
          branch_product_id: branchProduct._id,
          product_name: item.product_name || 'Sản phẩm',
          added_qty: addQty,
          price: newPrice,
        });
      }
    }

    await cart.save();

    const totalAddedQty = addedItems.reduce((sum, item) => sum + Number(item.added_qty || 0), 0);
    return res.json({
      success: true,
      data: {
        order_id: String(original._id),
        branch_id: branchId,
        cart_id: String(cart._id),
        added_count: totalAddedQty,
        added_items: addedItems,
        unavailable_items: unavailableItems,
        repriced_items: repricedItems,
        adjusted_items: adjustedItems,
      },
      message: totalAddedQty > 0
        ? 'Đã thêm các sản phẩm khả dụng vào giỏ hàng'
        : 'Không có sản phẩm nào khả dụng để mua lại',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/:id/invoice
export const getInvoice = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Regular users can only view their own invoices
    if (req.user?.role_id === 3 && String(order.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({ success: true, data: { order: normalizeOrder(order), invoice_number: `INV-${order._id}`, issued_at: new Date().toISOString() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
