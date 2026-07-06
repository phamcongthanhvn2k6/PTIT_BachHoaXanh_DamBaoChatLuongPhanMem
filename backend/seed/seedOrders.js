import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Branch from '../models/Branch.js';
import Order from '../models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
const mockDataPath = path.join(__dirname, '..', '..', 'fontend', 'mockData.json');

const parseHexId = (hex) => {
  const clean = String(hex).replace(/^0+/, '');
  return clean ? parseInt(clean, 10) : 1;
};

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Fetch dependencies from database
    const users = await User.find({ role_id: 3 });
    const branches = await Branch.find({});
    const products = await Product.find({});

    if (users.length === 0 || branches.length === 0 || products.length === 0) {
      console.error('Cannot seed orders. Missing dependencies in DB.');
      process.exit(1);
    }

    console.log(`Found:`);
    console.log(`- ${users.length} customer users`);
    console.log(`- ${branches.length} branches`);
    console.log(`- ${products.length} products`);

    // 2. Clear existing orders
    await Order.deleteMany({});
    console.log('Cleared existing orders in database.');

    const ordersToInsert = [];
    const ordersForMockData = [];

    const statuses = [
      'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', // 40% Delivered
      'SHIPPING', 'PROCESSING', 'CONFIRMED', 'PENDING',
      'CANCELLED', 'RETURNED', 'REFUNDED'
    ];
    const paymentMethods = ['COD', 'MOMO', 'VNPAY', 'WALLET'];

    // Receiver names generator pools
    const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô'];
    const middleNames = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Thanh', 'Hữu', 'Đức', 'Khánh', 'Ngọc', 'Quốc'];
    const firstNames = ['Anh', 'Bình', 'Chi', 'Dương', 'Em', 'Giang', 'Hùng', 'Linh', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Sơn', 'Tuấn', 'Vy', 'Trang', 'Hải', 'Phong', 'Lộc'];

    const streets = [
      'Nguyễn Thị Thập', 'Huỳnh Tấn Phát', 'Lê Văn Lương', 'Nguyễn Hữu Thọ', 
      'Trần Hưng Đạo', 'Cách Mạng Tháng Tám', 'Lý Tự Trọng', 'Hai Bà Trưng', 
      'Nguyễn Huệ', 'Lê Lợi', 'Điện Biên Phủ', 'Phan Đăng Lưu'
    ];

    // 3. Generate 120 different orders
    for (let i = 1; i <= 120; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const branch = branches[Math.floor(Math.random() * branches.length)];
      
      // Select 1 to 5 random products for each order to ensure uniqueness
      const orderProductsCount = Math.floor(Math.random() * 4) + 1;
      const orderProducts = [];
      const usedProductIds = new Set();

      while (orderProducts.length < orderProductsCount) {
        const prod = products[Math.floor(Math.random() * products.length)];
        if (!usedProductIds.has(prod._id.toString())) {
          orderProducts.push(prod);
          usedProductIds.add(prod._id.toString());
        }
      }

      // Calculate prices and quantities
      let subtotal = 0;
      const items = orderProducts.map(prod => {
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = prod.price || 18000;
        const finalPrice = price * quantity;
        subtotal += finalPrice;

        return {
          product_id: prod._id,
          product_name: prod.name,
          product_image: prod.images?.[0] || '',
          sku: prod.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
          category_name: prod.category_name || 'General',
          quantity: quantity,
          price: price,
          original_price: prod.original_price || price,
          unit_price: price,
          final_price: finalPrice,
          discount_amount: 0,
        };
      });

      const shippingFee = subtotal > 200000 ? 0 : 15000;
      const totalAmount = subtotal + shippingFee;

      const orderStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const paymentStatus = (orderStatus === 'DELIVERED' || orderStatus === 'SHIPPING' || orderStatus === 'PROCESSING') ? 'PAID' : 'PENDING';

      // Timestamps distributed over 30 days
      const daysAgo = Math.random() * 30;
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);

      const receiverName = `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${middleNames[Math.floor(Math.random() * middleNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}`;
      const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      const street = streets[Math.floor(Math.random() * streets.length)];

      const orderAddress = {
        receiver_name: receiverName,
        phone: phone,
        full_address: `${Math.floor(Math.random() * 300) + 1} Đường ${street}, Quận 7`,
        city: 'Hồ Chí Minh',
        district: 'Quận 7',
        ward: 'Tân Phong',
        note: 'Gọi điện trước khi giao hàng',
      };

      const orderIdHex = String(i).padStart(24, '0');
      const orderId = new mongoose.Types.ObjectId(orderIdHex);

      const dbOrder = {
        _id: orderId,
        user_id: user._id,
        branch_id: branch._id,
        branch_name: branch.name,
        items: items,
        order_address: orderAddress,
        status: orderStatus,
        subtotal: subtotal,
        shipping_fee: shippingFee,
        discount_amount: 0,
        total_amount: totalAmount,
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          transaction_id: paymentStatus === 'PAID' ? `TXN-${Math.floor(100000 + Math.random() * 900000)}` : null,
        },
        tracking: {
          tracking_number: `TRACK-${Math.floor(1000000 + Math.random() * 9000000)}`,
          carrier: 'BHX Delivery Express',
          dispatch_branch: branch._id,
          dispatch_branch_name: branch.name,
          history: [
            { timestamp: createdAt, status: 'PENDING', note: 'Đơn hàng mới tạo.' }
          ],
        },
        created_at: createdAt,
        updated_at: updatedAt,
      };

      if (orderStatus !== 'PENDING') {
        dbOrder.tracking.history.push({
          timestamp: new Date(createdAt.getTime() + 20 * 60 * 1000),
          status: 'CONFIRMED',
          note: 'Hệ thống đã xác nhận đơn hàng.',
        });
      }
      if (orderStatus === 'DELIVERED') {
        dbOrder.tracking.history.push({
          timestamp: updatedAt,
          status: 'DELIVERED',
          note: 'Đã giao hàng thành công.',
        });
      }

      ordersToInsert.push(dbOrder);

      // Format for mockData.json
      const mockOrder = {
        id: i,
        user_id: parseHexId(user._id.toString()),
        branch_id: parseHexId(branch._id.toString()),
        branch_name: branch.name,
        items: items.map(item => ({
          product_id: parseHexId(item.product_id.toString()),
          product_name: item.product_name,
          product_image: item.product_image,
          sku: item.sku,
          category_name: item.category_name,
          quantity: item.quantity,
          price: item.price,
          original_price: item.original_price,
          unit_price: item.unit_price,
          final_price: item.final_price,
          discount_amount: item.discount_amount,
        })),
        order_address: orderAddress,
        status: orderStatus,
        subtotal: subtotal,
        shipping_fee: shippingFee,
        discount_amount: 0,
        total_amount: totalAmount,
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          transaction_id: dbOrder.payment.transaction_id,
        },
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      };

      ordersForMockData.push(mockOrder);
    }

    // 4. Save to Database
    console.log('Saving orders to database...');
    await Order.insertMany(ordersToInsert);
    console.log(`Successfully seeded ${ordersToInsert.length} orders in MongoDB.`);

    // 5. Update mockData.json
    if (fs.existsSync(mockDataPath)) {
      const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
      mockData.orders = ordersForMockData;
      fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2), 'utf8');
      console.log(`Successfully updated mockData.json with ${ordersForMockData.length} orders.`);
    }

    console.log('Seed Orders complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding orders:', err);
    process.exit(1);
  }
};

run();
