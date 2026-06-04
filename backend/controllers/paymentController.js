import mongoose from 'mongoose';
import { PaymentMethod, PaymentTransaction, PaymentProvider } from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import { queueOrderSuccessEmail } from '../services/orderEmailService.js';
import { isValidVietnamPhone, normalizeVietnamPhone } from '../utils/validatePhone.js';
import { notifyOrderStatusChanged, notifyPointsEarned, notifyPaymentSuccess, notifyPaymentFailed } from '../services/userNotificationService.js';
import inventoryService from '../services/inventoryService.js';
import { expireSinglePayment } from '../services/paymentTimeoutService.js';

// ─── Membership tier helper ───
const MEMBERSHIP_TIERS = [
  { name: 'Đồng', minPoints: 0 },
  { name: 'Bạc', minPoints: 100 },
  { name: 'Vàng', minPoints: 500 },
  { name: 'Kim Cương', minPoints: 2000 },
];

const calculateMembershipTier = (totalPoints) => {
  let tier = 'Đồng';
  for (const t of MEMBERSHIP_TIERS) {
    if (totalPoints >= t.minPoints) tier = t.name;
  }
  return tier;
};

// ─── Payment security & validation helpers ───
const mockDecrypt = (encText) => {
  if (!encText) return '';
  if (encText.startsWith('MOCK_ENC_')) {
    try {
      return Buffer.from(encText.substring(9), 'base64').toString('utf8');
    } catch (e) {
      return '';
    }
  }
  return encText;
};

const checkLuhn = (numStr) => {
  const clean = numStr.replace(/\D/g, '');
  if (!clean || clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
};

const checkExpiry = (expiryStr) => {
  if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(expiryStr)) return false;
  const parts = expiryStr.split('/');
  const month = parseInt(parts[0], 10);
  let year = parseInt(parts[1], 10);
  if (year < 100) year += 2000;
  const now = new Date();
  const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
  return now <= lastDay;
};

const checkHolderName = (name) => {
  return /^[A-Z\s]+$/.test(name.trim());
};

const checkCvv = (cvvStr) => {
  return /^\d{3,4}$/.test(cvvStr);
};

export const methods = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role_id !== 3 && req.query.user_id) filter.user_id = req.query.user_id;
    else filter.user_id = req.userId;
    const raw = await PaymentMethod.find(filter);
    // Normalize: map _id → id for frontend consumption
    const data = raw.map(m => {
      const o = m.toObject();
      o.id = o.id || String(o._id);
      return o;
    });
    return res.json({ success: true, data });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const addMethod = async (req, res) => {
  try {
    const userId = (req.user?.role_id !== 3 && req.body.user_id) ? req.body.user_id : req.userId;
    const { type, brand, last4, expiry, holder_name, phone, card_number_encrypted, cvv_encrypted, phone_encrypted } = req.body;

    // 1. Validation and Duplication Checks
    if (type === 'card') {
      const rawCardNumber = mockDecrypt(card_number_encrypted);
      const rawCvv = mockDecrypt(cvv_encrypted);

      if (!rawCardNumber) {
        return res.status(400).json({ success: false, message: 'Mã số thẻ bị thiếu hoặc mã hóa không đúng' });
      }
      if (!checkLuhn(rawCardNumber)) {
        return res.status(400).json({ success: false, message: 'Số thẻ không hợp lệ (Lỗi kiểm tra Luhn)' });
      }
      if (!expiry || !checkExpiry(expiry)) {
        return res.status(400).json({ success: false, message: 'Thẻ đã hết hạn hoặc định dạng ngày không hợp lệ (MM/YY hoặc MM/YYYY)' });
      }
      if (!holder_name || !checkHolderName(holder_name)) {
        return res.status(400).json({ success: false, message: 'Tên in trên thẻ phải viết hoa không dấu và chỉ chứa chữ cái' });
      }
      if (!rawCvv || !checkCvv(rawCvv)) {
        return res.status(400).json({ success: false, message: 'Mã CVC/CVV không hợp lệ (phải gồm 3 hoặc 4 chữ số)' });
      }

      // Check duplicate
      const duplicate = await PaymentMethod.findOne({ user_id: userId, type: 'card', brand, last4 });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Thẻ thanh toán này đã được thêm từ trước' });
      }
    } else if (type === 'wallet') {
      const rawPhone = mockDecrypt(phone_encrypted) || phone;
      if (!rawPhone || rawPhone.length < 10) {
        return res.status(400).json({ success: false, message: 'Số điện thoại ví không hợp lệ' });
      }

      // Check duplicate
      const duplicate = await PaymentMethod.findOne({ user_id: userId, type: 'wallet', brand, phone: rawPhone });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Ví điện tử này đã được liên kết từ trước' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Loại phương thức thanh toán không hợp lệ' });
    }

    if (req.body.is_default) {
      await PaymentMethod.updateMany({ user_id: userId }, { is_default: false });
    }

    const newMethod = await PaymentMethod.create({
      ...req.body,
      user_id: userId,
      phone: type === 'wallet' ? (mockDecrypt(phone_encrypted) || phone) : ''
    });

    return res.status(201).json({ success: true, data: newMethod });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMethod = async (req, res) => {
  try {
    const m = await PaymentMethod.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user?.role_id === 3 && String(m.user_id) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    const updated = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, data: updated });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const deleteMethod = async (req, res) => {
  try {
    const m = await PaymentMethod.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user?.role_id === 3 && String(m.user_id) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    await PaymentMethod.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const setDefault = async (req, res) => {
  try {
    const pm = await PaymentMethod.findById(req.params.id);
    if (!pm) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user?.role_id === 3 && String(pm.user_id) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    await PaymentMethod.updateMany({ user_id: pm.user_id }, { is_default: false });
    pm.is_default = true; await pm.save();
    return res.json({ success: true, data: pm });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/payments/process
// Creates a PENDING payment transaction with QR data
export const process = async (req, res) => {
  try {
    const userId = (req.user?.role_id !== 3 && req.body.user_id) ? req.body.user_id : req.userId;
    const orderId = req.body.order_id;
    const amount = req.body.amount || 0;

    const checkoutUser = await User.findById(userId);
    if (!checkoutUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const normalizedPhone = normalizeVietnamPhone(checkoutUser.phone || '');
    if (!normalizedPhone || !isValidVietnamPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ hoặc chưa cập nhật' });
    }

    // Validate order_id before creating payment session
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      console.error('[PaymentController] process: order_id is missing or invalid from request body. Received:', req.body.order_id);
      return res.status(400).json({ success: false, message: 'order_id is required and must be valid to create payment session' });
    }

    console.log('[PaymentController] Creating payment session for order:', orderId, 'amount:', amount, 'user:', userId);

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 15 minute expiry
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    // VietQR-style mock data
    const qrData = {
      bank: 'MB Bank (Ngân hàng Quân Đội)',
      account_name: 'CONG TY TNHH LOTTE MART VN',
      account_number: '0851000386868',
      amount: amount,
      description: transactionId,
      qr_url: `https://img.vietqr.io/image/MB-0851000386868-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transactionId)}&accountName=${encodeURIComponent('CONG TY TNHH LOTTE MART VN')}`,
    };

    const tx = await PaymentTransaction.create({
      order_id: orderId,
      user_id: userId,
      provider: req.body.provider || 'BANK_TRANSFER',
      method_id: req.body.method_id || '',
      transaction_id: transactionId,
      amount,
      currency: req.body.currency || 'VND',
      status: 'PENDING',
      qr_data: qrData,
      expired_at: expiredAt,
    });

    console.log('[PaymentController] Created PENDING transaction:', {
      _id: tx._id,
      transaction_id: tx.transaction_id,
      order_id: tx.order_id,
      user_id: tx.user_id,
      amount: tx.amount,
      status: tx.status,
    });

    // Build response with qrData at top level for easy frontend access
    const responseData = tx.toObject();
    responseData.id = String(tx._id);
    responseData.qrData = {
      bank: qrData.bank,
      accountName: qrData.account_name,
      accountNumber: qrData.account_number,
      amount: qrData.amount,
      description: qrData.description,
      qrUrl: qrData.qr_url,
    };

    return res.json({ success: true, data: responseData, message: 'Đã tạo phiên thanh toán' });
  } catch (err) {
    console.error('[PaymentController] process error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/:id/confirm
// Confirms payment: updates status, updates order, awards loyalty points, updates membership tier
export const confirm = async (req, res) => {
  let session = null;
  try {
    const txId = req.params.id;

    // Validate transaction ID
    if (!txId || txId === 'undefined' || txId === 'null') {
      console.error('[PaymentController] confirm: Invalid transaction ID:', txId);
      return res.status(400).json({ success: false, message: 'Transaction ID is required and must be valid' });
    }

    console.log('[PaymentController] Confirming payment for transaction:', txId);

    session = await mongoose.startSession();
    session.startTransaction();

    // Find and lock the transaction
    const tx = await PaymentTransaction.findById(txId).session(session);
    if (!tx) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch thanh toán' });
    }

    // Prevent double-confirm or confirmation of failed/cancelled/expired transactions
    if (tx.status === 'FAILED' || tx.status === 'CANCELLED' || tx.status === 'EXPIRED') {
      console.log('[PaymentController] Cannot confirm failed, cancelled, or expired transaction:', txId);
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ success: false, message: 'Không thể thanh toán giao dịch đã thất bại, đã hủy hoặc đã hết hạn' });
    }

    if (tx.status === 'COMPLETED' || tx.status === 'PAID') {
      console.log('[PaymentController] Transaction already confirmed:', txId);
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }
      if (tx.order_id && mongoose.isValidObjectId(String(tx.order_id))) {
        try {
          const existingOrder = await Order.findById(String(tx.order_id));
          if (existingOrder?._id) {
            queueOrderSuccessEmail(existingOrder._id);
          }
        } catch (err) {
          console.error('EMAIL SEND FAILED:', err);
        }
      }
      return res.json({
        success: true,
        data: {
          transaction: tx,
          points_earned: 0,
          already_confirmed: true,
        },
        message: 'Giao dịch đã được xác nhận trước đó'
      });
    }

    // Check expiry
    if (tx.expired_at && new Date() > tx.expired_at) {
      await expireSinglePayment(tx, session);
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }
      return res.status(400).json({ success: false, message: 'Phiên thanh toán đã hết hạn. Vui lòng tạo giao dịch mới.' });
    }

    // Validate and process wallet balance check/deduction if applicable
    let isWalletPayment = false;
    if (tx.method_id && mongoose.isValidObjectId(tx.method_id)) {
      const pm = await PaymentMethod.findById(tx.method_id).session(session);
      if (pm && pm.type === 'wallet') {
        isWalletPayment = true;
      }
    }

    // Check role authorization for confirmation
    const isAdmin = req.user && req.user.role_key !== 'customer';
    const isSandbox = req.isSandboxSimulation === true;
    if (!isWalletPayment && !isAdmin && !isSandbox) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xác nhận giao dịch này thủ công. Chỉ ví điện tử được tự động đối soát, hoặc cần được phê duyệt bởi quản trị viên.'
      });
    }

    if (isWalletPayment) {
      const user = await User.findById(tx.user_id).session(session);
      if (!user) {
        throw new Error('Không tìm thấy người dùng sở hữu ví');
      }
      if ((user.wallet_balance || 0) < tx.amount) {
        throw new Error('Số dư ví điện tử không đủ để thực hiện giao dịch');
      }
      user.wallet_balance = (user.wallet_balance || 0) - tx.amount;
      await user.save({ session });
      console.log('[PaymentController] Deducted wallet balance:', tx.amount, 'New balance:', user.wallet_balance);
    }

    // Mark as paid
    tx.status = 'COMPLETED';
    tx.paid_at = new Date();
    await tx.save({ session });

    console.log('[PaymentController] Confirmed transaction:', tx._id, 'for order:', tx.order_id);

    let pointsEarned = 0;
    let orderTotalAmount = tx.amount || 0;
    let membershipLevel = null;

    // Update order status and payment info
    const orderIdStr = tx.order_id ? String(tx.order_id) : '';
    const hasValidOrderId = orderIdStr
      && orderIdStr !== 'undefined'
      && orderIdStr !== 'null'
      && orderIdStr.length > 0
      && mongoose.isValidObjectId(orderIdStr);

    console.log('[PaymentController] order_id from transaction:', tx.order_id, '→ valid:', hasValidOrderId);

    if (hasValidOrderId) {
      const order = await Order.findById(orderIdStr).session(session);
      if (order) {
        if (order.status === 'CANCELLED') {
          throw new Error('Đơn hàng liên kết đã bị hủy. Không thể hoàn tất thanh toán.');
        }
        const previousStatus = order.status;
        order.payment_status = 'PAID';
        if (order.status === 'PENDING') order.status = 'CONFIRMED';
        if (order.payment) {
          order.payment.status = 'PAID';
          order.payment.transaction_id = tx.transaction_id;
        } else {
          order.payment = {
            method: tx.provider || 'BANK_TRANSFER',
            status: 'PAID',
            transaction_id: tx.transaction_id,
          };
        }

        orderTotalAmount = order.total_amount || tx.amount || 0;

        // CRITICAL: Amount validation
        if (tx.amount < orderTotalAmount) {
          console.error(`[PaymentController] ❌ Amount validation failed for order ${orderIdStr}: transaction amount (${tx.amount}) is less than order total amount (${orderTotalAmount})`);
          throw new Error(`Số tiền thanh toán không khớp với tổng đơn hàng (Giao dịch: ${tx.amount}đ, Đơn hàng: ${orderTotalAmount}đ)`);
        }

        // Calculate loyalty points: 10,000 VND = 1 point
        pointsEarned = Math.floor(orderTotalAmount / 10000);
        order.points_earned = pointsEarned;
        await order.save({ session });

        // Log order confirmation to AuditLog inside session
        try {
          const { logActivity } = await import('../services/auditService.js');
          await logActivity({
            userId: order.user_id,
            userName: 'System/Payment',
            action: 'CONFIRM_PAYMENT',
            entity: 'order',
            entityId: order._id,
            details: { transaction_id: tx.transaction_id, amount: tx.amount },
            session
          });
        } catch (auditErr) {
          console.error('[Audit] Failed to log payment confirmation:', auditErr.message);
        }

        if (previousStatus !== order.status) {
          try {
            await notifyOrderStatusChanged({
              userId: order.user_id,
              orderId: String(order._id),
              status: order.status,
              note: 'Thanh toán đã xác nhận thành công',
            });
          } catch (notifyErr) {
            console.warn('[PaymentController] order status notification failed:', notifyErr.message);
          }
        }

        console.log('[PaymentController] Updated order:', order._id, 'status:', order.status, 'payment_status:', order.payment_status, 'points_earned:', pointsEarned);
      } else {
        console.warn('[PaymentController] Order not found for id:', orderIdStr);
        pointsEarned = Math.floor((tx.amount || 0) / 10000);
      }
    } else {
      console.warn('[PaymentController] No valid order_id on transaction:', tx._id, 'raw order_id:', tx.order_id);
      pointsEarned = Math.floor((tx.amount || 0) / 10000);
    }

    // Award loyalty points — with dedup by order_id
    const userIdStr = tx.user_id ? String(tx.user_id) : '';
    const hasValidUserId = userIdStr && userIdStr !== 'undefined' && userIdStr !== 'null' && mongoose.isValidObjectId(userIdStr);

    if (pointsEarned > 0 && hasValidUserId) {
      let alreadyAwarded = false;
      if (tx.order_id) {
        const existingTx = await LoyaltyTransaction.findOne({
          user_id: tx.user_id,
          order_id: tx.order_id,
          type: 'earn',
          source: 'purchase',
        }).session(session);
        if (existingTx) {
          console.log('[PaymentController] Points already awarded for order:', tx.order_id, '— skipping');
          alreadyAwarded = true;
          pointsEarned = 0; // Don't award again
        }
      }

      if (!alreadyAwarded) {
        const user = await User.findById(userIdStr).session(session);
        if (user) {
          const previousBalance = user.lotte_points || 0;
          user.lotte_points = previousBalance + pointsEarned;

          // Update membership tier based on new total points
          const newTier = calculateMembershipTier(user.lotte_points);
          const oldTier = user.membership_level || 'Đồng';
          user.membership_level = newTier;
          membershipLevel = newTier;

          await user.save({ session });

          await LoyaltyTransaction.create([{
            user_id: user._id,
            type: 'earn',
            points: pointsEarned,
            source: 'purchase',
            description: `Tích điểm từ đơn hàng #${tx.order_id || tx.transaction_id} (${orderTotalAmount.toLocaleString('vi-VN')}đ)`,
            order_id: tx.order_id || null,
            balance_after: user.lotte_points,
          }], { session });

          try {
            await notifyPointsEarned({
              userId: user._id,
              points: pointsEarned,
              orderId: tx.order_id || null,
              newBalance: user.lotte_points,
            });
          } catch (notifyErr) {
            console.warn('[PaymentController] loyalty notification failed:', notifyErr.message);
          }

          console.log('[PaymentController] Awarded', pointsEarned, 'points to user:', user._id,
            'new balance:', user.lotte_points,
            'tier:', oldTier, '→', newTier);
        }
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    if (hasValidOrderId) {
      queueOrderSuccessEmail(orderIdStr);
    }

    // Send payment success notification
    try {
      await notifyPaymentSuccess({ userId: tx.user_id, orderId: tx.order_id, amount: orderTotalAmount });
    } catch (notifyErr) {
      console.warn('[PaymentController] payment success notification failed:', notifyErr.message);
    }

    return res.json({
      success: true,
      data: {
        transaction: tx,
        points_earned: pointsEarned,
        membership_level: membershipLevel,
        total_amount: orderTotalAmount,
      },
      message: 'Thanh toán đã được xác nhận thành công',
    });
  } catch (err) {
    console.error('[PaymentController] ❌ confirm execution failed! Error Stack:', err.stack);
    console.error('[PaymentController] ❌ Details - Transaction ID:', req.params.id, 'Simulate flag:', req.isSandboxSimulation);
    if (session) {
      try {
        console.log('[PaymentController] Aborting mongoose transaction...');
        await session.abortTransaction();
      } catch (e) {
        console.error('[PaymentController] Failed to abort mongoose transaction:', e.message);
      }
      session.endSession();
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/:id/fail
// Marks a payment as failed, restores inventory, notifies user
export const fail = async (req, res) => {
  let session = null;
  try {
    const tx = await PaymentTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    if (['COMPLETED', 'PAID'].includes(tx.status)) {
      return res.status(400).json({ success: false, message: 'Không thể hủy giao dịch đã hoàn thành' });
    }
    if (tx.status === 'FAILED') {
      return res.json({ success: true, data: tx, message: 'Giao dịch đã ở trạng thái thất bại' });
    }

    tx.status = 'FAILED';
    tx.metadata = { ...(tx.metadata || {}), fail_reason: req.body.reason || 'Payment failed', failed_at: new Date() };
    await tx.save();

    // Restore inventory and rollback order if order exists
    const orderIdStr = tx.order_id ? String(tx.order_id) : '';
    if (orderIdStr && mongoose.isValidObjectId(orderIdStr)) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        const order = await Order.findById(orderIdStr).session(session);
        if (order && order.status === 'PENDING') {
          // 1. Restore inventory (idempotent)
          if (!order.is_inventory_restored) {
            await inventoryService.restoreInventoryFromOrder(order.items, session, order._id);
            order.is_inventory_restored = true;
          }
          // 2. Restore hot deals (idempotent)
          if (!order.is_hot_deal_restored) {
            const { restoreHotDealsForOrderItems } = await import('../services/orderHardeningService.js');
            await restoreHotDealsForOrderItems(order.items, session);
            order.is_hot_deal_restored = true;
          }
          // 3. Restore coupons and promotions (idempotent)
          if (!order.is_coupon_restored || !order.is_promotion_restored) {
            const { restorePromotionsAndCoupons } = await import('../services/orderHardeningService.js');
            await restorePromotionsAndCoupons(order, session);
            order.is_coupon_restored = true;
            order.is_promotion_restored = true;
          }
          order.status = 'CANCELLED';
          order.payment.status = 'FAILED';
          order.tracking.history.push({ status: 'CANCELLED', note: 'Thanh toán thất bại — tự động hủy', timestamp: new Date() });
          await order.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
        session = null;
      } catch (orderErr) {
        if (session) { await session.abortTransaction(); session.endSession(); session = null; }
        console.error('[PaymentController] fail: order restore error:', orderErr.message);
      }
    }

    // Notify user
    try {
      await notifyPaymentFailed({ userId: tx.user_id, orderId: tx.order_id, reason: req.body.reason || '' });
    } catch (notifyErr) {
      console.warn('[PaymentController] payment fail notification error:', notifyErr.message);
    }

    return res.json({ success: true, data: tx, message: 'Giao dịch đã được đánh dấu thất bại' });
  } catch (err) {
    console.error('[PaymentController] ❌ fail execution failed! Error Stack:', err.stack);
    console.error('[PaymentController] ❌ Details - Transaction ID:', req.params.id);
    if (session) {
      try {
        console.log('[PaymentController] Aborting mongoose transaction during fail...');
        await session.abortTransaction();
      } catch (e) {
        console.error('[PaymentController] Failed to abort mongoose transaction during fail:', e.message);
      }
      session.endSession();
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/:id/cancel
export const cancelPayment = async (req, res) => {
  try {
    const tx = await PaymentTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    if (['COMPLETED', 'PAID'].includes(tx.status)) {
      return res.status(400).json({ success: false, message: 'Không thể hủy giao dịch đã hoàn thành' });
    }
    tx.status = 'CANCELLED';
    await tx.save();
    return res.json({ success: true, data: tx, message: 'Đã hủy giao dịch thanh toán' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const transactions = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role_id !== 3 && req.query.user_id) filter.user_id = req.query.user_id;
    else filter.user_id = req.userId;
    return res.json({ success: true, data: await PaymentTransaction.find(filter).sort('-created_at') });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const providers = async (req, res) => {
  try { return res.json({ success: true, data: await PaymentProvider.find() }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateProviders = async (req, res) => {
  try {
    const { providers: list } = req.body;
    if (Array.isArray(list)) {
      for (const p of list) {
        if (p._id) await PaymentProvider.findByIdAndUpdate(p._id, p);
        else await PaymentProvider.create(p);
      }
    }
    return res.json({ success: true, data: await PaymentProvider.find() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const status = async (req, res) => {
  try {
    const tx = await PaymentTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Dynamically expire if query hits an expired pending transaction
    if (['PENDING', 'PROCESSING', 'WAITING_CONFIRMATION'].includes(tx.status) && tx.expired_at && new Date() > tx.expired_at) {
      await expireSinglePayment(tx);
    }
    
    return res.json({ success: true, data: tx });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const requestCheck = async (req, res) => {
  try {
    const tx = await PaymentTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });

    // Enforce ownership: only the owner (or admin) can request verification
    if (String(tx.user_id) !== String(req.userId) && req.user?.role_key === 'customer') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này' });
    }

    if (tx.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Trạng thái giao dịch không hợp lệ để đối soát: ${tx.status}` });
    }

    tx.status = 'PROCESSING';
    await tx.save();

    if (tx.order_id) {
      const order = await Order.findById(tx.order_id);
      if (order) {
        order.payment_status = 'WAITING_CONFIRMATION';
        if (order.payment) {
          order.payment.status = 'WAITING_CONFIRMATION';
        }
        await order.save();
      }
    }

    return res.json({ success: true, data: tx, message: 'Yêu cầu đối soát đang được xử lý' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const sandboxSimulate = async (req, res) => {
  try {
    const { status: simulatedStatus } = req.body;
    if (!['COMPLETED', 'FAILED'].includes(simulatedStatus)) {
      return res.status(400).json({ success: false, message: 'Simulated status must be COMPLETED or FAILED' });
    }

    req.isSandboxSimulation = true;
    if (simulatedStatus === 'COMPLETED') {
      return confirm(req, res);
    } else {
      req.body.reason = 'Sandbox Simulated Failure';
      return fail(req, res);
    }
  } catch (err) {
    console.error('[PaymentController] ❌ sandboxSimulate execution failed! Error Stack:', err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const bankWebhook = async (req, res) => {
  try {
    const webhookToken = process.env.PAYMENT_WEBHOOK_TOKEN || 'LotteMartWebhookSecret2026';
    const tokenHeader = req.headers.authorization;
    if (!tokenHeader || !tokenHeader.startsWith('Bearer ') || tokenHeader.split(' ')[1] !== webhookToken) {
      return res.status(401).json({ success: false, message: 'Unauthorized webhook call' });
    }

    const { transaction_id, status: webhookStatus } = req.body;
    const tx = await PaymentTransaction.findOne({ transaction_id });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại' });
    }

    req.params.id = tx._id.toString();
    req.isSandboxSimulation = true; // Webhook is authorized to perform state transition

    if (webhookStatus === 'COMPLETED') {
      return confirm(req, res);
    } else {
      req.body.reason = 'Webhook reported transaction failure';
      return fail(req, res);
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
