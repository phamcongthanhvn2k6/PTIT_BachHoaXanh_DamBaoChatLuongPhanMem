import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GamificationCampaign } from '../models/Gamification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not found in env');
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  // Check if a checkin campaign already exists
  const existing = await GamificationCampaign.findOne({ type: 'checkin' });
  if (existing) {
    console.log('Daily check-in campaign already exists:', existing.name);
    mongoose.disconnect();
    return;
  }

  console.log('Seeding Daily Check-in Campaign...');
  const campaign = new GamificationCampaign({
    name: "Điểm danh hàng ngày nhận quà Lotte",
    name_en: "Daily check-in for Lotte gifts",
    name_ja: "ロッテギフトのデイリーチェックイン",
    description: "Điểm danh mỗi ngày để nhận điểm thưởng Lotte và mã giảm giá đặc biệt.",
    type: "checkin",
    start_date: new Date("2026-06-01T00:00:00.000Z"),
    end_date: new Date("2026-07-31T23:59:59.000Z"),
    is_active: true,
    rewards: [
      {
        reward_type: "points",
        reward_name: "10 Điểm Lotte",
        reward_name_en: "10 Lotte Points",
        reward_name_ja: "10 ロッテポイント",
        reward_value: "10",
        reward_probability: 100,
        reward_status: "active"
      }
    ],
    checkin_schedule: [
      {
        date: "2026-06-12",
        reward_name: "Quà tặng checkin ngày 12",
        reward_name_en: "June 12 check-in gift",
        reward_name_ja: "6月12日のチェックインギフト",
        reward_type: "points",
        reward_value: "20",
        is_special: true
      },
      {
        date: "2026-06-13",
        reward_name: "Quà tặng checkin ngày 13",
        reward_name_en: "June 13 check-in gift",
        reward_name_ja: "6月13日のチェックインギフト",
        reward_type: "points",
        reward_value: "20",
        is_special: false
      }
    ],
    streak_bonuses: [
      {
        streak_days: 7,
        reward_name: "Thưởng Chuỗi 7 Ngày",
        reward_name_en: "7-Day Streak Bonus",
        reward_name_ja: "7日間連続ボーナス",
        reward_type: "points",
        reward_value: "50"
      },
      {
        streak_days: 14,
        reward_name: "Thưởng Chuỗi 14 Ngày",
        reward_name_en: "14-Day Streak Bonus",
        reward_name_ja: "14日間連続ボーナス",
        reward_type: "points",
        reward_value: "150"
      }
    ],
    max_spins_per_user_day: 1,
    max_spins_per_user_total: null,
    created_by: new mongoose.Types.ObjectId("000000000000000000009999")
  });

  await campaign.save();
  console.log('Daily Check-in Campaign seeded successfully!');
  mongoose.disconnect();
};

run();
