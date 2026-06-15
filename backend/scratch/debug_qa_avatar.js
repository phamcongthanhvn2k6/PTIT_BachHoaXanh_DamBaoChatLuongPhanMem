import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import ProductQuestion from '../models/ProductQuestion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const questions = await ProductQuestion.find({}).sort('-created_at').limit(5);
  console.log(`Retrieved ${questions.length} questions.`);

  for (const q of questions) {
    console.log('-------------------------------------------');
    console.log(`Question ID: ${q._id}`);
    console.log(`User ID (from Q): ${q.user_id} (Type: ${typeof q.user_id})`);
    console.log(`User Name (from Q): ${q.user_name}`);
    console.log(`Question Text: ${q.question}`);

    const user = await User.findById(q.user_id);
    if (user) {
      console.log(`User found in DB! ID: ${user._id} (Type: ${typeof user._id})`);
      console.log(`User avatar field in DB: "${user.avatar}"`);
    } else {
      console.log(`User NOT found in DB for user_id: ${q.user_id}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
