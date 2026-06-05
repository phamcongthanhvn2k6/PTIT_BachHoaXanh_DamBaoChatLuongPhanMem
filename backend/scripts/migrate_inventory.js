import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import Supplier from '../models/Supplier.js';
import ImportOrder from '../models/ImportOrder.js';
import ImportReceipt from '../models/ImportReceipt.js';
import InventoryBatch from '../models/InventoryBatch.js';
import StockMovement from '../models/StockMovement.js';
import Category from '../models/Category.js';
import Branch from '../models/Branch.js';
import { AuditLog } from '../models/Misc.js';

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting inventory migration...');

    // 1. Ensure a default supplier exists
    let defaultSupplier = await Supplier.findOne({ code: 'SUP-DEFAULT' });
    if (!defaultSupplier) {
      defaultSupplier = await Supplier.create({
        code: 'SUP-DEFAULT',
        name: 'Nhà Cung Cấp Tổng Hợp (Default)',
        contact_name: 'Admin',
        phone: '0901234567',
        is_active: true
      });
      console.log('Created default supplier.');
    }

    // 2. Load maps for fast lookup
    const categories = await Category.find();
    const branches = await Branch.find();
    
    const catMap = {};
    categories.forEach(c => catMap[c._id.toString()] = c.name);
    
    const branchMap = {};
    branches.forEach(b => branchMap[b._id.toString()] = b.name);

    // 3. Migrate Products
    const products = await Product.find();
    console.log(`Checking ${products.length} products...`);
    for (let p of products) {
      let changed = false;

      if (!p.sku) { p.sku = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*1000)}`; changed = true; }
      if (!p.master_id) { p.master_id = `MAS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*1000)}`; changed = true; }
      
      if (!p.supplier_id) {
        p.supplier_id = defaultSupplier._id;
        p.supplier_name = defaultSupplier.name;
        changed = true;
      }
      if (p.category_id && !p.category_name && catMap[p.category_id.toString()]) {
        p.category_name = catMap[p.category_id.toString()];
        changed = true;
      }

      if (changed) await p.save();
    }
    console.log('Products migration done.');

    // 4. Migrate Branch Products
    const bps = await BranchProduct.find();
    console.log(`Checking ${bps.length} branch products...`);
    
    for (let bp of bps) {
      const prod = await Product.findById(bp.product_id);
      if (!prod) continue;

      let changed = false;

      if (!bp.master_id || bp.master_id !== prod.master_id) { bp.master_id = prod.master_id; changed = true; }
      if (!bp.sku || bp.sku !== prod.sku) { bp.sku = prod.sku; changed = true; }
      
      if (!bp.supplier_id) {
        bp.supplier_id = prod.supplier_id || defaultSupplier._id;
        bp.supplier_name = prod.supplier_name || defaultSupplier.name;
        changed = true;
      }

      if (prod.category_id) {
        bp.category_id = prod.category_id;
        bp.category_name = prod.category_name || catMap[prod.category_id.toString()];
        changed = true;
      }

      if (!bp.batch_code) {
        bp.batch_code = `BATCH-${Date.now().toString(36).toUpperCase()}`;
        changed = true;
      }
      
      if (!bp.manufacture_date) {
        const d = new Date(); d.setMonth(d.getMonth() - 2);
        bp.manufacture_date = d;
        changed = true;
      }

      if (!bp.expiry_date) {
        const d = new Date(); d.setMonth(d.getMonth() + 4);
        bp.expiry_date = d;
        changed = true;
      }

      if (changed) await bp.save();

      // 5. Backfill Inventory Batch and Receipt and StockMovement if missing
      const existingBatch = await InventoryBatch.findOne({ branch_product_id: bp._id });
      if (!existingBatch && bp.stock > 0) {
        // Create an ImportOrder & Receipt to explain this stock
        const io = await ImportOrder.create({
          order_code: `PO-${Date.now().toString(36).toUpperCase()}`,
          supplier_id: bp.supplier_id,
          branch_id: bp.branch_id,
          status: 'received',
          expected_date: new Date(),
          ordered_date: new Date(),
          received_date: new Date(),
          items: [{
             product_id: bp.product_id,
             branch_product_id: bp._id,
             sku: bp.sku,
             product_name: prod.name,
             quantity_ordered: bp.stock,
             quantity_received: bp.stock,
             unit_cost: bp.import_price || bp.price * 0.7,
             subtotal: (bp.import_price || bp.price * 0.7) * bp.stock,
             batch_code: bp.batch_code,
             expiry_date: bp.expiry_date
          }],
          total_amount: (bp.import_price || bp.price * 0.7) * bp.stock,
          total_received_amount: (bp.import_price || bp.price * 0.7) * bp.stock,
          note: 'Auto-generated backfill'
        });

        const ir = await ImportReceipt.create({
          receipt_code: `RC-${Date.now().toString(36).toUpperCase()}`,
          import_order_id: io._id,
          supplier_id: bp.supplier_id,
          branch_id: bp.branch_id,
          status: 'confirmed',
          items: [{
             import_order_item_id: io.items[0]._id,
             product_id: bp.product_id,
             branch_product_id: bp._id,
             product_name: prod.name,
             quantity_received: bp.stock,
             unit_cost: bp.import_price || bp.price * 0.7,
             subtotal: (bp.import_price || bp.price * 0.7) * bp.stock,
             batch_code: bp.batch_code,
             expiry_date: bp.expiry_date
          }],
          total_amount: (bp.import_price || bp.price * 0.7) * bp.stock,
        });

        const batch = await InventoryBatch.create({
          branch_product_id: bp._id,
          batch_code: bp.batch_code,
          quantity: bp.stock,
          exp_date: bp.expiry_date,
          manufacture_date: bp.manufacture_date,
          cost_price: bp.import_price || bp.price * 0.7,
          supplier_id: bp.supplier_id,
          supplier_name: bp.supplier_name,
          purchase_order_id: io._id,
          import_receipt_id: ir._id,
          note: 'Auto-generated backfill'
        });

        await StockMovement.create({
           branch_id: bp.branch_id,
           branch_name: branchMap[bp.branch_id.toString()] || 'Default Branch',
           product_id: bp.product_id,
           product_name: prod.name,
           branch_product_id: bp._id,
           batch_code: bp.batch_code,
           movement_type: 'inbound',
           quantity: bp.stock,
           before_stock: 0,
           after_stock: bp.stock,
           reference_type: 'import_receipt',
           reference_id: ir._id,
           note: 'Initial backfill seed'
        });

        console.log(`Backfilled complete trace for Product ID: ${bp.product_id}`);
      }
    }

    console.log('Migration successfully completed!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
