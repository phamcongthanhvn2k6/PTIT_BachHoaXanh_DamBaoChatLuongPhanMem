import '../config/loadEnv.js';
import mongoose from 'mongoose';
import BranchProduct from '../models/BranchProduct.js';
import InventoryBatch from '../models/InventoryBatch.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const bps = await BranchProduct.find({ stock: { $gt: 0 } }).lean();
    let orphans = [];
    for (const bp of bps) {
      const batchCount = await InventoryBatch.countDocuments({ branch_product_id: bp._id });
      if (batchCount === 0) {
        orphans.push(bp._id);
      }
    }
    console.log('Orphan count:', orphans.length);
    console.log('Orphan IDs:', orphans);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
