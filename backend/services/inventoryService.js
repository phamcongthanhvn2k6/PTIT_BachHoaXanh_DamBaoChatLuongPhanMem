// backend/services/inventoryService.js
// ═══════════════════════════════════════════════════════
// FIFO Inventory Management
// When deducting stock, prioritise batches with the
// nearest expiry date (exp_date) first.
// ═══════════════════════════════════════════════════════
import mongoose from 'mongoose';
import { acquireLock, releaseLock } from './redisService.js';

// ─── InventoryBatch model (created here if it doesn't already exist) ───
const inventoryBatchSchema = new mongoose.Schema({
  branch_product_id: { type: mongoose.Schema.Types.Mixed, required: true },
  batch_code:        { type: String, default: '' },
  quantity:          { type: Number, required: true, default: 0 },
  exp_date:          { type: Date, default: null },
  received_date:     { type: Date, default: () => new Date() },
  cost_price:        { type: Number, default: 0 },
  supplier_id:       { type: mongoose.Schema.Types.Mixed, default: null },
  purchase_order_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: 'created_at' } });

const InventoryBatch =
  mongoose.models.InventoryBatch ||
  mongoose.model('InventoryBatch', inventoryBatchSchema);

/**
 * Deduct stock using FIFO — batches with the nearest exp_date are consumed first.
 *
 * @param {string|ObjectId} branchProductId - The branch product whose stock to reduce
 * @param {number}          qty             - How many units to deduct
 * @param {object}          session         - Mongoose Transaction session (optional)
 * @returns {{ success: boolean, consumed: Array<{ batchId, used: number }>, remaining: number }}
 */
export async function deductStockFIFO(branchProductId, qty, session = null) {
  if (qty <= 0) return { success: true, consumed: [], remaining: 0 };

  const normalizedId = mongoose.Types.ObjectId.isValid(branchProductId)
    ? new mongoose.Types.ObjectId(branchProductId)
    : branchProductId;

  // Get all batches ordered by exp_date ASC (soonest first), then by received_date ASC
  const batches = await InventoryBatch.find({
    branch_product_id: normalizedId,
    quantity: { $gt: 0 },
  }).sort({ exp_date: 1, received_date: 1 }).session(session);

  let remaining = qty;
  const consumed = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const used = Math.min(batch.quantity, remaining);
    batch.quantity -= used;
    remaining -= used;

    consumed.push({ batchId: batch._id, batchCode: batch.batch_code, used });
    await batch.save({ session });
  }

  return {
    success: remaining === 0,
    consumed,
    remaining,  // Should be 0 if enough stock
  };
}

/**
 * PRODUCTION-GRADE: Deduct inventory for an entire order using FIFO
 * Throws an explicit error if stock is insufficient, causing transaction to rollback.
 */
export async function deductInventoryForOrder(branch_id, items, session, orderId = null) {
  const deductResults = [];
  const lockedKeys = [];

  try {
    // 1. Acquire distributed locks for all items
    for (const item of items) {
      const bpId = item.branch_product_id;
      if (!bpId) continue;
      const lockKey = `inventory_lock:${bpId}`;
      const locked = await acquireLock(lockKey, 10); // 10 seconds TTL
      if (!locked) {
        throw new Error(`Sản phẩm ${item.name || bpId} đang được mua bởi người khác, vui lòng thử lại sau vài giây.`);
      }
      lockedKeys.push(lockKey);
    }
    
    // 2. Perform deduplication / FIFO
    for (const item of items) {
      const bpId = item.branch_product_id; 
      const qty = Number(item.quantity) || 1;
      if (!bpId) continue;
    
      const BranchProductModel = mongoose.model('BranchProduct');
      const bp = await BranchProductModel.findById(bpId).session(session);
      if (!bp) {
        throw new Error(`Không tìm thấy sản phẩm nhánh ${bpId}`);
      }

      const ProductModel = mongoose.model('Product');
      const p = await ProductModel.findById(bp.product_id).session(session);
      const productName = p ? (p.name || p.product_name) : (bp.name || 'Sản phẩm');

      // 1. Áp dụng thuật toán FIFO trên các lô (Batches)
      const result = await deductStockFIFO(bpId, qty, session);
      if (!result || !result.success) {
        throw new Error(`Sản phẩm "${productName}" không đủ số lượng tồn kho trong các lô hàng (FIFO) (yêu cầu: ${qty}).`);
      }
      
      // 2. Cập nhật trực tiếp tồn kho tổng (stock) trong bảng BranchProduct
      const currentStock = Number(bp.stock) || 0;
      if (currentStock < qty) {
        throw new Error(`Sản phẩm "${productName}" chỉ còn ${currentStock} sản phẩm trong kho (yêu cầu: ${qty})`);
      }
      const beforeStock = currentStock;
      const afterStock = currentStock - qty;
      bp.stock = afterStock;
      await bp.save({ session });

      // Resolve product details (already resolved above)

      // Create Stock Movement Ledger entry
      const StockMovementModel = mongoose.model('StockMovement');
      await StockMovementModel.create([{
        branch_id: bp.branch_id || branch_id,
        branch_name: bp.branch_name || '',
        product_id: bp.product_id,
        product_name: productName,
        branch_product_id: bp._id,
        batch_code: result.consumed?.[0]?.batchCode || bp.batch_code || '',
        movement_type: 'sale',
        quantity: qty,
        before_stock: beforeStock,
        after_stock: afterStock,
        reference_type: 'order',
        reference_id: orderId,
        created_by: null,
        note: 'Deduction for customer order',
      }], { session });
      
      deductResults.push({
        branch_product_id: bpId,
        deducted_qty: qty,
        batches_consumed: result.consumed
      });
    }
    
    return deductResults;
  } finally {
    for (const lockKey of lockedKeys) {
      await releaseLock(lockKey);
    }
  }
}

/**
 * PRODUCTION-GRADE: Restore inventory for a refunded/cancelled order.
 * Restores both InventoryBatch quantities AND BranchProduct.stock.
 */
export async function restoreInventoryFromOrder(items, session, orderId = null) {
  const BranchProductModel = mongoose.model('BranchProduct');

  for (const item of items) {
    const bpId = item.branch_product_id;
    const qty = Number(item.quantity) || 0;
    if (!bpId || qty <= 0) continue;
    
    let resolvedBatchCode = '';

    const normalizedId = mongoose.Types.ObjectId.isValid(bpId)
      ? new mongoose.Types.ObjectId(bpId)
      : bpId;

    // 1. Restore InventoryBatch (FIFO restore to most recent batch)
    const recentBatch = await InventoryBatch.findOne({ branch_product_id: normalizedId }).sort({ exp_date: -1 }).session(session);
    
    if (recentBatch) {
      recentBatch.quantity += qty;
      resolvedBatchCode = recentBatch.batch_code;
      await recentBatch.save({ session });
    } else {
      resolvedBatchCode = `RETURN-${Date.now().toString(36).toUpperCase()}`;
      await InventoryBatch.create([{
        branch_product_id: normalizedId,
        batch_code: resolvedBatchCode,
        quantity: qty,
        exp_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }], { session });
    }

    // 2. CRITICAL: Also restore BranchProduct.stock
    try {
      const bp = await BranchProductModel.findById(bpId).session(session);
      if (bp) {
        const beforeStock = Number(bp.stock) || 0;
        const afterStock = beforeStock + qty;
        bp.stock = afterStock;
        await bp.save({ session });

        // Resolve product details
        const ProductModel = mongoose.model('Product');
        const p = await ProductModel.findById(bp.product_id).session(session);
        const productName = p ? (p.name || p.product_name) : (bp.name || '');

        // Create Stock Movement Ledger entry
        const StockMovementModel = mongoose.model('StockMovement');
        await StockMovementModel.create([{
          branch_id: bp.branch_id,
          branch_name: bp.branch_name || '',
          product_id: bp.product_id,
          product_name: productName,
          branch_product_id: bp._id,
          batch_code: resolvedBatchCode,
          movement_type: 'cancel',
          quantity: qty,
          before_stock: beforeStock,
          after_stock: afterStock,
          reference_type: 'order',
          reference_id: orderId,
          created_by: null,
          note: 'Stock restored from cancelled/refunded order',
        }], { session });
      }
    } catch (e) {
      console.warn('[InventoryService] Could not restore BranchProduct.stock:', bpId, e.message);
    }
  }
}


/**
 * Add stock via a new batch (e.g. incoming goods receipt).
 */
export async function addStockBatch({ branchProductId, qty, expDate, costPrice, supplierId, purchaseOrderId, batchCode }) {
  const normalizedId = mongoose.Types.ObjectId.isValid(branchProductId)
    ? new mongoose.Types.ObjectId(branchProductId)
    : branchProductId;

  const batch = await InventoryBatch.create({
    branch_product_id: normalizedId,
    batch_code: batchCode || `BATCH-${Date.now().toString(36).toUpperCase()}`,
    quantity: qty,
    exp_date: expDate || null,
    cost_price: costPrice || 0,
    supplier_id: supplierId || null,
    purchase_order_id: purchaseOrderId || null,
  });
  return batch;
}

export { InventoryBatch };
export default { deductStockFIFO, deductInventoryForOrder, restoreInventoryFromOrder, addStockBatch, InventoryBatch };
