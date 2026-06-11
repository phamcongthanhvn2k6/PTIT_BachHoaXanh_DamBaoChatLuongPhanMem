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
  
  const count = await Order.countDocuments({});
  console.log(`Total orders in DB: ${count}`);
  
  const orders = await Order.find({}).sort('-created_at').limit(10);
  orders.forEach(o => {
    console.log(`Order ID: ${o._id} | User ID: ${o.user_id} | Status: ${o.status} | Total: ${o.total_amount} | Created At: ${o.created_at}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
