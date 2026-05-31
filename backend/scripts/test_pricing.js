import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import { resolveEffectivePrice, resolveProductPricing } from '../services/pricingResolverService.js';

dotenv.config({ path: path.resolve('.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const pId = '000000000000000000000012';
  const p = await Product.findById(pId);
  console.log(`Product: ${p.name}`);
  
  const bp = await BranchProduct.findOne({ product_id: new mongoose.Types.ObjectId(pId) });
  console.log('Found BranchProduct directly in test with ObjectId:', bp);

  const pricing = await resolveProductPricing(p, null, null, { now: new Date() });
  console.log('Pricing resolved:', pricing);

  await mongoose.disconnect();
}

run().catch(console.error);
