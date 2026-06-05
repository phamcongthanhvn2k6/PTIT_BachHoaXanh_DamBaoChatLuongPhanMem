import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import mongoose from 'mongoose';

const parseId = (id) => {
  if (!id) return null;
  if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const normalizeStr = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/đ/g, 'd')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
};

// Map of standard ingredients to rules
const INGREDIENT_RULES = {
  'banh mi': {
    required: ['banh mi', 'baguette', 'sandwich', 'banh my'],
    forbidden: ['quy', 'keo', 'ngot', 'bot', 'trung thu', 'hao hao', 'mi goi'],
    categories: ['Thực phẩm', 'Bánh mì']
  },
  'pate': {
    required: ['pate'],
    forbidden: ['coca', 'pepsi', 'sua', 'quy', 'keo', 'nuoc ngot'],
    categories: ['Thực phẩm', 'Đồ hộp', 'Thịt chế biến']
  },
  'cha lua': {
    required: ['cha lua', 'gio lua'],
    forbidden: ['coca', 'pepsi', 'sua', 'quy', 'keo'],
    categories: ['Thực phẩm', 'Thịt chế biến']
  },
  'dui ga': {
    required: ['ga', 'dui ga', 'canh ga', 'uc ga'],
    forbidden: ['coca', 'pepsi', 'sua', 'banh', 'keo', 'trung', 'nuoc ngot', 'bia'],
    categories: ['Thực phẩm', 'Tươi sống', 'Thịt gia cầm']
  },
  'thit ga': {
    required: ['ga', 'thit ga', 'dui ga', 'canh ga', 'uc ga'],
    forbidden: ['coca', 'pepsi', 'sua', 'banh', 'keo', 'trung', 'nuoc ngot', 'bia'],
    categories: ['Thực phẩm', 'Tươi sống', 'Thịt gia cầm']
  },
  'thit ba chi': {
    required: ['ba chi', 'thit heo', 'thit lon'],
    forbidden: ['coca', 'pepsi', 'sua', 'keo', 'banh', 'nuoc ngot'],
    categories: ['Thực phẩm', 'Tươi sống', 'Thịt chế biến']
  },
  'thit': {
    required: ['thit', 'xa xiu', 'heo', 'bo', 'ga', 'ba chi', 'gio thu'],
    forbidden: ['coca', 'pepsi', 'sua', 'quy', 'keo', 'tao', 'le'],
    categories: ['Thực phẩm', 'Tươi sống', 'Thịt chế biến']
  },
  'nuoc mam': {
    required: ['nuoc mam', 'nam ngu', 'phu quoc', 'chin su'],
    forbidden: ['coca', 'pepsi', 'bia', 'nuoc ngot', 'sua'],
    categories: ['Thực phẩm', 'Gia vị']
  },
  'nuoc tuong': {
    required: ['nuoc tuong', 'xi dau', 'maggi', 'chinsu'],
    forbidden: ['mi', 'hao hao', 'coca', 'pepsi', 'sua'],
    categories: ['Thực phẩm', 'Gia vị']
  },
  'duong': {
    required: ['duong'],
    forbidden: ['coca', 'pepsi', 'bia', 'nuoc ngot', 'sua tuoi'],
    categories: ['Thực phẩm', 'Gia vị', 'Gia vị & Nguyên liệu nấu ăn']
  },
  'hanh tim': {
    required: ['hanh', 'hanh tim', 'hanh tay'],
    forbidden: ['coca', 'pepsi', 'sua', 'bia', 'keo'],
    categories: ['Thực phẩm', 'Rau củ', 'Gia vị']
  },
  'toi': {
    required: ['toi'],
    forbidden: ['coca', 'pepsi', 'sua', 'bia', 'keo', 'banh'],
    categories: ['Thực phẩm', 'Rau củ', 'Gia vị']
  },
  'dau an': {
    required: ['dau an', 'dau nau', 'dau thuc vat', 'dau me'],
    forbidden: ['coca', 'pepsi', 'sua', 'bia'],
    categories: ['Thực phẩm', 'Dầu ăn']
  },
  'nuoc dua': {
    required: ['nuoc dua', 'dua tuoi'],
    forbidden: ['coca', 'pepsi', 'bia', 'sua'],
    categories: ['Thực phẩm', 'Nước giải khát']
  },
  'dua leo': {
    required: ['dua leo', 'dua chuot'],
    forbidden: ['sua', 'pepsi', 'coca', 'banh quy'],
    categories: ['Thực phẩm', 'Rau củ']
  },
  'trung': {
    required: ['trung'],
    forbidden: ['coca', 'pepsi', 'sua', 'banh quy', 'mi'],
    categories: ['Thực phẩm', 'Trứng']
  },
  'ca chua': {
    required: ['ca chua'],
    forbidden: ['coca', 'pepsi', 'le', 'tao'],
    categories: ['Thực phẩm', 'Rau củ']
  },
  'do chua': {
    required: ['do chua', 'cu cai', 'ca rot', 'dua gop'],
    forbidden: ['le', 'tao', 'coca', 'pepsi'],
    categories: ['Thực phẩm', 'Rau củ']
  },
  'sot bo': {
    required: ['sot', 'bo', 'mayonnaise'],
    forbidden: ['banh quy', 'coca', 'pepsi'],
    categories: ['Thực phẩm', 'Gia vị', 'Bơ sữa']
  },
  'ot': {
    required: ['ot', 'ot tuoi', 'ot hiem'],
    forbidden: ['coca', 'pepsi', 'sua', 'bia', 'banh'],
    categories: ['Thực phẩm', 'Rau củ', 'Gia vị']
  },
  'tieu': {
    required: ['tieu', 'tieu den', 'tieu xay'],
    forbidden: ['coca', 'pepsi', 'sua', 'bia', 'banh'],
    categories: ['Thực phẩm', 'Gia vị']
  },
  'muoi': {
    required: ['muoi', 'muoi say', 'muoi tinh'],
    forbidden: ['trung', 'banh', 'hat dieu', 'tom', 'ot', 'tieu', 'ga', 'heo', 'bo', 'coca', 'pepsi', 'sua', 'bia'],
    categories: ['Thực phẩm', 'Gia vị', 'Gia vị & Nguyên liệu nấu ăn']
  },
  'bot nep': {
    required: ['bot nep', 'bot gao', 'nep nuong'],
    forbidden: ['giat', 'omo', 'comfort', 'ngot', 'ajinomoto', 'nem', 'canh', 'coca', 'pepsi', 'sua'],
    categories: ['Thực phẩm', 'Gia vị', 'Nguyên liệu làm bánh']
  },
  'bot banh in': {
    required: ['bot nep', 'bot gao', 'nep nuong'],
    forbidden: ['giat', 'omo', 'comfort', 'ngot', 'ajinomoto', 'nem', 'canh', 'coca', 'pepsi', 'sua'],
    categories: ['Thực phẩm', 'Gia vị', 'Nguyên liệu làm bánh']
  },
  'bot gao': {
    required: ['bot gao', 'bot nep', 'gao st25', 'gao lut'],
    forbidden: ['giat', 'omo', 'comfort', 'ngot', 'ajinomoto', 'nem', 'canh', 'coca', 'pepsi', 'sua'],
    categories: ['Thực phẩm', 'Gia vị', 'Nguyên liệu làm bánh']
  },
  'dau xanh': {
    required: ['dau xanh', 'mung bean'],
    forbidden: ['sua', 'dau nanh', 'fami', 'dau thuc vat', 'dau an', 'dau phong', 'dau do', 'dau den'],
    categories: ['Thực phẩm', 'Hạt']
  },
  'nuoc hoa buoi': {
    required: ['buoi da xanh', 'hoa buoi'],
    forbidden: ['la vie', 'coca', 'pepsi', 'bia', 'sua', 'tra', 'xo'],
    categories: ['Thực phẩm']
  },
  'dua bao': {
    required: ['dua bao', 'cui dua', 'dua nao', 'dua tuoi'],
    forbidden: ['sua', 'pepsi', 'coca', 'dau an'],
    categories: ['Thực phẩm']
  }
};

const calculateScore = (product, ingredientName, rule) => {
  const pNameNorm = normalizeStr(product.name);
  const ingNameNorm = normalizeStr(ingredientName);

  // Check forbidden keywords
  if (rule && rule.forbidden) {
    for (const f of rule.forbidden) {
      if (pNameNorm.includes(normalizeStr(f))) return 0;
    }
  }

  // Check required keywords
  if (rule && rule.required) {
    const hasRequired = rule.required.some(r => pNameNorm.includes(normalizeStr(r)));
    if (!hasRequired) return 0;
  }

  // Calculate word overlap
  const pWords = pNameNorm.split('-');
  const ingWords = ingNameNorm.split('-');

  const intersection = pWords.filter(w => ingWords.includes(w));
  const union = Array.from(new Set([...pWords, ...ingWords]));

  const jaccard = union.length > 0 ? intersection.length / union.length : 0;
  let score = jaccard * 100;

  // Add bonus for exact substring match
  if (pNameNorm.includes(ingNameNorm) || ingNameNorm.includes(pNameNorm)) {
    score += 30;
  }

  // Add bonus for matching rule categories / tags
  if (rule && rule.categories) {
    const hasCategoryMatch = rule.categories.includes(product.category_name);
    const hasTagMatch = product.tags && product.tags.some(t => rule.categories.includes(t));
    if (hasCategoryMatch || hasTagMatch) {
      score += 20;
    }
  }

  return score;
};

/**
 * Fuzzy matches an ingredient name to available, active, in-stock branch products.
 * Uses category restriction, synonym dictionary, scoring, and strict inventory filters.
 */
export const matchIngredient = async (ingredientName, branchIdStr) => {
  try {
    const branchId = parseId(branchIdStr);
    if (!branchId) return { match: null, substitutes: [] };

    const normIng = normalizeStr(ingredientName);
    if (!normIng) return { match: null, substitutes: [] };

    // Find rule matching standard ingredient synonyms
    let ruleKey = Object.keys(INGREDIENT_RULES).find(k => normIng.includes(normalizeStr(k)));
    let rule = ruleKey ? INGREDIENT_RULES[ruleKey] : null;

    if (!rule) {
      const firstWord = ingredientName.trim().split(/\s+/)[0]?.toLowerCase();
      rule = {
        required: firstWord ? [firstWord] : [],
        forbidden: ['coca', 'pepsi', 'omo', 'sunlight'].filter(f => f !== firstWord),
        categories: []
      };
    }

    const keywords = rule && rule.required && rule.required.length > 0 ? rule.required : [];
    if (keywords.length === 0) {
      const firstWord = ingredientName.trim().split(/\s+/)[0]?.toLowerCase();
      if (firstWord) keywords.push(firstWord);
    }

    if (keywords.length === 0) {
      return { match: null, substitutes: [] };
    }

    // Build regex query matching any of the required keywords against name or slug
    const queryConditions = [];
    for (const kw of keywords) {
      const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      queryConditions.push({ name: { $regex: escapedKw, $options: 'i' } });
      const normKw = normalizeStr(kw);
      if (normKw) {
        queryConditions.push({ slug: { $regex: normKw.replace(/-/g, '.*'), $options: 'i' } });
      }
    }

    // Fetch candidate active products from the store database
    const products = await Product.find({
      is_active: true,
      is_deleted: { $ne: true },
      $or: queryConditions
    }).lean();

    if (products.length === 0) {
      return { match: null, substitutes: [] };
    }

    // Fetch all branch products for candidates in a single query (batch match)
    const productIds = products.map(p => p._id);
    const bps = await BranchProduct.find({
      product_id: { $in: productIds },
      branch_id: branchId,
      stock: { $gt: 0 },
      is_available: true
    }).lean();

    const bpMap = new Map(bps.map(bp => [bp.product_id.toString(), bp]));

    const candidates = [];
    for (const prod of products) {
      const score = calculateScore(prod, ingredientName, rule);
      if (score >= 45) {
        const bp = bpMap.get(prod._id.toString());
        if (bp) {
          candidates.push({
            _id: prod._id,
            name: prod.name,
            slug: prod.slug,
            thumbnail: prod.thumbnail,
            images: prod.images,
            brand: prod.brand,
            category_name: prod.category_name,
            category_id: prod.category_id,
            branch_product_id: bp._id,
            price: bp.price,
            original_price: bp.original_price,
            stock: bp.stock,
            is_available: bp.is_available,
            score
          });
        }
      }
    }

    // Sort by calculated matching score descending
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return { match: null, substitutes: [] };
    }

    const primaryMatch = candidates[0];
    const substitutes = candidates.slice(1, 6);

    return {
      match: primaryMatch,
      substitutes
    };
  } catch (err) {
    console.error('[IngredientMatchingService] Error matching ingredient:', err.message);
    return { match: null, substitutes: [] };
  }
};
