// backend/tests/checkOrderCancelReason.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Order from '../models/Order.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const orderId = '6a20d93b44072643c9b57438';
  const order = await Order.findById(orderId);
  if (order) {
    console.log(`Order ID: ${order._id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Cancel Reason: "${order.cancel_reason}"`);
    console.log(`Is Inventory Restored: ${order.is_inventory_restored}`);
    console.log(`Is Coupon Restored: ${order.is_coupon_restored}`);
    console.log(`Is Promotion Restored: ${order.is_promotion_restored}`);
    console.log(`Is Hot Deal Restored: ${order.is_hot_deal_restored}`);
  } else {
    console.log(`Order ${orderId} not found`);
  }

  await mongoose.connection.close();
}

main().catch(console.error);
