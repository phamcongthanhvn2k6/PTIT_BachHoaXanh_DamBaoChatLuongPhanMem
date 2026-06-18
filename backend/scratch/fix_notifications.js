import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Notification from '../models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in env');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const notifications = await Notification.find({});
    console.log(`Found ${notifications.length} notifications to examine.`);

    let updatedCount = 0;

    for (const notif of notifications) {
      let changed = false;
      let title = notif.title || '';
      let message = notif.message || '';

      // Fix titles
      if (title.includes('Thanh toan that bai')) {
        title = title.replace('Thanh toan that bai', 'Thanh toán thất bại');
        changed = true;
      }
      if (title.includes('Thanh toan thanh cong')) {
        title = title.replace('Thanh toan thanh cong', 'Thanh toán thành công');
        changed = true;
      }
      if (title.includes('Don hang') && title.includes('cap nhat')) {
        title = title.replace('Don hang', 'Đơn hàng').replace('cap nhat', 'cập nhật');
        changed = true;
      }
      if (title.includes('Ban vua nhan') && title.includes('L.Point')) {
        title = title.replace('Ban vua nhan', 'Bạn vừa nhận');
        changed = true;
      }
      if (title.includes('Ban duoc cong') && title.includes('L.Point')) {
        title = title.replace('Ban duoc cong', 'Bạn được cộng');
        changed = true;
      }
      if (title.includes('Ban bi tru') && title.includes('L.Point')) {
        title = title.replace('Ban bi tru', 'Bạn bị trừ');
        changed = true;
      }

      // Fix messages
      if (message.includes('Phien thanh toan da het han (15 phut) ma khong nhan duoc xac nhan.')) {
        message = message.replace('Phien thanh toan da het han (15 phut) ma khong nhan duoc xac nhan.', 'Phiên thanh toán đã hết hạn (15 phút) mà không nhận được xác nhận.');
        changed = true;
      }
      if (message.includes('Da huy. Thanh toan het han (15 phut) — tu dong huy')) {
        message = message.replace('Da huy. Thanh toan het han (15 phut) — tu dong huy', 'Đã hủy. Thanh toán hết hạn (15 phút) — tự động hủy');
        changed = true;
      }
      if (message.includes('Da xac nhan. He thong tu dong xac nhan don hang COD sau 15 phut')) {
        message = message.replace('Da xac nhan. He thong tu dong xac nhan don hang COD sau 15 phut', 'Đã xác nhận. Hệ thống tự động xác nhận đơn hàng COD sau 15 phút');
        changed = true;
      }
      if (message.includes('Don hang') && message.includes('da duoc thanh toan')) {
        message = message.replace('Don hang', 'Đơn hàng').replace('da duoc thanh toan', 'đã được thanh toán');
        changed = true;
      }
      if (message.includes('Dang cho xac nhan')) {
        message = message.replace('Dang cho xac nhan', 'Đang chờ xác nhận');
        changed = true;
      }
      if (message.includes('Da xac nhan')) {
        message = message.replace('Da xac nhan', 'Đã xác nhận');
        changed = true;
      }
      if (message.includes('Dang chuan bi hang')) {
        message = message.replace('Dang chuan bi hang', 'Đang chuẩn bị hàng');
        changed = true;
      }
      if (message.includes('Dang giao hang')) {
        message = message.replace('Dang giao hang', 'Đang giao hàng');
        changed = true;
      }
      if (message.includes('Da giao hang')) {
        message = message.replace('Da giao hang', 'Đã giao hàng');
        changed = true;
      }
      if (message.includes('Da huy')) {
        message = message.replace('Da huy', 'Đã hủy');
        changed = true;
      }
      if (message.includes('Da hoan tra')) {
        message = message.replace('Da hoan tra', 'Đã hoàn trả');
        changed = true;
      }
      if (message.includes('So du hien tai') && message.includes('L.Point')) {
        message = message.replace('So du hien tai', 'Số dư hiện tại');
        changed = true;
      }

      if (changed) {
        notif.title = title;
        notif.message = message;
        await notif.save();
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} notifications with proper accents.`);
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
