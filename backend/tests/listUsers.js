// backend/tests/listUsers.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../models/User.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  const users = await User.find({}, 'email username role_id is_active lotte_points');
  console.log('--- ALL SEEDED USERS ---');
  console.log(JSON.stringify(users, null, 2));
  await mongoose.connection.close();
}

main().catch(console.error);
