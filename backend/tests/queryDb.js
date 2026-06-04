// backend/tests/queryDb.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PaymentTransaction } from '../models/Payment.js';
import Order from '../models/Order.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const txs = await PaymentTransaction.find().sort({ created_at: -1 }).limit(10);
  console.log('--- LATEST 10 TRANSACTIONS ---');
  for (const tx of txs) {
    console.log(`TX ID: ${tx._id}`);
    console.log(`Transaction ID: ${tx.transaction_id}`);
    console.log(`Order ID: ${tx.order_id}`);
    console.log(`Amount: ${tx.amount}`);
    console.log(`Status: ${tx.status}`);
    
    if (tx.order_id && mongoose.isValidObjectId(String(tx.order_id))) {
      const order = await Order.findById(tx.order_id);
      if (order) {
        console.log(`  Order Status: ${order.status}`);
        console.log(`  Order Payment Status: ${order.payment_status}`);
        console.log(`  Order Total Amount: ${order.total_amount}`);
        console.log(`  Order Items Count: ${order.items?.length}`);
      } else {
        console.log('  Order not found in DB');
      }
    } else {
      console.log('  Invalid Order ID in Transaction');
    }
    console.log('------------------------------');
  }

  await mongoose.connection.close();
}

main().catch(console.error);
