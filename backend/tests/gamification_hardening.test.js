// backend/tests/gamification_hardening.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import { GamificationCampaign } from '../models/Gamification.js';
import { AuditLog } from '../models/Misc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = 'http://localhost:3001';

/**
 * Simple HTTP client using built-in http module.
 */
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Gamification Hardening & Flow Verification', () => {
  let adminToken = '';
  let userToken = '';
  let testUserId = ''; 
  let campaignId = '';

  before(async () => {
    // Connect to database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Ensure we have an active spin campaign to test with
    let campaign = await GamificationCampaign.findOne({ type: 'spin', is_active: true });
    if (!campaign) {
      campaign = await GamificationCampaign.create({
        title: 'Spring Spin Test Campaign',
        description: 'Test Campaign',
        type: 'spin',
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        max_spins_per_user_day: 3,
        rewards: [
          { reward_type: 'points', reward_name: '100 points', reward_value: '100', reward_probability: 100 }
        ],
        is_active: true
      });
    }
    campaignId = String(campaign._id);

    // Get Admin Token
    const adminRes = await request('POST', '/api/auth/login', {
      emailOrPhone: 'admin@lottemart.vn',
      password: 'Admin@123'
    });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.data.token || adminRes.body.token;

    // Get User Token
    const userRes = await request('POST', '/api/auth/login', {
      emailOrPhone: 'alice@gmail.com',
      password: 'password'
    });
    assert.equal(userRes.status, 200);
    userToken = userRes.body.data.token || userRes.body.token;

    // Retrieve user _id dynamically from DB
    const aliceUser = await User.findOne({ email: 'alice@gmail.com' });
    testUserId = String(aliceUser._id);
  });

  after(async () => {
    // Restore user lock state and clean up spin grants
    if (testUserId) {
      await User.findByIdAndUpdate(testUserId, {
        status: 'ACTIVE',
        $unset: { gamification_lock: 1 }
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should fetch user spin status successfully as admin', async () => {
    const res = await request(
      'GET', 
      `/api/gamification/admin/user-spin-status?user_id=${testUserId}&campaign_id=${campaignId}`, 
      null, 
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.hasOwnProperty('spins_granted'));
    assert.ok(res.body.data.hasOwnProperty('spins_used'));
    assert.ok(res.body.data.hasOwnProperty('spins_remaining'));
  });

  it('should deny user spin status queries if not admin', async () => {
    const res = await request(
      'GET', 
      `/api/gamification/admin/user-spin-status?user_id=${testUserId}&campaign_id=${campaignId}`, 
      null, 
      { Authorization: `Bearer ${userToken}` }
    );
    assert.equal(res.status, 403);
  });

  it('should successfully grant spins with type-safe user ID handling', async () => {
    // Check spin count before
    const beforeRes = await request(
      'GET', 
      `/api/gamification/admin/user-spin-status?user_id=${testUserId}&campaign_id=${campaignId}`, 
      null, 
      { Authorization: `Bearer ${adminToken}` }
    );
    const initialRemaining = beforeRes.body.data.spins_remaining;

    // Perform spin grant
    const grantRes = await request(
      'POST',
      '/api/gamification/admin/grant-spins',
      {
        user_id: testUserId,
        campaign_id: campaignId,
        spins_count: 5,
        reason: 'Integration Test Spin Grant'
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(grantRes.status, 200);
    assert.equal(grantRes.body.success, true);

    // Verify spin count increased
    const afterRes = await request(
      'GET', 
      `/api/gamification/admin/user-spin-status?user_id=${testUserId}&campaign_id=${campaignId}`, 
      null, 
      { Authorization: `Bearer ${adminToken}` }
    );
    const newRemaining = afterRes.body.data.spins_remaining;
    assert.equal(newRemaining, initialRemaining + 5);
  });

  it('should log audit log for spin grant', async () => {
    // Check if a log entry was created for spin grant in AuditLog collection
    const log = await AuditLog.findOne({
      action: 'GRANT_SPINS',
      entity: 'gamification_campaign',
      entity_id: campaignId
    });
    assert.ok(log, 'Audit log for manual grant should exist');
    assert.equal(log.details.spins_granted, 5);
  });

  it('should enforce locking/unlocking user from gamification and reflect in API response', async () => {
    // Lock the user
    const lockRes = await request(
      'POST',
      '/api/gamification/admin/lock-user',
      {
        user_id: testUserId,
        scope: 'all',
        reason: 'Testing locking security',
        duration_hours: 1
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(lockRes.status, 200);
    assert.equal(lockRes.body.success, true);

    // Verify user is locked in database
    const dbUser = await User.findById(testUserId);
    assert.equal(dbUser.gamification_lock.is_locked, true);
    assert.equal(dbUser.gamification_lock.scope, 'all');

    // Attempt to spin while locked (should fail with 403)
    const spinRes = await request(
      'POST',
      '/api/gamification/spin',
      {},
      { Authorization: `Bearer ${userToken}` }
    );
    assert.equal(spinRes.status, 403);
    assert.equal(spinRes.body.success, false);
    assert.match(spinRes.body.message, /khóa/);

    // Unlock the user
    const unlockRes = await request(
      'POST',
      '/api/gamification/admin/unlock-user',
      {
        user_id: testUserId
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.equal(unlockRes.status, 200);
    assert.equal(unlockRes.body.success, true);

    // Verify user is unlocked in database
    const dbUserUnlocked = await User.findById(testUserId);
    assert.equal(dbUserUnlocked.status, 'ACTIVE');
    assert.equal(dbUserUnlocked.gamification_lock.is_locked, false);
  });
});
