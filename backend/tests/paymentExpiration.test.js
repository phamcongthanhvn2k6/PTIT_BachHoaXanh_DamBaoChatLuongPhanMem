// backend/tests/paymentExpiration.test.js
// ═══════════════════════════════════════════════════════
// Test suite for Payment Timeout Expiration mechanism.
// ═══════════════════════════════════════════════════════
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PaymentTransaction } from '../models/Payment.js';
import Order from '../models/Order.js';
import { AuditLog } from '../models/Misc.js';
import StockMovement from '../models/StockMovement.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import { expireStalePayments, expireSinglePayment } from '../services/paymentTimeoutService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

describe('Payment Timeout Expiration Test Suite', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('Should successfully expire stale pending transactions and cancel their associated orders', async () => {
    const orderId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const txId = new mongoose.Types.ObjectId();

    // 1. Create a dummy order in PENDING status
    const order = await Order.create({
      _id: orderId,
      user_id: userId,
      branch_id: new mongoose.Types.ObjectId(),
      items: [
        {
          branch_product_id: new mongoose.Types.ObjectId(),
          name: 'Stale Product',
          quantity: 2,
          price: 50000,
        }
      ],
      subtotal: 100000,
      shipping_fee: 10000,
      total_amount: 110000,
      status: 'PENDING',
      payment_method: 'BANK_TRANSFER',
      payment_status: 'PENDING',
      is_inventory_restored: false,
      is_coupon_restored: false,
      is_promotion_restored: false,
      is_hot_deal_restored: false,
      order_address: {
        receiver_name: 'Nguyen Van Test',
        phone: '0987654321',
        full_address: '123 Test St, District 7, HCMC'
      }
    });

    // 2. Create a PaymentTransaction that expired 20 minutes ago
    const tx = await PaymentTransaction.create({
      _id: txId,
      order_id: orderId,
      user_id: userId,
      transaction_id: 'TXN-EXPIRE-TEST-123',
      amount: 110000,
      currency: 'VND',
      provider: 'BANK_TRANSFER',
      status: 'PENDING',
      expired_at: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      created_at: new Date(Date.now() - 35 * 60 * 1000)
    });

    // 3. Trigger stale payment expiration check
    const result = await expireStalePayments();
    assert.ok(result.expiredCount >= 1, 'Should find and expire at least our created test transaction');

    // 4. Verify transaction status updated to EXPIRED
    const updatedTx = await PaymentTransaction.findById(txId);
    assert.equal(updatedTx.status, 'EXPIRED', 'Transaction status should be EXPIRED');
    assert.equal(updatedTx.metadata?.expired_reason, 'No verification within 15 minutes');

    // 5. Verify associated order was cancelled with correct status & flags
    const updatedOrder = await Order.findById(orderId);
    assert.equal(updatedOrder.status, 'CANCELLED', 'Order status should be CANCELLED');
    assert.equal(updatedOrder.payment.status, 'EXPIRED', 'Order payment status should be EXPIRED');
    assert.equal(updatedOrder.cancel_reason, 'Thanh toán hết hạn (15 phút) — tự động hủy', 'Order cancellation reason should be set');
    assert.equal(updatedOrder.is_inventory_restored, true, 'is_inventory_restored flag should be true');
    assert.equal(updatedOrder.is_coupon_restored, true, 'is_coupon_restored flag should be true');
    assert.equal(updatedOrder.is_promotion_restored, true, 'is_promotion_restored flag should be true');
    assert.equal(updatedOrder.is_hot_deal_restored, true, 'is_hot_deal_restored flag should be true');

    // 6. Verify audit log was created
    const log = await AuditLog.findOne({
      action: 'PAYMENT_EXPIRED',
      entity: 'payment',
      entity_id: txId
    });
    assert.ok(log, 'Audit log for PAYMENT_EXPIRED should be present');
    assert.equal(log.details.old_status, 'PENDING');
    assert.equal(log.details.new_status, 'EXPIRED');

    // Clean up
    await PaymentTransaction.findByIdAndDelete(txId);
    await Order.findByIdAndDelete(orderId);
    await AuditLog.deleteOne({ _id: log._id });
  });
});
