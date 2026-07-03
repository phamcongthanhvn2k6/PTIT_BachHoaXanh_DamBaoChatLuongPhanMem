import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockPath = path.resolve(__dirname, '..', '..', 'fontend', 'mockData.json');

// Reusable slugify helper
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const categoriesConfig = [
  { id: 101, name: 'Nước ngọt & Nước giải khát', slug: 'nuoc-ngot-giai-khat', icon: 'Wine', description: 'Nước ngọt, nước giải khát các loại' },
  { id: 102, name: 'Nước lọc & Nước khoáng', slug: 'nuoc-loc-khoang', icon: 'Droplet', description: 'Nước lọc tinh khiết và nước khoáng thiên nhiên' },
  { id: 103, name: 'Trà & Cà phê đóng chai', slug: 'tra-ca-phe-dong-chai', icon: 'Coffee', description: 'Trà và cà phê đóng chai tiện lợi' },
  { id: 104, name: 'Nước ép & Sinh tố trái cây', slug: 'nuoc-ep-trai-cay', icon: 'Apple', description: 'Nước ép trái cây tươi và sinh tố thơm ngon' },
  { id: 105, name: 'Bia & Đồ uống có cồn', slug: 'bia-nuoc-len-men', icon: 'Beer', description: 'Bia và các đồ uống có cồn nhẹ' }
];

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

const branchesConfig = [
  { id: 1, name: 'Bách hóa XANH Nguyễn Thị Thập', address: '136 Nguyễn Thị Thập, Phường Bình Thuận, Quận 7', city: 'Hồ Chí Minh', phone: '19001908', manager: 'mgr.q7@bachhoaxanh.com' },
  { id: 2, name: 'Bách hóa XANH Thống Nhất', address: '542 Thống Nhất, Phường 15, Quận Gò Vấp', city: 'Hồ Chí Minh', phone: '19001909', manager: 'mgr.gv@bachhoaxanh.com' },
  { id: 3, name: 'Bách hóa XANH Giang Văn Minh', address: '42 Giang Văn Minh, Phường Kim Mã, Quận Ba Đình', city: 'Hà Nội', phone: '19001910', manager: 'mgr.bd@bachhoaxanh.com' },
  { id: 4, name: 'Bách hóa XANH Trưng Nữ Vương', address: '80 Trưng Nữ Vương, Phường Bình Hiên, Quận Hải Châu', city: 'Đà Nẵng', phone: '19001911', manager: 'mgr.dn@bachhoaxanh.com' }
];

function updateMockData() {
  if (!fs.existsSync(mockPath)) {
    console.error('mockData.json not found at', mockPath);
    process.exit(1);
  }

  console.log('Loading mockData.json...');
  const data = JSON.parse(fs.readFileSync(mockPath, 'utf8'));

  // Update Database Name
  data.database = "bach_hoa_xanh_v1";

  // Update Users
  if (Array.isArray(data.users)) {
    console.log('Updating users branding...');
    data.users.forEach(u => {
      if (u.email) {
        u.email = u.email
          .replace(/@lotte\.com/gi, '@bachhoaxanh.com')
          .replace(/@lottemart\.vn/gi, '@bachhoaxanh.com');
      }
      if (u.full_name) {
        u.full_name = u.full_name.replace(/Lotte/gi, 'Bách hóa XANH');
      }
      if (u.username) {
        u.username = u.username.replace(/lotte/gi, 'bhx');
      }
    });
  }

  // Update Categories
  console.log('Generating beverage categories...');
  data.categories = categoriesConfig.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    image: `/assets/products/${c.slug}.jpg`,
    banner: `/assets/products/${c.slug}-banner.jpg`,
    description: c.description,
    is_active: true,
    display_order: c.id,
    sort_order: c.id,
    product_count: 30
  }));

  // Update Branches
  console.log('Generating branches...');
  data.branches = branchesConfig.map(b => ({
    id: b.id,
    name: b.name,
    address: b.address,
    city: b.city,
    phone: b.phone,
    manager: b.manager,
    operating_hours: '08:00 - 22:00',
    is_active: true,
    coordinates: b.id === 1 ? { lat: 10.7412, lng: 106.7032 } : b.id === 2 ? { lat: 10.8407, lng: 106.6784 } : b.id === 3 ? { lat: 21.0315, lng: 105.8234 } : { lat: 16.0594, lng: 108.2198 }
  }));

  // Generate Products & Branch Products
  console.log('Generating products and branch products...');
  const newProducts = [];
  const newBranchProducts = [];
  let bpIdIndex = 10000;

  categoriesConfig.forEach(cat => {
    const cores = coreProductsData[cat.id] || [];
    let productIndexInCat = 0;

    cores.forEach(core => {
      const variants = [
        { suffix: '', priceMult: 1.0, suffixName: '', origin: 'Việt Nam' },
        { suffix: ' - Hữu cơ Organic', priceMult: 1.5, suffixName: 'organic', origin: 'Việt Nam (Đà Lạt)' },
        { suffix: ' - Nhập khẩu Premium', priceMult: 2.2, suffixName: 'imported', origin: 'Nhật Bản' }
      ];

      variants.forEach(variant => {
        productIndexInCat++;
        const finalIdNum = cat.id * 1000 + productIndexInCat;
        const variantName = `${core.name}${variant.suffix}`;
        const finalPrice = Math.round((core.basePrice * variant.priceMult) / 1000) * 1000;
        const finalSku = `SKU-${cat.id}-${productIndexInCat.toString().padStart(2, '0')}`;
        const finalBarcode = `893000${cat.id}${productIndexInCat.toString().padStart(2, '0')}`;

        const productDoc = {
          id: finalIdNum,
          name: variantName,
          slug: `${slugify(variantName)}-${finalIdNum}`,
          short_code: finalIdNum.toString(),
          description: `${variantName} chất lượng cao, cung cấp dinh dưỡng tối ưu và cam kết nguồn gốc xuất xứ rõ ràng.`,
          short_description: `${variantName} tại siêu thị Bách hóa XANH.`,
          category_id: cat.id,
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
          rating: 4.5,
          review_count: 50,
          sold_count: 120,
          vat_included: true
        };
        newProducts.push(productDoc);

        // Branch products for all 4 branches
        branchesConfig.forEach(br => {
          bpIdIndex++;
          const isOrganicOrImported = variantName.includes('Organic') || variantName.includes('Nhập khẩu') || variantName.includes('Premium');
          
          let priceMult = 1.0;
          let stock = 100;
          let promoTag = '';
          let discount = 0;

          if (br.id === 1) { // Nguyễn Thị Thập
            priceMult = 1.15;
            stock = isOrganicOrImported ? 120 : 50;
            promoTag = isOrganicOrImported ? 'Hot Import' : '';
            discount = isOrganicOrImported ? 10 : 0;
          } else if (br.id === 2) { // Thống Nhất
            priceMult = 0.9;
            stock = isOrganicOrImported ? 20 : 180;
            promoTag = !isOrganicOrImported ? 'Giá Tốt' : '';
            discount = !isOrganicOrImported ? 15 : 0;
          } else if (br.id === 3) { // Giang Văn Minh
            priceMult = 0.9 * 1.05;
            stock = isOrganicOrImported ? 20 : 180;
            promoTag = !isOrganicOrImported ? 'Giá Tốt' : '';
            discount = !isOrganicOrImported ? 15 : 0;
          } else { // Trưng Nữ Vương
            priceMult = 0.9 * 0.95;
            stock = isOrganicOrImported ? 20 : 180;
            promoTag = !isOrganicOrImported ? 'Giá Tốt' : '';
            discount = !isOrganicOrImported ? 15 : 0;
          }

          const brPrice = Math.round((finalPrice * priceMult) / 1000) * 1000;

          newBranchProducts.push({
            id: bpIdIndex,
            product_id: finalIdNum,
            branch_id: br.id,
            price: brPrice,
            original_price: brPrice,
            discount_percent: discount,
            stock: stock,
            min_stock: 20,
            is_available: true,
            promotion_tag: promoTag
          });
        });
      });
    });
  });

  data.products = newProducts;
  data.branch_products = newBranchProducts;

  // Update Coupons
  if (Array.isArray(data.coupons)) {
    console.log('Updating coupons branding...');
    data.coupons = [
      {
        id: 1,
        code: 'BHXNEW50',
        title: 'Giảm 50K - Khách Mới',
        description: 'Mã giảm 50.000đ cho khách hàng mới đăng ký tài khoản Bách hóa XANH, áp dụng cho đơn từ 200.000đ',
        type: 'fixed_amount',
        discount_value: 50000,
        min_order_amount: 200000,
        total_quantity: 500,
        remaining_quantity: 480,
        usage_per_user: 1,
        is_active: true,
        status: 'active',
        scope: 'all'
      },
      {
        id: 2,
        code: 'GIAM10',
        title: 'Giảm 10% Toàn Bộ',
        description: 'Giảm 10% cho tất cả sản phẩm, tối đa 100.000đ. Đơn tối thiểu 300.000đ',
        type: 'percent',
        discount_value: 10,
        max_discount_amount: 100000,
        min_order_amount: 300000,
        total_quantity: 1000,
        remaining_quantity: 780,
        used_count: 220,
        usage_per_user: 3,
        is_active: true,
        status: 'active',
        scope: 'all'
      },
      {
        id: 3,
        code: 'FREESHIP',
        title: 'Miễn Phí Vận Chuyển',
        description: 'Miễn phí vận chuyển cho đơn từ 150.000đ',
        type: 'free_shipping',
        discount_value: 0,
        min_order_amount: 150000,
        total_quantity: 2000,
        remaining_quantity: 1500,
        used_count: 500,
        usage_per_user: 5,
        is_active: true,
        status: 'active',
        scope: 'all'
      }
    ];
  }

  // Update Promotions
  if (Array.isArray(data.promotions)) {
    console.log('Updating promotions branding...');
    data.promotions = [
      {
        title: 'Flash Sale Cuối Tuần - Giảm 30% Đồ Uống',
        description: 'Áp dụng cho các sản phẩm đồ uống tại Bách hóa XANH, giảm ngay 30% khi mua từ 500.000đ',
        type: 'percent',
        status: 'active',
        is_active: true,
        discount_value: 30,
        max_discount_amount: 200000,
        min_order_amount: 500000,
        scope: 'all',
        usage_per_user: 2,
        priority: 10,
        badge_text: 'HOT'
      },
      {
        title: 'Mua 2 Tặng 1 - Nước Ngọt Coca-Cola',
        description: 'Mua 2 lon Coca-Cola 330ml, tặng ngay 1 lon cùng loại',
        type: 'bogo',
        status: 'active',
        is_active: true,
        min_quantity: 2,
        gift_quantity: 1,
        scope: 'all',
        usage_per_user: 3,
        priority: 8,
        badge_text: 'BOGO'
      }
    ];
  }

  // Update Banners
  if (Array.isArray(data.banners) || Array.isArray(data.home_banners)) {
    console.log('Updating banners branding...');
    const newBanners = [
      {
        title: 'Khai Trương Bách Hóa XANH Mua Sắm Thả Ga Giảm Đến 50%',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200',
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200',
        link: '/promotions',
        position: 'home',
        is_active: true
      },
      {
        title: 'Nước Khoáng Tinh Khiết Mát Lạnh Mỗi Ngày',
        image: 'https://images.unsplash.com/photo-1548839134-6c70284b9e28?q=80&w=1200',
        url: 'https://images.unsplash.com/photo-1548839134-6c70284b9e28?q=80&w=1200',
        link: '/products',
        position: 'home',
        is_active: true
      }
    ];
    if (data.banners) data.banners = newBanners;
    if (data.home_banners) data.home_banners = newBanners;
  }

  fs.writeFileSync(mockPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Successfully updated and overwrote mockData.json with beverage catalog & Bách hóa XANH branding.');
}

updateMockData();
