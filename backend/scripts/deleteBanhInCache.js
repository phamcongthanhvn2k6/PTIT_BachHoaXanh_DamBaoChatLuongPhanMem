import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Recipe from '../models/Recipe.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const res = await Recipe.deleteMany({
    $or: [
      { canonical_key: 'banh-in' },
      { normalized_name: 'banh-in' },
      { title: { $regex: 'bánh in', $options: 'i' } }
    ]
  });

  console.log('Deleted recipes count:', res.deletedCount);
  await mongoose.disconnect();
}

run().catch(console.error);
