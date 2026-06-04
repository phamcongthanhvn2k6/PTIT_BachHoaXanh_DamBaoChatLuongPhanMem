// backend/tests/simulateTimeout.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PaymentTransaction } from '../models/Payment.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const txId = '6a20d93d44072643c9b57457';
  
  const result = await PaymentTransaction.findByIdAndUpdate(
    txId,
    { $set: { expired_at: new Date(Date.now() - 20 * 60 * 1000) } },
    { new: true }
  );

  if (result) {
    console.log(`Successfully backdated expired_at for TX ID ${txId}`);
    console.log(`New expired_at: ${result.expired_at}`);
  } else {
    console.log(`Transaction with ID ${txId} not found!`);
  }

  await mongoose.connection.close();
}

main().catch(console.error);
