import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getRecommendations);

export default router;
