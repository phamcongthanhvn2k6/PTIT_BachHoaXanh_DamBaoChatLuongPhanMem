import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Find all orders where user_id is of type string
  const orders = await Order.find({ user_id: { $type: 'string' } });
  console.log(`Found ${orders.length} orders with string user_id.`);

  let updatedCount = 0;
  for (const o of orders) {
    if (mongoose.Types.ObjectId.isValid(o.user_id)) {
      const stringId = o.user_id;
      const objectId = new mongoose.Types.ObjectId(stringId);
      
      // Update directly via updateOne to bypass any validation or pre-save hooks if desired,
      // or save to trigger hooks. Since user_id is Mixed, we can just updateOne to be safe.
      await Order.updateOne({ _id: o._id }, { $set: { user_id: objectId } });
      console.log(`Updated Order ${o._id}: ${stringId} -> ObjectId(${objectId.toString()})`);
      updatedCount++;
    } else {
      console.warn(`Order ${o._id} has invalid user_id string: ${o.user_id}`);
    }
  }

  console.log(`Successfully normalized ${updatedCount} orders to ObjectId.`);
  await mongoose.disconnect();
}

run().catch(console.error);
