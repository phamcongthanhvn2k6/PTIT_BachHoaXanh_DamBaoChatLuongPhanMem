import cron from 'node-cron';
import BranchProduct from '../models/BranchProduct.js';
import InventoryBatch from '../models/InventoryBatch.js';
import { AuditLog } from '../models/Misc.js';
import { Coupon, CouponUsage } from '../models/Coupon.js';
import Promotion from '../models/Promotion.js';
import { PromotionUsage } from '../models/PromotionUsage.js';
import User from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import logger from '../utils/logger.js';

let schedulerStarted = false;

export async function runReconciliationAudit() {
  console.log('[RECONCILIATION] Starting data integrity reconciliation audit...');
  const discrepancies = [];

  try {
    // 1. Negative Inventory Check
    const negativeBranchProducts = await BranchProduct.find({ stock: { $lt: 0 } }).lean();
    for (const bp of negativeBranchProducts) {
      discrepancies.push({
        domain: 'inventory',
        type: 'negative_branch_product_stock',
        entityId: bp._id,
        message: `BranchProduct ${bp._id} has negative stock: ${bp.stock}`,
        details: { stock: bp.stock, sku: bp.sku, branch_id: bp.branch_id }
      });
    }

    const negativeBatches = await InventoryBatch.find({ remaining_quantity: { $lt: 0 } }).lean();
    for (const b of negativeBatches) {
      discrepancies.push({
        domain: 'inventory',
        type: 'negative_batch_remaining_quantity',
        entityId: b._id,
        message: `InventoryBatch ${b._id} has negative remaining quantity: ${b.remaining_quantity}`,
        details: { remaining_quantity: b.remaining_quantity, batch_code: b.batch_code, branch_product_id: b.branch_product_id }
      });
    }

    // 2. Coupon limit/usage mismatches
    const coupons = await Coupon.find({}).lean();
    for (const c of coupons) {
      const actualCount = await CouponUsage.countDocuments({ coupon_id: c._id });
      const recordCount = c.used_count || 0;
      if (recordCount !== actualCount) {
        discrepancies.push({
          domain: 'coupon',
          type: 'usage_count_drift',
          entityId: c._id,
          message: `Coupon ${c.code} (${c._id}) used_count drift: recorded ${recordCount}, actual ${actualCount}`,
          details: { recorded: recordCount, actual: actualCount, code: c.code }
        });
      }
    }

    // 3. Promotion usage mismatches
    const promotions = await Promotion.find({}).lean();
    for (const p of promotions) {
      const actualCount = await PromotionUsage.countDocuments({ promotion_id: p._id });
      const recordCount = p.usage_count || 0;
      if (recordCount !== actualCount) {
        discrepancies.push({
          domain: 'promotion',
          type: 'usage_count_drift',
          entityId: p._id,
          message: `Promotion ${p.title} (${p._id}) usage_count drift: recorded ${recordCount}, actual ${actualCount}`,
          details: { recorded: recordCount, actual: actualCount, title: p.title }
        });
      }
    }

    // 4. Loyalty points imbalance
    const loyaltyImbalances = await LoyaltyTransaction.aggregate([
      {
        $group: {
          _id: '$user_id',
          earned: {
            $sum: {
              $cond: [{ $eq: ['$type', 'earn'] }, '$points', 0]
            }
          },
          spent: {
            $sum: {
              $cond: [{ $eq: ['$type', 'spend'] }, '$points', 0]
            }
          },
          reversed: {
            $sum: {
              $cond: [{ $eq: ['$type', 'reverse'] }, '$points', 0]
            }
          }
        }
      }
    ]);

    for (const item of loyaltyImbalances) {
      if (!item._id) continue;
      const user = await User.findById(item._id).lean();
      if (!user) continue;

      const calculatedBalance = Math.max(0, item.earned - item.spent - item.reversed);
      const actualBalance = user.lotte_points || 0;
      
      if (calculatedBalance !== actualBalance) {
        discrepancies.push({
          domain: 'loyalty',
          type: 'points_balance_drift',
          entityId: user._id,
          message: `User ${user.username || user.email} (${user._id}) lotte_points balance drift: recorded ${actualBalance}, calculated ledger sum ${calculatedBalance}`,
          details: { recorded: actualBalance, calculated: calculatedBalance, earned: item.earned, spent: item.spent, reversed: item.reversed }
        });
      }
    }

    // 5. Alert & AuditLog if discrepancies found
    if (discrepancies.length > 0) {
      console.warn(`[RECONCILIATION] ⚠️ Found ${discrepancies.length} data integrity discrepancies during audit!`);
      logger.warn('[RECONCILIATION] Discrepancies detected:', discrepancies);

      // Create an AuditLog entry for the discrepancy report
      await AuditLog.create({
        userId: null,
        userName: 'SYSTEM_RECONCILIATION',
        action: 'RECONCILIATION_DISCREPANCY',
        entity: 'system',
        entityId: null,
        details: { discrepancies },
        ip: '127.0.0.1'
      });
    } else {
      console.log('[RECONCILIATION] ✅ Data integrity reconciliation audit completed. No discrepancies found.');
    }
  } catch (err) {
    console.error('[RECONCILIATION] ❌ Reconciliation audit failed:', err.message);
    logger.error('[RECONCILIATION] Audit error:', err);
  }

  return discrepancies;
}

export function startReconciliationScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run daily at 03:00 AM server time
  cron.schedule('0 3 * * *', async () => {
    try {
      await runReconciliationAudit();
    } catch (err) {
      console.error('[RECONCILIATION] Scheduled reconciliation failed:', err.message);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('✅ Reconciliation scheduler started (daily at 03:00 AM ICT)');
}
