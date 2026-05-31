import mongoose from 'mongoose';

const inventoryBatchSchema = new mongoose.Schema({
  branch_product_id: { type: mongoose.Schema.Types.Mixed, required: true },
  batch_code: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 0 },
  exp_date: { type: Date, default: null },
  manufacture_date: { type: Date, default: null },
  received_date: { type: Date, default: Date.now },
  cost_price: { type: Number, default: 0 },
  supplier_id: { type: mongoose.Schema.Types.Mixed, default: null },
  supplier_name: { type: String, default: '' },
  note: { type: String, default: '' },
  purchase_order_id: { type: mongoose.Schema.Types.Mixed, default: null },
  import_receipt_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

inventoryBatchSchema.index({ branch_product_id: 1, exp_date: 1, received_date: 1 });
inventoryBatchSchema.index({ batch_code: 1 });

// Capture original values for change detection
inventoryBatchSchema.post('init', function(doc) {
  doc._originalQuantity = doc.quantity;
});

inventoryBatchSchema.pre('save', function(next) {
  this._isNew = this.isNew;
  next();
});

inventoryBatchSchema.post('save', async function(doc, next) {
  try {
    const isNew = this._isNew;
    const oldQty = this._originalQuantity !== undefined ? this._originalQuantity : 0;
    const newQty = doc.quantity;

    if (newQty > oldQty) {
      const delta = newQty - oldQty;

      const StockMovement = mongoose.model('StockMovement');
      const AuditLog = mongoose.model('AuditLog');
      const BranchProduct = mongoose.model('BranchProduct');
      const Product = mongoose.model('Product');

      const refId = doc.import_receipt_id || doc.purchase_order_id;
      const refType = doc.import_receipt_id ? 'import_receipt' : (doc.purchase_order_id ? 'order' : 'manual');

      // Prevent duplicate StockMovement creation if one already exists
      const existingMovement = refId ? await StockMovement.findOne({
        branch_product_id: doc.branch_product_id,
        reference_id: refId,
        reference_type: refType,
      }) : null;

      if (!existingMovement) {
        const bp = await BranchProduct.findById(doc.branch_product_id);
        if (bp) {
          const product = await Product.findById(bp.product_id);
          const productName = product ? (product.name || product.product_name || '') : '';
          const beforeStock = Math.max(0, bp.stock - delta);
          const afterStock = bp.stock;

          await StockMovement.create({
            branch_id: bp.branch_id,
            branch_name: bp.branch_name || '',
            product_id: bp.product_id,
            product_name: productName,
            branch_product_id: bp._id,
            batch_code: doc.batch_code,
            movement_type: doc.import_receipt_id ? 'inbound' : 'adjustment',
            quantity: delta,
            before_stock: beforeStock,
            after_stock: afterStock,
            reference_type: refType,
            reference_id: refId || doc._id,
            created_by: null,
            note: doc.note || `Batch restocked: quantity increased from ${oldQty} to ${newQty}`,
          });
        }
      }

      // Prevent duplicate AuditLog entry
      const existingAudit = refId ? await AuditLog.findOne({
        entity: 'inventory_batch',
        entity_id: doc._id,
        action: isNew ? 'CREATE' : 'UPDATE',
      }) : null;

      if (!existingAudit) {
        await AuditLog.create({
          user_id: null,
          user_name: 'System',
          action: isNew ? 'CREATE' : 'UPDATE',
          entity: 'inventory_batch',
          entity_id: doc._id,
          details: { old_quantity: oldQty, new_quantity: newQty, batch_code: doc.batch_code },
        });
      }
    }

    this._originalQuantity = doc.quantity;
    next();
  } catch (err) {
    console.error('Error in InventoryBatch post-save hook:', err);
    next(err);
  }
});

const InventoryBatch = mongoose.models.InventoryBatch || mongoose.model('InventoryBatch', inventoryBatchSchema);

export default InventoryBatch;
