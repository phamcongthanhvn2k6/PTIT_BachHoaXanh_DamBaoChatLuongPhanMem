import mongoose from 'mongoose';
import { AuditLog } from '../models/Misc.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  console.log('Connected to DB');

  const logs = await AuditLog.find({ entity: 'promotion' }).sort({ created_at: -1 }).lean();
  console.log('Promotion Audit Logs:', logs.length);
  for (const log of logs) {
    console.log(log);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
