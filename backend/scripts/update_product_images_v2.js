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
    console.log('Connected to MongoDB. Running image updates for Omo and Pear to exact high-accuracy URLs...');

    // 1. Omo (Bột giặt Omo 3kg)
    const omo = await Product.findOne({ name: /Omo/i });
    if (omo) {
      omo.images = [
        'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=800',
        'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=800'
      ];
      omo.thumbnail = omo.images[0];
      omo.gallery = omo.images;
      await omo.save();
      console.log('Updated Omo images.');
    }

    // 2. Lê Đỏ Mỹ 1kg
    const pear = await Product.findOne({ name: /Lê Đỏ Mỹ/i });
    if (pear) {
      pear.images = [
        'https://images.unsplash.com/photo-1601876819102-99560f772713?q=80&w=800',
        'https://images.unsplash.com/photo-1517431359142-d999317b62aa?q=80&w=800'
      ];
      pear.thumbnail = pear.images[0];
      pear.gallery = pear.images;
      await pear.save();
      console.log('Updated Lê Đỏ Mỹ images.');
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update product images:', err);
    process.exit(1);
  }
};

run();
