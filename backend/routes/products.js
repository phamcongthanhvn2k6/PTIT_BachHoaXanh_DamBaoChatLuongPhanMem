import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';
import * as c from '../controllers/productController.js';
import * as c_review from '../controllers/reviewController.js';

const router = Router();

router.get('/', cacheMiddleware(60), c.list);
router.get('/search', cacheMiddleware(60), c.search);
router.get('/policies', cacheMiddleware(300), c.policies);
router.get('/compare', cacheMiddleware(60), c.compare);
router.get('/expiring', cacheMiddleware(60), c.getExpiringProducts);
router.get('/recommendations', c.smartRecommendations); // Must be before /:id
router.get('/:id', cacheMiddleware(60), c.detail);
router.get('/:id/related', cacheMiddleware(120), c.related);
router.get('/:id/recommendations', c.recommendations);
router.get('/:id/questions', c.questions);
router.post('/:id/questions', auth, c.askQuestion);
router.post('/:id/questions/:questionId/reply', auth, admin, c.replyQuestion);
router.get('/:id/reviews', c_review.forProduct);
router.post('/:id/reviews', auth, c_review.create);
router.get('/:id/promotions', c.promotionsDetail);
router.get('/:id/coupons', c.couponsDetail);
router.post('/', auth, admin, c.create);
router.put('/:id', auth, admin, c.update);
router.delete('/:id', auth, admin, c.remove);

export default router;
