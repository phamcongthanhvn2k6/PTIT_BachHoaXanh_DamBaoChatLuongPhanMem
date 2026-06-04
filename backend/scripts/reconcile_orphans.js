import '../config/loadEnv.js';
import mongoose from 'mongoose';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import ImportOrder from '../models/ImportOrder.js';
import ImportReceipt from '../models/ImportReceipt.js';
import InventoryBatch from '../models/InventoryBatch.js';
import StockMovement from '../models/StockMovement.js';
import { AuditLog } from '../models/Misc.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for reconciliation');

    // 1. Get all suppliers to use as fallback/linkage
    const suppliers = await Supplier.find({}).lean();
    if (suppliers.length === 0) {
      throw new Error('No suppliers found in database to link procurement history.');
    }
    const defaultSupplier = suppliers[0];

    // 2. Get all branches for mapping
    const branches = await Branch.find({}).lean();
    const branchMap = {};
    branches.forEach(b => {
      branchMap[String(b._id)] = b;
    });

    // 3. Find all BranchProducts with stock > 0
    const branchProducts = await BranchProduct.find({ stock: { $gt: 0 } }).lean();
    console.log(`Checking ${branchProducts.length} branch products with active stock...`);

    let reconciledCount = 0;

    for (const bp of branchProducts) {
      // Check if there is an existing InventoryBatch for this branch product
      const batchCount = await InventoryBatch.countDocuments({ branch_product_id: bp._id });
      if (batchCount > 0) {
        // Already has an inventory batch, skip
        continue;
      }

      console.log(`\nReconciling orphaned branch product:`);
      console.log(` - ID: ${bp._id}`);
      console.log(` - SKU: ${bp.sku}`);
      console.log(` - Stock: ${bp.stock}`);
      console.log(` - Branch ID: ${bp.branch_id}`);

      // Load Master Product info
      const product = await Product.findById(bp.product_id).lean();
      const productName = product ? (product.name || product.product_name || 'Unknown Product') : 'Unknown Product';
      const productSku = bp.sku || (product ? product.sku : '') || 'SKU-UNKNOWN';

      // Determine Branch Name
      const branchObj = branchMap[String(bp.branch_id)];
      const branchName = branchObj ? branchObj.name : `Branch ${String(bp.branch_id)}`;

      // Locate Supplier
      let supplier = defaultSupplier;
      if (bp.supplier_id) {
        const foundSupp = suppliers.find(s => String(s._id) === String(bp.supplier_id));
        if (foundSupp) supplier = foundSupp;
      }

      const costPrice = bp.import_price || Math.round((bp.price * 0.7) / 100) * 100 || 10000;
      const totalCost = bp.stock * costPrice;

      // Unique identifier for this migration transaction
      const timestampSuffix = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
      const orderCode = `PO-MIG-${timestampSuffix}`;
      const receiptCode = `GR-MIG-${timestampSuffix}`;
      const batchCode = `BAT-MIG-${timestampSuffix}`;

      // Create Import Order
      const importOrder = new ImportOrder({
        order_code: orderCode,
        supplier_id: supplier._id,
        branch_id: bp.branch_id,
        status: 'received',
        expected_date: new Date(),
        ordered_date: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
        received_date: new Date(),
        items: [
          {
            product_id: bp.product_id,
            branch_product_id: bp._id,
            sku: productSku,
            product_name: productName,
            quantity_ordered: bp.stock,
            quantity_received: bp.stock,
            unit_cost: costPrice,
            subtotal: totalCost,
            batch_code: batchCode,
            expiry_date: new Date(Date.now() + 90 * 24 * 3600 * 1000), // 90 days expiry
          }
        ],
        total_amount: totalCost,
        total_received_amount: totalCost,
        note: `System auto-generated PO to reconcile orphaned stock of ${productName} (SKU: ${productSku})`,
        timeline: [
          { status: 'draft', note: 'Created migration PO draft', at: new Date(Date.now() - 24 * 3600 * 1000) },
          { status: 'ordered', note: 'Approved system backfill', at: new Date(Date.now() - 23 * 3600 * 1000) },
          { status: 'received', note: 'Goods received and cataloged', at: new Date() }
        ]
      });

      await importOrder.save();

      // Create Goods Receipt
      const importReceipt = new ImportReceipt({
        receipt_code: receiptCode,
        import_order_id: importOrder._id,
        supplier_id: supplier._id,
        branch_id: bp.branch_id,
        received_date: new Date(),
        status: 'confirmed',
        items: [
          {
            product_id: bp.product_id,
            branch_product_id: bp._id,
            product_name: productName,
            quantity_received: bp.stock,
            unit_cost: costPrice,
            subtotal: totalCost,
            batch_code: batchCode,
            expiry_date: new Date(Date.now() + 90 * 24 * 3600 * 1000),
          }
        ],
        total_amount: totalCost,
        note: `System auto-generated goods receipt to reconcile orphaned stock of ${productName} (SKU: ${productSku})`
      });

      await importReceipt.save();

      // Create Inventory Batch
      const inventoryBatch = new InventoryBatch({
        branch_product_id: bp._id,
        batch_code: batchCode,
        quantity: bp.stock,
        exp_date: new Date(Date.now() + 90 * 24 * 3600 * 1000),
        manufacture_date: new Date(Date.now() - 5 * 24 * 3600 * 1000), // 5 days ago
        received_date: new Date(),
        cost_price: costPrice,
        supplier_id: supplier._id,
        supplier_name: supplier.name,
        purchase_order_id: importOrder._id,
        import_receipt_id: importReceipt._id,
        note: `System reconciliation batch for ${productName}`
      });

      // Explicitly bypass hook stock-increment since the BranchProduct already has stock.
      // But we DO want to create the StockMovement log to ensure auditing.
      await inventoryBatch.save();

      // Ensure StockMovement exists for this batch
      const movementExists = await StockMovement.findOne({
        branch_product_id: bp._id,
        reference_id: importReceipt._id,
      });

      if (!movementExists) {
        await StockMovement.create({
          branch_id: bp.branch_id,
          branch_name: branchName,
          product_id: bp.product_id,
          product_name: productName,
          branch_product_id: bp._id,
          batch_code: batchCode,
          movement_type: 'inbound',
          quantity: bp.stock,
          before_stock: 0,
          after_stock: bp.stock,
          reference_type: 'import_receipt',
          reference_id: importReceipt._id,
          note: `System migration receipt log for orphaned stock of ${productName}`
        });
      }

      // Create Audit Log
      await AuditLog.create({
        user_name: 'System',
        action: 'CREATE',
        entity: 'reconciliation',
        entity_id: bp._id,
        details: {
          message: 'Reconciled orphaned branch product stock',
          branch_product_id: bp._id,
          product_name: productName,
          sku: productSku,
          reconciled_stock: bp.stock,
          po_id: importOrder._id,
          receipt_id: importReceipt._id
        }
      });

      reconciledCount++;
    }

    console.log(`\n==================================================`);
    console.log(`✅ Reconciliation finished successfully!`);
    console.log(`- Total branch products audited: ${branchProducts.length}`);
    console.log(`- Total orphaned records reconciled: ${reconciledCount}`);
    console.log(`==================================================`);

    process.exit(0);
  } catch (error) {
    console.error('Reconciliation script failed:', error);
    process.exit(1);
  }
};

run().catch(console.error);
