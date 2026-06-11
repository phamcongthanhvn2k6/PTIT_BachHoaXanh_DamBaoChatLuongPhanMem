import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const orders = await Order.find({}).sort('-created_at').limit(10);
  for (const o of orders) {
    const userIdType = typeof o.user_id;
    const isObjectId = o.user_id instanceof mongoose.Types.ObjectId;
    console.log(`Order: ${o._id}`);
    console.log(`  user_id: ${o.user_id} (${userIdType})`);
    console.log(`  isObjectId: ${isObjectId}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
