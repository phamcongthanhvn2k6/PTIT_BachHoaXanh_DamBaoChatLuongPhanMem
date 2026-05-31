// backend/tests/adminAnalytics.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import { resolveProductPricing } from '../services/pricingResolverService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

describe('Admin Analytics Product Pricing Audit', () => {
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

  it('should query top selling products and resolve correct pricing and fields', async () => {
    const rawTopProducts = await Product.find({ is_deleted: { $ne: true } })
      .sort({ sold_count: -1 })
      .limit(5);

    assert.ok(rawTopProducts.length > 0, 'Should have products in database');

    const topSellingProducts = await Promise.all(
      rawTopProducts.map(async (p) => {
        const pricing = await resolveProductPricing(p, null, null, { now: new Date() });
        const img = (p.images && p.images.length > 0) ? p.images[0] : (p.thumbnail || '');
        const pr = pricing.effective_price ?? p.price ?? p.original_price ?? 0;
        return {
          productId: String(p._id),
          productName: p.name || '',
          image: img,
          quantitySold: p.sold_count || 0,
          price: pr,
          effectivePrice: pr,
          _id: p._id,
          name: p.name || '',
          sold_count: p.sold_count || 0
        };
      })
    );

    assert.equal(topSellingProducts.length, rawTopProducts.length);

    for (const p of topSellingProducts) {
      // 1. Assert required fields in contract
      assert.ok(p.productId, 'Should have productId');
      assert.ok(p.productName, 'Should have productName');
      assert.ok(typeof p.image === 'string', 'Should have image path');
      assert.ok(typeof p.quantitySold === 'number', 'Should have quantitySold');
      assert.ok(typeof p.price === 'number', 'Should have price');
      assert.ok(typeof p.effectivePrice === 'number', 'Should have effectivePrice');

      // 2. Ensure price is resolved and correct (not falling back to 0 if original product had a price)
      const originalProduct = rawTopProducts.find(orig => String(orig._id) === p.productId);
      if (originalProduct && (originalProduct.price > 0 || originalProduct.original_price > 0)) {
        assert.ok(p.price > 0, `Price for ${p.productName} should be greater than 0, got ${p.price}`);
        assert.ok(p.effectivePrice > 0, `EffectivePrice for ${p.productName} should be greater than 0, got ${p.effectivePrice}`);
      }
    }
  });
});
