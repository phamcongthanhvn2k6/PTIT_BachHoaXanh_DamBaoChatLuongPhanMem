import 'dotenv/config';
import mongoose from 'mongoose';
import ImportOrder from '../models/ImportOrder.js';
import ImportReceipt from '../models/ImportReceipt.js';
import InventoryBatch from '../models/InventoryBatch.js';
import BranchProduct from '../models/BranchProduct.js';
import Branch from '../models/Branch.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const branches = await Branch.find().lean();
  console.log('Branches:');
  branches.forEach(b => console.log(` - ID: ${b._id} (${typeof b._id}), Name: ${b.name}`));

  const bp = await BranchProduct.findOne().lean();
  console.log('\nBranchProduct sample:');
  if (bp) console.log(` - ID: ${bp._id}, product_id: ${bp.product_id}, branch_id: ${bp.branch_id} (${typeof bp.branch_id})`);

  const order = await ImportOrder.findOne().lean();
  console.log('\nImportOrder sample:');
  if (order) console.log(` - ID: ${order._id}, order_code: ${order.order_code}, branch_id: ${order.branch_id} (${typeof order.branch_id})`);

  const receipt = await ImportReceipt.findOne().lean();
  console.log('\nImportReceipt sample:');
  if (receipt) console.log(` - ID: ${receipt._id}, receipt_code: ${receipt.receipt_code}, branch_id: ${receipt.branch_id} (${typeof receipt.branch_id})`);

  const batch = await InventoryBatch.findOne().lean();
  console.log('\nInventoryBatch sample:');
  if (batch) console.log(` - ID: ${batch._id}, branch_product_id: ${batch.branch_product_id}, purchase_order_id: ${batch.purchase_order_id}, import_receipt_id: ${batch.import_receipt_id}`);

  await mongoose.disconnect();
}

run().catch(console.error);
