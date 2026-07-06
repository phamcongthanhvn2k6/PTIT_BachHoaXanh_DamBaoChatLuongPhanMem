import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../models/Product.js';

const backupPath = path.join(__dirname, '../backups/cloudinary_products_backup.json');
const mockDataPath = path.join(__dirname, '../../fontend/mockData.json');

const run = async () => {
  try {
    if (!fs.existsSync(backupPath)) {
      console.error('Backup file not found at:', backupPath);
      process.exit(1);
    }

    if (!fs.existsSync(mockDataPath)) {
      console.error('mockData.json not found at:', mockDataPath);
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const backupProducts = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

    console.log(`Loaded ${backupProducts.length} products from backup.`);
    console.log(`Loaded mockData.json with ${mockData.products ? mockData.products.length : 0} products.`);

    let dbUpdatedCount = 0;
    let mockUpdatedCount = 0;

    // Create a map of id/name/sku to Cloudinary URL
    const cloudinaryMap = new Map();

    for (const bp of backupProducts) {
      const images = bp.images || [];
      const gallery = bp.gallery || [];
      const allUrls = [...images, ...gallery];
      
      const cloudinaryUrl = allUrls.find(url => typeof url === 'string' && url.includes('cloudinary.com'));
      
      if (cloudinaryUrl) {
        cloudinaryMap.set(bp._id, cloudinaryUrl);
        if (bp.name) cloudinaryMap.set(bp.name, cloudinaryUrl);
        if (bp.sku) cloudinaryMap.set(bp.sku, cloudinaryUrl);
      }
    }

    console.log(`Found ${cloudinaryMap.size} total mappings with Cloudinary URLs.`);

    // 1. Update MongoDB Database Products
    const dbProducts = await Product.find({});
    for (const product of dbProducts) {
      const idStr = product._id.toString();
      let cloudinaryUrl = cloudinaryMap.get(idStr) || cloudinaryMap.get(product.name) || cloudinaryMap.get(product.sku);

      if (cloudinaryUrl) {
        product.images = [cloudinaryUrl];
        product.thumbnail = cloudinaryUrl;
        product.gallery = [cloudinaryUrl];
        await product.save();
        dbUpdatedCount++;
      }
    }

    // 2. Update mockData.json Products
    if (mockData.products) {
      for (const product of mockData.products) {
        const paddedId = String(product.id).padStart(24, '0');
        let cloudinaryUrl = cloudinaryMap.get(paddedId) || cloudinaryMap.get(product.name) || cloudinaryMap.get(product.sku);

        if (cloudinaryUrl) {
          product.images = [cloudinaryUrl];
          product.thumbnail = cloudinaryUrl;
          product.gallery = [cloudinaryUrl];
          mockUpdatedCount++;
        }
      }

      // Write updated mockData.json back to disk
      fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2), 'utf8');
      console.log('Successfully updated and saved mockData.json.');
    }

    console.log(`Summary:`);
    console.log(`- Updated ${dbUpdatedCount} products in MongoDB database.`);
    console.log(`- Updated ${mockUpdatedCount} products in mockData.json.`);

    process.exit(0);
  } catch (err) {
    console.error('Error during restoration:', err);
    process.exit(1);
  }
};

run();
