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
const BRANCH_Q7_ID = makeId(1); // Bách hóa XANH Nguyễn Thị Thập
const BRANCH_GV_ID = makeId(2); // Bách hóa XANH Thống Nhất
const BRANCH_BD_ID = makeId(3); // Bách hóa XANH Giang Văn Minh
const BRANCH_DN_ID = makeId(4); // Bách hóa XANH Trưng Nữ Vương
const BRANCH_TD1_ID = makeId(5); // Bách hóa XANH Võ Văn Ngân
const BRANCH_TD2_ID = makeId(6); // Bách hóa XANH Lê Văn Việt
const BRANCH_TD3_ID = makeId(7); // Bách hóa XANH Kha Vạn Cân
const BRANCH_Q12_ID = makeId(8); // Bách hóa XANH Nguyễn Ảnh Thủ
const BRANCH_Q10_ID = makeId(9); // Bách hóa XANH CMT8

// Categories Configuration
const categoriesConfig = [
  { id: 101, name: 'Nước ngọt & Nước giải khát', slug: 'nuoc-ngot-giai-khat', icon: 'Wine', description: 'Nước ngọt, nước giải khát các loại' },
  { id: 102, name: 'Nước lọc & Nước khoáng', slug: 'nuoc-loc-khoang', icon: 'Droplet', description: 'Nước lọc tinh khiết và nước khoáng thiên nhiên' },
  { id: 103, name: 'Trà & Cà phê đóng chai', slug: 'tra-ca-phe-dong-chai', icon: 'Coffee', description: 'Trà và cà phê đóng chai tiện lợi' },
  { id: 104, name: 'Nước ép & Sinh tố trái cây', slug: 'nuoc-ep-trai-cay', icon: 'Apple', description: 'Nước ép trái cây tươi và sinh tố thơm ngon' },
  { id: 105, name: 'Bia & Đồ uống có cồn', slug: 'bia-nuoc-len-men', icon: 'Beer', description: 'Bia và các đồ uống có cồn nhẹ' }
];

// Core products template for generating 30 products per category
const coreProductsData = {
  101: [ // Nước ngọt & Nước giải khát
    { name: 'Nước ngọt Coca-Cola', basePrice: 10000, unit: 'lon', brand: 'Coca-Cola', keywords: ['coca', 'coca cola', 'nước ngọt'] },
    { name: 'Nước ngọt Pepsi', basePrice: 9500, unit: 'lon', brand: 'PepsiCo', keywords: ['pepsi', 'pepsi lon', 'nước ngọt'] },
    { name: 'Nước ngọt 7Up vị chanh', basePrice: 9500, unit: 'lon', brand: 'PepsiCo', keywords: ['7up', 'nước ngọt chanh'] },
    { name: 'Nước ngọt Sprite', basePrice: 10000, unit: 'lon', brand: 'Coca-Cola', keywords: ['sprite', 'nước ngọt chanh'] },
    { name: 'Nước ngọt Mirinda hương cam', basePrice: 9500, unit: 'lon', brand: 'PepsiCo', keywords: ['mirinda', 'mirinda cam'] },
    { name: 'Nước ngọt Fanta hương xá xị', basePrice: 10000, unit: 'lon', brand: 'Coca-Cola', keywords: ['fanta', 'xa xi'] },
    { name: 'Nước tăng lực Redbull', basePrice: 12000, unit: 'lon', brand: 'Redbull', keywords: ['redbull', 'bò húc', 'tang luc'] },
    { name: 'Nước tăng lực Sting dâu', basePrice: 10000, unit: 'chai', brand: 'PepsiCo', keywords: ['sting', 'sting dau', 'nước ngọt'] },
    { name: 'Nước bù khoáng Revive', basePrice: 9000, unit: 'chai', brand: 'PepsiCo', keywords: ['revive', 'bu khoang'] },
    { name: 'Nước ngọt Schweppes Tonic', basePrice: 11000, unit: 'lon', brand: 'Coca-Cola', keywords: ['schweppes', 'tonic', 'soda'] }
  ],
  102: [ // Nước lọc & Nước khoáng
    { name: 'Nước khoáng La Vie', basePrice: 5000, unit: 'chai', brand: 'Nestlé', keywords: ['lavie', 'la vie', 'nuoc khoang'] },
    { name: 'Nước tinh khiết Aquafina', basePrice: 4500, unit: 'chai', brand: 'PepsiCo', keywords: ['aquafina', 'nuoc tinh khiet'] },
    { name: 'Nước khoáng Vĩnh Hảo', basePrice: 5500, unit: 'chai', brand: 'Vĩnh Hảo', keywords: ['vinh hao', 'vĩnh hảo', 'nuoc khoang'] },
    { name: 'Nước khoáng có ga Vĩnh Hảo', basePrice: 8000, unit: 'chai', brand: 'Vĩnh Hảo', keywords: ['vinh hao ga', 'nước khoáng ga'] },
    { name: 'Nước tinh khiết Dasani', basePrice: 4500, unit: 'chai', brand: 'Coca-Cola', keywords: ['dasani', 'nuoc loc'] },
    { name: 'Nước khoáng kiềm thiên nhiên Vikoda', basePrice: 6500, unit: 'chai', brand: 'Vikoda', keywords: ['vikoda', 'nuoc kiem'] },
    { name: 'Nước tinh khiết Sapuwa', basePrice: 5000, unit: 'chai', brand: 'Sapuwa', keywords: ['sapuwa', 'nuoc loc'] },
    { name: 'Nước khoáng Evian', basePrice: 25000, unit: 'chai', brand: 'Evian', keywords: ['evian', 'nuoc khoang phap'] },
    { name: 'Nước khoáng kiềm Ion Life', basePrice: 7000, unit: 'chai', brand: 'Ion Life', keywords: ['ion life', 'nuoc ion'] },
    { name: 'Nước tinh khiết TH True Water', basePrice: 5000, unit: 'chai', brand: 'TH True Milk', keywords: ['th true water', 'nuoc loc th'] }
  ],
  103: [ // Trà & Cà phê đóng chai
    { name: 'Trà xanh Không Độ', basePrice: 9000, unit: 'chai', brand: 'THP', keywords: ['khong do', 'tra xanh'] },
    { name: 'Trà Ô Long Tea Plus', basePrice: 10000, unit: 'chai', brand: 'PepsiCo', keywords: ['tea plus', 'oolong', 'tra o long'] },
    { name: 'Trà đen C2 hương chanh', basePrice: 8500, unit: 'chai', brand: 'URC', keywords: ['c2', 'tra c2'] },
    { name: 'Cà phê sữa Highlands Coffee', basePrice: 15000, unit: 'lon', brand: 'Highlands', keywords: ['highlands', 'ca phe sua'] },
    { name: 'Cà phê sữa đá Nescafé', basePrice: 14000, unit: 'lon', brand: 'Nestlé', keywords: ['nescafe', 'ca phe lon'] },
    { name: 'Trà sữa Kirin Latte', basePrice: 12000, unit: 'chai', brand: 'Kirin', keywords: ['kirin', 'tra sua'] },
    { name: 'Trà bí đao Wonderfarm', basePrice: 8000, unit: 'lon', brand: 'Wonderfarm', keywords: ['wonderfarm', 'tra bi dao'] },
    { name: 'Cà phê đen Highlands Coffee', basePrice: 15000, unit: 'lon', brand: 'Highlands', keywords: ['highlands den', 'ca phe den'] },
    { name: 'Trà sen vàng đóng chai', basePrice: 11000, unit: 'chai', brand: 'TH True Milk', keywords: ['tra sen', 'th true tea'] },
    { name: 'Trà xanh đóng chai TH True Tea', basePrice: 9000, unit: 'chai', brand: 'TH True Milk', keywords: ['th true tea', 'tra xanh th'] }
  ],
  104: [ // Nước ép & Sinh tố trái cây
    { name: 'Nước ép cam Twister', basePrice: 18000, unit: 'chai', brand: 'PepsiCo', keywords: ['twister', 'nuoc ep cam'] },
    { name: 'Nước ép táo Vfresh', basePrice: 42000, unit: 'hộp', brand: 'Vinamilk', keywords: ['vfresh', 'nuoc ep tao'] },
    { name: 'Nước ép ổi Vfresh', basePrice: 42000, unit: 'hộp', brand: 'Vinamilk', keywords: ['vfresh oi', 'nuoc ep oi'] },
    { name: 'Nước ép thơm Vfresh', basePrice: 42000, unit: 'hộp', brand: 'Vinamilk', keywords: ['vfresh thom', 'nuoc ep thom'] },
    { name: 'Nước ép cà chua Vfresh', basePrice: 40000, unit: 'hộp', brand: 'Vinamilk', keywords: ['vfresh ca chua', 'nuoc ca chua'] },
    { name: 'Sinh tố xoài đóng chai', basePrice: 22000, unit: 'chai', brand: 'Lafresh', keywords: ['sinh to xoai', 'xoai'] },
    { name: 'Sinh tố dâu tây đóng chai', basePrice: 25000, unit: 'chai', brand: 'Lafresh', keywords: ['sinh to dau', 'dau tay'] },
    { name: 'Nước ép nho xanh Ceres', basePrice: 55000, unit: 'hộp', brand: 'Ceres', keywords: ['ceres nho', 'nuoc ep nho'] },
    { name: 'Nước dừa xiêm đóng hộp Cocoxim', basePrice: 16000, unit: 'hộp', brand: 'Cocoxim', keywords: ['cocoxim', 'nuoc dua'] },
    { name: 'Nước nha đam Woongjin Hàn Quốc', basePrice: 32000, unit: 'chai', brand: 'Woongjin', keywords: ['nha dam', 'woongjin'] }
  ],
  105: [ // Bia & Đồ uống có cồn
    { name: 'Bia Heineken Silver', basePrice: 21000, unit: 'lon', brand: 'Heineken', keywords: ['heineken silver', 'ken bac'] },
    { name: 'Bia Tiger Crystal', basePrice: 18500, unit: 'lon', brand: 'Tiger', keywords: ['tiger crystal', 'tiger bac'] },
    { name: 'Bia Saigon Special', basePrice: 15500, unit: 'lon', brand: 'Sabeco', keywords: ['saigon special', 'bia sai gon'] },
    { name: 'Bia 333', basePrice: 13000, unit: 'lon', brand: 'Sabeco', keywords: ['bia 333', 'ba ba ba'] },
    { name: 'Bia Budweiser', basePrice: 22000, unit: 'lon', brand: 'Budweiser', keywords: ['budweiser', 'bia my'] },
    { name: 'Bia Sapporo Premium', basePrice: 23000, unit: 'lon', brand: 'Sapporo', keywords: ['sapporo', 'bia nhat'] },
    { name: 'Nước trái cây lên men Strongbow vị táo', basePrice: 20000, unit: 'chai', brand: 'Strongbow', keywords: ['strongbow', 'cider'] },
    { name: 'Nước trái cây lên men Strongbow dâu', basePrice: 20000, unit: 'chai', brand: 'Strongbow', keywords: ['strongbow dau', 'cider'] },
    { name: 'Rượu Soju Jinro hương mận', basePrice: 65000, unit: 'chai', brand: 'Jinro', keywords: ['soju', 'ruou han quoc'] },
    { name: 'Bia Tiger Lager', basePrice: 17500, unit: 'lon', brand: 'Tiger', keywords: ['tiger nau', 'tiger thuong'] }
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
  { name: 'Bách hóa XANH Foods', code: 'SUP-BHXFOOD', email: 'foods@bachhoaxanh.com', phone: '02838244000', address: 'Lê Thánh Tôn, Quận 1, TP. HCM', tax_code: '0310243120' },
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
      { name: 'Bách hóa XANH Nguyễn Thị Thập', address: '136 Nguyễn Thị Thập, Phường Bình Thuận, Quận 7', city: 'Hồ Chí Minh', phone: '19001908', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.7412, lng: 106.7032 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_GV_ID },
      { name: 'Bách hóa XANH Thống Nhất', address: '542 Thống Nhất, Phường 15, Quận Gò Vấp', city: 'Hồ Chí Minh', phone: '19001909', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.8407, lng: 106.6784 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_BD_ID },
      { name: 'Bách hóa XANH Giang Văn Minh', address: '42 Giang Văn Minh, Phường Kim Mã, Quận Ba Đình', city: 'Hà Nội', phone: '19001910', operating_hours: '08:00 - 22:00', coordinates: { lat: 21.0315, lng: 105.8234 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_DN_ID },
      { name: 'Bách hóa XANH Trưng Nữ Vương', address: '80 Trưng Nữ Vương, Phường Bình Hiên, Quận Hải Châu', city: 'Đà Nẵng', phone: '19001911', operating_hours: '08:00 - 22:00', coordinates: { lat: 16.0594, lng: 108.2198 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_TD1_ID },
      { name: 'Bách hóa XANH Võ Văn Ngân', address: '150 Võ Văn Ngân, Phường Bình Thọ, Thành phố Thủ Đức', city: 'Hồ Chí Minh', phone: '19001912', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.8491, lng: 106.7725 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_TD2_ID },
      { name: 'Bách hóa XANH Lê Văn Việt', address: '220 Lê Văn Việt, Phường Tăng Nhơn Phú B, Thành phố Thủ Đức', city: 'Hồ Chí Minh', phone: '19001913', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.8385, lng: 106.7865 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_TD3_ID },
      { name: 'Bách hóa XANH Kha Vạn Cân', address: '850 Kha Vạn Cân, Phường Linh Chiểu, Thành phố Thủ Đức', city: 'Hồ Chí Minh', phone: '19001914', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.8524, lng: 106.7621 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_Q12_ID },
      { name: 'Bách hóa XANH Nguyễn Ảnh Thủ', address: '12/5 Nguyễn Ảnh Thủ, Phường Hiệp Thành, Quận 12', city: 'Hồ Chí Minh', phone: '19001915', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.8795, lng: 106.6348 }, is_active: true },
      { upsert: true }
    );
    await Branch.findOneAndUpdate(
      { _id: BRANCH_Q10_ID },
      { name: 'Bách hóa XANH CMT8', address: '400 Cách Mạng Tháng Tám, Phường 11, Quận 10', city: 'Hồ Chí Minh', phone: '19001916', operating_hours: '08:00 - 22:00', coordinates: { lat: 10.7831, lng: 106.6713 }, is_active: true },
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
    console.log('Generating 150+ unique products (30 per category)...');
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
            short_description: `${variantName} tại siêu thị Bách hóa XANH.`,
            category_id: cat._id,
            brand: core.brand,
            origin: variant.origin,
            origin_country: variant.origin.includes('Nhật') ? 'Nhật Bản' : 'Việt Nam',
            unit: core.unit,
            weight: core.unit === 'kg' ? '1kg' : (core.unit === 'lon' ? '330ml' : (core.unit === 'chai' ? '500ml' : '1L')),
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
    console.log('Generating branch product catalog (Quận 7, Gò Vấp, Ba Đình, Đà Nẵng)...');
    const branchProductsToInsert = [];
    const bpByBranch = {
      [BRANCH_Q7_ID.toString()]: [],
      [BRANCH_GV_ID.toString()]: [],
      [BRANCH_BD_ID.toString()]: [],
      [BRANCH_DN_ID.toString()]: [],
      [BRANCH_TD1_ID.toString()]: [],
      [BRANCH_TD2_ID.toString()]: [],
      [BRANCH_TD3_ID.toString()]: [],
      [BRANCH_Q12_ID.toString()]: [],
      [BRANCH_Q10_ID.toString()]: []
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

      // 3. Ba Đình Branch Product (cloned from Gò Vấp layout with 5% mark up)
      bpIdIndex++;
      const bpBDId = makeId(bpIdIndex);
      const bdPrice = Math.round((prod.price * 1.05) / 1000) * 1000;
      const bpBD = {
        _id: bpBDId,
        product_id: prod._id,
        branch_id: BRANCH_BD_ID,
        price: bdPrice,
        original_price: bdPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpBD);
      bpByBranch[BRANCH_BD_ID.toString()].push({
        ...bpBD,
        product_name: prod.name,
        sku: prod.sku
      });

      // 4. Đà Nẵng Branch Product (cloned from Gò Vấp layout with 5% mark down)
      bpIdIndex++;
      const bpDNId = makeId(bpIdIndex);
      const dnPrice = Math.round((prod.price * 0.95) / 1000) * 1000;
      const bpDN = {
        _id: bpDNId,
        product_id: prod._id,
        branch_id: BRANCH_DN_ID,
        price: dnPrice,
        original_price: dnPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpDN);
      bpByBranch[BRANCH_DN_ID.toString()].push({
        ...bpDN,
        product_name: prod.name,
        sku: prod.sku
      });

      // 5. Võ Văn Ngân
      bpIdIndex++;
      const bpTD1Id = makeId(bpIdIndex);
      const bpTD1 = {
        _id: bpTD1Id,
        product_id: prod._id,
        branch_id: BRANCH_TD1_ID,
        price: gvPrice,
        original_price: gvPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpTD1);
      bpByBranch[BRANCH_TD1_ID.toString()].push({
        ...bpTD1,
        product_name: prod.name,
        sku: prod.sku
      });

      // 6. Lê Văn Việt
      bpIdIndex++;
      const bpTD2Id = makeId(bpIdIndex);
      const bpTD2 = {
        _id: bpTD2Id,
        product_id: prod._id,
        branch_id: BRANCH_TD2_ID,
        price: gvPrice,
        original_price: gvPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpTD2);
      bpByBranch[BRANCH_TD2_ID.toString()].push({
        ...bpTD2,
        product_name: prod.name,
        sku: prod.sku
      });

      // 7. Kha Vạn Cân
      bpIdIndex++;
      const bpTD3Id = makeId(bpIdIndex);
      const bpTD3 = {
        _id: bpTD3Id,
        product_id: prod._id,
        branch_id: BRANCH_TD3_ID,
        price: gvPrice,
        original_price: gvPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpTD3);
      bpByBranch[BRANCH_TD3_ID.toString()].push({
        ...bpTD3,
        product_name: prod.name,
        sku: prod.sku
      });

      // 8. Nguyễn Ảnh Thủ
      bpIdIndex++;
      const bpQ12Id = makeId(bpIdIndex);
      const bpQ12 = {
        _id: bpQ12Id,
        product_id: prod._id,
        branch_id: BRANCH_Q12_ID,
        price: gvPrice,
        original_price: gvPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpQ12);
      bpByBranch[BRANCH_Q12_ID.toString()].push({
        ...bpQ12,
        product_name: prod.name,
        sku: prod.sku
      });

      // 9. CMT8
      bpIdIndex++;
      const bpQ10Id = makeId(bpIdIndex);
      const bpQ10 = {
        _id: bpQ10Id,
        product_id: prod._id,
        branch_id: BRANCH_Q10_ID,
        price: gvPrice,
        original_price: gvPrice,
        discount_percent: bpGV.discount_percent,
        stock: gvStock,
        min_stock: 20,
        is_available: true,
        promotion_tag: bpGV.promotion_tag
      };
      branchProductsToInsert.push(bpQ10);
      bpByBranch[BRANCH_Q10_ID.toString()].push({
        ...bpQ10,
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
              branch_name: branchNum === 1 ? 'Bách hóa XANH Nguyễn Thị Thập' : 'Bách hóa XANH Thống Nhất',
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
