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
  is_deleted: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
  username: String,
  full_name: String,
  email: String,
  role_id: Number
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

const productQuestionSchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.Mixed,
  user_id: mongoose.Schema.Types.Mixed,
  user_name: { type: String, default: 'Khách hàng' },
  question: { type: String, required: true },
  status: { type: String, default: 'pending' },
  is_pinned: { type: Boolean, default: false },
  is_official_answer: { type: Boolean, default: false },
  answer: {
    content: { type: String, default: '' },
    admin_id: mongoose.Schema.Types.Mixed,
    admin_name: { type: String, default: '' },
    answered_at: { type: Date, default: null },
  },
  answer_source: { type: String, default: 'admin' },
  ai_model_used: { type: String, default: '' },
  ai_status: { type: String, default: 'pending' },
  confidence_score: { type: Number, default: 1.0 },
  reviewed_at: { type: Date, default: null },
  reviewed_by: mongoose.Schema.Types.Mixed,
  moderated_flag: { type: Boolean, default: false },
  qa_mode: { type: String, default: 'ai' },
  ai_attempt_count: { type: Number, default: 0 },
  published_at: { type: Date, default: null },
}, { collection: 'productquestions', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ProductQuestion = mongoose.model('ProductQuestion', productQuestionSchema);

const questionsPool = [
  { question: 'Sản phẩm này có chứa chất bảo quản hay phụ gia không ạ?', category: 'safety' },
  { question: 'Hạn sử dụng của sản phẩm thường còn bao lâu khi giao hàng thế shop?', category: 'expiry' },
  { question: 'Sản phẩm này có cần bảo quản trong ngăn mát tủ lạnh không?', category: 'storage' },
  { question: 'Tôi muốn mua số lượng lớn làm quà tặng thì có chiết khấu gì không?', category: 'price' },
  { question: 'Sản phẩm này có phù hợp cho phụ nữ mang thai và trẻ em không?', category: 'usage' },
  { question: 'Mùi vị của sản phẩm này ngọt nhiều hay ngọt thanh vậy mọi người?', category: 'taste' },
  { question: 'Sản phẩm này là hàng nhập khẩu chính hãng hay sản xuất trong nước?', category: 'origin' }
];

const mockAnswers = {
  safety: 'Sản phẩm hoàn toàn tự nhiên, không chứa chất bảo quản hóa học độc hại, đạt tiêu chuẩn chất lượng vệ sinh an toàn thực phẩm.',
  expiry: 'Dạ, Bách Hóa Xanh cam kết giao sản phẩm có hạn sử dụng còn ít nhất 2/3 tổng thời hạn sử dụng để bạn yên tâm dùng nhé.',
  storage: 'Nên bảo quản sản phẩm ở nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Sau khi mở bao bì nên để trong ngăn mát tủ lạnh.',
  price: 'Dạ có ạ, bạn có thể liên hệ hotline hoặc quầy dịch vụ khách hàng tại chi nhánh gần nhất để được tư vấn mức chiết khấu tốt nhất.',
  usage: 'Sản phẩm này lành tính và phù hợp cho cả gia đình. Tuy nhiên đối với trẻ nhỏ dưới 1 tuổi bạn nên tham khảo ý kiến bác sĩ.',
  taste: 'Sản phẩm có vị ngọt thanh tự nhiên, thanh mát, dễ uống và rất vừa miệng nhé bạn.',
  origin: 'Dạ, sản phẩm được nhập khẩu chính ngạch từ nhà sản xuất uy tín và có đầy đủ tem nhãn phụ tiếng Việt theo quy định.'
};

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  // Clear existing questions
  console.log('Clearing existing product questions...');
  await ProductQuestion.deleteMany({});
  console.log('Cleared!');

  const products = await Product.find({ is_deleted: { $ne: true } }).limit(20);
  const users = await User.find({}).limit(10);

  if (products.length === 0 || users.length === 0) {
    console.error('Missing products or users to seed questions.');
    await mongoose.disconnect();
    return;
  }

  const seededQuestions = [];

  // 1. Seed some pending questions
  for (let i = 0; i < 5; i++) {
    const p = products[i % products.length];
    const u = users[i % users.length];
    const poolItem = questionsPool[i % questionsPool.length];

    seededQuestions.push({
      product_id: p._id,
      user_id: u._id,
      user_name: u.full_name || u.username,
      question: `Cho tôi hỏi về ${p.name}: ${poolItem.question}`,
      status: 'pending',
      ai_status: 'pending',
      qa_mode: 'ai',
      created_at: new Date(Date.now() - i * 2 * 60 * 60 * 1000)
    });
  }

  // 2. Seed some AI needs_review questions
  for (let i = 0; i < 4; i++) {
    const p = products[(i + 5) % products.length];
    const u = users[(i + 2) % users.length];
    const poolItem = questionsPool[(i + 2) % questionsPool.length];

    seededQuestions.push({
      product_id: p._id,
      user_id: u._id,
      user_name: u.full_name || u.username,
      question: `Sản phẩm ${p.name} này dùng như thế nào?`,
      status: 'pending',
      answer: {
        content: `[AI Gợi ý] ${mockAnswers[poolItem.category]}`,
        admin_name: 'AI Assistant',
        answered_at: new Date()
      },
      answer_source: 'ai',
      ai_model_used: 'gemini-1.5-flash',
      ai_status: 'needs_review',
      confidence_score: 0.65,
      qa_mode: 'ai',
      created_at: new Date(Date.now() - (i + 5) * 60 * 60 * 1000)
    });
  }

  // 3. Seed some answered questions (AI & Admin)
  for (let i = 0; i < 8; i++) {
    const p = products[(i + 10) % products.length];
    const u = users[(i + 4) % users.length];
    const poolItem = questionsPool[(i + 4) % questionsPool.length];
    const isAi = i % 2 === 0;

    seededQuestions.push({
      product_id: p._id,
      user_id: u._id,
      user_name: u.full_name || u.username,
      question: `Bách Hóa Xanh ơi, sản phẩm ${p.name} còn hàng không?`,
      status: 'answered',
      answer: {
        content: isAi 
          ? `Chào bạn, ${p.name} hiện tại vẫn còn sẵn hàng tại hầu hết các chi nhánh thuộc hệ thống Bách Hóa Xanh.` 
          : `Chào bạn, sản phẩm ${p.name} đang được áp dụng chương trình khuyến mãi giảm giá cực tốt tuần này nhé!`,
        admin_name: isAi ? 'AI Assistant' : 'Bách Hóa Xanh Admin',
        answered_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      },
      answer_source: isAi ? 'ai' : 'admin',
      ai_model_used: isAi ? 'gemini-1.5-flash' : '',
      ai_status: isAi ? 'answered' : 'pending',
      confidence_score: isAi ? 0.92 : 1.0,
      qa_mode: isAi ? 'ai' : 'admin',
      is_official_answer: true,
      created_at: new Date(Date.now() - (i + 10) * 24 * 60 * 60 * 1000)
    });
  }

  // 4. Seed some rejected / hidden questions
  for (let i = 0; i < 3; i++) {
    const p = products[(i + 15) % products.length];
    const u = users[(i + 6) % users.length];

    seededQuestions.push({
      product_id: p._id,
      user_id: u._id,
      user_name: u.full_name || u.username,
      question: `Sản phẩm ${p.name} này dở tệ, tẩy chay shop bán hàng giả!!!`,
      status: 'hidden',
      ai_status: 'rejected',
      confidence_score: 0.15,
      qa_mode: 'ai',
      created_at: new Date(Date.now() - (i + 20) * 24 * 60 * 60 * 1000)
    });
  }

  console.log(`Inserting ${seededQuestions.length} mock questions...`);
  await ProductQuestion.insertMany(seededQuestions);
  console.log('Seeded successfully!');

  await mongoose.disconnect();
}

run().catch(console.error);
