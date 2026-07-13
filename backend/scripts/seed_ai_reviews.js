import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Review from '../models/Review.js';
import Product from '../models/Product.js';

dotenv.config({ path: path.resolve('backend/.env') });

const MONGO_URI = process.env.MONGODB_URI;

const sampleReviews = [
  {
    user_name: 'Khách hàng Hài Lòng',
    rating: 5,
    content: 'Rau xanh cải ngọt rất tươi ngon, tôi xào tỏi ăn rất giòn. Giao hàng cực kỳ nhanh, đóng gói sạch sẽ!',
    ai_sentiment: 'positive',
    ai_sentiment_score: 0.98,
    ai_is_flagged: false,
    ai_flag_reason: '',
    ai_suggested_reply: 'Cảm ơn bạn đã tin tưởng mua sắm tại Bách Hóa XANH! Chúng tôi luôn nỗ lực mang lại những sản phẩm tươi ngon nhất cho bạn. Chúc bạn một ngày vui vẻ!',
    status: 'published'
  },
  {
    user_name: 'Khách hàng Phàn Nàn',
    rating: 2,
    content: 'Quả dưa hấu bị giập nát hết góc khi giao đến, ăn bị chua hỏng rồi. Mong cửa hàng kiểm tra lại khâu vận chuyển hàng tươi sống.',
    ai_sentiment: 'negative',
    ai_sentiment_score: 0.15,
    ai_is_flagged: false,
    ai_flag_reason: '',
    ai_suggested_reply: 'Bách Hóa XANH chân thành xin lỗi về trải nghiệm không tốt của bạn. Chúng tôi đã liên hệ với bộ phận vận chuyển để khắc phục tình trạng này ngay lập tức.',
    status: 'published'
  },
  {
    user_name: 'Spammer Quảng Cáo',
    rating: 5,
    content: 'Sản phẩm quá đỉnh luôn bà con ơi!!! Xem thêm kho phim 18+ và nhận quà khủng miễn phí tại https://phim-hot-clip-247.net/qua-tang nhanh chân số lượng có hạn!',
    ai_sentiment: 'positive',
    ai_sentiment_score: 0.90,
    ai_is_flagged: true,
    ai_flag_reason: 'Nội dung chứa liên kết quảng cáo spam và nhạy cảm (18+).',
    ai_suggested_reply: null,
    status: 'reported'
  },
  {
    user_name: 'Khách hàng Độc Hại',
    rating: 1,
    content: 'Đm lũ lừa đảo, làm ăn như cc tao dí b* thèm mua ở đây nữa, bọn nhân viên thì ngu dốt mất dạy!',
    ai_sentiment: 'negative',
    ai_sentiment_score: 0.05,
    ai_is_flagged: true,
    ai_flag_reason: 'Nội dung chứa từ ngữ thô tục, xúc phạm thô bỉ.',
    ai_suggested_reply: null,
    status: 'reported'
  }
];

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  // Find a random product to link these reviews to
  const product = await Product.findOne({ is_deleted: { $ne: true } });
  if (!product) {
    console.error('No product found to link reviews!');
    process.exit(1);
  }
  console.log(`Linking reviews to product: ${product.name} (${product._id})`);

  // Clear existing reviews for this specific testing script to avoid duplicates
  console.log('Clearing old mock AI reviews...');
  await Review.deleteMany({
    user_name: { $in: ['Khách hàng Hài Lòng', 'Khách hàng Phàn Nàn', 'Spammer Quảng Cáo', 'Khách hàng Độc Hại'] }
  });

  // Use a generated dummy user ObjectId
  const userId = new mongoose.Types.ObjectId();

  for (const sample of sampleReviews) {
    const review = await Review.create({
      product_id: product._id,
      product_name: product.name,
      user_id: userId,
      user_name: sample.user_name,
      rating: sample.rating,
      content: sample.content,
      status: sample.status,
      moderation_reason: sample.ai_flag_reason,
      ai_sentiment: sample.ai_sentiment,
      ai_sentiment_score: sample.ai_sentiment_score,
      ai_is_flagged: sample.ai_is_flagged,
      ai_flag_reason: sample.ai_flag_reason,
      ai_suggested_reply: sample.ai_suggested_reply,
      created_at: new Date()
    });

    console.log(`Review created for ${review.user_name}!`);
    console.log(`- Status: ${review.status}`);
    console.log(`- Sentiment: ${review.ai_sentiment} (${review.ai_sentiment_score})`);
    console.log(`- Flagged: ${review.ai_is_flagged}`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnection complete. Seeding done.');
}

run().catch(console.error);
