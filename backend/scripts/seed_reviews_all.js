import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const MONGO_URI = process.env.MONGODB_URI;

// Define schemas
const productSchema = new mongoose.Schema({
  name: String,
  short_code: String,
  id: Number,
  rating: Number,
  average_rating: Number,
  review_count: Number,
  total_reviews: Number,
  rating_breakdown: mongoose.Schema.Types.Mixed,
  is_deleted: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

const reviewSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.Mixed,
  user_name: String,
  user_avatar: String,
  product_id: mongoose.Schema.Types.Mixed,
  product_name: String,
  rating: Number,
  content: String,
  status: String,
  is_verified_purchase: Boolean,
  helpful_count: Number,
  created_at: Date
}, { collection: 'reviews' });

const Review = mongoose.model('Review', reviewSchema);

const reviewers = [
  { name: 'Nguyễn Văn Hùng', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' },
  { name: 'Trần Thị Mai', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120' },
  { name: 'Phạm Minh Tuấn', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120' },
  { name: 'Lê Hoàng Yến', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120' },
  { name: 'Vũ Quốc Anh', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120' },
  { name: 'Hoàng Ngọc Bích', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120' },
  { name: 'Đỗ Duy Mạnh', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120' },
  { name: 'Nguyễn Thu Trang', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120' }
];

const reviewTemplates = [
  { rating: 5, content: 'Sản phẩm tuyệt vời, chất lượng tươi ngon và sạch sẽ. Đóng gói cẩn thận, giao nhanh.' },
  { rating: 5, content: 'Đúng chuẩn Bách Hóa Xanh, nhân viên giao hàng rất lịch sự. Sẽ tiếp tục mua lại lần sau.' },
  { rating: 5, content: 'Chất lượng quá tốt so với giá tiền. Hàng còn mới, hạn sử dụng dài.' },
  { rating: 4, content: 'Sản phẩm ngon lành, sạch sẽ. Chỉ có điều giao hàng hơi chậm hơn dự kiến 15 phút.' },
  { rating: 4, content: 'Chất lượng sản phẩm tốt, đóng gói kỹ. Hy vọng chi nhánh giữ vững chất lượng này.' },
  { rating: 4, content: 'Rất hài lòng về chất lượng. Mong cửa hàng có thêm nhiều chương trình khuyến mãi nữa.' },
  { rating: 3, content: 'Chất lượng ở mức ổn, không quá đặc sắc nhưng dùng được.' },
  { rating: 5, content: 'Sản phẩm tuyệt hảo, hạn sử dụng còn lâu, vị cực kỳ ngon. Khuyên mọi người nên thử.' }
];

const makeId = () => new mongoose.Types.ObjectId();

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  // Clear existing reviews
  console.log('Clearing existing reviews...');
  await Review.deleteMany({});
  console.log('Cleared existing reviews!');

  const products = await Product.find({ is_deleted: { $ne: true } });
  console.log(`Found ${products.length} products to seed reviews for.`);

  const reviewsToInsert = [];

  for (const p of products) {
    const numReviews = Math.floor(Math.random() * 5) + 4; // 4 to 8 reviews per product
    const shuffledReviewers = [...reviewers].sort(() => 0.5 - Math.random());
    const shuffledTemplates = [...reviewTemplates].sort(() => 0.5 - Math.random());

    const productReviews = [];

    for (let i = 0; i < Math.min(numReviews, shuffledReviewers.length); i++) {
      const reviewer = shuffledReviewers[i];
      const template = shuffledTemplates[i % shuffledTemplates.length];

      const reviewDoc = {
        user_id: makeId(),
        user_name: reviewer.name,
        user_avatar: reviewer.avatar,
        product_id: p._id,
        product_name: p.name,
        rating: template.rating,
        content: template.content,
        status: 'published',
        is_verified_purchase: Math.random() > 0.3,
        helpful_count: Math.floor(Math.random() * 10),
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
      };

      reviewsToInsert.push(reviewDoc);
      productReviews.push(reviewDoc);
    }

    // Recalculate stats for this product
    const reviewCount = productReviews.length;
    let averageRating = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (reviewCount > 0) {
      const sum = productReviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = Number((sum / reviewCount).toFixed(1));

      productReviews.forEach(r => {
        const ratingKey = String(Math.round(r.rating));
        if (ratingBreakdown[ratingKey] !== undefined) {
          ratingBreakdown[ratingKey] += 1;
        }
      });
    }

    p.rating = averageRating;
    p.average_rating = averageRating;
    p.review_count = reviewCount;
    p.total_reviews = reviewCount;
    p.rating_breakdown = ratingBreakdown;

    p.markModified('rating_breakdown');
    await p.save();
  }

  console.log(`Inserting ${reviewsToInsert.length} reviews into database...`);
  await Review.insertMany(reviewsToInsert);
  console.log(`Successfully seeded ${reviewsToInsert.length} reviews and synchronized stats for all products!`);

  await mongoose.disconnect();
}

run().catch(console.error);
