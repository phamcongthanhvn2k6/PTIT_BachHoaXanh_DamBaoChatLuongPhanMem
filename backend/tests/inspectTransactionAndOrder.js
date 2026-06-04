// backend/tests/inspectTransactionAndOrder.js
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

  const txId = '6a201e41041f9658218b89ad';
  const orderId = '6a201e40041f9658218b898c';

  const tx = await PaymentTransaction.findById(txId);
  const order = await Order.findById(orderId);

  console.log('=== TRANSACTION DOCUMENT ===');
  console.log(JSON.stringify(tx, null, 2));

  console.log('\n=== ORDER DOCUMENT ===');
  console.log(JSON.stringify(order, null, 2));

  await mongoose.connection.close();
}

main().catch(console.error);
