/**
 * Migration script to backfill short_codes and update slugs for all existing products.
 *
 * Run with: node --experimental-modules backend/scripts/backfillSlugs.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import Product from '../models/Product.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lotte_mart';

async function backfillSlugs() {
  console.log(`[backfillSlugs] Connecting to MongoDB: ${MONGO_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(MONGO_URI);
  console.log('[backfillSlugs] Connected.');

  const products = await Product.find({});

  console.log(`[backfillSlugs] Found ${products.length} products to check and migrate.`);

  let updated = 0;
  for (const product of products) {
    const oldSlug = product.slug;
    const oldShortCode = product.short_code;
    
    // Calling save() triggers the pre-save hook which generates/updates slug & short_code
    await product.save();
    
    if (product.slug !== oldSlug || product.short_code !== oldShortCode) {
      updated++;
    }
  }

  console.log(`[backfillSlugs] Done. Migrated/Updated ${updated} products.`);
  await mongoose.disconnect();
  process.exit(0);
}

backfillSlugs().catch((err) => {
  console.error('[backfillSlugs] Fatal error:', err);
  process.exit(1);
});
