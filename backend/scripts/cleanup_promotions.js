import mongoose from 'mongoose';
import Promotion from '../models/Promotion.js';
import Category from '../models/Category.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotte_mart');
  console.log('Connected to DB');

  // Find Fruit Category
  const fruitCat = await Category.findOne({ name: /trái cây|fruits/i }).lean();
  const fruitCatId = fruitCat ? fruitCat._id : null;
  console.log('Found Fruit Category ID:', fruitCatId);

  // 1. Fix "Đại tiệc Trái cây Nhập khẩu Tươi ngon" promotion
  const fruitPromo = await Promotion.findOne({ title: /Đại tiệc Trái cây/i });
  if (fruitPromo) {
    console.log('Before update:', {
      id: fruitPromo._id,
      title: fruitPromo.title,
      type: fruitPromo.type,
      discount_value: fruitPromo.discount_value,
      scope: fruitPromo.scope
    });

    fruitPromo.discount_value = 50; // Set to 50% discount instead of 10000%
    fruitPromo.type = 'percent';
    
    // If fruit category was found, scope it to that category
    if (fruitCatId) {
      fruitPromo.scope = 'category';
      fruitPromo.target_category_ids = [fruitCatId];
    } else {
      fruitPromo.scope = 'all';
    }

    await fruitPromo.save();
    console.log('After update:', {
      id: fruitPromo._id,
      title: fruitPromo.title,
      type: fruitPromo.type,
      discount_value: fruitPromo.discount_value,
      scope: fruitPromo.scope,
      target_category_ids: fruitPromo.target_category_ids
    });
  } else {
    console.log('Fruit promotion not found');
  }

  // 2. Clean up other promotions in database
  const allPromos = await Promotion.find({});
  console.log(`Auditing and cleaning ${allPromos.length} promotions...`);

  for (const promo of allPromos) {
    let changed = false;

    // Ensure type is valid and present
    if (!promo.type || !['percent', 'fixed_amount', 'bogo', 'free_shipping', 'points_multiplier', 'gift_item', 'flash_deal'].includes(promo.type)) {
      console.log(`Promotion "${promo.title}" (${promo._id}) has invalid type: "${promo.type}". Fixing type to "percent" and pausing.`);
      promo.type = 'percent';
      promo.status = 'paused';
      promo.is_active = false;
      changed = true;
    }

    // Enforce percent value limits
    if ((promo.type === 'percent' || promo.type === 'flash_deal') && (promo.discount_value > 100 || promo.discount_value < 0)) {
      console.log(`Promotion "${promo.title}" (${promo._id}) has invalid percent discount_value: ${promo.discount_value}. Capping at 50%.`);
      promo.discount_value = 50;
      changed = true;
    }

    // Ensure scope is valid
    if (!promo.scope || !['all', 'product', 'category', 'branch'].includes(promo.scope)) {
      promo.scope = 'all';
      changed = true;
    }

    // Ensure status is valid
    if (!promo.status || !['draft', 'active', 'scheduled', 'expired', 'paused'].includes(promo.status)) {
      promo.status = promo.is_active ? 'active' : 'paused';
      changed = true;
    }

    // Ensure discount_value is numeric
    if (promo.discount_value === undefined || promo.discount_value === null || isNaN(promo.discount_value)) {
      promo.discount_value = 0;
      changed = true;
    }

    if (changed) {
      await promo.save();
      console.log(`Saved changes for "${promo.title}"`);
    }
  }

  console.log('Cleanup completed successfully.');
  await mongoose.disconnect();
}

run().catch(console.error);
