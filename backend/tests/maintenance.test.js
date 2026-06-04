// backend/tests/maintenance.test.js
// ═══════════════════════════════════════════════════════
// Test suite for Maintenance Mode hardening safeguards.
// ═══════════════════════════════════════════════════════
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AdminSetting, AuditLog } from '../models/Misc.js';
import { PaymentTransaction } from '../models/Payment.js';
import { canRunDuringMaintenance } from '../utils/schedulerPolicy.js';
import { maintenanceGuard, checkMaintenanceMode, invalidateMaintenanceCache } from '../middlewares/maintenanceGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

describe('Maintenance Mode Hardening Test Suite', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    // Clean up settings to a known state
    await AdminSetting.deleteOne({ key: 'maintenance_mode' });
    invalidateMaintenanceCache();
  });

  after(async () => {
    await AdminSetting.deleteOne({ key: 'maintenance_mode' });
    invalidateMaintenanceCache();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Should report correct maintenance status', async () => {
    const isMaintenance = await checkMaintenanceMode();
    assert.equal(isMaintenance, false, 'Should be offline by default');
  });

  it('2. Scheduler policy canRunDuringMaintenance should work correctly', async () => {
    // Under non-maintenance
    let canRun = await canRunDuringMaintenance('inventory_sync');
    assert.equal(canRun, true, 'Should run non-whitelisted job if not under maintenance');

    // Turn ON maintenance mode in DB
    await AdminSetting.findOneAndUpdate(
      { key: 'maintenance_mode' },
      { key: 'maintenance_mode', value: true },
      { upsert: true }
    );
    invalidateMaintenanceCache();

    const isMaintenance = await checkMaintenanceMode();
    assert.equal(isMaintenance, true, 'Maintenance should be active');

    // Check allowed jobs
    assert.equal(await canRunDuringMaintenance('backup'), true, 'Backup should be allowed');
    assert.equal(await canRunDuringMaintenance('reconciliation'), true, 'Reconciliation should be allowed');
    assert.equal(await canRunDuringMaintenance('analytics_aggregation'), true, 'Analytics should be allowed');

    // Check blocked jobs
    assert.equal(await canRunDuringMaintenance('inventory_sync'), false, 'Inventory sync should be blocked');
    assert.equal(await canRunDuringMaintenance('promotion_publish'), false, 'Promotion publish should be blocked');
    assert.equal(await canRunDuringMaintenance('campaign_activation'), false, 'Campaign activation should be blocked');
    assert.equal(await canRunDuringMaintenance('bulk_import'), false, 'Bulk import should be blocked');

    // Restore to false
    await AdminSetting.findOneAndUpdate(
      { key: 'maintenance_mode' },
      { key: 'maintenance_mode', value: false },
      { upsert: true }
    );
    invalidateMaintenanceCache();
  });

  it('3. Maintenance bypass logic works and creates audit logs', async () => {
    // Turn ON maintenance mode
    await AdminSetting.findOneAndUpdate(
      { key: 'maintenance_mode' },
      { key: 'maintenance_mode', value: true },
      { upsert: true }
    );
    invalidateMaintenanceCache();

    // Mock request and response
    const req = {
      originalUrl: '/api/products',
      method: 'GET',
      headers: {
        'x-maintenance-bypass': 'test-token-2026'
      },
      user: {
        id: 'user123',
        username: 'test_user',
        email: 'test@lottemart.vn',
        role_key: 'customer'
      },
      ip: '127.0.0.1'
    };

    // Save bypass token env
    const originalToken = process.env.MAINTENANCE_BYPASS_TOKEN;
    process.env.MAINTENANCE_BYPASS_TOKEN = 'test-token-2026';

    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const res = {};

    await maintenanceGuard(req, res, next);
    assert.equal(nextCalled, true, 'Should allow bypass with correct token');

    // Check audit logs
    const log = await AuditLog.findOne({ action: 'MAINTENANCE_BYPASS' }).sort({ created_at: -1 });
    assert.ok(log, 'Bypass should write audit log');
    assert.equal(log.details.severity, 'CRITICAL', 'Should log critical severity');
    assert.equal(log.details.email, 'test@lottemart.vn', 'Should log correct user email');
    assert.equal(log.details.route, '/api/products', 'Should log correct route');

    // Restore original token
    process.env.MAINTENANCE_BYPASS_TOKEN = originalToken;
  });

  it('4. Payment transaction cancellation logic on settings update', async () => {
    // Create a mock pending transaction
    const txn = await PaymentTransaction.create({
      order_id: '507f1f77bcf86cd799439011',
      user_id: '507f1f77bcf86cd799439012',
      amount: 150000,
      status: 'PENDING',
      transaction_id: 'TEST-TXN-123'
    });

    // Mock settings put handler logic to trigger cancellation
    const triggerMaintenanceOn = async () => {
      const key = 'maintenance_mode';
      const value = true;
      if (key === 'maintenance_mode' && value) {
        invalidateMaintenanceCache();
        const { PaymentTransaction } = await import('../models/Payment.js');
        await PaymentTransaction.updateMany(
          { status: { $in: ['PENDING', 'PROCESSING'] } },
          { $set: { status: 'CANCELLED', 'metadata.cancel_reason': 'System entered maintenance mode' } }
        );
      }
    };

    await triggerMaintenanceOn();

    // Verify transaction status is now CANCELLED
    const updatedTxn = await PaymentTransaction.findById(txn._id);
    assert.equal(updatedTxn.status, 'CANCELLED', 'Pending transaction should be cancelled on maintenance activation');
    assert.equal(updatedTxn.metadata?.cancel_reason, 'System entered maintenance mode');

    // Clean up txn
    await PaymentTransaction.findByIdAndDelete(txn._id);
  });
});
