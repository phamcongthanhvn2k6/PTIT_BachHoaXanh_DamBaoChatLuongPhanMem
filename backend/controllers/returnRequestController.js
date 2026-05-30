import mongoose from 'mongoose';
import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import { createUserNotification } from '../services/userNotificationService.js';
import inventoryService from '../services/inventoryService.js';

const toComparableId = (value) => String(value || '');

const resolveUserId = (req) => {
  const roleId = Number(req.user?.role_id);
  if (roleId !== 3) {
    return req.query.user_id || req.body.user_id || req.params.userId || req.userId;
  }
  return req.userId;
};

const canAccessReturnRequest = (req, doc) => {
  if (!doc) return false;
  if (Number(req.user?.role_id) !== 3) return true;
  return toComparableId(doc.user_id) === toComparableId(req.userId);
};

const normalize = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = String(obj._id || obj.id);
  return obj;
};

const ALLOWED_RETURN_STATUSES = new Set([
  'pending',
  'approved',
  'rejected',
  'picked_up',
  'refunded',
  'closed',
  'cancelled',
]);

export const list = async (req, res) => {
  try {
    const roleId = Number(req.user?.role_id);
    const filter = {};

    if (roleId === 3) {
      filter.$or = [{ user_id: req.userId }, { user_id: String(req.userId) }];
    } else if (req.query.user_id) {
      filter.$or = [{ user_id: req.query.user_id }, { user_id: String(req.query.user_id) }];
    }

    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.order_id) filter.order_id = req.query.order_id;

    const data = await ReturnRequest.find(filter).sort('-created_at').limit(200);
    return res.json({ success: true, data: data.map(normalize) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (!canAccessReturnRequest(req, doc)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({ success: true, data: normalize(doc) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { order_id: orderId, reason, description = '', refund_method = 'original_payment', contact_phone = '', evidence_images = [], items = [] } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'reason is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (Number(req.user?.role_id) === 3 && toComparableId(order.user_id) !== toComparableId(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!['DELIVERED', 'COMPLETED', 'RETURNED'].includes(String(order.status || '').toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể tạo yêu cầu đổi trả cho đơn đã giao' });
    }

    const existingOpen = await ReturnRequest.findOne({
      order_id: orderId,
      $or: [{ user_id: userId }, { user_id: String(userId) }],
      status: { $in: ['pending', 'approved', 'picked_up'] },
    });

    if (existingOpen) {
      return res.status(409).json({ success: false, message: 'Đơn hàng này đã có yêu cầu đổi trả đang xử lý' });
    }

    const orderItems = Array.isArray(order.items) ? order.items : [];
    const normalizedItems = Array.isArray(items) && items.length > 0
      ? items
          .map((picked) => {
            const matched = orderItems.find((line) => {
              const sameBranchProduct = picked.branch_product_id && toComparableId(line.branch_product_id) === toComparableId(picked.branch_product_id);
              const sameProduct = picked.product_id && toComparableId(line.product_id) === toComparableId(picked.product_id);
              return sameBranchProduct || sameProduct;
            });

            if (!matched) return null;

            const quantity = Math.max(1, Math.min(Number(picked.quantity || 1), Number(matched.quantity || 1)));
            return {
              product_id: matched.product_id || null,
              branch_product_id: matched.branch_product_id || null,
              product_name: matched.product_name || '',
              product_image: matched.product_image || '',
              quantity,
              price: Number(matched.final_price || matched.unit_price || matched.price || 0),
              reason_detail: String(picked.reason_detail || ''),
            };
          })
          .filter(Boolean)
      : orderItems.map((line) => ({
          product_id: line.product_id || null,
          branch_product_id: line.branch_product_id || null,
          product_name: line.product_name || '',
          product_image: line.product_image || '',
          quantity: Number(line.quantity || 1),
          price: Number(line.final_price || line.unit_price || line.price || 0),
          reason_detail: '',
        }));

    if (normalizedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có sản phẩm hợp lệ để đổi trả' });
    }

    const amountRequested = normalizedItems.reduce((sum, line) => sum + Number(line.price || 0) * Number(line.quantity || 1), 0);

    const created = await ReturnRequest.create({
      user_id: userId,
      order_id: orderId,
      branch_id: order.branch_id || null,
      status: 'pending',
      reason: String(reason).trim(),
      description: String(description || '').trim(),
      refund_method: String(refund_method || 'original_payment'),
      contact_phone: String(contact_phone || '').trim(),
      amount_requested: Number(req.body.amount_requested || amountRequested || 0),
      evidence_images: Array.isArray(evidence_images) ? evidence_images.filter(Boolean).map((url) => String(url)) : [],
      items: normalizedItems,
      timeline: [{
        status: 'pending',
        note: 'Yêu cầu đổi trả đã được tạo',
        by: req.userId,
        timestamp: new Date(),
      }],
    });

    await createUserNotification({
      userId,
      title: 'Yêu cầu đổi trả đã được tiếp nhận',
      message: `Mã yêu cầu: #${String(created._id).slice(-8).toUpperCase()}`,
      type: 'return_request',
      icon: 'assignment_return',
      link: '/account/returns',
      metadata: {
        return_request_id: String(created._id),
        order_id: String(orderId),
      },
    });

    return res.status(201).json({
      success: true,
      data: normalize(created),
      message: 'Đã tạo yêu cầu đổi trả',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const cancel = async (req, res) => {
  try {
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (!canAccessReturnRequest(req, doc)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (String(doc.status) !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy yêu cầu đang chờ xử lý' });
    }

    doc.status = 'cancelled';
    doc.timeline.push({
      status: 'cancelled',
      note: req.body?.note || 'Khách hàng đã hủy yêu cầu đổi trả',
      by: req.userId,
      timestamp: new Date(),
    });
    await doc.save();

    return res.json({ success: true, data: normalize(doc), message: 'Đã hủy yêu cầu đổi trả' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const doc = await ReturnRequest.findById(req.params.id).session(session);
    if (!doc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    const nextStatus = String(req.body.status || '').trim().toLowerCase();
    if (!ALLOWED_RETURN_STATUSES.has(nextStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    doc.status = nextStatus;
    if (req.body.admin_note !== undefined) {
      doc.admin_note = String(req.body.admin_note || '');
    }

    if (['rejected', 'refunded', 'closed'].includes(nextStatus)) {
      doc.resolved_by = req.userId;
      doc.resolved_at = new Date();
    }

    // ERP compliance: Return items to inventory when status becomes 'approved', 'refunded', or 'closed'
    if (['approved', 'refunded', 'closed'].includes(nextStatus) && doc.is_returned_to_stock !== true) {
      if (Array.isArray(doc.items) && doc.items.length > 0) {
        await inventoryService.restoreInventoryFromOrder(doc.items, session, doc.order_id);
        doc.is_returned_to_stock = true;
      }
    }

    doc.timeline.push({
      status: nextStatus,
      note: String(req.body.note || ''),
      by: req.userId,
      timestamp: new Date(),
    });

    await doc.save({ session });

    await session.commitTransaction();
    session.endSession();

    await createUserNotification({
      userId: doc.user_id,
      title: 'Yêu cầu đổi trả được cập nhật',
      message: `Trạng thái mới: ${nextStatus}`,
      type: 'return_request',
      icon: 'assignment_return',
      link: '/account/returns',
      metadata: {
        return_request_id: String(doc._id),
        status: nextStatus,
      },
    });

    return res.json({ success: true, data: normalize(doc), message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};
