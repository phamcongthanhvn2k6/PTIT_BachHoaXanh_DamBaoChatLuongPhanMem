import { Banner, HotDeal } from '../models/Misc.js';
import Promotion from '../models/Promotion.js';
import { Coupon } from '../models/Coupon.js';
import Product from '../models/Product.js';

export const ensureMarketingSeed = async () => {
  try {
    const bannersCount = await Banner.countDocuments();
    const products = await Product.find({ is_active: true }).limit(10).lean();
    const productIds = products.map((p) => String(p._id)).filter(Boolean);

    if (bannersCount === 0) {
      console.log('Seeding initial banners...');
      await Banner.insertMany([
        { title: 'Siêu Sale Lotte 4.4', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070', image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070', link: '/promotions', position: 'home', is_active: true },
        { title: 'Tươi Xanh Mỗi Ngày', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974', link: '/products', position: 'home', is_active: true },
        { title: 'Thịt Bò Nhập Khẩu Đỉnh', image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=2070', image_url: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=2070', link: '/products', position: 'home', is_active: true }
      ]);
    }

    const promosCount = await Promotion.countDocuments();
    if (promosCount === 0) {
      console.log('Seeding initial promotions...');
      await Promotion.insertMany([
        { title: 'Khuyến mãi rau sạch nhập trong ngày', type: 'percent', discount_value: 15, is_active: true, status: 'active', scope: 'all', image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?q=80&w=2042', start_date: new Date(), end_date: new Date(Date.now() + 30 * 86400000) },
        { title: 'Flash sale mì gói', type: 'fixed_amount', discount_value: 20000, is_active: true, status: 'active', scope: 'all', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?q=80&w=1964', start_date: new Date(), end_date: new Date(Date.now() + 14 * 86400000) }
      ]);
    }

    const couponsCount = await Coupon.countDocuments();
    if (couponsCount === 0) {
      console.log('Seeding initial coupons...');
      await Coupon.insertMany([
        { code: 'GIAM50K', title: 'Giảm 50K cho đơn trên 500K', type: 'fixed_amount', discount_value: 50000, min_order_amount: 500000, is_active: true, status: 'active', usage_limit: 1000, total_quantity: 1000, remaining_quantity: 1000 },
        { code: 'LOTTE10', title: 'Giảm 10% khách hàng mới', type: 'percent', discount_value: 10, max_discount_amount: 100000, is_active: true, status: 'active', usage_limit: 1500, total_quantity: 1500, remaining_quantity: 1500 }
      ]);
    }

    const hotDealsCount = await HotDeal.countDocuments();
    if (hotDealsCount === 0) {
      console.log('Seeding initial hot deals...');
      const fallbackProductId = productIds[0] || 'dummy_product_id';
      const firstProductId = productIds[0] || fallbackProductId;
      const secondProductId = productIds[1] || fallbackProductId;
      await HotDeal.insertMany([
        { title: 'Táo Rockit Mỹ', product_id: firstProductId, type: 'percent', discount_percent: 30, discount_value: 30, original_price: 150000, deal_price: 105000, stock_limit: 100, remaining_quantity: 100, total_quantity: 100, sold_count: 0, is_active: true, image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?q=80&w=1974' },
        { title: 'Cá Hồi Na-uy', product_id: secondProductId, type: 'fixed_amount', discount_percent: 15, discount_value: 15000, original_price: 300000, deal_price: 285000, stock_limit: 200, remaining_quantity: 150, total_quantity: 200, sold_count: 50, is_active: true, image_url: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?q=80&w=2070' }
      ]);
    }
  } catch (err) {
    console.error('Marketing seed error:', err.message);
  }
};

