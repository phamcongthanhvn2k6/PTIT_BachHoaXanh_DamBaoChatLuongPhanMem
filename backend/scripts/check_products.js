import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const MONGO_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  original_price: Number,
  sold_count: Number,
  is_deleted: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

const branchProductSchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.ObjectId,
  branch_id: mongoose.Schema.Types.ObjectId,
  price: Number,
  original_price: Number,
  stock: Number
}, { collection: 'branchproducts' });

const BranchProduct = mongoose.model('BranchProduct', branchProductSchema);

async function run() {
  console.log('Connecting to:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const rawTopProducts = await Product.find({ is_deleted: { $ne: true } })
    .sort({ sold_count: -1 })
    .limit(10);

  console.log('Top Products and Branch Prices:');
  for (const p of rawTopProducts) {
    const bps = await BranchProduct.find({ product_id: p._id });
    console.log(`- Product: ${p.name} (Base Price: ${p.price})`);
    for (const bp of bps) {
      console.log(`  * Branch: ${bp.branch_id}, Price: ${bp.price}, OriginalPrice: ${bp.original_price}, Stock: ${bp.stock}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
