import { Router } from 'express';
import { auth, admin, optionalAuth } from '../middlewares/auth.js';
import {
  listFlashDeals,
  detailFlashDeal,
  createFlashDeal,
  updateFlashDeal,
  removeFlashDeal,
  toggleFlashDeal,
  cleanupFlashDeals,
} from '../controllers/flashDealController.js';

const router = Router();

router.get('/', optionalAuth, listFlashDeals);
router.post('/cleanup/run', auth, admin, cleanupFlashDeals);
router.get('/:id', optionalAuth, detailFlashDeal);
router.post('/', auth, admin, createFlashDeal);
router.put('/:id', auth, admin, updateFlashDeal);
router.delete('/:id', auth, admin, removeFlashDeal);
router.patch('/:id/toggle', auth, admin, toggleFlashDeal);

export default router;
