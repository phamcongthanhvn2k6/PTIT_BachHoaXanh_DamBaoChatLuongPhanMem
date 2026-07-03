// backend/scripts/runBackup.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { performBackup } from './backupMongoDB.js';

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not set in environment.');
      process.exit(1);
    }
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully. Starting backup...');
    await performBackup();
    console.log('Backup finished.');
  } catch (err) {
    console.error('Error during backup run:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
    process.exit(0);
  }
};

run();
