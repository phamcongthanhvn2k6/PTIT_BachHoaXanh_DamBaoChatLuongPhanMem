// backend/tests/orderPromotionStabilization.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Order from '../models/Order.js';

describe('Order Promotion Schema Stabilization', () => {
  it('should compile Order model and validate successfully with structured applied_promotions', () => {
    const dummyOrder = new Order({
      user_id: new mongoose.Types.ObjectId(),
      branch_id: new mongoose.Types.ObjectId(),
      branch_name: 'Test Branch',
      items: [{
        branch_product_id: new mongoose.Types.ObjectId(),
        product_id: new mongoose.Types.ObjectId(),
        product_name: 'Test Product',
        quantity: 1,
        price: 10000,
        original_price: 10000,
        unit_price: 10000,
        final_price: 9000,
        discount_amount: 1000,
      }],
      subtotal: 10000,
      shipping_fee: 2000,
      discount_amount: 1000,
      total_amount: 11000,
      payment: {
        method: 'COD',
        status: 'PENDING'
      },
      applied_promotions: [
        {
          promotion_id: new mongoose.Types.ObjectId().toString(),
          title: 'Giảm giá 10%',
          type: 'discount',
          badge_text: 'HOT',
          discount_amount: 1000,
          affected_items: 1
        }
      ],
      applied_coupon: {
        coupon_id: new mongoose.Types.ObjectId().toString(),
        code: 'TESTCOUPON',
        title: 'Giảm giá 5k',
        type: 'fixed',
        discount_amount: 5000
      }
    });

    const validationError = dummyOrder.validateSync();
    assert.equal(validationError, undefined, `Validation should pass, but failed: ${validationError?.message}`);
    
    // Assert structural values of the subdocument
    assert.equal(dummyOrder.applied_promotions[0].title, 'Giảm giá 10%');
    assert.equal(dummyOrder.applied_promotions[0].discount_amount, 1000);
    assert.equal(dummyOrder.applied_coupon.code, 'TESTCOUPON');
  });

  it('should cast numeric properties correctly in applied_promotions subdocument', () => {
    const dummyOrder = new Order({
      user_id: new mongoose.Types.ObjectId(),
      items: [],
      applied_promotions: [
        {
          promotion_id: new mongoose.Types.ObjectId().toString(),
          title: 'Giảm 20k',
          type: 'discount',
          badge_text: 'PROMO',
          discount_amount: '20000', // string that should be cast to number
          affected_items: '2' // string that should be cast to number
        }
      ]
    });

    const validationError = dummyOrder.validateSync();
    assert.equal(validationError, undefined, `Validation should pass, but failed: ${validationError?.message}`);
    assert.equal(typeof dummyOrder.applied_promotions[0].discount_amount, 'number');
    assert.equal(dummyOrder.applied_promotions[0].discount_amount, 20000);
    assert.equal(dummyOrder.applied_promotions[0].affected_items, 2);
  });
});
