import cron from 'node-cron';
import BranchProduct from '../models/BranchProduct.js';
import InventoryBatch from '../models/InventoryBatch.js';
import { AuditLog } from '../models/Misc.js';
import { sendMail } from './emailService.js';
import { Coupon, CouponUsage } from '../models/Coupon.js';
import Promotion from '../models/Promotion.js';
import { PromotionUsage } from '../models/PromotionUsage.js';
import User from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import logger from '../utils/logger.js';
import { checkMaintenanceMode } from '../middlewares/maintenanceGuard.js';

let schedulerStarted = false;

export async function runReconciliationAudit() {
  const isMaintenance = await checkMaintenanceMode();
  console.log(`[RECONCILIATION] Starting data integrity reconciliation audit. [Maintenance Mode: ${isMaintenance ? 'ACTIVE' : 'INACTIVE'}]`);
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
          totalPoints: { $sum: '$points' }
        }
      }
    ]);

    for (const item of loyaltyImbalances) {
      if (!item._id) continue;
      const user = await User.findById(item._id).lean();
      if (!user) continue;

      const calculatedBalance = Math.max(0, item.totalPoints || 0);
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

      // Trigger daily reconciliation discrepancy alert
      await sendReconciliationAlert(discrepancies);
    } else {
      console.log('[RECONCILIATION] ✅ Data integrity reconciliation audit completed. No discrepancies found.');
    }
  } catch (err) {
    console.error('[RECONCILIATION] ❌ Reconciliation audit failed:', err.message);
    logger.error('[RECONCILIATION] Audit error:', err);
  }

  return discrepancies;
}

export async function sendReconciliationAlert(discrepancies) {
  try {
    const adminEmail = process.env.EMAIL_USER || 'admin@bachhoaxanh.com';
    const subject = `[BHX ERP ALERT] ${discrepancies.length} Data Reconciliation Discrepancies Found`;
    const rows = discrepancies.map(d => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-weight: bold; color: #e53e3e;">${d.domain.toUpperCase()}</td>
        <td style="padding: 8px;">${d.type}</td>
        <td style="padding: 8px;">${d.message}</td>
        <td style="padding: 8px; font-family: monospace; font-size: 11px;">${JSON.stringify(d.details)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #2d3748;">
        <h2 style="color: #e53e3e; border-bottom: 2px solid #e53e3e; padding-bottom: 8px;">⚠️ Cảnh Báo Đối Soát Dữ Liệu Bách hóa XANH ERP</h2>
        <p>Hệ thống tự động phát hiện <b>${discrepancies.length} bất thường</b> về dữ liệu trong đợt đối soát lúc <b>${new Date().toLocaleString('vi-VN')}</b>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background-color: #f7fafc; border-bottom: 2px solid #cbd5e0;">
              <th style="padding: 8px; text-align: left;">Phân Hệ</th>
              <th style="padding: 8px; text-align: left;">Loại Lỗi</th>
              <th style="padding: 8px; text-align: left;">Nội Dung Chi Tiết</th>
              <th style="padding: 8px; text-align: left;">Thông Tin Kỹ Thuật</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <p style="margin-top: 24px; color: #718096; font-size: 12px;">Đây là email tự động từ hệ thống giám sát. Vui lòng đăng nhập Admin Dashboard để kiểm tra và xử lý.</p>
      </div>
    `;

    await sendMail({
      to: adminEmail,
      subject,
      text: `Cảnh Báo Đối Soát Dữ Liệu: ${discrepancies.length} bất thường được tìm thấy.`,
      html
    });
    console.log(`[RECONCILIATION] Alert email sent successfully to ${adminEmail}`);
  } catch (err) {
    console.error(`[RECONCILIATION] Failed to send discrepancy alert email:`, err.message);
  }
}

export function startReconciliationScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run daily at 03:00 AM server time
  cron.schedule('0 3 * * *', async () => {
    try {
      const { canRunDuringMaintenance } = await import('../utils/schedulerPolicy.js');
      const allowed = await canRunDuringMaintenance('reconciliation');
      if (!allowed) {
        console.warn('[RECONCILIATION] Scheduled reconciliation skipped because it is blocked during maintenance.');
        return;
      }
      await runReconciliationAudit();
    } catch (err) {
      console.error('[RECONCILIATION] Scheduled reconciliation failed:', err.message);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('✅ Reconciliation scheduler started (daily at 03:00 AM ICT)');
}
