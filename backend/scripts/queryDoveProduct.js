import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const bpIdStr = '000000000000000000011019';
  const bpIdObj = new mongoose.Types.ObjectId(bpIdStr);

  const InventoryBatch = mongoose.model('InventoryBatch', new mongoose.Schema({}, { strict: false }));

  const countByString = await InventoryBatch.countDocuments({ branch_product_id: bpIdStr });
  const countByObjectId = await InventoryBatch.countDocuments({ branch_product_id: bpIdObj });

  console.log(`Count by String ID ("${bpIdStr}"):`, countByString);
  console.log(`Count by ObjectId (${bpIdObj}):`, countByObjectId);

  await mongoose.disconnect();
}

run().catch(console.error);
