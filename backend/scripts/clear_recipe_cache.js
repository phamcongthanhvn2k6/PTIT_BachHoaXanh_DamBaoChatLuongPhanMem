import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Recipe from '../models/Recipe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const result = await Recipe.deleteMany({});
  console.log(`Deleted ${result.deletedCount} cached recipes from database.`);
  
  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(console.error);
