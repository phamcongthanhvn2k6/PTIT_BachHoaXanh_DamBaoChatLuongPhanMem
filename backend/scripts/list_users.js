import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const users = await User.find({});
  console.log(`Total users in DB: ${users.length}`);
  users.forEach(u => {
    console.log(`User ID: ${u._id} | Username: ${u.username} | Email: ${u.email} | Phone: ${u.phone} | Role ID: ${u.role_id}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
