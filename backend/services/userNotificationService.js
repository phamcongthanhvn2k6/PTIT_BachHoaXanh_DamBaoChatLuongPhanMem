import Notification from '../models/Notification.js';
import { enqueueJob } from './queueService.js';

export const processNotificationJob = async (data) => {
  const { userId, title, message, type, icon, link, metadata } = data;
  if (!userId || !title) return null;

  try {
    const created = await Notification.create({
      user_id: userId,
      title: String(title),
      message: String(message || ''),
      type,
      icon,
      link,
      is_read: false,
      metadata,
    });

    if (global.io) {
      global.io.to(`user_${userId}`).emit('new_notification', created);
    }

    return created;
  } catch (err) {
    console.error('Failed to process notification job', err);
    throw err;
  }
};

export const createUserNotification = async (data) => {
  if (!data.userId || !data.title) return null;
  // Fire and forget via Queue
  enqueueJob('notification', 'create_notification', data).catch(err => {
    console.error('Failed to enqueue notification', err);
  });
  return true;
};

const ORDER_STATUS_LABELS = {
  PENDING: 'Đang chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã hoàn trả',
};

export const notifyOrderStatusChanged = async ({
  userId,
  orderId,
  status,
  note = '',
}) => {
  const statusLabel = ORDER_STATUS_LABELS[String(status || '').toUpperCase()] || String(status || 'Unknown');
  return createUserNotification({
    userId,
    title: `Đơn hàng #${orderId} cập nhật`,
    message: note ? `${statusLabel}. ${note}` : `Trạng thái mới: ${statusLabel}`,
    type: 'order',
    icon: 'local_shipping',
    link: `/account/orders/${orderId}`,
    metadata: {
      order_id: String(orderId),
      status: String(status || ''),
    },
  });
};

export const notifyPointsEarned = async ({
  userId,
  points,
  orderId = null,
  newBalance = null,
}) => {
  return createUserNotification({
    userId,
    title: `Bạn vừa nhận ${Number(points || 0).toLocaleString('vi-VN')} L.Point`,
    message: newBalance !== null
      ? `Số dư hiện tại: ${Number(newBalance || 0).toLocaleString('vi-VN')} L.Point`
      : 'Điểm thưởng đã được cập nhật.',
    type: 'loyalty',
    icon: 'military_tech',
    link: '/account/loyalty',
    metadata: {
      points: Number(points || 0),
      order_id: orderId ? String(orderId) : null,
      new_balance: newBalance,
    },
  });
};

export const notifyPointsAdjusted = async ({
  userId,
  delta,
  newBalance,
  reason = '',
}) => {
  const amount = Number(delta || 0);
  const increase = amount >= 0;
  return createUserNotification({
    userId,
    title: increase
      ? `Bạn được cộng ${amount.toLocaleString('vi-VN')} L.Point`
      : `Bạn bị trừ ${Math.abs(amount).toLocaleString('vi-VN')} L.Point`,
    message: reason
      ? `${reason}. Số dư hiện tại: ${Number(newBalance || 0).toLocaleString('vi-VN')} L.Point`
      : `Số dư hiện tại: ${Number(newBalance || 0).toLocaleString('vi-VN')} L.Point`,
    type: 'loyalty',
    icon: 'military_tech',
    link: '/account/loyalty',
    metadata: {
      delta: amount,
      new_balance: Number(newBalance || 0),
      reason,
    },
  });
};

export const notifyPaymentSuccess = async ({ userId, orderId, amount }) => {
  return createUserNotification({
    userId,
    title: 'Thanh toán thành công',
    message: `Đơn hàng #${orderId} đã được thanh toán ${Number(amount || 0).toLocaleString('vi-VN')}đ`,
    type: 'payment',
    icon: 'check_circle',
    link: `/account/orders/${orderId}`,
    metadata: { order_id: String(orderId), amount: Number(amount || 0), event: 'payment_success' },
  });
};

export const notifyPaymentFailed = async ({ userId, orderId, reason = '' }) => {
  return createUserNotification({
    userId,
    title: 'Thanh toán thất bại',
    message: reason || `Đơn hàng #${orderId} chưa được thanh toán. Vui lòng thử lại.`,
    type: 'payment',
    icon: 'error',
    link: `/account/orders/${orderId}`,
    metadata: { order_id: String(orderId), event: 'payment_failed', reason },
  });
};
