// backend/tests/paymentState.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { PaymentTransaction } from '../models/Payment.js';

describe('Payment Transaction State Machine', () => {
  it('should compile PaymentTransaction model with the correct status values', () => {
    const dummyTx = new PaymentTransaction({
      user_id: new mongoose.Types.ObjectId(),
      order_id: new mongoose.Types.ObjectId(),
      transaction_id: 'TXN_TEST_12345',
      amount: 150000,
      currency: 'VND',
      provider: 'BANK_TRANSFER',
      status: 'PENDING'
    });

    const validationError = dummyTx.validateSync();
    assert.equal(validationError, undefined, `Validation should pass, but failed: ${validationError?.message}`);
    assert.equal(dummyTx.status, 'PENDING');
  });

  it('should transition to states in the state machine enum successfully', () => {
    const validStatuses = ['DRAFT', 'PENDING', 'PROCESSING', 'WAITING_CONFIRMATION', 'COMPLETED', 'AUTHORIZED', 'FAILED', 'EXPIRED', 'REFUNDED'];

    for (const status of validStatuses) {
      const dummyTx = new PaymentTransaction({
        user_id: new mongoose.Types.ObjectId(),
        order_id: new mongoose.Types.ObjectId(),
        transaction_id: `TXN_${status}`,
        amount: 50000,
        currency: 'VND',
        provider: 'VISA',
        status
      });

      const validationError = dummyTx.validateSync();
      assert.equal(validationError, undefined, `Validation should pass for status ${status}, but failed: ${validationError?.message}`);
      assert.equal(dummyTx.status, status);
    }
  });

  it('should reject invalid status transitions or values not in the enum', () => {
    const dummyTx = new PaymentTransaction({
      user_id: new mongoose.Types.ObjectId(),
      order_id: new mongoose.Types.ObjectId(),
      transaction_id: 'TXN_INVALID',
      amount: 50000,
      currency: 'VND',
      provider: 'VISA',
      status: 'FAKE_SUCCESS' // Not in enum
    });

    const validationError = dummyTx.validateSync();
    assert.ok(validationError, 'Validation should fail for status FAKE_SUCCESS');
    assert.ok(validationError.errors.status, 'Should have validation error specifically on the status field');
  });
});
