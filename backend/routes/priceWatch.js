import express from 'express';
import { createPriceWatch, getPriceWatches, updatePriceWatch, deletePriceWatch } from '../controllers/priceWatchController.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/', auth, createPriceWatch);
router.get('/', auth, getPriceWatches);
router.patch('/:id', auth, updatePriceWatch);
router.delete('/:id', auth, deletePriceWatch);

export default router;
