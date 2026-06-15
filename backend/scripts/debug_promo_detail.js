import mongoose from 'mongoose';
import Promotion from '../models/Promotion.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  console.log('Connected to DB');

  const p = await Promotion.findById('6a222b202fe391e8eefb0386').lean();
  console.log(p);

  await mongoose.disconnect();
}

run().catch(console.error);
