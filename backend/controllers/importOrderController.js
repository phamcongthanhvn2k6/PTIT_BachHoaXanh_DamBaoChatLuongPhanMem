import mongoose from 'mongoose';
import ImportOrder from '../models/ImportOrder.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import { logActivity } from '../services/auditService.js';

const computeLine = (line) => {
  const quantityOrdered = Number(line.quantity_ordered || line.quantity || 0);
  const quantityReceived = Number(line.quantity_received || 0);
  const unitCost = Number(line.unit_cost || line.cost_price || 0);
  return {
    product_id: line.product_id,
    branch_product_id: line.branch_product_id || null,
    sku: line.sku || '',
    product_name: line.product_name || line.name || '',
    quantity_ordered: quantityOrdered,
    quantity_received: quantityReceived,
    unit_cost: unitCost,
    subtotal: Number((quantityOrdered * unitCost).toFixed(2)),
    batch_code: line.batch_code || '',
    expiry_date: line.expiry_date || null,
    note: line.note || '',
  };
};

const sumAmounts = (items) => {
  const totalAmount = items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
  const totalReceivedAmount = items.reduce(
    (sum, i) => sum + Number(i.quantity_received || 0) * Number(i.unit_cost || 0),
    0
  );
  return {
    totalAmount: Number(totalAmount.toFixed(2)),
    totalReceivedAmount: Number(totalReceivedAmount.toFixed(2)),
  };
};

const nextStatusByItems = (items, fallback = 'ordered') => {
  const ordered = items.reduce((sum, i) => sum + Number(i.quantity_ordered || 0), 0);
  const received = items.reduce((sum, i) => sum + Number(i.quantity_received || 0), 0);
  if (received <= 0) return fallback;
  if (received >= ordered && ordered > 0) return 'received';
  return 'partially_received';
};

const makeOrderCode = () => `IO-${Date.now().toString(36).toUpperCase()}`;

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
  if (req.query?.status) q.status = req.query.status;
  if (req.query?.from || req.query?.to) {
    q.created_at = {};
    if (req.query.from) q.created_at.$gte = new Date(req.query.from);
    if (req.query.to) q.created_at.$lte = new Date(req.query.to);
  }
  return q;
};

export const list = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const query = buildQuery(req);

    const [total, data] = await Promise.all([
      ImportOrder.countDocuments(query),
      ImportOrder.find(query)
        .populate('supplier_id', 'name code contact_name phone email')
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
    const order = await ImportOrder.findById(req.params.id).populate('supplier_id', 'name code contact_name phone email address tax_code');
    if (!order) return res.status(404).json({ success: false, message: 'Import order not found' });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { supplier_id, branch_id, items, status, expected_date, note } = req.body || {};
    if (!supplier_id) return res.status(400).json({ success: false, message: 'supplier_id is required' });
    if (!branch_id) return res.status(400).json({ success: false, message: 'branch_id is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items are required' });
    }

    const branch = await Branch.findById(branch_id);
    if (!branch) return res.status(404).json({ success: false, message: 'Chi nhánh không tồn tại' });

    const supplier = await Supplier.findById(supplier_id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const normalizedItems = items.map(computeLine).filter((i) => i.product_id && i.quantity_ordered > 0);
    if (normalizedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid item lines' });
    }

    const ProductModel = mongoose.model('Product');
    for (const item of normalizedItems) {
      const prod = await ProductModel.findById(item.product_id);
      if (!prod) {
        return res.status(400).json({ success: false, message: `Sản phẩm với ID ${item.product_id} không tồn tại` });
      }
      if (!item.sku) item.sku = prod.sku || '';
      if (!item.product_name) item.product_name = prod.name || prod.product_name || '';
    }

    const amounts = sumAmounts(normalizedItems);
    const st = status || 'draft';
    const now = new Date();

    const order = await ImportOrder.create({
      order_code: makeOrderCode(),
      supplier_id,
      branch_id,
      status: st,
      expected_date: expected_date || null,
      ordered_date: st === 'ordered' ? now : null,
      items: normalizedItems,
      total_amount: amounts.totalAmount,
      total_received_amount: amounts.totalReceivedAmount,
      note: note || '',
      timeline: [{ status: st, note: 'Import order created', by: req.userId, at: now }],
      created_by: req.userId,
      updated_by: req.userId,
    });

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'CREATE',
      entity: 'import_order',
      entityId: order._id,
      details: { new_data: order.toObject() },
      ip: req.ip,
    });

    return res.status(201).json({ success: true, data: order, message: 'Import order created' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Import order not found' });

    // Enterprise Audit Lock: Only draft orders can be edited
    if (['ordered', 'partially_received', 'received', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể chỉnh sửa đơn hàng đã duyệt, đã nhận hoặc đã hủy (Trạng thái: ${order.status}). Chỉ được phép sửa đơn Nháp.` 
      });
    }

    const oldData = order.toObject();

    if (req.body.supplier_id) {
      const supplier = await Supplier.findById(req.body.supplier_id);
      if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
      order.supplier_id = req.body.supplier_id;
    }

    if (req.body.branch_id) {
      const branch = await Branch.findById(req.body.branch_id);
      if (!branch) return res.status(404).json({ success: false, message: 'Chi nhánh không tồn tại' });
      order.branch_id = req.body.branch_id;
    }
    if (req.body.expected_date !== undefined) order.expected_date = req.body.expected_date || null;
    if (req.body.note !== undefined) order.note = req.body.note || '';

    if (Array.isArray(req.body.items)) {
      const normalizedItems = req.body.items.map(computeLine).filter((i) => i.product_id && i.quantity_ordered > 0);
      if (normalizedItems.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid item lines' });
      }
      const ProductModel = mongoose.model('Product');
      for (const item of normalizedItems) {
        const prod = await ProductModel.findById(item.product_id);
        if (!prod) {
          return res.status(400).json({ success: false, message: `Sản phẩm với ID ${item.product_id} không tồn tại` });
        }
        if (!item.sku) item.sku = prod.sku || '';
        if (!item.product_name) item.product_name = prod.name || prod.product_name || '';
      }
      order.items = normalizedItems;
    }

    if (req.body.status) order.status = req.body.status;

    const amounts = sumAmounts(order.items || []);
    order.total_amount = amounts.totalAmount;
    order.total_received_amount = amounts.totalReceivedAmount;
    order.updated_by = req.userId;

    order.timeline.push({
      status: order.status,
      note: req.body.timeline_note || 'Import order updated',
      by: req.userId,
      at: new Date(),
    });

    await order.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'UPDATE',
      entity: 'import_order',
      entityId: order._id,
      details: { old_data: oldData, new_data: order.toObject() },
      ip: req.ip,
    });

    return res.json({ success: true, data: order, message: 'Import order updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body || {};
    const allowed = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Import order not found' });

    const current = order.status;

    // 1. Unchanged state check
    if (current === status) {
      return res.status(400).json({ success: false, message: `Đơn hàng đã ở trạng thái ${status} từ trước.` });
    }

    // 2. Frozen state check (Received or Cancelled orders are final)
    if (['received', 'cancelled'].includes(current)) {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể thay đổi trạng thái của đơn hàng đã ${current === 'received' ? 'hoàn thành nhận hàng' : 'bị hủy'}.` 
      });
    }

    // 3. Rollback to Draft check
    if (status === 'draft') {
      return res.status(400).json({ success: false, message: 'Không thể chuyển đơn hàng đã xử lý về lại trạng thái Nháp (Draft).' });
    }

    // 4. Rollback to Ordered check
    if (status === 'ordered' && ['partially_received', 'received'].includes(current)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể chuyển đơn hàng đã nhận một phần hoặc toàn bộ về trạng thái đã duyệt/đặt hàng.' 
      });
    }

    // 5. Cancel received check
    if (status === 'cancelled' && ['received', 'partially_received'].includes(current)) {
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng đã nhận hàng.' });
    }

    const oldData = order.toObject();
    order.status = status;
    if (status === 'ordered' && !order.ordered_date) order.ordered_date = new Date();
    if (status === 'received') order.received_date = new Date();
    order.updated_by = req.userId;
    order.timeline.push({ status, note: note || 'Status updated', by: req.userId, at: new Date() });

    if (status === 'received') {
      order.items = (order.items || []).map((line) => ({
        ...line.toObject(),
        quantity_received: Number(line.quantity_ordered || 0),
      }));
      const amounts = sumAmounts(order.items || []);
      order.total_received_amount = amounts.totalAmount;
    }

    await order.save();

    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Admin',
      action: 'STATUS_CHANGE',
      entity: 'import_order',
      entityId: order._id,
      details: { old_data: oldData, new_data: order.toObject(), note: note || '' },
      ip: req.ip,
    });

    return res.json({ success: true, data: order, message: 'Status updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const appendReceivedQuantities = async (importOrderId, receiptItems, userId, session = null) => {
  const orderQuery = ImportOrder.findById(importOrderId);
  if (session) orderQuery.session(session);
  const order = await orderQuery;
  if (!order) throw new Error('Import order not found');

  const itemMap = new Map();
  for (const line of order.items) {
    itemMap.set(String(line._id), line);
  }

  for (const rLine of receiptItems || []) {
    const lineId = rLine.import_order_item_id ? String(rLine.import_order_item_id) : '';
    let matched = lineId ? itemMap.get(lineId) : null;

    if (!matched) {
      matched = order.items.find((i) => String(i.product_id) === String(rLine.product_id));
    }

    if (matched) {
      matched.quantity_received = Number(matched.quantity_received || 0) + Number(rLine.quantity_received || 0);
      if (matched.quantity_received > matched.quantity_ordered) {
        matched.quantity_received = matched.quantity_ordered;
      }
    }
  }

  const status = nextStatusByItems(order.items, order.status === 'draft' ? 'ordered' : order.status);
  order.status = status;
  if (status === 'received') order.received_date = new Date();

  const amounts = sumAmounts(order.items || []);
  order.total_received_amount = amounts.totalReceivedAmount;
  order.updated_by = userId;
  order.timeline.push({
    status,
    note: 'Goods receiving updated quantities',
    by: userId,
    at: new Date(),
  });
  await order.save(session ? { session } : undefined);
  return order;
};
