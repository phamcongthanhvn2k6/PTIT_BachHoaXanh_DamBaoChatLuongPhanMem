import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const branchProductSchema = new mongoose.Schema({}, { strict: false });
const BranchProduct = mongoose.model('BranchProduct', branchProductSchema, 'branchproducts');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const bps = await BranchProduct.find({});
    console.log('BRANCH PRODUCTS IN DB (First 15):');
    bps.slice(0, 15).forEach(bp => {
      console.log(`- ID: ${bp._id}, ProductId: ${bp.product_id || bp.productId}, Name: "${bp.name}", Image: "${bp.image}", Thumbnail: "${bp.thumbnail}"`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
