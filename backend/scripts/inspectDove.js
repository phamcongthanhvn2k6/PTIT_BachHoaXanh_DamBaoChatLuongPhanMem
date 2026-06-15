import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import InventoryBatch from '../models/InventoryBatch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({ name: /Dove/i }).lean();
  console.log(`Found ${products.length} products:`);
  for (const p of products) {
    console.log(`- ID: ${p._id}, SKU: ${p.sku}, Name: "${p.name}"`);
    const bps = await BranchProduct.find({ product_id: p._id }).lean();
    for (const bp of bps) {
      console.log(`  * BranchProduct ID: ${bp._id}, Branch: ${bp.branch_id}, Stock: ${bp.stock}`);
      const batches = await InventoryBatch.find({ branch_product_id: bp._id }).lean();
      const batchesStr = await InventoryBatch.find({ branch_product_id: String(bp._id) }).lean();
      console.log(`    Batches (ObjId): ${batches.length}, Batches (Str): ${batchesStr.length}`);
      for (const b of batches) {
        console.log(`      [ObjId] Batch: ${b.batch_code}, Qty: ${b.quantity}, Exp: ${b.exp_date}`);
      }
      for (const b of batchesStr) {
        console.log(`      [Str] Batch: ${b.batch_code}, Qty: ${b.quantity}, Exp: ${b.exp_date}`);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
