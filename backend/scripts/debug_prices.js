import mongoose from 'mongoose';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  console.log('Connected to DB');

  const bpCount = await BranchProduct.countDocuments({});
  console.log('Total BranchProducts:', bpCount);

  const bps = await BranchProduct.find({}).limit(5).populate('product_id').lean();
  for (const bp of bps) {
    console.log('--- BranchProduct:', bp._id);
    console.log('sku:', bp.sku);
    console.log('price:', bp.price, 'original_price:', bp.original_price, 'import_price:', bp.import_price);
    
    if (bp.product_id) {
      const p = bp.product_id;
      console.log('Master Product price:', p.price, 'original_price:', p.original_price, 'import_price:', p.import_price);
    } else {
      console.log('Product ID not found/populated:', bp.product_id);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
