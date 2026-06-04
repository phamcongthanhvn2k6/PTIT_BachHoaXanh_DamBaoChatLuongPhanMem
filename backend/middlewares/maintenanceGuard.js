import { AdminSetting } from '../models/Misc.js';
import { logActivity } from '../services/auditService.js';

if (!process.env.MAINTENANCE_BYPASS_TOKEN) {
  console.warn('[MaintenanceGuard] ⚠️ WARNING: MAINTENANCE_BYPASS_TOKEN environment variable is not defined. Emergency bypass functionality is disabled.');
}

let lastCheck = 0;
let isMaintenance = false;
const CACHE_TTL = 5000; // Cache database query for 5 seconds to optimize performance

export function invalidateMaintenanceCache() {
  lastCheck = 0;
}

export async function checkMaintenanceMode() {
  if (Date.now() - lastCheck > CACHE_TTL) {
    try {
      const setting = await AdminSetting.findOne({ key: 'maintenance_mode' });
      isMaintenance = setting ? !!setting.value : false;
      lastCheck = Date.now();
    } catch (err) {
      console.error('[MaintenanceGuard] Error reading settings:', err);
      // Fallback: keep last known state if DB is temporarily unavailable
    }
  }
  return isMaintenance;
}

const getNormalizedPath = (req) => {
  const urlPath = req.originalUrl.split('?')[0];
  // Remove version prefix /api/v1 or /api to standardise matches
  return urlPath.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
};

export const maintenanceGuard = async (req, res, next) => {
  try {
    const enabled = await checkMaintenanceMode();
    if (enabled) {
      // 1. Staff/Admin Bypass: role_id != 3 and role_key != 'customer'
      const user = req.user;
      const isStaffOrAdmin = user && !(Number(user.role_id) === 3 || user.role_key === 'customer');

      if (isStaffOrAdmin) {
        return next();
      }

      // 2. Emergency Recovery Bypass via secure env variable only (no hardcoded fallback)
      const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN;
      if (bypassToken && req.headers['x-maintenance-bypass'] === bypassToken) {
        try {
          await logActivity({
            userId: req.user?.id || req.userId || null,
            userName: req.user?.username || 'SYSTEM_BYPASS_CLIENT',
            action: 'MAINTENANCE_BYPASS',
            entity: 'system',
            entityId: 'maintenance_bypass',
            details: {
              severity: 'CRITICAL',
              userId: req.user?.id || req.userId || null,
              email: req.user?.email || null,
              role: req.user?.role_key || req.user?.role_id || null,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              route: req.originalUrl,
              timestamp: new Date().toISOString()
            },
            ip: req.ip
          });
        } catch (auditErr) {
          console.error('[MaintenanceGuard] Failed to log bypass activity:', auditErr.message);
        }
        return next();
      }

      const path = getNormalizedPath(req);
      const method = req.method;

      // 3. Explicit top-level exemptions (Health status, Facebook login callback, etc.)
      if (path === '/health' || path === '/auth/facebook/callback') {
        return next();
      }

      // 4. Webhook / Transaction Reconciliation exemptions
      // Allow confirming, failing, and cancelling transactions to prevent status drift
      const isPaymentConfirmOrCancel = /^\/payments\/[^/]+\/(confirm|fail|cancel)$/.test(path);
      if (isPaymentConfirmOrCancel && method === 'POST') {
        return next();
      }

      // 5. Block strictly transactional pages completely (both GET and POST/PUT/DELETE)
      const isCheckoutOrProcess = path.startsWith('/checkout') || path.startsWith('/payments/process');
      if (isCheckoutOrProcess) {
        return res.status(503).json({
          success: false,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Hệ thống đang bảo trì định kỳ để nâng cấp. Vui lòng quay lại sau.',
          message_en: 'The system is undergoing routine maintenance. Please try again later.',
          message_ja: 'システムは定期メンテナンス中です。後でもう一度お試しください。'
        });
      }

      // 6. Block customer-facing mutations (POST, PUT, DELETE, PATCH) on transactional resources
      const isMutationMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      const isTransactionalRoute = path.startsWith('/cart') || 
                                   path.startsWith('/orders') || 
                                   path.startsWith('/coupons') || 
                                   path.startsWith('/return-requests') ||
                                   path.startsWith('/payments');

      if (isMutationMethod && isTransactionalRoute) {
        return res.status(503).json({
          success: false,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Hệ thống đang bảo trì định kỳ để nâng cấp. Vui lòng quay lại sau.',
          message_en: 'The system is undergoing routine maintenance. Please try again later.',
          message_ja: 'システムは定期メンテナンス中です。後でもう一度お試しください。'
        });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
