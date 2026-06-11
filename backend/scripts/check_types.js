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
  
  const order = await Order.findOne({});
  if (order) {
    console.log('Order User ID:', order.user_id);
    console.log('Type of user_id:', typeof order.user_id);
    console.log('Is ObjectId:', order.user_id instanceof mongoose.Types.ObjectId);
  } else {
    console.log('No orders found');
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
