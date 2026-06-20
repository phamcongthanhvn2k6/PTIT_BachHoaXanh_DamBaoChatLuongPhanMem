import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to:', MONGODB_URI);

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');
  
  const users = await User.find({}, { email: 1, username: 1, password_hash: 1, authProviders: 1 }).lean();
  console.log('Users in database:', JSON.stringify(users, null, 2));
  
  await mongoose.disconnect();
}

run().catch(console.error);
