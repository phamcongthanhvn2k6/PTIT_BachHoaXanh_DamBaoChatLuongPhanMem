// backend/services/paymentTimeoutService.js
// ═══════════════════════════════════════════════════════
// Automatic Payment Expiration Service
// ═══════════════════════════════════════════════════════
import cron from 'node-cron';
import mongoose from 'mongoose';
import { PaymentTransaction } from '../models/Payment.js';
import Order from '../models/Order.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import { HotDeal } from '../models/Misc.js';
import inventoryService from './inventoryService.js';
import { restorePromotionsAndCoupons, restoreHotDealsForOrderItems } from './orderHardeningService.js';
import { logActivity } from './auditService.js';
import { notifyPaymentFailed, notifyOrderStatusChanged } from './userNotificationService.js';

let schedulerStarted = false;

/**
 * Expire a single payment transaction, releasing all associated order resources.
 * Idempotent and transaction-safe.
 */
export async function expireSinglePayment(tx, session = null) {
  const oldStatus = tx.status;
  
  // Update transaction status to EXPIRED
  tx.status = 'EXPIRED';
  tx.metadata = {
    ...(tx.metadata || {}),
    expired_reason: 'No verification within 15 minutes',
    expired_at: new Date()
  };
  
  if (session) {
    await tx.save({ session });
  } else {
    await tx.save();
  }

  // Handle associated order rollback
  const orderIdStr = tx.order_id ? String(tx.order_id) : '';
  if (orderIdStr && mongoose.isValidObjectId(orderIdStr)) {
    const order = session
      ? await Order.findById(orderIdStr).session(session)
      : await Order.findById(orderIdStr);

    if (order && order.status === 'PENDING') {
      // A. Restore inventory (idempotent via order flag)
      if (!order.is_inventory_restored) {
        await inventoryService.restoreInventoryFromOrder(order.items, session, order._id);
        for (const item of order.items) {
          try {
            const bp = session
              ? await BranchProduct.findById(item.branch_product_id).session(session)
              : await BranchProduct.findById(item.branch_product_id);
            if (bp) {
              bp.sold_count = Math.max(0, (bp.sold_count || 0) - item.quantity);
              if (session) {
                await bp.save({ session });
              } else {
                await bp.save();
              }
              
              const p = session
                ? await Product.findById(bp.product_id).session(session)
                : await Product.findById(bp.product_id);
              if (p) {
                p.sold_count = Math.max(0, (p.sold_count || 0) - item.quantity);
                if (session) {
                  await p.save({ session });
                } else {
                  await p.save();
                }
              }
            }
          } catch (e) {
            console.warn(`[PAYMENT_TIMEOUT] sold_count revert error for item ${item.branch_product_id}:`, e.message);
          }
        }
        order.is_inventory_restored = true;
      }

      // B. Restore Hot Deals (idempotent via order flag)
      if (!order.is_hot_deal_restored) {
        await restoreHotDealsForOrderItems(order.items, session);
        order.is_hot_deal_restored = true;
      }

      // C. Restore coupon/promotions (idempotent via order flags)
      if (!order.is_coupon_restored || !order.is_promotion_restored) {
        await restorePromotionsAndCoupons(order, session);
        order.is_coupon_restored = true;
        order.is_promotion_restored = true;
      }

      // D. Cancel the order itself
      order.status = 'CANCELLED';
      order.cancel_reason = 'Thanh toán hết hạn (15 phút) — tự động hủy';
      order.payment.status = 'EXPIRED';
      order.tracking.history.push({
        status: 'CANCELLED',
        note: 'Thanh toán hết hạn (15 phút) — tự động hủy',
        timestamp: new Date()
      });

      if (session) {
        await order.save({ session });
      } else {
        await order.save();
      }

      // E. Notify Order Status Changed
      try {
        await notifyOrderStatusChanged({
          userId: order.user_id,
          orderId: String(order._id),
          status: 'CANCELLED',
          note: 'Thanh toán hết hạn (15 phút) — tự động hủy'
        });
      } catch (notifyErr) {
        console.warn('[PAYMENT_TIMEOUT] order status notification failed:', notifyErr.message);
      }
    }
  }

  // 3. Write Audit Log
  await logActivity({
    userId: null,
    userName: 'SYSTEM_PAYMENT_TIMEOUT',
    action: 'PAYMENT_EXPIRED',
    entity: 'payment',
    entityId: tx._id,
    details: {
      order_id: tx.order_id,
      transaction_id: tx.transaction_id,
      old_status: oldStatus,
      new_status: 'EXPIRED',
      reason: 'No verification within 15 minutes',
      amount: tx.amount
    }
  });

  // 4. Send Payment Failed Notification to the customer
  try {
    await notifyPaymentFailed({
      userId: tx.user_id,
      orderId: tx.order_id,
      reason: 'Phiên thanh toán đã hết hạn (15 phút) mà không nhận được xác nhận.'
    });
  } catch (notifyErr) {
    console.warn('[PAYMENT_TIMEOUT] payment failed notification failed:', notifyErr.message);
  }
}

/**
 * Scan for stale pending payments older than 15 minutes and expire them.
 */
export async function expireStalePayments() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  // Find transactions in PENDING, PROCESSING, or WAITING_CONFIRMATION older than 15 minutes
  const staleTransactions = await PaymentTransaction.find({
    status: { $in: ['PENDING', 'PROCESSING', 'WAITING_CONFIRMATION'] },
    $or: [
      { expired_at: { $lte: new Date() } },
      { expired_at: null, created_at: { $lte: fifteenMinutesAgo } }
    ]
  });

  if (staleTransactions.length === 0) {
    return { expiredCount: 0 };
  }

  console.log(`[PAYMENT_TIMEOUT] Found ${staleTransactions.length} stale pending transactions to expire.`);
  let expiredCount = 0;

  for (const tx of staleTransactions) {
    let session = null;
    try {
      // Start database transaction for safety
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (err) {
        session = null;
      }

      // Re-fetch transaction under lock/session to ensure idempotency
      const currentTx = session 
        ? await PaymentTransaction.findById(tx._id).session(session)
        : await PaymentTransaction.findById(tx._id);

      if (!currentTx || !['PENDING', 'PROCESSING', 'WAITING_CONFIRMATION'].includes(currentTx.status)) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        continue; // Already processed or changed status
      }

      await expireSinglePayment(currentTx, session);

      // Commit Mongoose transaction
      if (session) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }

      expiredCount++;
      console.log(`[PAYMENT_TIMEOUT] Successfully expired transaction ${currentTx._id} and rolled back order resources.`);
    } catch (txErr) {
      console.error(`[PAYMENT_TIMEOUT] Failed to expire transaction ${tx._id}:`, txErr.stack);
      if (session) {
        try {
          await session.abortTransaction();
        } catch (e) {
          console.error('[PAYMENT_TIMEOUT] Failed to abort transaction:', e.message);
        }
        session.endSession();
        session = null;
      }
    }
  }

  return { expiredCount };
}

/**
 * Start cron job scheduler running every minute.
 */
export function startPaymentTimeoutScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const { canRunDuringMaintenance } = await import('../utils/schedulerPolicy.js');
      const allowed = await canRunDuringMaintenance('payment_timeout');
      if (!allowed) {
        console.warn('[PAYMENT_TIMEOUT] Scheduled timeout sweep skipped because it is blocked during maintenance.');
        return;
      }
      await expireStalePayments();
    } catch (err) {
      console.error('[PAYMENT_TIMEOUT] Scheduled timeout sweep failed:', err.message);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('✅ Payment timeout scheduler started (every minute)');
}
