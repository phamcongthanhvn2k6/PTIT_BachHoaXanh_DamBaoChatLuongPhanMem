import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const total = await Product.countDocuments({});
  console.log(`Total products: ${total}`);
  
  // Group products by category
  const categories = await Product.aggregate([
    { $group: { _id: '$category_id', count: { $sum: 1 } } }
  ]);
  console.log('Products per category:');
  console.log(categories);
  
  // Find first 20 products
  const products = await Product.find({}).limit(50);
  console.log('Sample Products (first 50):');
  products.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p._id}] Name: ${p.name} | Category ID: ${p.category_id} | Slug: ${p.slug}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
