import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  console.log('Connected to DB');

  const count = await Order.countDocuments({});
  console.log('Total orders in DB:', count);

  const allOrders = await Order.find({}).lean();
  let missingCount = 0;
  for (const o of allOrders) {
    if (!o.order_address) {
      missingCount++;
      console.log('Missing order_address in order:', o._id, 'created_at:', o.created_at, 'user_id:', o.user_id);
    }
  }
  console.log(`Total orders: ${allOrders.length}, missing order_address: ${missingCount}`);

  await mongoose.disconnect();
}

run().catch(console.error);
