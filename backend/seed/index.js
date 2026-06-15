import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { generateShortCode, buildProductSlug } from '../utils/slugify.js';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Branch from '../models/Branch.js';
import BranchProduct from '../models/BranchProduct.js';
import Order from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import Promotion from '../models/Promotion.js';
import { PromotionClaim, PromotionUsage } from '../models/PromotionUsage.js';
import { EventPost } from '../models/EventPost.js';
import { Banner, HotDeal, DeliverySlot, AdminSetting } from '../models/Misc.js';
import { PaymentProvider } from '../models/Payment.js';
import MembershipTier from '../models/MembershipTier.js';
import { PopupAd } from '../models/PopupAd.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockPath = path.join(__dirname, '..', '..', 'fontend', 'mockData.json');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for seeding');

  let mock = {};
  if (fs.existsSync(mockPath)) {
    mock = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    console.log('Loaded mockData.json with keys:', Object.keys(mock).join(', '));
  } else {
    console.log('mockData.json not found, seeding minimal data');
  }

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}),
    Branch.deleteMany({}), BranchProduct.deleteMany({}), Order.deleteMany({}),
    Coupon.deleteMany({}), Promotion.deleteMany({}), EventPost.deleteMany({}),
    PromotionClaim.deleteMany({}), PromotionUsage.deleteMany({}),
    Banner.deleteMany({}), HotDeal.deleteMany({}), DeliverySlot.deleteMany({}),
    AdminSetting.deleteMany({}), PaymentProvider.deleteMany({}), MembershipTier.deleteMany({}),
    PopupAd.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Helper to make deterministic ObjectId from a number
  const makeId = (id) => id ? new mongoose.Types.ObjectId(String(id).padStart(24, '0')) : new mongoose.Types.ObjectId();

  // Seed Users
  const usersData = (mock.users || []).map(u => ({
    _id: makeId(u.id),
    username: u.username || u.full_name || u.email?.split('@')[0] || 'user',
    full_name: u.full_name || u.username || '',
    email: (u.email || `user${u.id}@lottemart.vn`).toLowerCase(),
    phone: u.phone || '',
    password_hash: u.password_hash || (u.password ? u.password : null),
    avatar: u.avatar || null,
    role_id: u.role_id || 3,
    branch_id: u.branch_id ? makeId(u.branch_id) : null,
    lotte_points: u.lotte_points || 0,
    membership_level: u.membership_level || 'Đồng',
    signup_method: u.signup_method || 'email',
    googleId: u.googleId || null,
    status: u.status || 'ACTIVE',
    is_active: u.is_active !== false,
    profile_completed: u.profile_completed === true,
    wallet_balance: Number(u.wallet_balance || 0),
    default_payment_method: u.default_payment_method || null,
    email_verified: u.email_verified !== false,
    tags: u.tags || [],
    note: u.note || '',
    preferences: u.preferences || {},
    security: u.security || {},
    settings: u.settings || {},
  }));
  // Ensure default admin exists
  if (!usersData.some(u => u.email === 'admin@lottemart.vn')) {
    usersData.push({
      _id: makeId(9999),
      username: 'admin',
      full_name: 'Admin Lotte',
      email: 'admin@lottemart.vn',
      password_hash: await bcrypt.hash('Admin@123', 10),
      role_id: 1,
      is_active: true,
      email_verified: true,
      status: 'ACTIVE',
      membership_level: 'Kim Cương',
      lotte_points: 9999,
    });
  }
  // Hash passwords for seeded users
  for (const u of usersData) {
    if (u.password_hash && !u.password_hash.startsWith('$2')) {
      u.password_hash = await bcrypt.hash(u.password_hash, 10);
    }
  }
  const users = await User.insertMany(usersData, { ordered: false }).catch(e => { console.log('Users partial insert:', e.message); return []; });
  console.log(`Seeded ${users.length} users`);

  // Seed Categories
  const categories = await Category.insertMany((mock.categories || []).map(c => ({
    _id: makeId(c.id),
    name: c.name, slug: c.slug || '', icon: c.icon || '', image: c.image || '',
    banner: c.banner || '',
    description: c.description || '',
    parent_id: c.parent_id ? makeId(c.parent_id) : null,
    sort_order: c.sort_order ?? c.display_order ?? 0,
    display_order: c.display_order ?? c.sort_order ?? 0,
    is_active: c.is_active !== false,
    product_count: c.product_count || 0,
    created_by: c.created_by ? makeId(c.created_by) : null,
  }))).catch(() => []);
  console.log(`Seeded ${categories.length} categories`);

  // Seed Products
  const products = await Product.insertMany((mock.products || []).map(p => {
    const prodId = makeId(p.id);
    const shortCode = p.short_code || generateShortCode(prodId);
    const slug = p.slug || buildProductSlug(p.name, prodId, shortCode);
    return {
      _id: prodId,
      name: p.name,
      slug: slug,
      short_code: shortCode,
      description: p.description || '',

    short_description: Array.isArray(p.short_description) ? p.short_description.join(' ') : String(p.short_description || ''),
    eco_label: p.eco_label ?? null,
    category_id: p.category_id ? makeId(p.category_id) : null,
    brand: p.brand || '',
    origin: p.origin || p.origin_country || '',
    origin_country: p.origin_country || p.origin || '',
    origin_flag: p.origin_flag || '',
    unit: p.unit || 'cái',
    weight: p.weight || '', barcode: p.barcode || '', sku: p.sku || '',
    price: p.price || 0, original_price: p.original_price || 0, discount_percent: p.discount_percent || 0,
    images: p.images || [], thumbnail: p.thumbnail || (p.images?.[0]) || '',
    gallery: p.gallery || [],
    ar_model_url: p.ar_model_url || '',
    tags: p.tags || [], is_active: p.is_active !== false, is_featured: p.is_featured || false,
    rating: p.rating || 0, review_count: p.review_count || 0, sold_count: p.sold_count || 0,
    total_reviews: p.total_reviews || 0,
    rating_breakdown: p.rating_breakdown || {},
    vat_included: p.vat_included !== false,
    shipping_excluded: p.shipping_excluded === true,
    highlights: p.highlights || [],
    product_details: p.product_details || [],
    specifications: p.specifications || {}, nutrition_info: p.nutrition_info || null,
    usage_guide: p.usage_guide || '',
    storage_instructions: p.storage_instructions || '',
    storage_guide: p.storage_guide || '',
    notes: p.notes || '',
    recipe_suggestions: p.recipe_suggestions || [],
    related_product_ids: p.related_product_ids || [],
    frequently_bought_together: p.frequently_bought_together || [],
    created_by: p.created_by ? makeId(p.created_by) : null,
    };
  })).catch((e) => { console.error('Product seed err:', e.message); return []; });
  console.log(`Seeded ${products.length} products`);

  // Seed Branches
  const branches = await Branch.insertMany((mock.branches || [{ id: 1, name: 'Lotte Mart Hà Nội', address: '229 Tây Sơn, Đống Đa', city: 'Hà Nội', is_active: true }]).map(b => ({
    _id: makeId(b.id),
    name: b.name, address: b.address || '', city: b.city || '', phone: b.phone || '',
    manager: b.manager || '', is_active: b.is_active !== false,
    operating_hours: b.operating_hours || '08:00 - 22:00',
    coordinates: b.coordinates || null,
  }))).catch(() => []);
  console.log(`Seeded ${branches.length} branches`);

  // Seed BranchProducts
  await BranchProduct.insertMany((mock.branch_products || []).map(bp => ({
    _id: makeId(bp.id),
    product_id: bp.product_id ? makeId(bp.product_id) : null, branch_id: bp.branch_id ? makeId(bp.branch_id) : null,
    price: bp.price || 0, original_price: bp.original_price || 0, discount_percent: bp.discount_percent || 0,
    stock: bp.stock || 0, min_stock: bp.min_stock || 0, is_available: bp.is_available !== false,
    promotion_tag: bp.promotion_tag || '',
  }))).catch(() => []);

  // Seed Promotions
  await Promotion.insertMany((mock.promotions || []).map(p => {
    const pType = ['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'].includes(String(p.type || '').toLowerCase())
      ? String(p.type).toLowerCase()
      : (String(p.type || '').toLowerCase() === 'percentage' ? 'percent' : 'fixed_amount');
    let discountVal = p.discount_value || p.discount || 0;
    if ((pType === 'percent' || pType === 'flash_deal') && discountVal > 100) {
      discountVal = 50; // safe fallback
    }
    return {
      title: p.title || p.name || '',
      description: p.description || '',
      type: pType,
      status: p.status || 'active',
      scope: p.scope || 'all',
      target_product_ids: p.target_product_ids || [],
      target_category_ids: p.target_category_ids || [],
      target_branch_ids: p.target_branch_ids || [],
      excluded_product_ids: p.excluded_product_ids || [],
      excluded_category_ids: p.excluded_category_ids || [],
      start_date: p.start_date ? new Date(p.start_date) : null,
      end_date: p.end_date ? new Date(p.end_date) : null,
      usage_limit: p.usage_limit ?? null,
      usage_per_user: p.usage_per_user ?? 1,
      max_redemptions: p.max_redemptions ?? null,
      max_discount_amount: p.max_discount_amount ?? null,
      min_order_amount: p.min_order_amount ?? 0,
      min_quantity: p.min_quantity ?? 0,
      discount_value: discountVal,
      gift_product_id: p.gift_product_id || null,
      gift_quantity: p.gift_quantity || 0,
      points_multiplier: p.points_multiplier || 1,
      badge_text: p.badge_text || p.badge || '',
      banner_image: p.banner_image || p.image || '',
      banner_url: p.banner_url || p.link || '',
      priority: p.priority || 0,
      stackable: p.stackable === true,
      is_active: p.is_active !== false,
    };
  })).catch(() => []);

  // Seed Coupons
  await Coupon.insertMany((mock.coupons || []).map(c => {
    const cType = ['percent', 'fixed_amount', 'free_shipping', 'points'].includes(String(c.type || '').toLowerCase())
      ? String(c.type).toLowerCase()
      : (String(c.type || '').toLowerCase() === 'percentage' ? 'percent' : 'fixed_amount');
    let discountVal = c.discount_value || 0;
    if (cType === 'percent' && discountVal > 100) {
      discountVal = 50; // safe fallback
    }
    return {
      code: (c.code || `COUPON${c.id}`).toUpperCase(),
      title: c.title || '',
      description: c.description || '',
      type: cType,
      scope: c.scope || 'all',
      target_product_ids: c.target_product_ids || [],
      target_category_ids: c.target_category_ids || [],
      target_branch_ids: c.target_branch_ids || [],
      excluded_product_ids: c.excluded_product_ids || [],
      excluded_category_ids: c.excluded_category_ids || [],
      discount_value: discountVal,
      min_order_amount: c.min_order_amount || c.min_order_value || 0,
      min_quantity: c.min_quantity || 0,
      max_discount_amount: c.max_discount_amount || c.max_discount || null,
      usage_limit: c.usage_limit ?? null,
      usage_per_user: c.usage_per_user ?? 1,
      start_date: c.start_date ? new Date(c.start_date) : null,
      end_date: c.end_date ? new Date(c.end_date) : null,
      is_active: c.is_active !== false,
    };
  })).catch(() => []);

  // Seed EventPosts
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
  await EventPost.insertMany(seedEvents).catch((e) => console.log('EventPosts seed err:', e.message));

  // Seed Banners
  await Banner.insertMany((mock.banners || mock.home_banners || []).map(b => ({
    title: b.title || '', image: b.image || b.url || '', link: b.link || '', position: 'home',
    is_active: true,
  }))).catch(() => []);

  // Seed DeliverySlots
  await DeliverySlot.insertMany((mock.delivery_slots || []).map(s => ({
    date: s.date || '', time_start: s.time_start || s.start || '', time_end: s.time_end || s.end || '',
    capacity: s.capacity || 10, is_available: s.is_available !== false,
  }))).catch(() => []);

  // Seed PaymentProviders
  await PaymentProvider.insertMany((mock.payment_providers || []).map(p => ({
    name: p.name, code: p.code || p.name?.toLowerCase(), icon: p.icon || '', is_active: p.is_active !== false,
  }))).catch(() => []);

  // Seed AdminSettings
  const settingsArr = Array.isArray(mock.admin_settings) ? mock.admin_settings : [];
  await AdminSetting.insertMany(settingsArr.map(s => ({
    key: s.key, value: s.value, label: s.label || '', group: s.group || 'general',
  }))).catch(() => []);

  // Seed Membership Tiers
  await MembershipTier.insertMany([
    { level: 'Đồng', min_points: 0, discount_rate: 0, benefits: ['Tích điểm 1% đơn hàng'] },
    { level: 'Bạc', min_points: 100, discount_rate: 0.02, benefits: ['Tích điểm 1.5% đơn hàng', 'Giảm giá 2% toàn sàn'] },
    { level: 'Vàng', min_points: 500, discount_rate: 0.05, benefits: ['Tích điểm 2% đơn hàng', 'Giảm giá 5% toàn sàn', 'Quà sinh nhật'] },
    { level: 'Kim Cương', min_points: 2000, discount_rate: 0.1, benefits: ['Tích điểm 3% đơn hàng', 'Giảm giá 10% toàn sàn', 'Quà sinh nhật cao cấp', 'Ưu tiên CSKH'] }
  ]).catch(() => []);

  // Seed PopupAds
  const seedPopupAds = [
    {
      title: "Siêu Ưu Đãi Mùa Hè",
      subtitle: "Giảm ngay 20% cho toàn bộ ngành hàng tươi sống",
      description: "Áp dụng cho khách hàng thành viên LOTTE khi mua sắm online trên ứng dụng.",
      image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800",
      cta_text: "Xem Ngay",
      cta_link: "/products",
      campaign_type: "url",
      target_branch: "all",
      target_audience: "all",
      start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      priority: 10,
      status: "active",
      show_once_per_day: true,
    }
  ];
  await PopupAd.insertMany(seedPopupAds).catch((e) => console.log('PopupAds seed err:', e.message));

  console.log('\n✅ Seed complete!');
  console.log('Admin login: admin@lottemart.vn / Admin@123');
  process.exit(0);
};

run().catch(err => { console.error('Seed error:', err); process.exit(1); });
