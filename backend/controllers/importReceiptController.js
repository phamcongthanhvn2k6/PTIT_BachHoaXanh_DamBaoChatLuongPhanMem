import mongoose from 'mongoose';
import ImportReceipt from '../models/ImportReceipt.js';
import ImportOrder from '../models/ImportOrder.js';
import Supplier from '../models/Supplier.js';
import BranchProduct from '../models/BranchProduct.js';
import InventoryBatch from '../models/InventoryBatch.js';
import StockMovement from '../models/StockMovement.js';
import { logActivity } from '../services/auditService.js';
import { appendReceivedQuantities } from './importOrderController.js';

const makeReceiptCode = () => `IR-${Date.now().toString(36).toUpperCase()}`;

const normalizeReceiptItems = (items = []) => {
  return items
    .map((line) => {
      const quantityReceived = Number(line.quantity_received || line.quantity || 0);
      const unitCost = Number(line.unit_cost || line.cost_price || 0);
      return {
        import_order_item_id: line.import_order_item_id || null,
        product_id: line.product_id,
        branch_product_id: line.branch_product_id,
        product_name: line.product_name || line.name || '',
        quantity_received: quantityReceived,
        unit_cost: unitCost,
        subtotal: Number((quantityReceived * unitCost).toFixed(2)),
        batch_code: line.batch_code || '',
        expiry_date: line.expiry_date || null,
        note: line.note || '',
      };
    })
    .filter((line) => line.product_id && line.quantity_received > 0);
};

const sumTotal = (items = []) => Number(items.reduce((sum, line) => sum + Number(line.subtotal || 0), 0).toFixed(2));

const ensureBranchProduct = async ({ branchId, productId, branchProductId, session }) => {
  if (branchProductId) {
    const found = await BranchProduct.findById(branchProductId).session(session);
    if (found) return found;
  }

  const existing = await BranchProduct.findOne({ branch_id: branchId, product_id: productId }).session(session);
  if (existing) return existing;

  const created = await BranchProduct.create([
    {
      branch_id: branchId,
      product_id: productId,
      price: 0,
      original_price: 0,
      stock: 0,
      min_stock: 0,
      is_available: true,
    },
  ], { session });

  return created[0];
};

const createBatch = async ({ line, importOrderId, receiptId, supplierId, session }) => {
  const batchCode = line.batch_code || `LOT-${Date.now().toString(36).toUpperCase()}`;
  let supplierName = '';
  if (supplierId) {
    const supplier = await Supplier.findById(supplierId).session(session);
    if (supplier) {
      supplierName = supplier.name || '';
    }
  }

  const [batch] = await InventoryBatch.create([
    {
      branch_product_id: line.branch_product_id,
      batch_code: batchCode,
      quantity: Number(line.quantity_received || 0),
      exp_date: line.expiry_date || null,
      received_date: new Date(),
      cost_price: Number(line.unit_cost || 0),
      supplier_id: supplierId || null,
      supplier_name: supplierName,
      purchase_order_id: importOrderId,
      import_receipt_id: receiptId,
    },
  ], { session });
  return batch;
};

const applyLineDelta = async ({ branchId, line, deltaQty, userId, refType, refId, session, reason }) => {
  if (!line?.branch_product_id || !deltaQty) return;

  const bp = await BranchProduct.findById(line.branch_product_id).session(session);
  if (!bp) throw new Error(`BranchProduct not found: ${line.branch_product_id}`);

  const beforeStock = Number(bp.stock || 0);
  const nextStock = beforeStock + Number(deltaQty);
  if (nextStock < 0) {
    throw new Error(`Insufficient stock to reverse receipt for branch_product ${line.branch_product_id}`);
  }

  bp.stock = nextStock;
  await bp.save({ session });

  if (deltaQty > 0) {
    await createBatch({
      line,
      importOrderId: line.import_order_id || null,
      receiptId: refId,
      supplierId: line.supplier_id || null,
      session,
    });
  } else if (deltaQty < 0) {
    let toReduce = Math.abs(Number(deltaQty));
    const batches = await InventoryBatch.find({
      branch_product_id: line.branch_product_id,
      quantity: { $gt: 0 },
    }).sort({ exp_date: -1, received_date: -1 }).session(session);

    for (const batch of batches) {
      if (toReduce <= 0) break;
      const used = Math.min(Number(batch.quantity || 0), toReduce);
      batch.quantity = Number(batch.quantity || 0) - used;
      toReduce -= used;
      await batch.save({ session });
    }

    if (toReduce > 0) {
      throw new Error(`Unable to reverse batch quantity for branch_product ${line.branch_product_id}`);
    }
  }

  // Resolve branch and product names to comply with StockMovement schema
  const ProductModel = mongoose.model('Product');
  const BranchModel = mongoose.model('Branch');
  const [product, branch] = await Promise.all([
    ProductModel.findById(line.product_id).session(session),
    BranchModel.findById(branchId).session(session)
  ]);
  const productName = product ? (product.name || product.product_name || '') : (line.product_name || '');
  const branchName = branch ? (branch.name || '') : '';

  await StockMovement.create([
    {
      branch_id: branchId,
      branch_name: branchName,
      product_id: line.product_id,
      product_name: productName,
      branch_product_id: line.branch_product_id,
      batch_code: line.batch_code || '',
      movement_type: deltaQty > 0 ? 'inbound' : 'adjustment',
      quantity: Math.abs(Number(deltaQty)),
      before_stock: beforeStock,
      after_stock: nextStock,
      reference_type: refType || 'import_receipt',
      reference_id: refId,
      created_by: userId,
      note: reason || (deltaQty > 0 ? 'Goods received' : 'Receipt corrected'),
    },
  ], { session });
};

const parseBranchId = (id) => {
  if (!id) return null;
  if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const buildQuery = (req) => {
  const q = {};
  if (req.query?.branch_id && req.query.branch_id !== 'ALL') {
    const parsed = parseBranchId(req.query.branch_id);
    if (parsed) q.branch_id = parsed;
  }
  if (req.query?.supplier_id) q.supplier_id = req.query.supplier_id;
  if (req.query?.import_order_id) q.import_order_id = req.query.import_order_id;
  if (req.query?.status) q.status = req.query.status;
  if (req.query?.from || req.query?.to) {
    q.received_date = {};
    if (req.query.from) q.received_date.$gte = new Date(req.query.from);
    if (req.query.to) q.received_date.$lte = new Date(req.query.to);
  }
  return q;
};

export const list = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const query = buildQuery(req);

    const [total, data] = await Promise.all([
      ImportReceipt.countDocuments(query),
      ImportReceipt.find(query)
        .populate('supplier_id', 'name code')
        .populate('import_order_id', 'order_code status branch_id')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const receipt = await ImportReceipt.findById(req.params.id)
      .populate('supplier_id', 'name code contact_name phone email')
      .populate('import_order_id', 'order_code status branch_id');

    if (!receipt) return res.status(404).json({ success: false, message: 'Import receipt not found' });
    return res.json({ success: true, data: receipt });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { import_order_id, supplier_id, branch_id, items, note } = req.body || {};
    if (!import_order_id) return res.status(400).json({ success: false, message: 'import_order_id is required' });
    if (!branch_id) return res.status(400).json({ success: false, message: 'branch_id is required' });

    const importOrder = await ImportOrder.findById(import_order_id).session(session);
    if (!importOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Import order not found' });
    }

    // ERP Integrity: Prevent receiving against cancelled or fully received Purchase Orders
    if (importOrder.status === 'cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Không thể nhận hàng cho Đơn mua hàng đã bị hủy (Cancelled PO)' });
    }
    if (importOrder.status === 'received') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Đơn mua hàng đã hoàn thành nhập kho (Received PO), không thể tạo thêm phiếu nhận hàng.' });
    }

    // ERP Integrity: Ensure branch matches PO branch
    if (String(branch_id) !== String(importOrder.branch_id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Chi nhánh của Phiếu nhận hàng phải trùng khớp với chi nhánh của Đơn mua hàng (Branch mismatch).' });
    }

    // ERP Integrity: Ensure supplier matches PO supplier
    if (supplier_id && String(supplier_id) !== String(importOrder.supplier_id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Nhà cung cấp của Phiếu nhận hàng phải trùng khớp với nhà cung cấp của Đơn mua hàng (Supplier mismatch).' });
    }

    const supplierId = supplier_id || importOrder.supplier_id;
    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const normalizedItems = normalizeReceiptItems(items || []);
    if (normalizedItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'No valid receipt items' });
    }

    // ERP Integrity: Prevent receiving more than ordered, and ensure product matches PO lines
    for (const receiptLine of normalizedItems) {
      const orderLine = importOrder.items.find(
        (i) => String(i.product_id) === String(receiptLine.product_id)
      );
      if (!orderLine) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${receiptLine.product_name || receiptLine.product_id} không nằm trong Đơn mua hàng ${importOrder.order_code}`
        });
      }
      const quantityOrdered = Number(orderLine.quantity_ordered || 0);
      const quantityAlreadyReceived = Number(orderLine.quantity_received || 0);
      const remainingAllowed = quantityOrdered - quantityAlreadyReceived;
      const quantityReceived = Number(receiptLine.quantity_received || 0);

      if (quantityReceived > remainingAllowed) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Không thể nhận thêm ${quantityReceived} đơn vị của ${receiptLine.product_name || orderLine.product_name}. Số lượng còn lại được phép nhận là ${remainingAllowed} (Đã nhận: ${quantityAlreadyReceived}/${quantityOrdered}).`
        });
      }
    }

    const [receipt] = await ImportReceipt.create([
      {
        receipt_code: makeReceiptCode(),
        import_order_id,
        supplier_id: supplierId,
        branch_id,
        received_date: req.body.received_date || new Date(),
        status: req.body.status || 'confirmed',
        items: normalizedItems,
        total_amount: sumTotal(normalizedItems),
        note: note || '',
        created_by: req.userId,
        updated_by: req.userId,
      },
    ], { session });

    for (const line of normalizedItems) {
      const bp = await ensureBranchProduct({
        branchId: branch_id,
        productId: line.product_id,
        branchProductId: line.branch_product_id,
        session,
      });
      line.branch_product_id = bp._id;
      line.import_order_id = import_order_id;
      line.supplier_id = supplierId;

      await applyLineDelta({
        branchId: branch_id,
        line,
        deltaQty: Number(line.quantity_received || 0),
        userId: req.userId,
        refType: 'import_receipt',
        refId: receipt._id,
        session,
        reason: 'Goods receiving confirmed',
      });
    }

    receipt.items = normalizedItems;
    receipt.total_amount = sumTotal(normalizedItems);
    await receipt.save({ session });

    await appendReceivedQuantities(import_order_id, normalizedItems, req.userId, session);

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'CREATE',
      entity: 'import_receipt',
      entityId: receipt._id,
      details: { new_data: receipt.toObject() },
      ip: req.ip,
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ success: true, data: receipt, message: 'Import receipt created' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const receipt = await ImportReceipt.findById(req.params.id).session(session);
    if (!receipt) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Import receipt not found' });
    }

    const oldData = receipt.toObject();

    const nextItems = Array.isArray(req.body.items) ? normalizeReceiptItems(req.body.items) : receipt.items.map((i) => i.toObject());
    const oldItems = receipt.items.map((i) => i.toObject());
    const targetStatus = req.body.status !== undefined ? req.body.status : receipt.status;

    if (targetStatus === 'cancelled' && receipt.status !== 'cancelled') {
      for (const line of oldItems) {
        await applyLineDelta({
          branchId: receipt.branch_id,
          line,
          deltaQty: -Number(line.quantity_received || 0),
          userId: req.userId,
          refType: 'import_receipt',
          refId: receipt._id,
          session,
          reason: 'Import receipt cancelled',
        });
      }

      receipt.status = 'cancelled';
      receipt.items = oldItems.map((line) => ({ ...line, quantity_received: 0, subtotal: 0 }));
      receipt.total_amount = 0;
      receipt.updated_by = req.userId;
      if (req.body.note !== undefined) receipt.note = req.body.note || '';
      if (req.body.received_date !== undefined) receipt.received_date = req.body.received_date || receipt.received_date;

      await receipt.save({ session });
      await appendReceivedQuantities(receipt.import_order_id, receipt.items, req.userId, session);

      await logActivity({
        userId: req.userId,
        userName: req.user?.full_name || req.user?.username || 'Admin',
        action: 'UPDATE',
        entity: 'import_receipt',
        entityId: receipt._id,
        details: { old_data: oldData, new_data: receipt.toObject() },
        ip: req.ip,
      });

      await session.commitTransaction();
      session.endSession();
      return res.json({ success: true, data: receipt, message: 'Import receipt updated' });
    }

    const oldMap = new Map();
    for (const i of oldItems) {
      const key = String(i.import_order_item_id || i.product_id);
      oldMap.set(key, i);
    }

    const nextMap = new Map();
    for (const i of nextItems) {
      const key = String(i.import_order_item_id || i.product_id);
      nextMap.set(key, i);
    }

    const allKeys = new Set([...oldMap.keys(), ...nextMap.keys()]);

    for (const key of allKeys) {
      const oldLine = oldMap.get(key);
      const nextLine = nextMap.get(key);

      if (nextLine && !nextLine.branch_product_id) {
        const bp = await ensureBranchProduct({
          branchId: receipt.branch_id,
          productId: nextLine.product_id,
          branchProductId: nextLine.branch_product_id,
          session,
        });
        nextLine.branch_product_id = bp._id;
      }

      const oldQty = Number(oldLine?.quantity_received || 0);
      const nextQty = Number(nextLine?.quantity_received || 0);
      const delta = nextQty - oldQty;

      if (delta !== 0) {
        const applyLine = nextLine || oldLine;
        await applyLineDelta({
          branchId: receipt.branch_id,
          line: applyLine,
          deltaQty: delta,
          userId: req.userId,
          refType: 'import_receipt',
          refId: receipt._id,
          session,
          reason: 'Import receipt adjusted',
        });
      }
    }

    receipt.items = nextItems;
    if (req.body.received_date !== undefined) receipt.received_date = req.body.received_date || receipt.received_date;
    if (req.body.note !== undefined) receipt.note = req.body.note || '';
    receipt.status = targetStatus;
    receipt.total_amount = sumTotal(nextItems);
    receipt.updated_by = req.userId;

    await receipt.save({ session });

    await appendReceivedQuantities(receipt.import_order_id, receipt.items, req.userId, session);

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'UPDATE',
      entity: 'import_receipt',
      entityId: receipt._id,
      details: { old_data: oldData, new_data: receipt.toObject() },
      ip: req.ip,
    });

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, data: receipt, message: 'Import receipt updated' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};
