import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { generateRecipe } from '../services/aiService.js';
import { matchIngredient } from '../services/ingredientMatchingService.js';

const attachMatchedProducts = async (recipe, branchId) => {
  if (!recipe) return null;
  if (!recipe.ingredients || !branchId) return recipe;

  const matched = [];
  for (const ing of recipe.ingredients) {
    const { match, substitutes } = await matchIngredient(ing.name, branchId);
    matched.push({
      ingredient: ing,
      product: match || null,
      substitutes: substitutes || []
    });
  }
  recipe.matched_ingredients = matched;
  return recipe;
};

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const branchId = '000000000000000000000001';
  console.log('\n--- 1. Testing AI / Fallback Recipe Generation for "Bánh In" ---');
  
  const recipeData = await generateRecipe({ 
    dishName: 'Bánh In', 
    servings: 4, 
    appetite: 'normal' 
  });

  console.log('\nGenerated Recipe Title:', recipeData.title);
  console.log('Difficulty:', recipeData.difficulty);
  console.log('Prep Time:', recipeData.prep_time);
  console.log('Cook Time:', recipeData.cook_time);
  console.log('Tags:', recipeData.tags);
  console.log('Tips:', recipeData.tips);

  console.log('\nNutrition Data:');
  console.log(recipeData.nutrition);

  // Assert that nutrition values are non-zero
  const nutrition = recipeData.nutrition;
  if (nutrition.calories > 0 && nutrition.carbs > 0) {
    console.log('✅ PASS: Nutrition data is non-zero and realistic!');
  } else {
    console.log('❌ FAIL: Nutrition data is zero or invalid!');
  }

  console.log('\nIngredients:');
  recipeData.ingredients.forEach(i => {
    console.log(` - ${i.name}: ${i.quantity} ${i.unit}`);
  });

  // Verify savory check
  const savoryKeywords = ['nước mắm', 'tỏi', 'hành tím', 'thịt', 'sườn', 'cá', 'tôm', 'chả lụa'];
  const hasSavory = recipeData.ingredients.some(i => {
    const nameLower = i.name.toLowerCase();
    return savoryKeywords.some(kw => nameLower.includes(kw));
  });

  if (!hasSavory) {
    console.log('✅ PASS: Recipe has no savory ingredients! Cultural authenticity preserved.');
  } else {
    console.log('❌ FAIL: Recipe contains savory/hallucinated ingredients!');
  }

  console.log('\nSteps:');
  recipeData.steps.forEach((step, idx) => {
    console.log(`  ${idx + 1}. [${step.title || 'Bước'}] ${step.description} (${step.duration || ''})`);
  });

  const firstStepDesc = recipeData.steps[0]?.description || '';
  if (recipeData.steps.length > 0 && !firstStepDesc.includes('stir-fry') && !firstStepDesc.includes('xào')) {
    console.log('✅ PASS: Steps are dish-specific and structured, not savory templates!');
  } else {
    console.log('❌ FAIL: Steps are fallback savory stir-fry templates!');
  }

  console.log('\n--- 2. Testing Ingredient Product Mapping ---');
  const enrichedRecipe = await attachMatchedProducts(recipeData, branchId);

  console.log('\nMapped Products result:');
  enrichedRecipe.matched_ingredients.forEach(item => {
    console.log(`Ingredient: "${item.ingredient.name}"`);
    if (item.product) {
      console.log(`  -> Mapped Product: "${item.product.name}" (Price: ${item.product.price}đ, Stock: ${item.product.stock})`);
    } else {
      console.log('  -> Mapped Product: Không có sản phẩm phù hợp');
    }
  });

  // Check sugar match
  const sugarMatch = enrichedRecipe.matched_ingredients.find(item => item.ingredient.name.toLowerCase().includes('đường'));
  if (sugarMatch && sugarMatch.product && sugarMatch.product.name.includes('Đường tinh luyện Biên Hòa')) {
    console.log('✅ PASS: Sugar correctly mapped to Đường tinh luyện Biên Hòa!');
  } else {
    console.log('❌ FAIL: Sugar mapping incorrect!');
  }

  // Check salt match does not map to salted eggs
  const saltMatch = enrichedRecipe.matched_ingredients.find(item => item.ingredient.name.toLowerCase().includes('muối'));
  if (saltMatch) {
    if (saltMatch.product && saltMatch.product.name.toLowerCase().includes('trứng')) {
      console.log('❌ FAIL: Salt mapped incorrectly to eggs ("Trứng muối")!');
    } else {
      console.log('✅ PASS: Salt does not incorrectly map to eggs!');
    }
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from database.');
}

run().catch(console.error);
