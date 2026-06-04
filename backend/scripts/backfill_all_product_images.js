import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../models/Product.js';

// High-quality, reliable Unsplash image URLs mapping based on keywords/categories
const MAPPINGS = [
  // 1. Vegetables
  { keywords: ['dưa leo', 'dưa chuột'], url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=800' },
  { keywords: ['cà chua'], url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=800' },
  { keywords: ['bắp cải', 'cải thảo', 'xà lách'], url: 'https://images.unsplash.com/photo-1550341333-e33a9a53232a?q=80&w=800' },
  { keywords: ['cà rốt'], url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800' },
  { keywords: ['khoai tây'], url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800' },
  { keywords: ['bông cải', 'súp lơ'], url: 'https://images.unsplash.com/photo-1583209814683-c023de294402?q=80&w=800' },
  { keywords: ['hành', 'tỏi', 'gừng', 'sả'], url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=800' },
  { keywords: ['rau muống', 'rau cải', 'mồng tơi', 'rau sạch', 'rau ngót'], url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800' },
  { keywords: ['nấm'], url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800' },

  // 2. Fruits
  { keywords: ['táo fuji', 'táo rockit', 'táo đỏ', 'táo'], url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?q=80&w=800' },
  { keywords: ['chuối'], url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=800' },
  { keywords: ['cam'], url: 'https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=800' },
  { keywords: ['dưa hấu'], url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=800' },
  { keywords: ['xoài'], url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=800' },
  { keywords: ['bưởi'], url: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=800' },
  { keywords: ['nho'], url: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?q=80&w=800' },
  { keywords: ['thanh long'], url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800' },
  { keywords: ['lê'], url: 'https://images.unsplash.com/photo-1601876819102-99560f772713?q=80&w=800' },
  { keywords: ['bơ'], url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=800' },

  // 3. Meat
  { keywords: ['ba rọi', 'ba chỉ', 'vai heo', 'heo', 'sườn', 'giò heo'], url: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?q=80&w=800' },
  { keywords: ['bò', 'beef', 'phi lê'], url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800' },
  { keywords: ['gà', 'cánh gà', 'đùi gà', 'chicken'], url: 'https://images.unsplash.com/photo-1587593817645-121a59d3581b?q=80&w=800' },

  // 4. Seafood
  { keywords: ['tôm', 'shrimp'], url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=800' },
  { keywords: ['mực', 'squid'], url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800' },
  { keywords: ['cá hồi', 'salmon'], url: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?q=80&w=800' },
  { keywords: ['cá nục', 'cá lóc', 'cá basa', 'cá'], url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800' },

  // 5. Eggs
  { keywords: ['trứng', 'egg'], url: 'https://images.unsplash.com/photo-1582722418955-41717b414d0c?q=80&w=800' },

  // 6. Bakery
  { keywords: ['bánh mì', 'bread', 'sandwich'], url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800' },
  { keywords: ['bánh ngọt', 'cake', 'cupcake', 'bánh bông lan'], url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?q=80&w=800' },

  // 7. Milk & Dairy
  { keywords: ['sữa tươi', 'sữa tiệt trùng', 'milk'], url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800' },
  { keywords: ['sữa chua', 'yogurt'], url: 'https://images.unsplash.com/photo-1571244856353-fb0556e4c7c8?q=80&w=800' },
  { keywords: ['phô mai', 'cheese', 'bơ thực vật', 'butter'], url: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?q=80&w=800' },

  // 8. Frozen
  { keywords: ['đông lạnh', 'há cảo', 'sủi cảo', 'chả giò', 'cá viên', 'bò viên'], url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800' },

  // 9. Instant
  { keywords: ['mì ăn liền', 'mì gói', 'hảo hảo', 'kokomi', 'omachi', 'cháo ăn liền'], url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800' },

  // 10. Rice & Grains
  { keywords: ['gạo', 'rice'], url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800' },

  // 11. Beverages
  { keywords: ['pepsi', 'coca', 'nước ngọt', 'fanta', 'sprite'], url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=800' },
  { keywords: ['bia', 'beer', 'heineken', 'tiger'], url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=800' },
  { keywords: ['nước khoáng', 'nước tinh khiết', 'aquafina', 'dasani'], url: 'https://images.unsplash.com/photo-1608885898957-a599fb1ee4a4?q=80&w=800' },
  { keywords: ['sữa hạt', 'nước trái cây', 'juice'], url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=800' },
  { keywords: ['trà', 'tea', 'cà phê', 'coffee', 'nescafe'], url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800' },

  // 12. Spices & Sauces
  { keywords: ['dầu ăn', 'simply', 'neptune'], url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800' },
  { keywords: ['nước tương', 'chinsu', 'maggi', 'nước mắm', 'nam ngư', 'tương ớt'], url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=800' },
  { keywords: ['gia vị', 'muối', 'đường', 'bột ngọt', 'hạt nêm', 'tiêu'], url: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=800' },

  // 13. Snacks
  { keywords: ['bánh quy', 'cosy', 'snack', 'khoai tây chiên', 'lays', 'kẹo', 'sô cô la', 'chocolate'], url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800' },

  // 14. Personal Care
  { keywords: ['dầu gội', 'dầu xả', 'shampoo', 'sữa tắm', 'xà bông'], url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800' },
  { keywords: ['kem đánh răng', 'bàn chải', 'colgate', 'ps'], url: 'https://images.unsplash.com/photo-1559591937-e620a0149794?q=80&w=800' },
  { keywords: ['lăn khử mùi', 'x-men', 'nivea', 'dove'], url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800' },

  // 15. Home Care
  { keywords: ['bột giặt', 'nước giặt', 'nước xả', 'comfort', 'downy', 'omo'], url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=800' },
  { keywords: ['rửa chén', 'lau nhà', 'gift', 'sunlight'], url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=800' }
];

const DEFAULT_CATEGORY_MAPPINGS = {
  'Rau củ': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800',
  'Trái cây': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=800',
  'Thịt các loại': 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?q=80&w=800',
  'Hải sản': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800',
  'Trứng': 'https://images.unsplash.com/photo-1582722418955-41717b414d0c?q=80&w=800',
  'Bánh mì & Bánh ngọt': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800',
  'Sữa & Sản phẩm từ sữa': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800',
  'Thực phẩm đông lạnh': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800',
  'Thực phẩm ăn liền': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800',
  'Gạo': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800',
  'Mì & Bún & Phở': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800',
  'Đồ uống': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=800',
  'Gia vị & Nguyên liệu nấu ăn': 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=800',
  'Nước sốt & Nước chấm': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=800',
  'Bánh kẹo & Đồ ăn vặt': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800',
  'Hóa mỹ phẩm & Đồ gia dụng': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=800',
  'Chăm sóc cá nhân': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800'
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting global product image backfill...');

    const products = await Product.find({});
    console.log(`Analyzing ${products.length} products...`);

    let updatedCount = 0;

    for (const product of products) {
      const nameLower = product.name.toLowerCase();
      let matchedUrl = null;

      // 1. Check keyword mappings first for high specificity
      for (const map of MAPPINGS) {
        const matches = map.keywords.some(kw => nameLower.includes(kw));
        if (matches) {
          matchedUrl = map.url;
          break;
        }
      }

      // 2. Fall back to category mapping
      if (!matchedUrl && product.category_name) {
        matchedUrl = DEFAULT_CATEGORY_MAPPINGS[product.category_name];
      }

      // 3. Fallback to generic product image
      if (!matchedUrl) {
        matchedUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800'; // Grocery store aisle
      }

      // Only update if it currently has a non-existent local placeholder or empty images
      const needsUpdate = !product.images || 
                          product.images.length === 0 || 
                          product.images[0].startsWith('/assets/') || 
                          product.images[0].startsWith('/uploads/') ||
                          product.images[0] === 'N/A';

      if (needsUpdate) {
        product.images = [matchedUrl];
        product.thumbnail = matchedUrl;
        if (product.gallery) {
          product.gallery = [matchedUrl];
        }
        await product.save();
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`Updated ${updatedCount} products so far...`);
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} products with high-quality stock URLs!`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to backfill product images:', err);
    process.exit(1);
  }
};

run();
