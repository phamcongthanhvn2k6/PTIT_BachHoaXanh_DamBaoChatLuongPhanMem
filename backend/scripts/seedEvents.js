import 'dotenv/config';
import mongoose from 'mongoose';
import { EventPost, EventComment } from '../models/EventPost.js';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottemart';

const seedEvents = [
  {
    title: "Tuần lễ Nông sản Sạch - Lotte Mart District 7",
    slug: "tuan-le-nong-san-sach-lotte-mart-district-7",
    category_id: 2,
    author_name: "Admin Nguyễn",
    thumbnail: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800",
    banner: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200",
    excerpt: "Chương trình nông sản sạch, ưu đãi cực lớn lên đến 50% tại chi nhánh Quận 7.",
    summary: "Chương trình nông sản sạch, ưu đãi cực lớn lên đến 50% tại chi nhánh Quận 7.",
    description: "Đến với tuần lễ nông sản sạch của Lotte Mart, khách hàng sẽ có cơ hội sở hữu những sản phẩm rau củ quả hữu cơ, tươi ngon đạt chứng nhận chuẩn VietGAP, GlobalGAP với mức giá ưu đãi chưa từng có.",
    views: 12400,
    likes: 85,
    status: "published",
    is_published: true,
    is_featured: true,
    start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    branch: "Lotte Mart District 7",
    tags: ["Khuyến mãi", "Nông sản sạch", "Quận 7"],
    content_blocks: [
      { type: "text", text: "Tuần lễ nông sản sạch giới thiệu các sản phẩm tươi ngon..." }
    ]
  },
  {
    title: "Đêm nhạc Lotte Harmony 2024",
    slug: "dem-nhac-lotte-harmony-2024",
    category_id: 3,
    author_name: "Admin Trần",
    thumbnail: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800",
    banner: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200",
    excerpt: "Đại nhạc hội tri ân khách hàng thân thiết Lotte Mart với dàn sao cực đỉnh.",
    summary: "Đại nhạc hội tri ân khách hàng thân thiết Lotte Mart với dàn sao cực đỉnh.",
    description: "Lotte Harmony là sự kiện âm nhạc quy mô lớn được tổ chức hàng năm để tri ân hàng triệu khách hàng đã đồng hành cùng Lotte Mart trong suốt thời gian qua.",
    views: 5200,
    likes: 42,
    status: "published",
    is_published: true,
    is_featured: false,
    start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days (Scheduled!)
    end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    branch: "Lotte Mart Quận 7",
    tags: ["Sự kiện", "Đại nhạc hội", "Tri ân"],
    content_blocks: [
      { type: "text", text: "Chương trình âm nhạc đặc sắc với nhiều ca sĩ nổi tiếng..." }
    ]
  },
  {
    title: "Khai trương Chi nhánh Lotte Mart Long An",
    slug: "khai-truong-chi-nhanh-lotte-mart-long-an",
    category_id: 4,
    author_name: "Admin Lê",
    thumbnail: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800",
    banner: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1200",
    excerpt: "Cột mốc mới tại miền Tây sông nước - hàng ngàn quà tặng khai trương cực hot.",
    summary: "Cột mốc mới tại miền Tây sông nước - hàng ngàn quà tặng khai trương cực hot.",
    description: "Nhân dịp khai trương Lotte Mart Long An, chúng tôi mang đến hàng ngàn chương trình khuyến mãi mua 1 tặng 1 và quà tặng đặc biệt cho khách hàng đầu tiên mua sắm.",
    views: 28900,
    likes: 128,
    status: "published",
    is_published: true,
    is_featured: true,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago (Expired!)
    branch: "Lotte Mart Long An",
    tags: ["Khai trương", "Long An", "Quà tặng"],
    content_blocks: [
      { type: "text", text: "Lotte Mart chính thức mở cửa chi nhánh mới tại thành phố Tân An, Long An..." }
    ]
  },
  {
    title: "Workshop: Nấu ăn cùng Siêu đầu bếp",
    slug: "workshop-nau-an-cung-sieu-dau-bep",
    category_id: 5,
    author_name: "Admin Nguyễn",
    thumbnail: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=800",
    banner: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200",
    excerpt: "Học làm các món ăn Âu Á cùng chuyên gia ẩm thực hàng đầu.",
    summary: "Học làm các món ăn Âu Á cùng chuyên gia ẩm thực hàng đầu.",
    description: "Workshop trải nghiệm thực tế giúp nâng cao tay nghề nấu nướng gia đình của bạn, sử dụng các nguyên liệu tươi sạch mua trực tiếp tại Lotte Mart.",
    views: 1800,
    likes: 12,
    status: "archived",
    is_published: false,
    is_featured: false,
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end_date: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000),
    branch: "Lotte Mart Quận 11",
    tags: ["Nội dung", "Workshop", "Nấu ăn"],
    content_blocks: [
      { type: "text", text: "Chia sẻ công thức làm salad và bít tết chuẩn nhà hàng năm sao..." }
    ]
  },
  {
    title: "Siêu Sale Mùa Hè - Giảm đến 50%",
    slug: "sieu-sale-mua-he-giam-den-50",
    category_id: 2,
    author_name: "Admin Trần",
    thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800",
    banner: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200",
    excerpt: "Bùng nổ mua sắm mùa hè với hàng ngàn deal giải nhiệt giảm giá sâu cực sốc.",
    summary: "Bùng nổ mua sắm mùa hè với hàng ngàn deal giải nhiệt giải giá sâu cực sốc.",
    description: "Săn deal giảm nửa giá cho tất cả sản phẩm thời trang hè, đồ gia dụng, thực phẩm mát lạnh giải nhiệt mùa hè.",
    views: 34100,
    likes: 195,
    status: "published",
    is_published: true,
    is_featured: true,
    start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    branch: "Toàn bộ hệ thống",
    tags: ["Khuyến mãi", "Siêu sale", "Mùa hè"],
    content_blocks: [
      { type: "text", text: "Cơ hội mua sắm thả ga không lo về giá từ Lotte Mart..." }
    ]
  }
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB for seeding events');

    await EventPost.deleteMany({});
    await EventComment.deleteMany({});
    console.log('Cleared existing event posts and comments');

    const createdEvents = await EventPost.insertMany(seedEvents);
    console.log(`Seeded ${createdEvents.length} event posts`);

    // Get an admin user for comments
    const adminUser = await User.findOne({ role_id: 1 }) || await User.findOne({});
    const userId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();
    const userName = adminUser ? (adminUser.full_name || adminUser.username) : 'Huynh Bao';

    // Seed some comments for Tuần lễ Nông sản Sạch (createdEvents[0])
    if (createdEvents.length > 0) {
      const targetEvent = createdEvents[0];
      const comments = [
        {
          event_id: targetEvent._id,
          user_id: userId,
          user_name: userName,
          content: "Sự kiện này có cần đăng ký trước không ạ? Mình thấy thông tin chưa rõ lắm.",
          likes: 2,
          status: "active",
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        },
        {
          event_id: targetEvent._id,
          user_id: userId,
          user_name: userName,
          content: "Nông sản ở Lotte Mart District 7 dạo này rất tươi, giá cũng ổn.",
          likes: 5,
          status: "active",
          created_at: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
        }
      ];
      await EventComment.insertMany(comments);
      console.log('Seeded comments for target event');
      
      // Update comments count on target event
      targetEvent.comments_count = comments.length;
      await targetEvent.save();
    }

    console.log('Event seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding events:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
