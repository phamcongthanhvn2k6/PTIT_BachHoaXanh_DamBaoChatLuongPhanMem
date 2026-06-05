import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Product from '../models/Product.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const terms = ['gạo', 'đậu', 'nước', 'đầu'];
  for (const t of terms) {
    const prods = await Product.find({
      name: { $regex: t, $options: 'i' }
    }).limit(10).lean();
    console.log(`\nSearch term "${t}": found ${prods.length} products`);
    prods.forEach(p => {
      console.log(` - ID: ${p._id}, Name: "${p.name}", Cat: "${p.category_name}"`);
    });
  }

  // Find unique categories
  const categories = await Product.distinct('category_name');
  console.log('\nUnique categories in DB:', categories);

  const total = await Product.countDocuments();
  console.log(`\nTotal products in DB: ${total}`);
  const sample = await Product.find().limit(20).lean();
  console.log('Sample 20 products:');
  sample.forEach(p => {
    console.log(` - ID: ${p._id}, Name: "${p.name}", Cat: "${p.category_name}"`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
