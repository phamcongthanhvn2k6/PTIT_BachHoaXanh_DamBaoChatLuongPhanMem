import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import * as c from '../controllers/questionController.js';

const router = Router();

router.get('/settings', auth, admin, c.getSettings);
router.put('/settings', auth, admin, c.updateSettings);

router.get('/', auth, admin, c.listAll);
router.put('/:id', auth, admin, c.update);
router.delete('/:id', auth, admin, c.remove);

export default router;
