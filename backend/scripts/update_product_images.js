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
    console.log('Connected to MongoDB. Updating product images to high-accuracy and reliable URLs...');

    // 1. Pepsi Cola 1.5L
    const pepsi = await Product.findOne({ name: /Pepsi Cola/i });
    if (pepsi) {
      pepsi.images = [
        'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=800',
        'https://images.unsplash.com/photo-1531384441138-2736e62e0919?q=80&w=800'
      ];
      pepsi.thumbnail = pepsi.images[0];
      pepsi.gallery = pepsi.images;
      await pepsi.save();
      console.log('Updated Pepsi Cola images.');
    }

    // 2. Cà chua Đà Lạt 500g
    const tomato = await Product.findOne({ name: /Cà chua/i });
    if (tomato) {
      tomato.images = [
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=800',
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800'
      ];
      tomato.thumbnail = tomato.images[0];
      tomato.gallery = tomato.images;
      await tomato.save();
      console.log('Updated Tomato images.');
    }

    // 3. Bột giặt Omo 3kg
    const omo = await Product.findOne({ name: /Omo/i });
    if (omo) {
      omo.images = [
        'https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800',
        'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=800'
      ];
      omo.thumbnail = omo.images[0];
      omo.gallery = omo.images;
      await omo.save();
      console.log('Updated Omo images.');
    }

    // 4. Chuối Cavendish 1kg
    const banana = await Product.findOne({ name: /Chuối Cavendish/i });
    if (banana) {
      banana.images = [
        'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=800',
        'https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=800'
      ];
      banana.thumbnail = banana.images[0];
      banana.gallery = banana.images;
      await banana.save();
      console.log('Updated Chuối Cavendish images.');
    }

    // 5. Bánh quy Cosy mới
    const cosy = await Product.findOne({ name: /Bánh quy Cosy/i });
    if (cosy) {
      cosy.images = [
        'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800',
        'https://images.unsplash.com/photo-1558961309-dbdf71799f5a?q=80&w=800'
      ];
      cosy.thumbnail = cosy.images[0];
      cosy.gallery = cosy.images;
      await cosy.save();
      console.log('Updated Bánh quy Cosy images.');
    }

    // 6. Lê Đỏ Mỹ 1kg
    const pear = await Product.findOne({ name: /Lê Đỏ Mỹ/i });
    if (pear) {
      pear.images = [
        'https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=800',
        'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800'
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
