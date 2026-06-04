import '../config/loadEnv.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateShortCode, buildProductSlug } from '../utils/slugify.js';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Branch from '../models/Branch.js';
import BranchProduct from '../models/BranchProduct.js';
import Supplier from '../models/Supplier.js';
import ImportOrder from '../models/ImportOrder.js';
import ImportReceipt from '../models/ImportReceipt.js';
import InventoryBatch from '../models/InventoryBatch.js';
import StockMovement from '../models/StockMovement.js';
import { AuditLog } from '../models/Misc.js';

// Deterministic ObjectId helper
const makeId = (num) => new mongoose.Types.ObjectId(String(num).padStart(24, '0'));

// Branch IDs mapping
const BRANCH_Q7_ID = makeId(1); // Lotte Mart Quận 7
const BRANCH_GV_ID = makeId(2); // Lotte Mart Gò Vấp

// Categories Configuration
const categoriesConfig = [
  { id: 101, name: 'Rau củ', slug: 'rau-cu', icon: 'Leaf', description: 'Rau củ tươi sạch mỗi ngày' },
  { id: 102, name: 'Trái cây', slug: 'trai-cay', icon: 'Apple', description: 'Trái cây nội địa và nhập khẩu' },
  { id: 103, name: 'Thịt các loại', slug: 'thit-cac-loai', icon: 'Flame', description: 'Thịt heo, thịt bò, thịt gà tươi ngon' },
  { id: 104, name: 'Hải sản', slug: 'hai-san', icon: 'Fish', description: 'Tôm, cua, cá, mực tươi sống' },
  { id: 105, name: 'Trứng', slug: 'trung', icon: 'Egg', description: 'Trứng gà, trứng vịt, trứng cút sạch' },
  { id: 106, name: 'Bánh mì & Bánh ngọt', slug: 'banh-mi-banh-ngot', icon: 'Cupcake', description: 'Bánh mì tươi, bánh kem ngon miệng' },
  { id: 107, name: 'Sữa & Sản phẩm từ sữa', slug: 'sua-san-pham-sua', icon: 'Milk', description: 'Sữa tươi, sữa chua, phô mai' },
  { id: 108, name: 'Thực phẩm đông lạnh', slug: 'thuc-pham-dong-lanh', icon: 'Snowflake', description: 'Há cảo, chả giò, lẩu đông lạnh' },
  { id: 109, name: 'Thực phẩm ăn liền', slug: 'thuc-pham-an-lien', icon: 'Clock', description: 'Mì gói, cháo ăn liền tiện lợi' },
  { id: 110, name: 'Gạo', slug: 'gao', icon: 'Wheat', description: 'Gạo tẻ, gạo lứt, nếp các loại' },
  { id: 111, name: 'Mì & Bún & Phở', slug: 'mi-bun-pho', icon: 'Soup', description: 'Các loại mì khô, bún khô, bánh phở' },
  { id: 112, name: 'Đồ uống', slug: 'do-uong', icon: 'Wine', description: 'Nước ngọt, bia, nước trái cây' },
  { id: 113, name: 'Gia vị & Nguyên liệu nấu ăn', slug: 'gia-vi-nguyen-lieu', icon: 'ChefHat', description: 'Dầu ăn, muối, đường, pate' },
  { id: 114, name: 'Nước sốt & Nước chấm', slug: 'nuoc-sot-nuoc-cham', icon: 'Droplet', description: 'Nước tương, nước mắm, tương ớt' },
  { id: 115, name: 'Bánh kẹo & Đồ ăn vặt', slug: 'banh-keo-do-an-vat', icon: 'Cookie', description: 'Snack, bánh quy, sô cô la' },
  { id: 116, name: 'Hóa mỹ phẩm & Đồ gia dụng', slug: 'hoa-my-pham-gia-dung', icon: 'Trash2', description: 'Bột giặt, nước lau nhà, dụng cụ bếp' },
  { id: 117, name: 'Chăm sóc cá nhân', slug: 'cham-soc-ca-nhan', icon: 'Smile', description: 'Dầu gội, tắm rửa, kem đánh răng' }
];

// Core products template for generating 30 products per category
const coreProductsData = {
  101: [ // Vegetables (Rau củ)
    { name: 'Dưa leo Đà Lạt', basePrice: 20000, unit: 'kg', brand: 'Dalat Gap', keywords: ['dua leo', 'dưa leo', 'dưa chuột', 'dưa chuột đà lạt'] },
    { name: 'Cà chua Đà Lạt', basePrice: 25000, unit: 'kg', brand: 'Dalat Gap', keywords: ['ca chua', 'cà chua', 'cà chua đà lạt'] },
    { name: 'Bắp cải thảo', basePrice: 18000, unit: 'kg', brand: 'Lotte Farm', keywords: ['bap cai', 'bắp cải', 'cải thảo'] },
    { name: 'Cà rốt Đà Lạt', basePrice: 22000, unit: 'kg', brand: 'Dalat Gap', keywords: ['ca rot', 'cà rốt'] },
    { name: 'Khoai tây Đà Lạt', basePrice: 30000, unit: 'kg', brand: 'Dalat Gap', keywords: ['khoai tay', 'khoai tây'] },
    { name: 'Rau muống sạch', basePrice: 12000, unit: 'bó', brand: 'Lotte Farm', keywords: ['rau muong', 'rau muống'] },
    { name: 'Cải thìa tươi', basePrice: 16000, unit: 'kg', brand: 'Lotte Farm', keywords: ['rau cai', 'cải thìa'] },
    { name: 'Bông cải xanh', basePrice: 45000, unit: 'kg', brand: 'Dalat Gap', keywords: ['bong cai xanh', 'súp lơ xanh'] },
    { name: 'Hành tây trắng', basePrice: 20000, unit: 'kg', brand: 'Lotte Farm', keywords: ['hanh tay', 'hành tây'] },
    { name: 'Tỏi Lý Sơn', basePrice: 120000, unit: 'kg', brand: 'Lý Sơn', keywords: ['toi ly son', 'tỏi cô đơn'] }
  ],
  102: [ // Fruits (Trái cây)
    { name: 'Táo Fuji', basePrice: 79000, unit: 'kg', brand: 'Lotte Import', keywords: ['tao fuji', 'táo đỏ', 'apple'] },
    { name: 'Chuối già Nam Mỹ', basePrice: 28000, unit: 'kg', brand: 'Vinasun', keywords: ['chuoi', 'chuối tiêu'] },
    { name: 'Cam sành Hàm Yên', basePrice: 35000, unit: 'kg', brand: 'Hàm Yên', keywords: ['cam sanh', 'cam vắt'] },
    { name: 'Dưa hấu không hạt', basePrice: 22000, unit: 'kg', brand: 'Lotte Farm', keywords: ['dua hau', 'dưa hấu'] },
    { name: 'Xoài cát Hòa Lộc', basePrice: 85000, unit: 'kg', brand: 'Hòa Lộc', keywords: ['xoai cat', 'xoài chín'] },
    { name: 'Bưởi da xanh', basePrice: 65000, unit: 'quả', brand: 'Bến Tre', keywords: ['buoi da xanh', 'bưởi ngọt'] },
    { name: 'Nho ngón tay Mỹ', basePrice: 249000, unit: 'kg', brand: 'Lotte Import', keywords: ['nho ngoc tay', 'nho đen'] },
    { name: 'Thanh long ruột đỏ', basePrice: 30000, unit: 'kg', brand: 'Bình Thuận', keywords: ['thanh long', 'thanh long đỏ'] },
    { name: 'Lê đỏ Nam Phi', basePrice: 89000, unit: 'kg', brand: 'Lotte Import', keywords: ['le do', 'lê nam phi'] },
    { name: 'Bơ sáp Đắk Lắk', basePrice: 45000, unit: 'kg', brand: 'Đắk Lắk', keywords: ['bo sap', 'bơ sáp'] }
  ],
  103: [ // Meat (Thịt các loại)
    { name: 'Thịt ba rọi heo', basePrice: 165000, unit: 'kg', brand: 'CP Meat', keywords: ['ba roi', 'ba rọi', 'thịt heo', 'pork'] },
    { name: 'Thịt vai heo sạch', basePrice: 130000, unit: 'kg', brand: 'CP Meat', keywords: ['thit vai', 'thịt vai', 'thịt heo'] },
    { name: 'Thịt bò phi lê Úc', basePrice: 380000, unit: 'kg', brand: 'Lotte Import', keywords: ['thit bo', 'bò phi lê', 'beef'] },
    { name: 'Thịt bò Mỹ ba chỉ', basePrice: 249000, unit: 'khay', brand: 'Excel', keywords: ['ba chi bo', 'ba chỉ bò', 'bò mỹ'] },
    { name: 'Đùi gà góc tư', basePrice: 75000, unit: 'kg', brand: 'CP Chicken', keywords: ['dui ga', 'đùi gà', 'chicken'] },
    { name: 'Cánh gà tươi', basePrice: 95000, unit: 'kg', brand: 'CP Chicken', keywords: ['canh ga', 'cánh gà'] },
    { name: 'Thịt heo xá xíu', basePrice: 195000, unit: 'kg', brand: 'Vissan', keywords: ['thit xa xiu', 'thịt xá xíu', 'thịt nguội'] },
    { name: 'Giò heo khoanh', basePrice: 110000, unit: 'kg', brand: 'CP Meat', keywords: ['gio heo', 'giò heo'] },
    { name: 'Sườn non heo', basePrice: 210000, unit: 'kg', brand: 'Vissan', keywords: ['suon non', 'sườn non'] },
    { name: 'Thịt bò xay', basePrice: 180000, unit: 'kg', brand: 'Vissan', keywords: ['thit bo xay', 'bò xay'] }
  ],
  104: [ // Seafood (Hải sản)
    { name: 'Tôm thẻ chân trắng', basePrice: 185000, unit: 'kg', brand: 'Lotte Seafood', keywords: ['tom the', 'tôm thẻ', 'shrimp'] },
    { name: 'Mực ống tươi', basePrice: 280000, unit: 'kg', brand: 'Phan Thiết', keywords: ['muc ong', 'mực tươi', 'squid'] },
    { name: 'Cá hồi Na Uy phi lê', basePrice: 590000, unit: 'kg', brand: 'Leroy', keywords: ['ca hoi', 'cá hồi na uy', 'salmon'] },
    { name: 'Cá lóc bông làm sạch', basePrice: 95000, unit: 'kg', brand: 'Lotte Seafood', keywords: ['ca loc', 'cá quả'] },
    { name: 'Ngao hai cồi', basePrice: 120000, unit: 'kg', brand: 'Lotte Seafood', keywords: ['ngao', 'nghêu'] },
    { name: 'Cua cà mau sống', basePrice: 420000, unit: 'kg', brand: 'Cà Mau', keywords: ['cua ca mau', 'cua gạch'] },
    { name: 'Cá basa phi lê', basePrice: 65000, unit: 'kg', brand: 'Lotte Seafood', keywords: ['ca basa', 'cá tra'] },
    { name: 'Bạch tuộc tươi', basePrice: 175000, unit: 'kg', brand: 'Phan Thiết', keywords: ['bach tuoc', 'bạch tuộc'] },
    { name: 'Cá cam Nhật Bản', basePrice: 160000, unit: 'kg', brand: 'Lotte Import', keywords: ['ca cam', 'cá cam nhật'] },
    { name: 'Cá nục hoa', basePrice: 55000, unit: 'kg', brand: 'Lotte Seafood', keywords: ['ca nuc', 'cá nục'] }
  ],
  105: [ // Eggs (Trứng)
    { name: 'Trứng gà CP 10 quả', basePrice: 32000, unit: 'hộp', brand: 'CP Eggs', keywords: ['trung ga', 'trứng gà cp', 'egg', 'trung ga 10 qua'] },
    { name: 'Trứng gà hữu cơ Ba Huân', basePrice: 45000, unit: 'hộp', brand: 'Ba Huân', keywords: ['trung ga huu co', 'trứng organic', 'trung ga sach'] },
    { name: 'Trứng vịt sạch 10 quả', basePrice: 38000, unit: 'hộp', brand: 'Ba Huân', keywords: ['trung vit', 'trứng vịt sạch'] },
    { name: 'Trứng vịt lộn', basePrice: 28000, unit: 'vỉ', brand: 'Ba Huân', keywords: ['trung vit lon', 'hột vịt lộn'] },
    { name: 'Trứng cút sạch 30 quả', basePrice: 25000, unit: 'hộp', brand: 'CP Eggs', keywords: ['trung cut', 'trứng cút'] },
    { name: 'Trứng gà omega-3', basePrice: 52000, unit: 'hộp', brand: 'Ba Huân', keywords: ['trung ga omega', 'trứng gà bổ dưỡng'] },
    { name: 'Trứng muối đóng hộp', basePrice: 42000, unit: 'hộp', brand: 'Ba Huân', keywords: ['trung ga muoi', 'trứng vịt muối'] },
    { name: 'Trứng bắc thảo', basePrice: 48000, unit: 'hộp', brand: 'Ba Huân', keywords: ['trung bac thao', 'bách thảo'] },
    { name: 'Trứng vịt muối Ba Huân 6 quả', basePrice: 26000, unit: 'hộp', brand: 'Ba Huân', keywords: ['trung vit muoi', 'trứng muối'] },
    { name: 'Trứng cút ăn liền', basePrice: 35000, unit: 'gói', brand: 'Ba Huân', keywords: ['trung cut an lien', 'trứng cút kho'] }
  ],
  106: [ // Bakery (Bánh mì & Bánh ngọt)
    { name: 'Bánh mì Việt Nam', basePrice: 5000, unit: 'ổ', brand: 'Lotte Bakery', keywords: ['banh mi', 'bánh mì', 'bánh mì việt nam'] },
    { name: 'Bánh mì baguette', basePrice: 15000, unit: 'ổ', brand: 'Lotte Bakery', keywords: ['banh mi baguette', 'baguette pháp'] },
    { name: 'Bánh mì sandwich lát', basePrice: 25000, unit: 'gói', brand: 'Lotte Bakery', keywords: ['banh mi sandwich', 'sandwich gối'] },
    { name: 'Bánh mì nguyên cám hữu cơ', basePrice: 38000, unit: 'gói', brand: 'Lotte Bakery', keywords: ['banh mi nguyen cam', 'bánh mì ngũ cốc'] },
    { name: 'Bánh sừng bò Croissant', basePrice: 18000, unit: 'cái', brand: 'Lotte Bakery', keywords: ['croissant', 'bánh sừng bò'] },
    { name: 'Bánh trứng Egg Tart', basePrice: 12000, unit: 'cái', brand: 'Lotte Bakery', keywords: ['egg tart', 'bánh trứng tart'] },
    { name: 'Bánh donut phủ dâu', basePrice: 15000, unit: 'cái', brand: 'Lotte Bakery', keywords: ['donut', 'bánh donut'] },
    { name: 'Bánh mì ngọt chà bông', basePrice: 16000, unit: 'cái', brand: 'Lotte Bakery', keywords: ['banh mi cha bong', 'bánh mì ruốc'] },
    { name: 'Bánh su kem mini', basePrice: 30000, unit: 'hộp', brand: 'Lotte Bakery', keywords: ['su kem', 'choux cream'] },
    { name: 'Bánh bông lan trứng muối', basePrice: 65000, unit: 'hộp', brand: 'Lotte Bakery', keywords: ['bong lan trung muoi', 'bông lan chà bông'] }
  ],
  107: [ // Dairy (Sữa & Sản phẩm sữa)
    { name: 'Sữa tươi TH True Milk ít đường 1L', basePrice: 38000, unit: 'hộp', brand: 'TH True Milk', keywords: ['sua tuoi', 'th true milk', 'sữa tươi 1l'] },
    { name: 'Sữa tươi Vinamilk có đường 1L', basePrice: 36000, unit: 'hộp', brand: 'Vinamilk', keywords: ['sua tuoi', 'vinamilk có đường', 'sữa tươi 1l'] },
    { name: 'Sữa chua Vinamilk có đường', basePrice: 28000, unit: 'lốc', brand: 'Vinamilk', keywords: ['sua chua', 'sữa chua vinamilk', 'yogurt'] },
    { name: 'Bơ lạt Anchor 227g', basePrice: 85000, unit: 'cục', brand: 'Anchor', keywords: ['bo lat', 'bơ lạt anchor', 'butter'] },
    { name: 'Phô mai bò cười 8 miếng', basePrice: 42000, unit: 'hộp', brand: 'Con Bò Cười', keywords: ['pho mai', 'phô mai bò cười', 'cheese'] },
    { name: 'Sữa đặc Ông Thọ đỏ', basePrice: 24000, unit: 'lon', brand: 'Vinamilk', keywords: ['sua dac', 'sữa ông thọ', 'sữa đặc'] },
    { name: 'Sữa đậu nành Fami', basePrice: 22000, unit: 'lốc', brand: 'Fami', keywords: ['sua dau nanh', 'sữa fami'] },
    { name: 'Sữa chua uống Proby', basePrice: 26000, unit: 'lốc', brand: 'Vinamilk', keywords: ['sua chua uong', 'proby'] },
    { name: 'Kem whipping Anchor 250ml', basePrice: 75000, unit: 'hộp', brand: 'Anchor', keywords: ['whipping cream', 'kem tươi whipping'] },
    { name: 'Váng sữa Monte Pháp', basePrice: 62000, unit: 'lốc', brand: 'Monte', keywords: ['vang sua', 'váng sữa monte'] }
  ],
  108: [ // Frozen Food (Thực phẩm đông lạnh)
    { name: 'Há cảo tôm Cầu Tre 500g', basePrice: 75000, unit: 'gói', brand: 'Cầu Tre', keywords: ['ha cao', 'há cảo tôm', 'dimsum'] },
    { name: 'Chả giò rế tôm cua Cầu Tre', basePrice: 65000, unit: 'gói', brand: 'Cầu Tre', keywords: ['cha gio', 'chả giò rế', 'nem rán'] },
    { name: 'Cá viên chiên CP', basePrice: 48000, unit: 'gói', brand: 'CP Việt Nam', keywords: ['ca vien', 'cá viên chiên'] },
    { name: 'Bò viên ngon Vissan', basePrice: 72000, unit: 'gói', brand: 'Vissan', keywords: ['bo vien', 'bò viên vissan'] },
    { name: 'Khoai tây chiên McCain 1kg', basePrice: 95000, unit: 'gói', brand: 'McCain', keywords: ['khoai tay chien', 'khoai tây sợi'] },
    { name: 'Xúc xích Đức xông khói CP', basePrice: 58000, unit: 'gói', brand: 'CP Việt Nam', keywords: ['xuc xich', 'xúc xích đức'] },
    { name: 'Lẩu thái thập cẩm đóng khay', basePrice: 129000, unit: 'khay', brand: 'Lotte Foods', keywords: ['lau thai', 'khay lẩu đông lạnh'] },
    { name: 'Bánh bao nhân thịt trứng cút', basePrice: 42000, unit: 'gói', brand: 'Thọ Phát', keywords: ['banh bao', 'bánh bao thọ phát'] },
    { name: 'Pizza hải sản Lotte', basePrice: 85000, unit: 'hộp', brand: 'Lotte Foods', keywords: ['pizza', 'pizza đông lạnh'] },
    { name: 'Sủi cảo nhân thịt Hàn Quốc', basePrice: 88000, unit: 'gói', brand: 'Bibigo', keywords: ['sui cao', 'mandu hàn quốc'] }
  ],
  109: [ // Instant Food (Thực phẩm ăn liền)
    { name: 'Mì gói Hảo Hảo tôm chua cay', basePrice: 4000, unit: 'gói', brand: 'Acecook', keywords: ['mi tom', 'mì hảo hảo', 'mi hao hao', 'mì gói'] },
    { name: 'Mì cốc khoai tây Omachi sườn hầm', basePrice: 10500, unit: 'cốc', brand: 'Masan', keywords: ['mi omachi', 'mì omachi cốc', 'omachi'] },
    { name: 'Cháo sườn ăn liền Gấu Đỏ', basePrice: 4500, unit: 'gói', brand: 'Asia Foods', keywords: ['chao an lien', 'cháo gấu đỏ'] },
    { name: 'Phở bò ăn liền Đệ Nhất', basePrice: 8000, unit: 'gói', brand: 'Acecook', keywords: ['pho an lien', 'phở đệ nhất'] },
    { name: 'Hủ tiếu Nam Vang Nhịp Sống', basePrice: 7500, unit: 'gói', brand: 'Acecook', keywords: ['hu tieu', 'hủ tiếu nhịp sống'] },
    { name: 'Mì trộn Koreno tương đen', basePrice: 12000, unit: 'gói', brand: 'Paldo', keywords: ['mi tron', 'mì tương đen', 'koreno'] },
    { name: 'Bún bò Huế Hằng Nga', basePrice: 8500, unit: 'gói', brand: 'Acecook', keywords: ['bun bo hue', 'bún ăn liền'] },
    { name: 'Mì ăn liền Indomie Mi Goreng', basePrice: 6500, unit: 'gói', brand: 'Indomie', keywords: ['mi indomie', 'mì trộn indomie'] },
    { name: 'Canh rong biển thịt bò ăn liền', basePrice: 15000, unit: 'gói', brand: 'Barona', keywords: ['canh an lien', 'canh rong biển'] },
    { name: 'Cơm sấy chà bông Ninh Bình', basePrice: 28000, unit: 'gói', brand: 'Ninh Bình', keywords: ['com say', 'cơm sấy chà bông'] }
  ],
  110: [ // Rice (Gạo)
    { name: 'Gạo thơm ST25 cao cấp túi 5kg', basePrice: 165000, unit: 'túi', brand: 'Gạo Ông Cua', keywords: ['gao st25', 'gạo st25 ông cua', 'gao thom'] },
    { name: 'Gạo lài sữa dẻo túi 5kg', basePrice: 110000, unit: 'túi', brand: 'Lotte Rice', keywords: ['gao lai sua', 'gạo lài sữa', 'gạo dẻo'] },
    { name: 'Gạo lứt huyết rồng túi 2kg', basePrice: 65000, unit: 'túi', brand: 'Vinh Phát', keywords: ['gao lut', 'gạo lứt huyết rồng', 'gạo giảm cân'] },
    { name: 'Gạo nếp nương Điện Biên 2kg', basePrice: 58000, unit: 'túi', brand: 'Điện Biên', keywords: ['gao nep', 'nếp nương'] },
    { name: 'Gạo Nhật Sushi túi 2kg', basePrice: 72000, unit: 'túi', brand: 'Lotte Import', keywords: ['gao nhat', 'gạo sushi'] },
    { name: 'Gạo thơm Jasmine túi 5kg', basePrice: 95000, unit: 'túi', brand: 'Vinh Phát', keywords: ['gao jasmine', 'gạo thơm lài'] },
    { name: 'Gạo tám thơm Điện Biên 5kg', basePrice: 135000, unit: 'túi', brand: 'Điện Biên', keywords: ['gao tam thom', 'gạo tám thơm'] },
    { name: 'Gạo lứt tím than túi 2kg', basePrice: 78000, unit: 'túi', brand: 'Gạo Ông Cua', keywords: ['gao lut tim', 'lứt tím than'] },
    { name: 'Gạo nàng thơm Chợ Đào 5kg', basePrice: 145000, unit: 'túi', brand: 'Chợ Đào', keywords: ['gao nang thom', 'nàng thơm chợ đào'] },
    { name: 'Gạo hữu cơ sạch Hoa Sữa 2kg', basePrice: 90000, unit: 'túi', brand: 'Hoa Sữa', keywords: ['gao huu co', 'gạo organic'] }
  ],
  111: [ // Noodles (Mì & Bún & Phở)
    { name: 'Bún tươi khô Safoco 300g', basePrice: 18000, unit: 'gói', brand: 'Safoco', keywords: ['bun kho', 'bún tươi khô', 'bun safoco'] },
    { name: 'Bánh phở tươi sấy khô Safoco', basePrice: 22000, unit: 'gói', brand: 'Safoco', keywords: ['banh pho', 'bánh phở khô'] },
    { name: 'Mì trứng cao cấp Safoco 500g', basePrice: 32000, unit: 'gói', brand: 'Safoco', keywords: ['mi trung', 'mì trứng khô', 'mì trứng safoco'] },
    { name: 'Mì Ý Spaghetti Agnesi 500g', basePrice: 48000, unit: 'gói', brand: 'Agnesi', keywords: ['mi y', 'mì spaghetti', 'pasta'] },
    { name: 'Hủ tiếu dai Sa Đéc', basePrice: 25000, unit: 'gói', brand: 'Sa Đéc', keywords: ['hu tieu kho', 'hủ tiếu sa đéc'] },
    { name: 'Miến dong riềng Bắc Kạn', basePrice: 45000, unit: 'gói', brand: 'Bắc Kạn', keywords: ['mien dong', 'miến dong sạch'] },
    { name: 'Nui ống Safoco 400g', basePrice: 24000, unit: 'gói', brand: 'Safoco', keywords: ['nui ong', 'nui safoco'] },
    { name: 'Bún gạo Ba Khánh', basePrice: 15000, unit: 'gói', brand: 'Ba Khánh', keywords: ['bun gao', 'bún gạo khô'] },
    { name: 'Mì Soba Nhật Bản', basePrice: 78000, unit: 'gói', brand: 'Lotte Import', keywords: ['mi soba', 'mì nhật bản'] },
    { name: 'Mì Somyeon Hàn Quốc', basePrice: 65000, unit: 'gói', brand: 'Lotte Import', keywords: ['mi somyeon', 'mì somen hàn quốc'] }
  ],
  112: [ // Beverages (Đồ uống)
    { name: 'Nước ngọt Coca-Cola 1.5L', basePrice: 21000, unit: 'chai', brand: 'Coca-Cola', keywords: ['coca', 'coca cola', 'nước ngọt coca', 'coca 1.5l'] },
    { name: 'Nước ngọt Pepsi lon 320ml', basePrice: 10500, unit: 'lon', brand: 'PepsiCo', keywords: ['pepsi', 'pepsi lon', 'nước ngọt pepsi'] },
    { name: 'Trà xanh không độ 500ml', basePrice: 9000, unit: 'chai', brand: 'THP', keywords: ['tra xanh khong do', 'trà xanh', 'không độ'] },
    { name: 'Nước khoáng La Vie 500ml', basePrice: 5500, unit: 'chai', brand: 'Nestlé', keywords: ['nuoc khoang', 'nước suối la vie', 'lavie'] },
    { name: 'Bia Heineken lon 330ml', basePrice: 21500, unit: 'lon', brand: 'Heineken', keywords: ['bia heineken', 'ken bạc', 'heineken'] },
    { name: 'Nước tăng lực Redbull Thái', basePrice: 12500, unit: 'lon', brand: 'Redbull', keywords: ['bo huc', 'bò húc', 'redbull'] },
    { name: 'Nước ép cam nguyên chất Twister', basePrice: 20000, unit: 'chai', brand: 'PepsiCo', keywords: ['nuoc ep', 'nước cam twister'] },
    { name: 'Trà Oolong Tea Plus 455ml', basePrice: 10000, unit: 'chai', brand: 'Suntory Pepsico', keywords: ['oolong', 'trà ô long tea plus'] },
    { name: 'Sữa đậu nành hạt óc chó Vinamilk', basePrice: 32000, unit: 'lốc', brand: 'Vinamilk', keywords: ['sua dau nanh', 'sữa hạt óc chó'] },
    { name: 'Bia Tiger Crystal lon 330ml', basePrice: 18500, unit: 'lon', brand: 'Tiger', keywords: ['bia tiger', 'tiger bạc'] }
  ],
  113: [ // Cooking Ingredients (Gia vị & Nguyên liệu nấu ăn)
    { name: 'Dầu ăn Simply đậu nành 1L', basePrice: 58000, unit: 'chai', brand: 'Simply', keywords: ['dau an simply', 'dầu đậu nành', 'simply 1l'] },
    { name: 'Dầu thực vật Neptune Light 1L', basePrice: 55000, unit: 'chai', brand: 'Neptune', keywords: ['dau an neptune', 'neptune light'] },
    { name: 'Hạt nêm Knorr thịt thăn ống 400g', basePrice: 42000, unit: 'gói', brand: 'Knorr', keywords: ['hat nem knorr', 'hạt nêm', 'knorr'] },
    { name: 'Bột ngọt Ajinomoto 454g', basePrice: 36000, unit: 'gói', brand: 'Ajinomoto', keywords: ['bot ngot', 'bột ngọt ajinomoto', 'mì chính'] },
    { name: 'Pate gan heo Cầu Tre', basePrice: 35000, unit: 'lon', brand: 'Cầu Tre', keywords: ['pate gan heo', 'pate gan heo cau tre', 'pate', 'pa te'] },
    { name: 'Pate Hạ Long lon 150g', basePrice: 28000, unit: 'lon', brand: 'Hạ Long', keywords: ['pate ha long', 'pate', 'pa te'] },
    { name: 'Pate gan gà thơm béo', basePrice: 40000, unit: 'lon', brand: 'Lotte Foods', keywords: ['pate gan ga', 'pate ga', 'pate', 'pa te'] },
    { name: 'Đường tinh luyện Biên Hòa 1kg', basePrice: 26000, unit: 'gói', brand: 'Biên Hòa', keywords: ['duong cat', 'đường biên hòa'] },
    { name: 'Muối sấy tinh khiết Hải Tiến 1kg', basePrice: 8000, unit: 'gói', brand: 'Hải Tiến', keywords: ['muoi an', 'muối tinh'] },
    { name: 'Dầu hào Maggi tỏi ớt 350g', basePrice: 29000, unit: 'chai', brand: 'Maggi', keywords: ['dau hao maggi', 'dầu hào'] }
  ],
  114: [ // Sauces (Nước sốt & Nước chấm)
    { name: 'Nước tương Chinsu tỏi ớt 250ml', basePrice: 16000, unit: 'chai', brand: 'Chinsu', keywords: ['nuoc tuong chinsu', 'nước tương tỏi ớt', 'xì dầu', 'nuoc tuong'] },
    { name: 'Nước tương Maggi đậm đặc 300ml', basePrice: 22000, unit: 'chai', brand: 'Maggi', keywords: ['nuoc tuong maggi', 'nước tương', 'xì dầu', 'nuoc tuong maggi dam dac'] },
    { name: 'Nước tương Tam Thái Tử Nhị Ca 500ml', basePrice: 18000, unit: 'chai', brand: 'Tam Thái Tử', keywords: ['nuoc tuong tam thai tu', 'nước tương', 'xì dầu', 'tam thai tu'] },
    { name: 'Nước mắm Nam Ngư Đệ Nhị 900ml', basePrice: 35000, unit: 'chai', brand: 'Nam Ngư', keywords: ['nuoc mam nam ngu', 'nước mắm', 'nam ngư'] },
    { name: 'Nước mắm Chin-su Hương Cá Hồi', basePrice: 45000, unit: 'chai', brand: 'Chinsu', keywords: ['nuoc mam chinsu', 'nước mắm hương cá hồi'] },
    { name: 'Tương ớt Chinsu siêu cay 250g', basePrice: 15000, unit: 'chai', brand: 'Chinsu', keywords: ['tuong ot chinsu', 'tương ớt', 'siêu cay'] },
    { name: 'Sốt mayonnaise kewpie 130g', basePrice: 34000, unit: 'tuýp', brand: 'Kewpie', keywords: ['sot mayonnaise', 'mayonnaise kewpie', 'sốt trứng gà'] },
    { name: 'Tương cà Chinsu 250g', basePrice: 14000, unit: 'chai', brand: 'Chinsu', keywords: ['tuong ca', 'tương cà chinsu'] },
    { name: 'Nước mắm nhỉ Knorr 43 độ đạm', basePrice: 85000, unit: 'chai', brand: 'Knorr', keywords: ['nuoc mam knorr', 'nước mắm ngon'] },
    { name: 'Sốt lẩu Thái Cholimex', basePrice: 24000, unit: 'chai', brand: 'Cholimex', keywords: ['sot lau thai', 'cholimex'] }
  ],
  115: [ // Snacks (Bánh kẹo & Đồ ăn vặt)
    { name: 'Bánh quy Cosy Marie 136g', basePrice: 18000, unit: 'gói', brand: 'Kinh Đô', keywords: ['banh quy cosy', 'cosy marie', 'bánh quy bơ', 'cosy'] },
    { name: 'Khoai tây lát Lay\'s tự nhiên 95g', basePrice: 22000, unit: 'gói', brand: 'Lay\'s', keywords: ['snack lays', 'khoai tây lát', 'snack'] },
    { name: 'Bánh ChocoPie Orion hộp 12 cái', basePrice: 56000, unit: 'hộp', brand: 'Orion', keywords: ['chocopie orion', 'bánh chocopie'] },
    { name: 'Bánh bông lan Custas nhân kem dâu', basePrice: 58000, unit: 'hộp', brand: 'Orion', keywords: ['custas orion', 'bánh custas'] },
    { name: 'Kẹo dẻo Haribo Gấu Vàng', basePrice: 26000, unit: 'gói', brand: 'Haribo', keywords: ['keo deo haribo', 'kẹo dẻo gấu'] },
    { name: 'Snack Oishi hành 40g', basePrice: 6000, unit: 'gói', brand: 'Oishi', keywords: ['snack oishi', 'bim bim hành'] },
    { name: 'Hạt điều rang muối Lotte Choice', basePrice: 120000, unit: 'hộp', brand: 'Choice L', keywords: ['hat dieu', 'hạt điều rang muối'] },
    { name: 'Sô cô la sữa M&M', basePrice: 32000, unit: 'gói', brand: 'M&M', keywords: ['socola', 'sô cô la m&m'] },
    { name: 'Rong biển sấy khô Bibigo', basePrice: 28000, unit: 'lốc', brand: 'Bibigo', keywords: ['rong bien say', 'rong biển ăn liền'] },
    { name: 'Khô bò phi lê cay', basePrice: 150000, unit: 'gói', brand: 'Tuyền Ký', keywords: ['kho bo', 'khô bò phi lê'] }
  ],
  116: [ // Household (Hóa mỹ phẩm & Đồ gia dụng)
    { name: 'Bột giặt OMO Comfort túi 3.6kg', basePrice: 185000, unit: 'túi', brand: 'Unilever', keywords: ['bot giat omo', 'omo comfort', 'omo'] },
    { name: 'Nước xả vải Comfort đậm đặc 1.8L', basePrice: 129000, unit: 'túi', brand: 'Unilever', keywords: ['nuoc xa comfort', 'xả comfort'] },
    { name: 'Nước lau sàn Sunlight hương hoa 1L', basePrice: 32000, unit: 'chai', brand: 'Unilever', keywords: ['sunlight lau san', 'nước lau sàn'] },
    { name: 'Nước rửa chén Sunlight Chanh 750g', basePrice: 26000, unit: 'chai', brand: 'Unilever', keywords: ['sunlight rua chen', 'sunlight chanh', 'rửa bát'] },
    { name: 'Nước lau kính Cif 500ml', basePrice: 28000, unit: 'chai', brand: 'Unilever', keywords: ['cif', 'lau kính cif'] },
    { name: 'Khăn giấy rút Lotte Choice 220 tờ', basePrice: 18000, unit: 'gói', brand: 'Choice L', keywords: ['khan giay', 'khăn giấy rút'] },
    { name: 'Nước tẩy bồn cầu Vim diệt khuẩn', basePrice: 35000, unit: 'chai', brand: 'Unilever', keywords: ['vim', 'tẩy bồn cầu vim'] },
    { name: 'Nước rửa tay Lifebuoy bảo vệ 500g', basePrice: 68000, unit: 'chai', brand: 'Unilever', keywords: ['rua tay lifebuoy', 'lifebuoy bảo vệ'] },
    { name: 'Túi rác đen tự hủy sinh học Lotte', basePrice: 42000, unit: 'cuộn', brand: 'Choice L', keywords: ['tui rac', 'túi rác tự hủy'] },
    { name: 'Nước lau nhà vệ sinh Gift', basePrice: 30000, unit: 'chai', brand: 'Gift', keywords: ['gift', 'lau sàn gift'] }
  ],
  117: [ // Personal Care (Chăm sóc cá nhân)
    { name: 'Dầu gội Lifebuoy tóc dày 640g', basePrice: 110000, unit: 'chai', brand: 'Unilever', keywords: ['dau goi lifebuoy', 'lifebuoy shampoo'] },
    { name: 'Sữa tắm Pantene mềm mượt 650ml', basePrice: 135000, unit: 'chai', brand: 'P&G', keywords: ['sua tam', 'dầu gội pantene', 'pantene'] },
    { name: 'Kem đánh răng Colgate ngừa sâu răng', basePrice: 32000, unit: 'hộp', brand: 'Colgate', keywords: ['kem danh rang', 'colgate'] },
    { name: 'Bàn chải đánh răng Colgate SlimSoft', basePrice: 45000, unit: 'cái', brand: 'Colgate', keywords: ['ban chai', 'bàn chải colgate'] },
    { name: 'Sữa rửa mặt Pond\'s trắng hồng 100g', basePrice: 75000, unit: 'tuýp', brand: 'Unilever', keywords: ['sua rua mat', 'pond\'s'] },
    { name: 'Nước súc miệng Listerine Cool Mint', basePrice: 85000, unit: 'chai', brand: 'Johnson & Johnson', keywords: ['listerine', 'nước súc miệng'] },
    { name: 'Bông tẩy trang Lotte Choice 100 miếng', basePrice: 28000, unit: 'gói', brand: 'Choice L', keywords: ['bong tay trang', 'tẩy trang'] },
    { name: 'Dầu xả Dove phục hồi hư tổn', basePrice: 125000, unit: 'chai', brand: 'Unilever', keywords: ['dau xa dove', 'dove'] },
    { name: 'Lăn khử mùi X-Men mạnh mẽ', basePrice: 49000, unit: 'chai', brand: 'X-Men', keywords: ['lan khu mui', 'xmen'] },
    { name: 'Sữa tắm dưỡng ẩm Dove 500g', basePrice: 115000, unit: 'chai', brand: 'Unilever', keywords: ['sua tam dove', 'dove shower'] }
  ]
};

// 30 suppliers
const suppliersData = [
  { name: 'Vinamilk', code: 'SUP-VINAMILK', email: 'sales@vinamilk.com.vn', phone: '02854155555', address: '10 Tân Trào, Quận 7, TP. HCM', tax_code: '0300588569' },
  { name: 'TH True Milk', code: 'SUP-THMILK', email: 'info@thmilk.vn', phone: '1800545440', address: 'Nghĩa Đàn, Nghệ An', tax_code: '2901174360' },
  { name: 'Masan Consumer', code: 'SUP-MASAN', email: 'info@masangroup.com', phone: '02862563862', address: 'Nguyễn Huệ, Quận 1, TP. HCM', tax_code: '0305535815' },
  { name: 'Acecook Việt Nam', code: 'SUP-ACECOOK', email: 'sales@acecook.com.vn', phone: '02838154064', address: 'Tân Phú, TP. HCM', tax_code: '0300619894' },
  { name: 'CP Việt Nam', code: 'SUP-CP', email: 'sales@cp.com.vn', phone: '02513836251', address: 'KCN Biên Hòa 2, Đồng Nai', tax_code: '3600195536' },
  { name: 'Vissan', code: 'SUP-VISSAN', email: 'vissan@hcm.fpt.vn', phone: '02838412610', address: 'Nơ Trang Long, Bình Thạnh, TP. HCM', tax_code: '0300105749' },
  { name: 'Cầu Tre', code: 'SUP-CAUTRE', email: 'sales@cautre.com.vn', phone: '02839612543', address: 'Quận 11, TP. HCM', tax_code: '0300481234' },
  { name: 'Dabaco', code: 'SUP-DABACO', email: 'info@dabaco.com.vn', phone: '02223826077', address: 'Lý Thái Tổ, Bắc Ninh', tax_code: '2300115386' },
  { name: 'Neptune Oils', code: 'SUP-NEPTUNE', email: 'contact@calofic.com.vn', phone: '02033841201', address: 'KCN Cái Lân, Quảng Ninh', tax_code: '5700101345' },
  { name: 'Simply Oils', code: 'SUP-SIMPLY', email: 'sales@simply.com.vn', phone: '02838223654', address: 'Bến Nghé, Quận 1, TP. HCM', tax_code: '0302324213' },
  { name: 'Nestlé Việt Nam', code: 'SUP-NESTLE', email: 'consumer.services@vn.nestle.com', phone: '02839113700', address: 'KCN Biên Hòa 2, Đồng Nai', tax_code: '3600234151' },
  { name: 'Coca-Cola Việt Nam', code: 'SUP-COCA', email: 'info@coca-cola.com.vn', phone: '02838961000', address: 'Xa Lộ Hà Nội, Thủ Đức, TP. HCM', tax_code: '0300742130' },
  { name: 'PepsiCo Việt Nam', code: 'SUP-PEPSI', email: 'contact@suntorypepsico.vn', phone: '02838219434', address: 'Lê Duẩn, Quận 1, TP. HCM', tax_code: '0312061230' },
  { name: 'Unilever Việt Nam', code: 'SUP-UNILEVER', email: 'unilever.vn@unilever.com', phone: '02854135686', address: 'Khu đô thị Phú Mỹ Hưng, Quận 7, TP. HCM', tax_code: '0301435850' },
  { name: 'Ajinomoto Việt Nam', code: 'SUP-AJINOMOTO', email: 'sales@ajinomoto.com.vn', phone: '02838221567', address: 'Biên Hòa, Đồng Nai', tax_code: '3600251341' },
  { name: 'Orion Food Vina', code: 'SUP-ORION', email: 'orion@orion.com.vn', phone: '02743512999', address: 'KCN Mỹ Phước, Bình Dương', tax_code: '3700685210' },
  { name: 'Kinh Đô Mondelez', code: 'SUP-KINHDO', email: 'sales@mdlz.com', phone: '02838270838', address: 'KCN Việt Nam - Singapore, Bình Dương', tax_code: '3700343210' },
  { name: 'Bibica', code: 'SUP-BIBICA', email: 'bibica@bibica.com.vn', phone: '02839717910', address: 'Lý Thường Kiệt, Tân Bình, TP. HCM', tax_code: '0301845620' },
  { name: 'Lotte Foods Việt Nam', code: 'SUP-LOTTEFOOD', email: 'lottefoods@lotte.vn', phone: '02838244000', address: 'Lê Thánh Tôn, Quận 1, TP. HCM', tax_code: '0310243120' },
  { name: 'Ba Huân Corp', code: 'SUP-BAHUAN', email: 'bahuanco@bahuan.vn', phone: '02838542456', address: 'Chợ Lớn, Quận 5, TP. HCM', tax_code: '0302834151' },
  { name: 'Thọ Phát Bakery', code: 'SUP-THOPHAT', email: 'banhbao@thophat.com', phone: '02839250898', address: 'Nguyễn Tri Phương, Quận 5, TP. HCM', tax_code: '0304325410' },
  { name: 'Vinh Phát Rice', code: 'SUP-VINHPHAT', email: 'rice@vinhphat.com', phone: '02838323671', address: 'Quận 4, TP. HCM', tax_code: '0301124312' },
  { name: 'Safoco Food', code: 'SUP-SAFOCO', email: 'safocofood@safoco.com.vn', phone: '02838940866', address: 'Gò Vấp, TP. HCM', tax_code: '0301438965' },
  { name: 'Trung Nguyên Coffee', code: 'SUP-TRUNGNGUYEN', email: 'sales@trungnguyen.com.vn', phone: '02839251859', address: 'Nguyễn Đình Chiểu, Quận 3, TP. HCM', tax_code: '0303588965' },
  { name: 'Heineken Việt Nam', code: 'SUP-HEINEKEN', email: 'sales.hnk@heineken.com', phone: '02838224755', address: 'Tòa nhà Vietcombank, Quận 1, TP. HCM', tax_code: '0300742131' },
  { name: 'Kewpie Việt Nam', code: 'SUP-KEWPIE', email: 'sales@kewpie.com.vn', phone: '02743767980', address: 'KCN VSIP, Bình Dương', tax_code: '3701235123' },
  { name: 'Cholimex Food', code: 'SUP-CHOLIMEX', email: 'cholimexfood@cholimex.com.vn', phone: '02837653389', address: 'KCN Vĩnh Lộc, Bình Chánh, TP. HCM', tax_code: '0301449830' },
  { name: 'Barona Foods', code: 'SUP-BARONA', email: 'info@barona.vn', phone: '02839151060', address: 'Quận 3, TP. HCM', tax_code: '0310243152' },
  { name: 'Dalat Gap Farm', code: 'SUP-DALATGAP', email: 'organic@dalatgap.vn', phone: '02633831201', address: 'Thành phố Đà Lạt, Lâm Đồng', tax_code: '5800243120' },
  { name: 'Ba Khánh Rice & Noodles', code: 'SUP-BAKHANH', email: 'bakhanh@bakhanh.com', phone: '02723821213', address: 'Tân An, Long An', tax_code: '1100243120' }
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database successfully.');

    // 1. Clear database collections (except User & Recipe to keep admin/audited data)
    console.log('Clearing old collections...');
    await Promise.all([
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
      BranchProduct.deleteMany({}),
      ImportOrder.deleteMany({}),
      ImportReceipt.deleteMany({}),
      InventoryBatch.deleteMany({}),
      StockMovement.deleteMany({}),
      AuditLog.deleteMany({ entity: { $in: ['supplier', 'product', 'branch_product', 'import_order', 'import_receipt', 'inventory_batch'] } })
    ]);
    console.log('Collections cleared.');

    // 2. Ensure branches exist in DB
    console.log('Ensuring target branches...');
    await Branch.findOneAndUpdate(
      { _id: BRANCH_Q7_ID },
      { name: 'Lotte Mart Quận 7', address: '469 Nguyễn Hữu Thọ, Tân Hưng, Quận 7', city: 'Hồ Chí Minh', is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_GV_ID },
      { name: 'Lotte Mart Gò Vấp', address: '242 Nguyễn Văn Lượng, Phường 10, Gò Vấp', city: 'Hồ Chí Minh', is_active: true },
      { upsert: true }
    );
    console.log('Branches ensured.');

    // 3. Insert Suppliers
    console.log('Inserting suppliers...');
    const seededSuppliers = await Supplier.insertMany(
      suppliersData.map((s, idx) => ({
        _id: makeId(200 + idx),
        ...s,
        contact_name: `${s.name} Sales Rep`,
        is_active: true
      }))
    );
    console.log(`Seeded ${seededSuppliers.length} suppliers.`);

    // 4. Insert Categories
    console.log('Inserting categories...');
    const seededCategories = await Category.insertMany(
      categoriesConfig.map(c => ({
        _id: makeId(c.id),
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        description: c.description,
        sort_order: c.id,
        display_order: c.id,
        is_active: true
      }))
    );
    console.log(`Seeded ${seededCategories.length} categories.`);

    // 5. Generate and Insert Products
    console.log('Generating 510+ unique products (30 per category)...');
    const productsToInsert = [];
    const productsByCategory = {}; // to easily select items for POs

    for (const cat of seededCategories) {
      const catIdNum = Number(cat.sort_order);
      const cores = coreProductsData[catIdNum] || [];
      productsByCategory[cat._id.toString()] = [];

      // We have 10 cores per category. We generate 3 variants for each core to get 30 products!
      let productIndexInCat = 0;
      for (const core of cores) {
        const variants = [
          { suffix: '', priceMult: 1.0, suffixName: '', origin: 'Việt Nam' },
          { suffix: ' - Hữu cơ Organic', priceMult: 1.5, suffixName: 'organic', origin: 'Việt Nam (Đà Lạt)' },
          { suffix: ' - Nhập khẩu Premium', priceMult: 2.2, suffixName: 'imported', origin: 'Nhật Bản' }
        ];

        // Ensure we hit exactly 30 products per category
        for (const variant of variants) {
          productIndexInCat++;
          const finalIdNum = catIdNum * 1000 + productIndexInCat;
          const globalId = makeId(finalIdNum);

          const variantName = `${core.name}${variant.suffix}`;
          const finalPrice = Math.round((core.basePrice * variant.priceMult) / 1000) * 1000;
          const finalSku = `SKU-${catIdNum}-${productIndexInCat.toString().padStart(2, '0')}`;
          const finalBarcode = `893000${catIdNum}${productIndexInCat.toString().padStart(2, '0')}`;

          const keywords = [...(core.keywords || [])];
          keywords.push(variantName.toLowerCase());
          if (variant.suffixName) {
            keywords.push(variant.suffixName);
            keywords.push(`${core.name.toLowerCase()} ${variant.suffixName}`);
          }

          const shortCode = generateShortCode(globalId);
          const slug = buildProductSlug(variantName, globalId, shortCode);

          const productDoc = {
            _id: globalId,
            name: variantName,
            slug: slug,
            short_code: shortCode,
            description: `${variantName} chất lượng cao, cung cấp dinh dưỡng tối ưu và cam kết nguồn gốc xuất xứ rõ ràng.`,
            short_description: `${variantName} tại siêu thị Lotte Mart.`,
            category_id: cat._id,
            brand: core.brand,
            origin: variant.origin,
            origin_country: variant.origin.includes('Nhật') ? 'Nhật Bản' : 'Việt Nam',
            unit: core.unit,
            weight: core.unit === 'kg' ? '1kg' : '300g',
            barcode: finalBarcode,
            sku: finalSku,
            price: finalPrice,
            original_price: finalPrice,
            discount_percent: 0,
            images: [`/assets/products/${cat.slug}.jpg`],
            thumbnail: `/assets/products/${cat.slug}.jpg`,
            tags: variant.suffixName ? [variant.suffixName, cat.name] : [cat.name],
            is_active: true,
            rating: 4.0 + Math.random() * 1.0,
            review_count: Math.floor(Math.random() * 100) + 10,
            sold_count: Math.floor(Math.random() * 500) + 50,
            vat_included: true
          };

          productsToInsert.push(productDoc);
          productsByCategory[cat._id.toString()].push(productDoc);
        }
      }
    }

    const seededProducts = await Product.insertMany(productsToInsert);
    console.log(`Seeded ${seededProducts.length} global products.`);

    // 6. Generate Branch Products (BranchProduct)
    console.log('Generating branch product catalog (Quận 7 and Gò Vấp)...');
    const branchProductsToInsert = [];
    const bpByBranch = {
      [BRANCH_Q7_ID.toString()]: [],
      [BRANCH_GV_ID.toString()]: []
    };

    let bpIdIndex = 10000;
    for (const prod of seededProducts) {
      // 1. Quận 7 Branch Product (Imported, Organic, Premium focus)
      bpIdIndex++;
      const bpQ7Id = makeId(bpIdIndex);
      const isOrganicOrImported = prod.name.includes('Organic') || prod.name.includes('Nhập khẩu') || prod.name.includes('Premium');
      
      // Quận 7 pricing: 15% mark up, higher stock for premium/imported items
      const q7Price = Math.round((prod.price * 1.15) / 1000) * 1000;
      const q7Stock = isOrganicOrImported ? 120 : 50;

      const bpQ7 = {
        _id: bpQ7Id,
        product_id: prod._id,
        branch_id: BRANCH_Q7_ID,
        price: q7Price,
        original_price: q7Price,
        discount_percent: isOrganicOrImported ? 10 : 0, // premium promotions
        stock: q7Stock,
        min_stock: 10,
        is_available: true,
        promotion_tag: isOrganicOrImported ? 'Hot Import' : ''
      };
      branchProductsToInsert.push(bpQ7);
      bpByBranch[BRANCH_Q7_ID.toString()].push({
        ...bpQ7,
        product_name: prod.name,
        sku: prod.sku
      });

      // 2. Gò Vấp Branch Product (Popular, Family, Budget focus)
      bpIdIndex++;
      const bpGVId = makeId(bpIdIndex);
      
      // Gò Vấp pricing: 10% mark down, higher stock for popular items
      const gvPrice = Math.round((prod.price * 0.9) / 1000) * 1000;
      const gvStock = isOrganicOrImported ? 20 : 180; // more stock for popular, standard items

      const bpGV = {
        _id: bpGVId,
        product_id: prod._id,
        branch_id: BRANCH_GV_ID,
        price: gvPrice,
        original_price: gvPrice,
        discount_percent: !isOrganicOrImported ? 15 : 0, // budget promotions
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: !isOrganicOrImported ? 'Giá Tốt' : ''
      };
      branchProductsToInsert.push(bpGV);
      bpByBranch[BRANCH_GV_ID.toString()].push({
        ...bpGV,
        product_name: prod.name,
        sku: prod.sku
      });
    }

    const seededBranchProducts = await BranchProduct.insertMany(branchProductsToInsert);
    console.log(`Seeded ${seededBranchProducts.length} branch product options.`);

    // 7. Generate Purchase Orders (ImportOrder) & Goods Receipts (ImportReceipt) & Inventory Batches (InventoryBatch) & Stock Movements
    console.log('Generating ERP pipeline records (POs, Receipts, Batches, Stock Movements)...');
    
    const importOrdersToInsert = [];
    const importReceiptsToInsert = [];
    const inventoryBatchesToInsert = [];
    const stockMovementsToInsert = [];
    const auditLogsToInsert = [];

    // Helper maps
    const bpMapQ7 = bpByBranch[BRANCH_Q7_ID.toString()];
    const bpMapGV = bpByBranch[BRANCH_GV_ID.toString()];

    // Generate 200 Purchase Orders (100 per branch)
    let erpIndex = 0;
    
    // We will distribute the POs among suppliers
    for (let branchNum = 1; branchNum <= 2; branchNum++) {
      const branchId = branchNum === 1 ? BRANCH_Q7_ID : BRANCH_GV_ID;
      const bpList = branchNum === 1 ? bpMapQ7 : bpMapGV;

      for (let poNum = 1; poNum <= 110; poNum++) {
        erpIndex++;
        const poId = makeId(20000 + erpIndex);
        const receiptId = makeId(30000 + erpIndex);
        const poCode = `PO-${branchNum === 1 ? 'Q7' : 'GV'}-${poNum.toString().padStart(4, '0')}`;
        const rcCode = `GR-${branchNum === 1 ? 'Q7' : 'GV'}-${poNum.toString().padStart(4, '0')}`;

        const supplier = seededSuppliers[(erpIndex) % seededSuppliers.length];
        
        // Pick 5 random items from this branch product list
        const poItems = [];
        const receiptItems = [];
        let totalAmount = 0;

        const startIndex = (poNum * 5) % (bpList.length - 10);
        for (let i = 0; i < 5; i++) {
          const bpItem = bpList[startIndex + i];
          const qtyOrdered = 100;
          const unitCost = Math.round((bpItem.price * 0.7) / 100) * 100;
          const subtotal = qtyOrdered * unitCost;
          totalAmount += subtotal;

          // PO Item
          poItems.push({
            product_id: bpItem.product_id,
            branch_product_id: bpItem._id,
            sku: bpItem.sku,
            product_name: bpItem.product_name,
            quantity_ordered: qtyOrdered,
            quantity_received: poNum <= 105 ? qtyOrdered : 0,
            unit_cost: unitCost,
            subtotal: subtotal
          });

          // Receipt Item (if PO is received)
          if (poNum <= 105) {
            receiptItems.push({
              product_id: bpItem.product_id,
              branch_product_id: bpItem._id,
              product_name: bpItem.product_name,
              quantity_received: qtyOrdered,
              unit_cost: unitCost,
              subtotal: subtotal,
              batch_code: `BAT-${poCode}-${i}`,
              expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
            });

            // Inventory Batch
            const batchDoc = {
              _id: makeId(400000 + erpIndex * 10 + i),
              branch_product_id: bpItem._id,
              batch_code: `BAT-${poCode}-${i}`,
              quantity: qtyOrdered,
              exp_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              manufacture_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              received_date: new Date(),
              cost_price: unitCost,
              supplier_id: supplier._id,
              supplier_name: supplier.name,
              purchase_order_id: poId,
              import_receipt_id: receiptId,
              note: `Automated seeding batch for ${bpItem.product_name}`
            };
            inventoryBatchesToInsert.push(batchDoc);

            // Stock Movement
            stockMovementsToInsert.push({
              _id: makeId(500000 + erpIndex * 10 + i),
              branch_id: branchId,
              branch_name: branchNum === 1 ? 'Lotte Mart Quận 7' : 'Lotte Mart Gò Vấp',
              product_id: bpItem.product_id,
              product_name: bpItem.product_name,
              branch_product_id: bpItem._id,
              batch_code: `BAT-${poCode}-${i}`,
              movement_type: 'inbound',
              quantity: qtyOrdered,
              before_stock: bpItem.stock - qtyOrdered > 0 ? bpItem.stock - qtyOrdered : 0,
              after_stock: bpItem.stock,
              reference_type: 'import_receipt',
              reference_id: receiptId,
              note: `Received batch via Goods Receipt ${rcCode}`
            });

            // Audit Log
            auditLogsToInsert.push({
              _id: makeId(600000 + erpIndex * 10 + i),
              user_name: 'System',
              action: 'CREATE',
              entity: 'inventory_batch',
              entity_id: batchDoc._id,
              details: { old_quantity: 0, new_quantity: qtyOrdered, batch_code: batchDoc.batch_code }
            });
          }
        }

        // PO Status distribution
        let status = 'draft';
        if (poNum <= 95) status = 'received'; // fully received
        else if (poNum <= 105) status = 'partially_received';
        else if (poNum <= 108) status = 'ordered'; // pending delivery
        else status = 'cancelled';

        // Insert ImportOrder
        importOrdersToInsert.push({
          _id: poId,
          order_code: poCode,
          supplier_id: supplier._id,
          branch_id: branchId,
          status: status,
          expected_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          ordered_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          received_date: status === 'received' ? new Date() : null,
          items: poItems,
          total_amount: totalAmount,
          total_received_amount: status === 'received' ? totalAmount : 0,
          note: `Auto-generated procurement order for testing.`,
          timeline: [
            { status: 'draft', note: 'Created PO draft', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { status: 'ordered', note: 'Approved by Purchasing Manager', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
          ]
        });

        // Insert Goods Receipt if received or partially received
        if (poNum <= 105) {
          importReceiptsToInsert.push({
            _id: receiptId,
            receipt_code: rcCode,
            import_order_id: poId,
            supplier_id: supplier._id,
            branch_id: branchId,
            received_date: new Date(),
            status: 'confirmed',
            items: receiptItems,
            total_amount: totalAmount,
            note: `Auto-generated goods receipt for PO code ${poCode}`
          });
        }
      }
    }

    console.log('Bulk writing ERP database objects...');
    await ImportOrder.insertMany(importOrdersToInsert);
    console.log(`Seeded ${importOrdersToInsert.length} Import Orders.`);

    await ImportReceipt.insertMany(importReceiptsToInsert);
    console.log(`Seeded ${importReceiptsToInsert.length} Import Receipts.`);

    await InventoryBatch.insertMany(inventoryBatchesToInsert);
    console.log(`Seeded ${inventoryBatchesToInsert.length} Inventory Batches.`);

    await StockMovement.insertMany(stockMovementsToInsert);
    console.log(`Seeded ${stockMovementsToInsert.length} Stock Movements.`);

    await AuditLog.insertMany(auditLogsToInsert);
    console.log(`Seeded ${auditLogsToInsert.length} Audit Logs.`);

    console.log('\n==================================================');
    console.log('✅ SEEDING COMPLETE WITH ENTERPRISE DATA INTEGRITY!');
    console.log('==================================================');
    console.log(`- Suppliers: ${seededSuppliers.length}`);
    console.log(`- Global Products: ${seededProducts.length}`);
    console.log(`- Branch Products: ${seededBranchProducts.length} (GV: ${bpMapGV.length}, Q7: ${bpMapQ7.length})`);
    console.log(`- Purchase Orders: ${importOrdersToInsert.length}`);
    console.log(`- Goods Receipts: ${importReceiptsToInsert.length}`);
    console.log(`- Inventory Batches: ${inventoryBatchesToInsert.length}`);
    console.log(`- Stock Movements: ${stockMovementsToInsert.length}`);
    console.log(`- Audit Logs: ${auditLogsToInsert.length}`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
};

run().catch(console.error);
