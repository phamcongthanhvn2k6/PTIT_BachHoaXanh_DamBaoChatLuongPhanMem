import express from 'express';
import * as promotionController from '../controllers/promotionController.js';
import { auth, admin, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', optionalAuth, promotionController.list);
router.get('/my-wallet', auth, promotionController.myWallet);
router.get('/claims', auth, admin, promotionController.claims);
router.post('/bulk-expiring', auth, admin, promotionController.bulkCreateExpiringPromotions);
router.get('/applicable', optionalAuth, promotionController.applicable);
router.post('/calculate', optionalAuth, promotionController.calculate);
router.post('/:id/claim', auth, promotionController.claim);
router.get('/:id/usage', auth, admin, promotionController.usage);
router.get('/:id', promotionController.detail);

// Admin Routes
router.post('/', auth, admin, promotionController.create);
router.put('/:id', auth, admin, promotionController.update);
router.delete('/:id', auth, admin, promotionController.remove);
router.post('/:id/activate', auth, admin, promotionController.activate);
router.post('/:id/pause', auth, admin, promotionController.pause);

export default router;
