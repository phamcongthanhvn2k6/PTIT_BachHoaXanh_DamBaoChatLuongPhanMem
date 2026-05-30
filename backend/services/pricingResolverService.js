import Promotion from '../models/Promotion.js';
import { HotDeal } from '../models/Misc.js';
import BranchProduct from '../models/BranchProduct.js';
import mongoose from 'mongoose';

const toIdString = (value) => (value === null || value === undefined ? '' : String(value));
const asArray = (value) => (Array.isArray(value) ? value : []);
const buildIdSet = (arr) => new Set(asArray(arr).map((item) => toIdString(item)));
const isInSet = (set, value) => set.has(toIdString(value));

const isScopedToItem = (ruleLike, product, branchId) => {
  const excludedProducts = buildIdSet(ruleLike.excluded_product_ids);
  const excludedCategories = buildIdSet(ruleLike.excluded_category_ids);

  if (isInSet(excludedProducts, product._id || product.id)) return false;
  if (isInSet(excludedCategories, product.category_id)) return false;

  const scope = String(ruleLike.scope || 'all').toLowerCase();
  if (scope === 'all') return true;

  if (scope === 'product') {
    const targetProducts = buildIdSet(ruleLike.target_product_ids);
    return targetProducts.size > 0 && isInSet(targetProducts, product._id || product.id);
  }

  if (scope === 'category') {
    const targetCategories = buildIdSet(ruleLike.target_category_ids);
    return targetCategories.size > 0 && isInSet(targetCategories, product.category_id);
  }

  if (scope === 'branch') {
    const targetBranches = buildIdSet(ruleLike.target_branch_ids);
    return targetBranches.size > 0 && isInSet(targetBranches, branchId);
  }

  return false;
};

const meetsQuantityAndOrder = (ruleLike, quantity = 1, orderSubtotal = 0) => {
  const minQty = Number(ruleLike.min_quantity || 0);
  const minOrder = Number(ruleLike.min_order_amount || 0);
  if (minQty > 0 && quantity < minQty) return false;
  if (minOrder > 0 && orderSubtotal < minOrder) return false;
  return true;
};

const calcDiscountByType = (ruleLike, lineSubtotal) => {
  const type = String(ruleLike.type || '').toLowerCase();
  const discountValue = Number(ruleLike.discount_value || 0);
  const maxDiscountAmount = Number(ruleLike.max_discount_amount || 0);

  if (type === 'percent' || type === 'flash_deal') {
    let discount = lineSubtotal * (discountValue / 100);
    if (maxDiscountAmount > 0) discount = Math.min(discount, maxDiscountAmount);
    return Math.max(0, discount);
  }

  if (type === 'fixed_amount') {
    return Math.max(0, Math.min(discountValue, lineSubtotal));
  }

  return 0;
};

/**
 * Centrally resolve the pricing object for a given product and optional branch product/branch ID.
 * Priority hierarchy:
 * 1. Active Hot Deal (matching branch and product, remaining_quantity > 0)
 * 2. Active Promotion (highest priority discount)
 * 3. Product Sale Price (if price < original_price)
 * 4. Original/Base price fallback
 */
export async function resolveEffectivePrice(product, branchProduct = null, branchId = null, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const quantity = Number(options.quantity || 1);
  
  // Normalize input objects to plain JS
  const prod = product?.toObject ? product.toObject() : (product ? { ...product } : null);
  let bp = branchProduct?.toObject ? branchProduct.toObject() : (branchProduct ? { ...branchProduct } : null);

  if (!prod) {
    return {
      originalPrice: 0,
      effectivePrice: 0,
      discountPercent: 0,
      pricingSource: 'original_price',
      promotionId: null,
      hotDealId: null,
      isHotDeal: false,
      isPromotion: false,
    };
  }

  const pId = String(prod._id || prod.id || '');
  const bId = branchId ? String(branchId) : (bp ? String(bp.branch_id || '') : null);

  // Fallback branch product lookup if not passed but branchId is present
  if (!bp && bId && mongoose.Types.ObjectId.isValid(pId)) {
    try {
      const foundBp = await BranchProduct.findOne({
        product_id: pId,
        branch_id: bId,
      }).lean();
      if (foundBp) bp = foundBp;
    } catch (e) {}
  }

  // 1. Check Active Hot Deals (pre-loaded or query)
  let activeDeals = options.preloadedHotDeals;
  if (!activeDeals) {
    const dealQuery = {
      is_active: true,
      status: 'active',
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] }
      ]
    };
    if (bp) {
      dealQuery.$or = [
        { branch_product_id: bp._id || bp.id },
        { product_id: prod._id || prod.id, branch_id: bId }
      ];
    } else {
      dealQuery.product_id = prod._id || prod.id;
      if (bId) {
        dealQuery.branch_id = bId;
      }
    }
    try {
      activeDeals = await HotDeal.find(dealQuery).lean();
    } catch (e) {
      activeDeals = [];
    }
  }

  // Filter deals matching this product and branch, and having remaining stock
  const matchedDeals = activeDeals.filter(deal => {
    const dealProdId = toIdString(deal.product_id);
    const dealBranchId = toIdString(deal.branch_id);
    const dealBpId = toIdString(deal.branch_product_id);

    const prodMatch = dealProdId === pId;
    const branchMatch = !bId || !dealBranchId || dealBranchId === bId;
    const bpMatch = !bp || !dealBpId || dealBpId === String(bp._id || bp.id || '');
    
    const stockOk = deal.remaining_quantity === null || deal.remaining_quantity === undefined || Number(deal.remaining_quantity) > 0;
    const bpActive = bp ? (bp.is_available !== false && Number(bp.stock) > 0) : true;
    
    return prodMatch && branchMatch && bpMatch && stockOk && bpActive;
  });

  if (matchedDeals.length > 0) {
    // Pick highest priority/newest hot deal
    const deal = matchedDeals.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))[0];
    
    const baseOrig = Number(deal.original_price || bp?.original_price || prod.original_price || bp?.price || prod.price || 0);
    const effPrice = Math.max(0, Number(deal.deal_price || 0));
    const discPercent = baseOrig > 0 ? Math.round((1 - effPrice / baseOrig) * 100) : 0;

    return {
      originalPrice: baseOrig,
      effectivePrice: effPrice,
      discountPercent: discPercent,
      pricingSource: 'hot_deal',
      promotionId: null,
      hotDealId: String(deal._id || deal.id),
      isHotDeal: true,
      isPromotion: false,
    };
  }

  // 2. Check Active Promotions (pre-loaded or query)
  let activePromotions = options.preloadedPromotions;
  if (!activePromotions) {
    try {
      activePromotions = await Promotion.find({
        is_active: true,
        status: 'active',
        $and: [
          { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
          { $or: [{ end_date: null }, { end_date: { $gte: now } }] }
        ]
      }).sort({ priority: -1 }).lean();
    } catch (e) {
      activePromotions = [];
    }
  }

  const basePrice = Number(bp ? bp.price : prod.price || 0);
  const baseOriginalPrice = Number(bp ? (bp.original_price || bp.price) : (prod.original_price || prod.price || 0));

  // Filter promotions scoped to this product & branch
  const matchedPromos = activePromotions.filter(promo => {
    return isScopedToItem(promo, prod, bId) && meetsQuantityAndOrder(promo, quantity, basePrice * quantity);
  });

  if (matchedPromos.length > 0) {
    // Find best promotion (highest discount)
    let bestPromo = null;
    let bestDiscount = 0;

    for (const promo of matchedPromos) {
      const discount = calcDiscountByType(promo, basePrice);
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestPromo = promo;
      }
    }

    if (bestPromo && bestDiscount > 0) {
      const effPrice = Math.max(0, basePrice - bestDiscount);
      const discPercent = baseOriginalPrice > 0 ? Math.round((1 - effPrice / baseOriginalPrice) * 100) : 0;

      return {
        originalPrice: baseOriginalPrice,
        effectivePrice: effPrice,
        discountPercent: discPercent,
        pricingSource: 'promotion',
        promotionId: String(bestPromo._id || bestPromo.id),
        hotDealId: null,
        isHotDeal: false,
        isPromotion: true,
      };
    }
  }

  // 3. Fallback to product sale price (if price < original_price)
  if (basePrice < baseOriginalPrice && baseOriginalPrice > 0) {
    const discPercent = Math.round((1 - basePrice / baseOriginalPrice) * 100);
    return {
      originalPrice: baseOriginalPrice,
      effectivePrice: basePrice,
      discountPercent: discPercent,
      pricingSource: 'sale_price',
      promotionId: null,
      hotDealId: null,
      isHotDeal: false,
      isPromotion: false,
    };
  }

  // 4. Fallback to original price
  return {
    originalPrice: baseOriginalPrice || basePrice,
    effectivePrice: basePrice,
    discountPercent: 0,
    pricingSource: 'original_price',
    promotionId: null,
    hotDealId: null,
    isHotDeal: false,
    isPromotion: false,
  };
}

export async function resolveProductPricing(product, branchProduct = null, branchId = null, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  
  const pricing = await resolveEffectivePrice(product, branchProduct, branchId, options);
  
  let activeHotDeal = null;
  let activePromotion = null;
  
  if (pricing.hotDealId) {
    try {
      activeHotDeal = await HotDeal.findById(pricing.hotDealId).lean();
    } catch (e) {}
  }
  
  if (pricing.promotionId) {
    try {
      activePromotion = await Promotion.findById(pricing.promotionId).lean();
    } catch (e) {}
  }
  
  let pricingSourceUpper = 'BASE_PRICE';
  if (pricing.pricingSource === 'hot_deal') pricingSourceUpper = 'HOT_DEAL';
  else if (pricing.pricingSource === 'promotion') pricingSourceUpper = 'PROMOTION';
  else if (pricing.pricingSource === 'sale_price') pricingSourceUpper = 'SALE_PRICE';
  else if (pricing.pricingSource === 'original_price') pricingSourceUpper = 'BASE_PRICE';

  // Prevent negative prices
  const finalEffectivePrice = Math.max(0, pricing.effectivePrice);
  const finalOriginalPrice = Math.max(finalEffectivePrice, pricing.originalPrice);
  
  // Prevent deal price > original price
  const finalDiscountPercent = finalOriginalPrice > 0 ? Math.round((1 - finalEffectivePrice / finalOriginalPrice) * 100) : 0;

  return {
    effective_price: finalEffectivePrice,
    original_price: finalOriginalPrice,
    discount_percent: finalDiscountPercent,
    pricing_source: pricingSourceUpper,
    active_hot_deal: activeHotDeal ? {
      id: String(activeHotDeal._id || activeHotDeal.id),
      title: activeHotDeal.title,
      deal_price: activeHotDeal.deal_price,
      start_date: activeHotDeal.start_date,
      end_date: activeHotDeal.end_date,
      remaining_quantity: activeHotDeal.remaining_quantity,
      total_quantity: activeHotDeal.total_quantity,
      badge_text: activeHotDeal.badge_text || 'Hot Deal'
    } : null,
    active_promotion: activePromotion ? {
      id: String(activePromotion._id || activePromotion.id),
      title: activePromotion.title,
      badge_text: activePromotion.badge_text || 'Khuyến mãi'
    } : null,
  };
}
