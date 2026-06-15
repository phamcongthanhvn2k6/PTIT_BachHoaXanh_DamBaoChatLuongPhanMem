import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import * as c from '../controllers/gamificationController.js';

const router = Router();

// User play endpoints
router.get('/campaign/active', auth, c.getActiveCampaign);
router.get('/checkin/state', auth, c.getCheckinState);
router.get('/my-logs', auth, c.getMyLogs);
router.post('/spin', auth, c.spinWheel);
router.post('/checkin', auth, c.dailyCheckin);

// Admin endpoints
router.get('/admin/campaigns', auth, admin, c.listCampaigns);
router.post('/admin/campaigns', auth, admin, c.createCampaign);
router.put('/admin/campaigns/:id', auth, admin, c.updateCampaign);
router.delete('/admin/campaigns/:id', auth, admin, c.deleteCampaign);
router.get('/admin/logs', auth, admin, c.getLogs);
router.get('/admin/search-users', auth, admin, c.searchUsersForAdmin);
router.get('/admin/analytics/:campaign_id', auth, admin, c.getAnalytics);
router.post('/admin/grant-spins', auth, admin, c.grantSpins);
router.get('/admin/user-spin-status', auth, admin, c.getUserSpinStatus);
router.post('/admin/unlock-user', auth, admin, c.unlockUser);
router.post('/admin/lock-user', auth, admin, c.lockUser);

export default router;
