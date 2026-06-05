import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import * as c from '../controllers/popupAdController.js';

const router = Router();

router.get('/', c.listPopupAds);
router.get('/:id', c.detailPopupAd);
router.post('/', auth, admin, c.createPopupAd);
router.put('/:id', auth, admin, c.updatePopupAd);
router.delete('/:id', auth, admin, c.deletePopupAd);

export default router;
