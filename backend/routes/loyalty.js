import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import * as c from '../controllers/loyaltyController.js';
const router = Router();
router.get('/transactions', auth, c.transactions);
router.get('/rules', c.rules);
router.put('/rules', auth, admin, c.updateRules);
router.post('/redeem', auth, c.redeemPoints);
export default router;
