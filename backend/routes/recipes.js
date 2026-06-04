import express from 'express';
import { getRecipes, searchRecipes, getRecipeByName, getRecipeById, generateUserRecipe, previewUserRecipe, saveUserRecipe } from '../controllers/recipeController.js';
import { optionalAuth } from '../middlewares/auth.js';
import { recipeRateLimiter } from '../middlewares/recipeRateLimiter.js';

const router = express.Router();

router.get('/', getRecipes);
router.get('/search', searchRecipes);
router.get('/by-name/:name', getRecipeByName);
router.post('/generate', optionalAuth, recipeRateLimiter, generateUserRecipe);
router.post('/preview', optionalAuth, recipeRateLimiter, previewUserRecipe);
router.post('/save', optionalAuth, saveUserRecipe);
router.get('/:id', getRecipeById);

export default router;
