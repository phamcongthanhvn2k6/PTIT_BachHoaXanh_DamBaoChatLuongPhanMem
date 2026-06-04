import Recipe from '../models/Recipe.js';
import { generateRecipe, enrichRecipe } from '../services/aiService.js';
import { matchIngredient } from '../services/ingredientMatchingService.js';

const normalizeStr = (str) => {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const attachMatchedProducts = async (recipeObj, branchId) => {
  if (!recipeObj) return null;
  const recipe = recipeObj.toObject ? recipeObj.toObject() : recipeObj;
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

// GET /api/recipes
export const getRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recipes = await Recipe.find({ status: 'active' })
      .sort('-access_count -createdAt')
      .limit(limit)
      .select('-steps');
    res.json({ success: true, data: recipes });
  } catch (err) {
    console.error('[RecipeList] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recipes/search?q=
export const searchRecipes = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const normQ = normalizeStr(q);
    const exactMatch = await Recipe.findOne({ normalized_name: { $regex: normQ, $options: 'i' }, status: 'active' });
    if (exactMatch) return res.json({ success: true, data: [exactMatch] });

    const partialMatches = await Recipe.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { normalized_name: { $regex: normQ, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ],
      status: 'active'
    }).limit(10);

    return res.json({ success: true, data: partialMatches });
  } catch (err) {
    console.error('[RecipeSearch] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recipes/:id
export const getRecipeById = async (req, res) => {
  try {
    let recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ success: false, message: 'Không tìm thấy công thức' });

    if (!isRecipeComplete(recipe)) {
      console.log(`[RecipeById] Recipe is incomplete (e.g. zero nutrition). Enriching on the fly...`);
      try {
        const enriched = await enrichRecipe(recipe.toObject(), recipe.servings || 2, 'normal');
        if (enriched) {
          recipe.title = enriched.title || recipe.title;
          recipe.description = enriched.description || recipe.description;
          recipe.prep_time = enriched.prep_time || recipe.prep_time;
          recipe.cook_time = enriched.cook_time || recipe.cook_time;
          recipe.difficulty = enriched.difficulty || recipe.difficulty;
          recipe.ingredients = enriched.ingredients || recipe.ingredients;
          recipe.steps = enriched.steps || recipe.steps;
          recipe.tips = enriched.tips || recipe.tips;
          recipe.tags = enriched.tags || recipe.tags;
          recipe.nutrition = enriched.nutrition || recipe.nutrition;
          recipe.completeness_status = 'complete';
          recipe.last_checked_at = new Date();
          recipe.ai_generated = true;
        }
      } catch (err) {
        console.warn(`[RecipeById] Enrichment failed:`, err.message);
      }
    }

    recipe.access_count += 1;
    recipe.last_accessed_at = new Date();
    await recipe.save();

    const branchId = req.query.branchId;
    const finalData = await attachMatchedProducts(recipe, branchId);
    res.json({ success: true, data: finalData });
  } catch (err) {
    console.error('[RecipeById] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recipes/by-name/:name
export const getRecipeByName = async (req, res) => {
  try {
    const norm = normalizeStr(req.params.name);
    let recipe = await Recipe.findOne({ normalized_name: { $regex: `^${norm}`, $options: 'i' } });

    if (recipe) {
      if (!isRecipeComplete(recipe)) {
        console.log(`[RecipeByName] Recipe is incomplete (e.g. zero nutrition). Enriching on the fly...`);
        try {
          const enriched = await enrichRecipe(recipe.toObject(), recipe.servings || 2, 'normal');
          if (enriched) {
            recipe.title = enriched.title || recipe.title;
            recipe.description = enriched.description || recipe.description;
            recipe.prep_time = enriched.prep_time || recipe.prep_time;
            recipe.cook_time = enriched.cook_time || recipe.cook_time;
            recipe.difficulty = enriched.difficulty || recipe.difficulty;
            recipe.ingredients = enriched.ingredients || recipe.ingredients;
            recipe.steps = enriched.steps || recipe.steps;
            recipe.tips = enriched.tips || recipe.tips;
            recipe.tags = enriched.tags || recipe.tags;
            recipe.nutrition = enriched.nutrition || recipe.nutrition;
            recipe.completeness_status = 'complete';
            recipe.last_checked_at = new Date();
            recipe.ai_generated = true;
          }
        } catch (err) {
          console.warn(`[RecipeByName] Enrichment failed:`, err.message);
        }
      }

      recipe.access_count += 1;
      recipe.last_accessed_at = new Date();
      await recipe.save();

      const branchId = req.query.branchId;
      const finalData = await attachMatchedProducts(recipe, branchId);
      return res.json({ success: true, data: finalData });
    }

    return res.status(404).json({ success: false, message: 'Không tìm thấy công thức, vui lòng tạo mới.' });
  } catch (err) {
    console.error('[RecipeByName] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const isRecipeComplete = (recipe) => {
  if (!recipe) return false;
  if (!recipe.title || String(recipe.title).trim().length < 2) return false;
  if (!recipe.description || String(recipe.description).trim().length < 10) return false;
  if (!recipe.prep_time || String(recipe.prep_time).trim().length === 0) return false;
  if (!recipe.cook_time || String(recipe.cook_time).trim().length === 0) return false;
  
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 4) return false;
  for (const ing of recipe.ingredients) {
    if (!ing.name || String(ing.name).trim().length === 0) return false;
    if (!ing.quantity || String(ing.quantity).trim().length === 0) return false;
  }

  if (!Array.isArray(recipe.steps) || recipe.steps.length < 3) return false;
  for (const s of recipe.steps) {
    if (!s.description || String(s.description).trim().length < 25) return false;
  }

  // Nutrition validation: must have non-zero calories, protein, fat, carbs
  if (!recipe.nutrition || 
      (Number(recipe.nutrition.calories || 0) === 0 && 
       Number(recipe.nutrition.protein || 0) === 0 && 
       Number(recipe.nutrition.fat || 0) === 0 && 
       Number(recipe.nutrition.carbs || 0) === 0)) {
    return false;
  }

  return true;
};

const scaleRecipe = (recipe, targetServings) => {
  const currentServings = recipe.servings || 2;
  if (currentServings === targetServings) return recipe;
  
  const ratio = targetServings / currentServings;
  const scaledIngredients = (recipe.ingredients || []).map(ing => {
    const qtyStr = String(ing.quantity || '').trim();
    let scaledQty = qtyStr;
    
    let num = parseFloat(qtyStr);
    if (!isNaN(num)) {
      scaledQty = String(Math.round(num * ratio * 100) / 100);
    } else if (qtyStr.includes('/')) {
      const parts = qtyStr.split('/');
      const num1 = parseFloat(parts[0]);
      const num2 = parseFloat(parts[1]);
      if (!isNaN(num1) && !isNaN(num2)) {
        scaledQty = String(Math.round((num1 / num2) * ratio * 100) / 100);
      }
    }
    
    return {
      ...ing,
      quantity: scaledQty
    };
  });
  
  return {
    ...recipe,
    ingredients: scaledIngredients,
    servings: targetServings
  };
};

// POST /api/recipes/generate
export const generateUserRecipe = async (req, res) => {
  try {
    const { dishName, servings, appetite = 'normal', sourceProductIds = [] } = req.body;
    const branchId = req.query.branchId || req.body.branchId;

    // ── INPUT VALIDATION ──
    if (!dishName || typeof dishName !== 'string' || dishName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên món ăn.' });
    }
    if (dishName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Tên món ăn quá ngắn (tối thiểu 2 ký tự).' });
    }
    if (dishName.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Tên món ăn quá dài (tối đa 100 ký tự).' });
    }
    if (servings === undefined || servings === null || isNaN(Number(servings))) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn số người ăn (1-10).' });
    }

    const srv = Math.min(10, Math.max(1, parseInt(servings, 10)));
    const cleanDishName = dishName.trim();
    const validAppetites = ['small', 'normal', 'large'];
    const cleanAppetite = validAppetites.includes(appetite) ? appetite : 'normal';
    const canonicalKey = normalizeStr(cleanDishName) + '-' + srv + '-' + cleanAppetite;

    console.log(`[RecipeGenerate] ═══════════════════════════════════════`);
    console.log(`[RecipeGenerate] Request: "${cleanDishName}" for ${srv} servings (appetite=${cleanAppetite})`);
    console.log(`[RecipeGenerate] Canonical Key: "${canonicalKey}"`);

    // ── DB-FIRST: lookup exact match or alias ──
    let recipeObj = await Recipe.findOne({
      $or: [
        { normalized_name: canonicalKey },
        { canonical_key: canonicalKey },
        { aliases: canonicalKey }
      ],
      status: 'active'
    });

    let wasScaled = false;
    let cached = false;

    if (recipeObj) {
      console.log(`[RecipeGenerate] ✅ CACHE HIT (exact match): "${recipeObj.title}" (id=${recipeObj._id})`);
      cached = true;
    } else {
      // Look up any recipe for the same dish base key, regardless of servings or appetite
      const baseDishKey = normalizeStr(cleanDishName);
      const similarRecipe = await Recipe.findOne({
        normalized_name: { $regex: '^' + baseDishKey + '-' },
        status: 'active'
      });

      if (similarRecipe) {
        console.log(`[RecipeGenerate] 🔄 CACHE HIT (similar dish): "${similarRecipe.title}" (servings=${similarRecipe.servings}). Scaling ingredients to ${srv} servings.`);
        recipeObj = scaleRecipe(similarRecipe.toObject(), srv);
        recipeObj.canonical_key = canonicalKey;
        recipeObj.normalized_name = canonicalKey;
        recipeObj.source_product_ids = sourceProductIds || recipeObj.source_product_ids || [];
        wasScaled = true;
        cached = true;
      }
    }

    // ── AI GENERATION OR ENRICHMENT ──
    if (cached) {
      // Check completeness
      const isComplete = isRecipeComplete(recipeObj);
      if (!isComplete) {
        console.log(`[RecipeGenerate] ⚠️ Cached recipe is INCOMPLETE. Enriching with AI...`);
        try {
          const enriched = await enrichRecipe(
            recipeObj.toObject ? recipeObj.toObject() : recipeObj,
            srv,
            cleanAppetite
          );
          if (enriched) {
            recipeObj.title = enriched.title || recipeObj.title;
            recipeObj.description = enriched.description || recipeObj.description;
            recipeObj.prep_time = enriched.prep_time || recipeObj.prep_time;
            recipeObj.cook_time = enriched.cook_time || recipeObj.cook_time;
            recipeObj.difficulty = enriched.difficulty || recipeObj.difficulty;
            recipeObj.ingredients = enriched.ingredients || recipeObj.ingredients;
            recipeObj.steps = enriched.steps || recipeObj.steps;
            recipeObj.tips = enriched.tips || recipeObj.tips;
            recipeObj.tags = enriched.tags || recipeObj.tags;
            recipeObj.nutrition = enriched.nutrition || recipeObj.nutrition;
            recipeObj.completeness_status = 'complete';
            recipeObj.last_checked_at = new Date();
            recipeObj.canonical_key = canonicalKey;
            recipeObj.normalized_name = canonicalKey;
            recipeObj.ai_generated = true;
            recipeObj.source_type = 'ai_generated';
            recipeObj.source_product_ids = sourceProductIds || recipeObj.source_product_ids || [];

            if (recipeObj.save && !wasScaled) {
              await recipeObj.save();
              console.log(`[RecipeGenerate] Enriched existing recipe saved: id=${recipeObj._id}`);
            } else {
              if (recipeObj._id) delete recipeObj._id; // Ensure clean insert
              recipeObj = await Recipe.create(recipeObj);
              console.log(`[RecipeGenerate] Created and saved new enriched recipe: id=${recipeObj._id}`);
            }
          }
        } catch (enrichError) {
          console.warn(`[RecipeGenerate] AI Enrichment failed. Returning base cached recipe. Error:`, enrichError.message);
        }
      } else {
        // Exact match cache hit - increment access count
        if (recipeObj.save && !wasScaled) {
          recipeObj.access_count += 1;
          recipeObj.last_accessed_at = new Date();
          await recipeObj.save();
        } else if (wasScaled) {
          // Save scaled complete recipe to cache
          if (recipeObj._id) delete recipeObj._id;
          recipeObj.completeness_status = 'complete';
          recipeObj.last_checked_at = new Date();
          recipeObj = await Recipe.create(recipeObj);
          console.log(`[RecipeGenerate] Scaled complete recipe saved to cache: id=${recipeObj._id}`);
        }
      }

      const finalData = await attachMatchedProducts(recipeObj, branchId);
      return res.json({ success: true, data: finalData, cached: true });
    }

    // ── CACHE MISS: Generate completely new recipe ──
    console.log(`[RecipeGenerate] ❌ Cache miss — generating new recipe with AI...`);
    let generatedData = null;
    try {
      generatedData = await generateRecipe({ dishName: cleanDishName, servings: srv, appetite: cleanAppetite });
    } catch (aiError) {
      console.error(`[RecipeGenerate] AI service error:`, aiError.message);
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.'
      });
    }

    if (!generatedData) {
      return res.status(500).json({
        success: false,
        message: 'AI không thể tạo công thức chi tiết cho món này. Vui lòng thử lại.'
      });
    }

    // Prepare for DB
    generatedData.normalized_name = canonicalKey;
    generatedData.canonical_key = canonicalKey;
    generatedData.servings = srv;
    generatedData.ai_generated = true;
    generatedData.source_type = 'ai_generated';
    generatedData.status = 'active';
    generatedData.completeness_status = 'complete';
    generatedData.last_checked_at = new Date();
    generatedData.source_product_ids = sourceProductIds;

    // Save
    try {
      const newRecipe = await Recipe.create(generatedData);
      console.log(`[RecipeGenerate] ✅ SAVED new recipe: "${newRecipe.title}" (id=${newRecipe._id})`);
      const finalData = await attachMatchedProducts(newRecipe, branchId);
      return res.json({ success: true, data: finalData, cached: false });
    } catch (saveError) {
      if (saveError.code === 11000) {
        // Race condition fallback
        const dup = await Recipe.findOne({ normalized_name: canonicalKey });
        if (dup) {
          const finalData = await attachMatchedProducts(dup, branchId);
          return res.json({ success: true, data: finalData, cached: true });
        }
      }
      throw saveError;
    }
  } catch (err) {
    console.error('[RecipeGenerate] Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo công thức.' });
  }
};

// POST /api/recipes/preview
export const previewUserRecipe = async (req, res) => {
  try {
    const { dishName, servings, appetite = 'normal', sourceProductIds = [] } = req.body;
    const branchId = req.query.branchId || req.body.branchId;

    if (!dishName || typeof dishName !== 'string' || dishName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên món ăn.' });
    }
    if (dishName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Tên món ăn quá ngắn (tối thiểu 2 ký tự).' });
    }
    if (dishName.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Tên món ăn quá dài (tối đa 100 ký tự).' });
    }
    if (servings === undefined || servings === null || isNaN(Number(servings))) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn số người ăn (1-10).' });
    }

    const srv = Math.min(10, Math.max(1, parseInt(servings, 10)));
    const cleanDishName = dishName.trim();
    const validAppetites = ['small', 'normal', 'large'];
    const cleanAppetite = validAppetites.includes(appetite) ? appetite : 'normal';
    const canonicalKey = normalizeStr(cleanDishName) + '-' + srv + '-' + cleanAppetite;

    console.log(`[RecipePreview] Ephemeral request: "${cleanDishName}" for ${srv} servings`);

    // 1. Exact match lookup in DB
    let recipeObj = await Recipe.findOne({
      $or: [
        { normalized_name: canonicalKey },
        { canonical_key: canonicalKey },
        { aliases: canonicalKey }
      ],
      status: 'active'
    });

    if (recipeObj) {
      console.log(`[RecipePreview] ✅ DB Exact match hit: "${recipeObj.title}"`);
      const isComplete = isRecipeComplete(recipeObj);
      if (!isComplete) {
        console.log(`[RecipePreview] Cached recipe is incomplete. Enriching...`);
        try {
          const enriched = await enrichRecipe(recipeObj.toObject(), srv, cleanAppetite);
          if (enriched) {
            recipeObj = enriched;
            recipeObj.canonical_key = canonicalKey;
            recipeObj.normalized_name = canonicalKey;
          }
        } catch (err) {
          console.warn(`[RecipePreview] Enrichment failed:`, err.message);
        }
      }
      const finalData = await attachMatchedProducts(recipeObj, branchId);
      return res.json({ success: true, data: finalData, cached: true, isSaved: true });
    }

    // 2. Similar dish scaling lookup
    const baseDishKey = normalizeStr(cleanDishName);
    const similarRecipe = await Recipe.findOne({
      normalized_name: { $regex: '^' + baseDishKey + '-' },
      status: 'active'
    });

    if (similarRecipe) {
      console.log(`[RecipePreview] 🔄 DB Similar match hit: "${similarRecipe.title}". Scaling...`);
      let scaled = scaleRecipe(similarRecipe.toObject(), srv);
      scaled.canonical_key = canonicalKey;
      scaled.normalized_name = canonicalKey;
      scaled.source_product_ids = sourceProductIds || scaled.source_product_ids || [];
      const finalData = await attachMatchedProducts(scaled, branchId);
      return res.json({ success: true, data: finalData, cached: true, isSaved: false });
    }

    // 3. AI Generation
    console.log(`[RecipePreview] ❌ DB Miss. Generating via AI...`);
    let generatedData = null;
    try {
      generatedData = await generateRecipe({ dishName: cleanDishName, servings: srv, appetite: cleanAppetite });
    } catch (aiError) {
      console.error(`[RecipePreview] AI generation error:`, aiError.message);
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.'
      });
    }

    if (!generatedData) {
      return res.status(500).json({
        success: false,
        message: 'AI không thể tạo công thức cho món ăn này.'
      });
    }

    generatedData.normalized_name = canonicalKey;
    generatedData.canonical_key = canonicalKey;
    generatedData.servings = srv;
    generatedData.ai_generated = true;
    generatedData.source_type = 'ai_generated';
    generatedData.status = 'active';
    generatedData.completeness_status = 'complete';
    generatedData.last_checked_at = new Date();
    generatedData.source_product_ids = sourceProductIds;

    const finalData = await attachMatchedProducts(generatedData, branchId);
    return res.json({ success: true, data: finalData, cached: false, isSaved: false });
  } catch (err) {
    console.error('[RecipePreview] Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo công thức xem trước.' });
  }
};

// POST /api/recipes/save
export const saveUserRecipe = async (req, res) => {
  try {
    const recipeData = req.body;
    if (!recipeData || !recipeData.title || !recipeData.normalized_name) {
      return res.status(400).json({ success: false, message: 'Dữ liệu công thức không hợp lệ.' });
    }

    let existing = await Recipe.findOne({ normalized_name: recipeData.normalized_name });
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Công thức đã tồn tại trong hệ thống.' });
    }

    if (req.user) {
      recipeData.created_by = req.user._id;
    }
    recipeData.status = 'active';

    const savedRecipe = await Recipe.create(recipeData);
    console.log(`[RecipeSave] Saved new recipe to DB: "${savedRecipe.title}" (id=${savedRecipe._id})`);
    return res.json({ success: true, data: savedRecipe });
  } catch (err) {
    if (err.code === 11000) {
      const dup = await Recipe.findOne({ normalized_name: req.body.normalized_name });
      if (dup) {
        return res.json({ success: true, data: dup });
      }
    }
    console.error('[RecipeSave] Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lưu công thức.' });
  }
};
