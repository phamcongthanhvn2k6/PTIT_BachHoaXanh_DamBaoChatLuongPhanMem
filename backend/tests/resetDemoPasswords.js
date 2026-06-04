// backend/tests/resetDemoPasswords.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../models/User.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const hash = await bcrypt.hash('Admin@123', 10);
  
  const result = await User.updateMany(
    { email: { $in: ['customer@lotte.com', 'admin@lotte.com', 'superadmin@lotte.com', 'admin@lottemart.vn'] } },
    { $set: { password_hash: hash } }
  );
  
  console.log(`Updated passwords for ${result.modifiedCount} demo users.`);
  await mongoose.connection.close();
}

main().catch(console.error);
