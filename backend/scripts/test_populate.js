import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

// Copy of populate helper from orderController.js
const normalizeOrder = (order) => {
  if (!order) return null;
  const o = order.toObject ? order.toObject() : { ...order };
  o.id = o._id ? String(o._id) : o.id;
  return o;
};

const populateOrdersWithUsers = async (orders) => {
  const normalized = orders.map(normalizeOrder).filter(Boolean);
  const userIds = [...new Set(normalized.map(o => o.user_id).filter(Boolean))];
  console.log('userIds extracted:', userIds);
  try {
    const users = await User.find({ _id: { $in: userIds } }).lean();
    console.log('Users found:', users.length);
    const userMap = new Map(users.map(u => [String(u._id), {
      _id: u._id,
      id: String(u._id),
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone
    }]));
    for (const o of normalized) {
      if (o.user_id) {
        o.user = userMap.get(String(o.user_id)) || null;
      }
    }
  } catch (e) {
    console.error('[populateOrdersWithUsers] Error:', e.message);
  }
  return normalized;
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  
  const rawOrders = await Order.find({}).limit(5);
  const populated = await populateOrdersWithUsers(rawOrders);
  
  for (const o of populated) {
    console.log('Order ID:', o.id);
    console.log('user_id:', o.user_id);
    console.log('user field populated:', o.user);
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
