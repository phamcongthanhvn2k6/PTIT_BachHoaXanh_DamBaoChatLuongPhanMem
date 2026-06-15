import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const MONGO_URI = process.env.MONGODB_URI;

const categorySchema = new mongoose.Schema({
  name: String,
  icon: String,
  icon_type: String,
  icon_name: String,
  icon_emoji: String
}, { collection: 'categories' });

const Category = mongoose.model('Category', categorySchema);

const MIGRATIONS = {
  'Rau củ': 'eco',
  'Trái cây': 'nutrition',
  'Thịt các loại': 'whatshot',
  'Hải sản': 'set_meal',
  'Trứng': 'egg',
  'Bánh mì & Bánh ngọt': 'bakery_dining',
  'Sữa & Sản phẩm từ sữa': 'local_drink',
  'Thực phẩm đông lạnh': 'ac_unit',
  'Thực phẩm ăn liền': 'schedule',
  'Gạo': 'grass',
  'Mì & Bún & Phở': 'ramen_dining',
  'Đồ uống': 'wine_bar',
  'Gia vị & Nguyên liệu nấu ăn': 'flatware',
  'Bánh kẹo & Đồ ăn vặt': 'cookie'
};

async function run() {
  console.log('Connecting to:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const categories = await Category.find({});
  console.log('=== Migrating Categories ===');
  for (const c of categories) {
    const targetIcon = MIGRATIONS[c.name];
    if (targetIcon) {
      console.log(`Migrating: ${c.name} -> ${targetIcon}`);
      c.icon = targetIcon;
      c.icon_name = targetIcon;
      c.icon_type = 'material_icon';
      await c.save();
    } else {
      // Ensure fields are set even if correct
      let changed = false;
      if (!c.icon_name || c.icon_name === 'undefined') {
        c.icon_name = c.icon;
        changed = true;
      }
      if (!c.icon_type || c.icon_type === 'undefined') {
        c.icon_type = 'material_icon';
        changed = true;
      }
      if (changed) {
        await c.save();
      }
    }
  }

  console.log('Migration complete!');
  await mongoose.disconnect();
}

run().catch(console.error);
