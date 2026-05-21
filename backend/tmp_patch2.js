import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const Product = mongoose.model('Product', new mongoose.Schema({ name: String, image: String, product_name: String, product_image: String }, { strict: false }));

    const orders = await Order.find({});
    let updated = 0;
    for (const o of orders) {
        if (!o.items || !Array.isArray(o.items)) continue;
        let changed = false;
        for (const item of o.items) {
            if ((!item.product_name || item.product_name === 'Sản phẩm' || item.product_name === 'product' || item.product_name === 'undefined') && item.product_id) {
                try {
                    const prod = await Product.findById(item.product_id);
                    if (prod) {
                        const name = prod.name || prod.product_name || item.name || 'Sản phẩm';
                        console.log(`Fixing item: ${item.product_id} -> ${name}`);
                        item.product_name = name;
                        item.name = name;
                        item.product_image = prod.image || prod.product_image || item.product_image || '';
                        changed = true;
                    }
                } catch (err) { }
            } else if (!item.product_name && item.name) {
                item.product_name = item.name;
                changed = true;
            }
        }
        if (changed) {
            await Order.updateOne({ _id: o._id }, { $set: { items: o.items } });
            updated++;
        }
    }
    console.log('Fixed', updated, 'orders for Product Name consistency.');
    process.exit(0);
}

run().catch(console.error);
