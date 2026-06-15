import { Router } from 'express';
import { auth, admin, requirePermission } from '../middlewares/auth.js';
import * as c from '../controllers/inventoryBatchController.js';

const router = Router();

router.get('/', auth, admin, requirePermission('inventory.read'), c.list);
router.get('/alerts/low-stock', auth, admin, requirePermission('inventory.read'), c.lowStockAlerts);
router.get('/alerts/expiring', auth, admin, requirePermission('inventory.read'), c.expiringAlerts);
router.post('/draft-promotion', auth, admin, requirePermission('promotions.write'), c.draftPromotionFromAlert);

// Reconciliation / Drift routes (must be before /:id)
router.get('/reconciliation/drift-report', auth, admin, requirePermission('inventory.read'), c.driftReport);
router.post('/reconciliation/auto-heal', auth, admin, requirePermission('inventory.write'), c.autoHealProduct);
router.post('/reconciliation/auto-heal-all', auth, admin, requirePermission('inventory.write'), c.autoHealAll);

router.get('/:id', auth, admin, requirePermission('inventory.read'), c.detail);
router.post('/', auth, admin, requirePermission('inventory.write'), c.create);
router.put('/:id', auth, admin, requirePermission('inventory.write'), c.update);

export default router;

