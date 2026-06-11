import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import { AdminSetting, AuditLog, NotificationTemplate } from '../models/Misc.js';
import * as bc from '../controllers/bannerController.js';
import { forProduct, create as createReview } from '../controllers/reviewController.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { generateToken } from '../utils/jwt.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ensureRbacSeed, getPermissionsForUser, mapRoleIdToKey } from '../services/rbacService.js';
import { resolveProductPricing } from '../services/pricingResolverService.js';
import { logActivity } from '../services/auditService.js';
import { invalidateMaintenanceCache } from '../middlewares/maintenanceGuard.js';

const router = Router();

router.get('/analytics', auth, admin, async (req, res) => {
  try {
    const totalRevenueAggr = await Order.aggregate([
      { $match: { is_deleted: { $ne: true }, status: 'DELIVERED' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const totalRevenue = totalRevenueAggr.length > 0 ? totalRevenueAggr[0].total : 0;

    const ordersPerDay = await Order.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    const activeUsers = await User.countDocuments({ is_deleted: { $ne: true }, is_active: true });

    const rawTopProducts = await Product.find({ is_deleted: { $ne: true } })
      .sort({ sold_count: -1 })
      .limit(5);

    const topSellingProducts = await Promise.all(
      rawTopProducts.map(async (p) => {
        const pricing = await resolveProductPricing(p, null, null, { now: new Date() });
        const img = (p.images && p.images.length > 0) ? p.images[0] : (p.thumbnail || '');
        const pr = pricing.effective_price ?? p.price ?? p.original_price ?? 0;
        return {
          productId: String(p._id),
          productName: p.name || '',
          image: img,
          quantitySold: p.sold_count || 0,
          price: pr,
          effectivePrice: pr,
          // Keep legacy fields for backward compatibility
          _id: p._id,
          name: p.name || '',
          sold_count: p.sold_count || 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalRevenue,
        ordersPerDay,
        activeUsers,
        topSellingProducts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải analytics' });
  }
});

// Admin Restore Endpoints
router.post('/restore/:model/:id', auth, admin, async (req, res) => {
  try {
    const { model, id } = req.params;
    let Model;
    if (model === 'users') Model = User;
    else if (model === 'products') Model = Product;
    else if (model === 'orders') Model = Order;
    else return res.status(400).json({ success: false, message: 'Invalid model type' });

    const doc = await Model.findOneAndUpdate(
      { _id: id, is_deleted: true },
      { $set: { is_deleted: false } },
      { new: true }
    );
    
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found or not deleted' });
    
    res.json({ success: true, message: 'Restored successfully', data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin auth
router.post('/auth/login', async (req, res) => {
  try {
    await ensureRbacSeed();
    const { email, password } = req.body;
    const loginInput = email?.trim();
    if (!loginInput) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tài khoản đăng nhập' });
    }
    const normalizedInput = loginInput.toLowerCase();
    
    // Log if seed account is missing
    if (normalizedInput === 'admin@lottemart.vn') {
      const exists = await User.findOne({ email: normalizedInput });
      if (!exists) {
        console.warn(`[Admin Auth] Warning: Seed admin account 'admin@lottemart.vn' is missing from the database.`);
      }
    }

    let user = await User.findOne({
      $or: [
        { email: normalizedInput },
        { username: loginInput }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (Number(user.role_id) === 3 || user.role_key === 'customer') {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập admin' });
    }
    
    if (user.status === 'LOCKED' || !user.is_active) {
      return res.status(403).json({ success: false, message: 'Tài khoản admin đã bị khóa' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'Tài khoản admin chưa được kích hoạt' });
    }

    if (!user.password_hash) {
      console.error(`[Admin Auth] User ${normalizedInput} has no password hash.`);
      return res.status(401).json({ success: false, message: 'Tài khoản chưa thiết lập mật khẩu' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
    }
    
    const token = generateToken(user);
    user.role_key = user.role_key || mapRoleIdToKey(user.role_id);
    user.permissions = await getPermissionsForUser(user);
    user.last_login_at = new Date(); 
    await user.save();
    
    return res.json({ success: true, data: { token, admin: user.toPublic() } });
  } catch (err) { 
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: err.message }); 
  }
});

router.get('/auth/verify', auth, admin, (req, res) => {
  return res.json({ success: true, data: { admin: req.user.toPublic() } });
});

// Admin settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await AdminSetting.find();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    return res.json({ success: true, data: obj });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/settings', auth, admin, async (req, res) => {
  try {
    const oldSettings = await AdminSetting.find();
    const oldMap = {};
    oldSettings.forEach(s => { oldMap[s.key] = s.value; });

    for (const [key, value] of Object.entries(req.body)) {
      const oldValue = oldMap[key];
      if (oldValue !== value) {
        await AdminSetting.findOneAndUpdate({ key }, { key, value }, { upsert: true });
        
        if (key === 'maintenance_mode') {
          invalidateMaintenanceCache();
          if (value === true || value === 'true') {
            try {
              const { PaymentTransaction } = await import('../models/Payment.js');
              const result = await PaymentTransaction.updateMany(
                { status: { $in: ['PENDING', 'PROCESSING'] } },
                { $set: { status: 'CANCELLED', 'metadata.cancel_reason': 'System entered maintenance mode' } }
              );
              console.info(`[Maintenance] Cancelled ${result.modifiedCount} pending/processing payment transactions.`);
            } catch (payErr) {
              console.error('[Maintenance] Failed to cancel pending payments:', payErr.message);
            }
          }
          if (global.io) {
            console.info(`[Socket] Broadcasting maintenance:${value ? 'on' : 'off'}`);
            global.io.emit(`maintenance:${value ? 'on' : 'off'}`);
          }
        }

        // Audit log the setting change
        await logActivity({
          userId: req.user.id || req.user._id,
          userName: req.user.username || req.user.full_name || 'Admin',
          action: 'UPDATE',
          entity: 'admin_setting',
          entityId: key,
          details: {
            field: key,
            old_value: oldValue !== undefined ? oldValue : null,
            new_value: value,
            reason: req.body.maintenance_mode_reason || 'System configuration update'
          },
          ip: req.ip
        });
      }
    }
    const settings = await AdminSetting.find();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    return res.json({ success: true, data: obj, message: 'Cập nhật thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/settings/reset', auth, admin, async (req, res) => {
  try { await AdminSetting.deleteMany({}); return res.json({ success: true, message: 'Đã đặt lại' }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Audit logs
router.get('/audit-logs', auth, admin, async (req, res) => {
  try {
    const data = await AuditLog.find().sort('-created_at').limit(100);
    return res.json({ success: true, data });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Notification templates
router.get('/notification-templates', auth, admin, async (req, res) => {
  try { return res.json({ success: true, data: await NotificationTemplate.find() }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/notification-templates/:id', auth, admin, async (req, res) => {
  try { return res.json({ success: true, data: await NotificationTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Analytics dashboard
router.get('/analytics/dashboard', auth, admin, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, orders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find().select('total_amount status'),
    ]);
    const totalRevenue = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + (o.total_amount || 0), 0);
    return res.json({
      success: true,
      data: { totalUsers, totalProducts, totalOrders, totalRevenue,
        ordersByStatus: { pending: orders.filter(o => o.status === 'PENDING').length, delivered: orders.filter(o => o.status === 'DELIVERED').length, cancelled: orders.filter(o => o.status === 'CANCELLED').length } },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Hot deals, featured collections, delivery slots (mounted under /api/admin but also accessible from /api/)
router.get('/hot-deals', bc.listHotDeals);
router.post('/hot-deals', auth, admin, bc.createHotDeal);
router.put('/hot-deals/:id', auth, admin, bc.updateHotDeal);
router.delete('/hot-deals/:id', auth, admin, bc.deleteHotDeal);
router.get('/featured-collections', bc.listFeaturedCollections);
router.get('/delivery-slots', bc.listDeliverySlots);

// Roles & membership tiers — super_admin only
router.get('/roles', auth, admin, async (req, res) => {
  try {
    // Only super_admin can list all roles
    const { isSuperAdmin: checkSA } = await import('../services/rbacService.js');
    if (!checkSA(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden: super admin access required' });
    }
    await ensureRbacSeed();
    const data = await Role.find({ is_active: true }).sort({ level: 1, role_id: 1, created_at: 1 });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/membership-tiers', (req, res) => res.json({ success: true, data: [{ level: 'Đồng', min_points: 0 }, { level: 'Bạc', min_points: 100 }, { level: 'Vàng', min_points: 500 }, { level: 'Kim Cương', min_points: 2000 }] }));

// ═══════════════════════════════════════════════════════
// DEAD LETTER QUEUE — View failed background jobs
// ═══════════════════════════════════════════════════════
router.get('/failed-jobs', auth, admin, async (req, res) => {
  try {
    const { getFailedJobs } = await import('../services/queueService.js');
    const jobs = await getFailedJobs();
    res.json({ success: true, data: jobs, count: jobs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// FEATURE FLAGS — Dynamic enable/disable features
// ═══════════════════════════════════════════════════════
router.get('/feature-flags', auth, admin, async (req, res) => {
  try {
    const { getAllFlags } = await import('../services/featureFlagService.js');
    const flags = await getAllFlags();
    res.json({ success: true, data: flags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/feature-flags/:key', auth, admin, async (req, res) => {
  try {
    const { upsertFlag } = await import('../services/featureFlagService.js');
    const flag = await upsertFlag(
      req.params.key,
      req.body,
      req.user?.email || req.userId || 'admin'
    );
    res.json({ success: true, data: flag, message: 'Feature flag updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/feature-flags/:key', auth, admin, async (req, res) => {
  try {
    const { deleteFlag } = await import('../services/featureFlagService.js');
    await deleteFlag(req.params.key);
    res.json({ success: true, message: 'Feature flag deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// BACKUP MANAGEMENT — View history & trigger manual backup
// ═══════════════════════════════════════════════════════
router.get('/backups', auth, admin, async (req, res) => {
  try {
    const { getBackupHistory } = await import('../scripts/backupMongoDB.js');
    const backups = await getBackupHistory();
    res.json({ success: true, data: backups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/backups', auth, admin, async (req, res) => {
  try {
    const { performBackup } = await import('../scripts/backupMongoDB.js');
    const meta = await performBackup();
    res.json({ success: true, data: meta, message: 'Backup completed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

