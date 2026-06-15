import mongoose from 'mongoose';
import Promotion from '../models/Promotion.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  console.log('Connected to DB');

  const promos = await Promotion.find({}).lean();
  for (const p of promos) {
    console.log('--- Promotion ID:', p._id);
    console.log('title:', p.title);
    console.log('type:', p.type);
    console.log('discount_value:', p.discount_value);
    console.log('scope:', p.scope);
    console.log('target_product_ids:', p.target_product_ids);
    console.log('target_category_ids:', p.target_category_ids);
    console.log('target_branch_ids:', p.target_branch_ids);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
