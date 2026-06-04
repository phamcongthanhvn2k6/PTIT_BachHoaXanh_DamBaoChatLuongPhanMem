// backend/tests/paymentDebug.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PaymentTransaction } from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { confirm, fail } from '../controllers/paymentController.js';

describe('Payment Confirmation Debug Test', () => {
  before(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  });

  after(async () => {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  });

  it('should attempt to confirm a transaction and log the exact error', async () => {
    // 1. Create a mock user
    const mockUser = await User.create({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      phone: '0912345678', // valid VN phone
      email_verified: true,
      lotte_points: 0,
      wallet_balance: 1000000,
    });

    // 2. Create a mock order
    const mockOrder = await Order.create({
      user_id: mockUser._id,
      branch_id: new mongoose.Types.ObjectId().toString(),
      branch_name: 'Test Branch',
      subtotal: 50000,
      shipping_fee: 10000,
      total_amount: 60000,
      status: 'PENDING',
      payment_method: 'qr_transfer',
      payment_status: 'PENDING',
      order_address: {
        receiver_name: 'Test Receiver',
        phone: '0912345678',
        full_address: 'Test Address',
      },
      items: [
        {
          product_id: new mongoose.Types.ObjectId().toString(),
          branch_product_id: new mongoose.Types.ObjectId().toString(),
          quantity: 1,
          price: 50000,
          unit_price: 50000,
          original_price: 50000,
          final_price: 50000,
          product_name: 'Test Product',
        }
      ]
    });

    // 3. Create a payment transaction
    const mockTx = await PaymentTransaction.create({
      order_id: mockOrder._id,
      user_id: mockUser._id,
      provider: 'BANK_TRANSFER',
      transaction_id: `TXN-DEBUG-${Date.now()}`,
      amount: 60000,
      status: 'PENDING',
    });

    console.log('Created Mock Transaction ID:', mockTx._id.toString());

    // 4. Call confirm
    const req = {
      params: { id: mockTx._id.toString() },
      isSandboxSimulation: true,
      body: {},
      user: { role_key: 'customer' },
    };

    let statusCalled = null;
    let jsonCalled = null;

    const res = {
      status(s) {
        statusCalled = s;
        return this;
      },
      json(j) {
        jsonCalled = j;
        return this;
      }
    };

    try {
      console.log('Calling confirm...');
      await confirm(req, res);
      console.log('Response Status:', statusCalled);
      console.log('Response JSON:', JSON.stringify(jsonCalled, null, 2));
    } catch (err) {
      console.error('Confirm threw error:', err);
    } finally {
      // Cleanup
      await PaymentTransaction.deleteOne({ _id: mockTx._id });
      await Order.deleteOne({ _id: mockOrder._id });
      await User.deleteOne({ _id: mockUser._id });
    }
  });
});
