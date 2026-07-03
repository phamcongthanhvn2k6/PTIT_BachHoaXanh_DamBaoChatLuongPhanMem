import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Banner } from './models/Misc.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const banners = await Banner.find().lean();
  console.log('--- BANNERS IN DB ---');
  console.log(JSON.stringify(banners, null, 2));
  await mongoose.disconnect();
}
run();
