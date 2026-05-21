import mongoose from 'mongoose';

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/lotte_mart_db');
    console.log('Connected');
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

    const order = await Order.findOne({ 'items.0': { $exists: true } }).sort({ created_at: -1 });
    if (order) {
        console.log(JSON.stringify(order.items, null, 2));
    } else {
        console.log('No orders with items');
    }
    process.exit();
}

run();
