import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../models/Product.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const products = await Product.find({}, 'name images thumbnail gallery');
    console.log('PRODUCTS IN DB:');
    products.forEach(p => {
      console.log(`- ID: ${p._id}, Name: "${p.name}", Images:`, p.images, `, Thumbnail: "${p.thumbnail}"`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
