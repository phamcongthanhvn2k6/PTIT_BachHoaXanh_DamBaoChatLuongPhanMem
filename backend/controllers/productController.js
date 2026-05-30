import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import Promotion from '../models/Promotion.js';
import { Coupon } from '../models/Coupon.js';
import ProductQuestion from '../models/ProductQuestion.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import { paginateMeta } from '../utils/helpers.js';
import { syncHotDealsForProductId } from '../services/hotDealIntegrityService.js';
import { slugify, buildProductSlug, extractIdFromSlug, generateShortCode } from '../utils/slugify.js';
import { resolveEffectivePrice, resolveProductPricing } from '../services/pricingResolverService.js';
import { HotDeal } from '../models/Misc.js';
import { buildProductAISummary, isProductAISummaryReady } from '../services/aiSummaryService.js';


const parseBranchId = (id) => {
  if (!id) return null;
  if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

/**
 * Safely resolve a product ID parameter.
 * Handles Mongo ObjectId strings, legacy numeric strings, etc.
 * Returns null if the ID is invalid.
 */
const resolveProductId = (idParam) => {
  if (!idParam) return null;
  // If it's a valid 24-hex ObjectId string, use it directly
  if (mongoose.Types.ObjectId.isValid(idParam) && /^[0-9a-fA-F]{24}$/.test(String(idParam))) {
    return idParam;
  }
  // If it's a numeric string, it might be a legacy id - try anyway
  if (/^\d+$/.test(String(idParam))) {
    return null; // Numeric IDs are not valid ObjectIds
  }
  return null;
};

const isTargetMatched = (scopeArray, idToMatch) => {
  if (!scopeArray || scopeArray.length === 0) return false;
  const stringArray = scopeArray.map((id) => String(id));
  return stringArray.includes(String(idToMatch));
};

const findProductByRouteParam = async (idParam) => {
  let product = null;
  const paramStr = String(idParam || '').trim();

  // 1. Try direct ObjectId match
  if (mongoose.Types.ObjectId.isValid(paramStr) && /^[0-9a-fA-F]{24}$/.test(paramStr)) {
    product = await Product.findById(paramStr);
  }

  // 2. Try direct slug match
  if (!product) {
    product = await Product.findOne({ slug: paramStr });
  }

  // 3. Try lookup by short_code directly
  if (!product) {
    product = await Product.findOne({ short_code: paramStr });
  }

  // 4. Try extracting short code from slug
  if (!product) {
    const matchCode = paramStr.match(/-?(p[0-9a-fA-F]+)$/i) || paramStr.match(/^(p[0-9a-fA-F]+)$/i);
    if (matchCode) {
      product = await Product.findOne({ short_code: matchCode[1].toLowerCase() });
    }
  }

  // 5. Try extracting ObjectId from SEO slug
  if (!product) {
    const extractedId = extractIdFromSlug(paramStr);
    if (extractedId && extractedId !== paramStr && mongoose.Types.ObjectId.isValid(extractedId)) {
      product = await Product.findById(extractedId);
    }
  }

  // 6. Try legacy numeric ID
  if (!product && /^\d+$/.test(paramStr)) {
    product = await Product.findOne({ id: Number(paramStr) });
  }

  return product;
};

const normalizeQuestion = (questionDoc) => {
  const q = questionDoc.toObject ? questionDoc.toObject() : { ...questionDoc };
  return {
    id: String(q._id),
    product_id: q.product_id,
    user_id: q.user_id,
    user_name: q.user_name || 'Khach hang',
    question: q.question || '',
    content: q.question || '',
    status: q.status || 'pending',
    created_at: q.created_at,
    answer: q.answer || null,
    answers: q.answer?.content
      ? [{
        content: q.answer.content,
        created_at: q.answer.answered_at || q.updated_at,
        admin_name: q.answer.admin_name || 'Lotte Mart',
      }]
      : [],
  };
};

// GET /api/products
export const list = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, branchId, sort, search, minPrice, maxPrice, featured, bestSeller, new: isNew } = req.query;

    const pipeline = [];

    // If search is provided, use $text for full-word search performance.
    // $regex fallback is handled in the search() export for partial matches.
    if (search) {
      const searchStr = String(search).trim();
      if (searchStr.length >= 2) {
        // Try $text first for full-word matches (uses text index)
        pipeline.push({ $match: { $text: { $search: searchStr } } });
        if (!sort) {
          pipeline.push({ $sort: { score: { $meta: 'textScore' } } });
        }
      }
    }

    // Match Product Core Phase
    const matchStage = { is_active: true };
    if (category) {
      matchStage.category_id = mongoose.Types.ObjectId.isValid(category) 
        ? new mongoose.Types.ObjectId(category) 
        : category;
    }
    if (featured === 'true') matchStage.is_featured = true;

    pipeline.push({ $match: matchStage });

    // Lookup Branch Products if branchId is given
    if (branchId) {
      pipeline.push({
        $lookup: {
          from: 'branchproducts',
          localField: '_id',
          foreignField: 'product_id',
          as: 'branch_info',
          pipeline: [
            { $match: { branch_id: parseBranchId(branchId), is_available: true, stock: { $gt: 0 } } }
          ]
        }
      });
      pipeline.push({
        $unwind: {
          path: '$branch_info',
          preserveNullAndEmptyArrays: false // Only return products that exist in this branch
        }
      });

      // Override Product price/stock with BranchProduct
      pipeline.push({
        $addFields: {
          branch_product_id: "$branch_info._id",
          price: "$branch_info.price",
          original_price: "$branch_info.original_price",
          discount_percent: "$branch_info.discount_percent",
          stock: "$branch_info.stock",
          branch_active: "$branch_info.is_available"
        }
      });
    }

    // Secondary Match Phase (based on newly mapped branch prices)
    const secondaryMatch = {};
    if (minPrice || maxPrice) {
      secondaryMatch.price = {};
      if (minPrice) secondaryMatch.price.$gte = Number(minPrice);
      if (maxPrice) secondaryMatch.price.$lte = Number(maxPrice);
    }
    if (Object.keys(secondaryMatch).length > 0) {
      pipeline.push({ $match: secondaryMatch });
    }

    // Sort Phase
    let sortStage = { created_at: -1 }; // default: newest
    if (sort === 'newest') sortStage = { created_at: -1 };
    if (sort === 'price-low') sortStage = { price: 1 };
    if (sort === 'price-high') sortStage = { price: -1 };
    if (sort === 'rating') sortStage = { rating: -1 };
    if (sort === 'best-seller' || sort === 'best') sortStage = { sold_count: -1 };
    if (sort === 'newest') sortStage = { created_at: -1 };
    if (sort === 'stock-desc') sortStage = { stock: -1 };

    pipeline.push({ $sort: sortStage });

    // Pagination Phase
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: (p - 1) * l }, { $limit: l }]
      }
    });

    const result = await Product.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];

    // Get active promotions to attach badges
    const minDate = new Date();
    const activePromotions = await Promotion.find({
      is_active: true,
      status: 'active',
      start_date: { $lte: minDate },
      end_date: { $gte: minDate },
      $or: [
        { usage_limit: null },
        { $expr: { $lt: ["$usage_count", "$usage_limit"] } }
      ]
    }).sort({ priority: -1 }).lean();

    const activeHotDeals = await HotDeal.find({
      is_active: true,
      status: 'active',
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: minDate } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: minDate } }] }
      ]
    }).lean();

    const isTargetMatched = (scopeArray, idToMatch) => {
      if (!scopeArray || scopeArray.length === 0) return false;
      const stringArray = scopeArray.map(id => String(id));
      return stringArray.includes(String(idToMatch));
    };

    // Map `id` from `_id` and cleanup
    const mappedData = await Promise.all(data.map(async (item) => {
      item.id = item._id;

      // Resolve effective dynamic pricing
      const resolvedPricing = await resolveProductPricing(item, null, branchId, {
        now: minDate,
        preloadedHotDeals: activeHotDeals,
        preloadedPromotions: activePromotions
      });
      item.price = resolvedPricing.effective_price;
      item.original_price = resolvedPricing.original_price;
      item.discount_percent = resolvedPricing.discount_percent;
      item.effective_price = resolvedPricing.effective_price;
      item.pricing_source = resolvedPricing.pricing_source;
      item.active_hot_deal = resolvedPricing.active_hot_deal;
      item.active_promotion = resolvedPricing.active_promotion;
      item.pricing = resolvedPricing;

      const applicablePromotions = activePromotions.filter(promo => {
        if (isTargetMatched(promo.excluded_product_ids, item._id)) return false;
        if (isTargetMatched(promo.excluded_category_ids, item.category_id)) return false;
        if (promo.scope === 'product') return isTargetMatched(promo.target_product_ids, item._id);
        if (promo.scope === 'category') return isTargetMatched(promo.target_category_ids, item.category_id);
        if (promo.scope === 'branch') return branchId ? isTargetMatched(promo.target_branch_ids, branchId) : false;
        return promo.scope === 'all';
      });

      if (applicablePromotions.length > 0) {
        item.promotions = applicablePromotions.map(p => ({
          _id: p._id,
          title: p.title,
          type: p.type,
          badge_text: p.badge_text
        }));
      }

      // If the dynamic price resolved is a hot deal, attach hot deal countdown metadata
      if (resolvedPricing.pricing_source === 'HOT_DEAL' && resolvedPricing.active_hot_deal) {
        item.hot_deal = resolvedPricing.active_hot_deal;
      }

      delete item.branch_info; // hide lookup artifacts
      return item;
    }));

    return res.json({
      success: true,
      data: mappedData,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/search — with $regex fallback for partial matches
export const search = async (req, res) => {
  req.query.search = req.query.q || req.query.search || '';

  // Clone response to intercept — if $text returns 0 results, retry with $regex
  const originalJson = res.json.bind(res);
  const searchTerm = String(req.query.search || '').trim();

  // If search term is very short (< 2 chars), skip $text entirely and use $regex
  if (searchTerm && searchTerm.length < 2) {
    req.query.search = '';  // disable $text in list()
    req.query._regexSearch = searchTerm;
  }

  // Wrap res.json to detect empty $text results and retry with $regex
  let responded = false;
  res.json = (body) => {
    if (responded) return;
    responded = true;

    // If $text returned 0 results and we have a search term, retry with $regex
    if (body?.success && body?.data?.length === 0 && searchTerm.length >= 2) {
      // Reset and use regex fallback
      responded = false;
      res.json = originalJson;  // restore original

      // Build regex pipeline manually
      const regexQuery = {
        is_active: true,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { brand: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      const page = Math.max(1, parseInt(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));

      const branchId = req.query.branchId || req.query.branch_id || null;
      Product.countDocuments(regexQuery).then(total => {
        Product.find(regexQuery)
          .sort({ created_at: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .then(async (data) => {
            const now = new Date();
            const mapped = await Promise.all(data.map(async (item) => {
              const obj = { ...item, id: item._id };
              const pricing = await resolveProductPricing(obj, null, branchId, { now });
              obj.price = pricing.effective_price;
              obj.original_price = pricing.original_price;
              obj.discount_percent = pricing.discount_percent;
              obj.effective_price = pricing.effective_price;
              obj.pricing_source = pricing.pricing_source;
              obj.active_hot_deal = pricing.active_hot_deal;
              obj.active_promotion = pricing.active_promotion;
              obj.pricing = pricing;
              return obj;
            }));
            return originalJson({
              success: true,
              data: mapped,
              pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
            });
          })
          .catch(err => originalJson({ success: false, data: [], pagination: { page, limit, total: 0, totalPages: 1 } }));
      });
      return;
    }

    return originalJson(body);
  };

  return list(req, res);
};

// GET /api/products/policies
export const policies = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 1, title: 'Chính sách đổi trả', description: 'Đổi trả trong 7 ngày kể từ ngày mua', icon: 'return' },
      { id: 2, title: 'Giao hàng miễn phí', description: 'Miễn phí giao hàng cho đơn từ 300.000đ', icon: 'delivery' },
      { id: 3, title: 'Thanh toán an toàn', description: 'Hỗ trợ nhiều phương thức thanh toán', icon: 'payment' },
      { id: 4, title: 'Hàng chính hãng', description: '100% sản phẩm chính hãng', icon: 'authentic' },
    ],
  });
};

// GET /api/products/compare?ids=a,b,c&branch_id=...
export const compare = async (req, res) => {
  try {
    const idsRaw = String(req.query.ids || '').trim();
    if (!idsRaw) {
      return res.status(400).json({ success: false, message: 'ids query is required' });
    }

    const requestedIds = Array.from(new Set(idsRaw.split(',').map((x) => x.trim()).filter(Boolean))).slice(0, 4);
    if (requestedIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid product ids' });
    }

    const objectIds = requestedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const products = await Product.find({ _id: { $in: objectIds }, is_active: true }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const branchIdRaw = req.query.branch_id || req.query.branchId || null;
    let branchProducts = [];

    if (objectIds.length > 0) {
      if (branchIdRaw) {
        branchProducts = await BranchProduct.find({
          branch_id: parseBranchId(branchIdRaw),
          product_id: { $in: objectIds },
        }).lean();
      } else {
        const grouped = await BranchProduct.aggregate([
          { $match: { product_id: { $in: objectIds }, is_available: true } },
          { $sort: { stock: -1, updated_at: -1 } },
          { $group: { _id: '$product_id', doc: { $first: '$$ROOT' } } },
        ]);
        branchProducts = grouped.map((item) => item.doc);
      }
    }

    const branchProductMap = new Map(branchProducts.map((bp) => [String(bp.product_id), bp]));

    const now = new Date();
    const activePromotions = await Promotion.find({
      is_active: true,
      status: 'active',
      start_date: { $lte: now },
      end_date: { $gte: now },
    }).lean();

    const activeCoupons = await Coupon.find({
      is_active: true,
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
      ],
    }).lean();

    const policiesData = [
      { title: 'Đổi trả 7 ngày', description: 'Đổi trả trong 7 ngày kể từ ngày mua' },
      { title: 'Giao hàng miễn phí', description: 'Miễn phí giao hàng cho đơn từ 300.000đ' },
      { title: 'Hàng chính hãng', description: 'Cam kết sản phẩm chính hãng' },
    ];

    const data = await Promise.all(requestedIds
      .map(async (pid) => {
        const product = productMap.get(String(pid));
        if (!product) return null;

        const branchProduct = branchProductMap.get(String(product._id));
        const pricing = await resolveProductPricing(product, branchProduct, branchIdRaw, { now });

        const applicablePromotions = activePromotions.filter((promo) => {
          if (isTargetMatched(promo.excluded_product_ids, product._id)) return false;
          if (isTargetMatched(promo.excluded_category_ids, product.category_id)) return false;

          if (promo.scope === 'product') return isTargetMatched(promo.target_product_ids, product._id);
          if (promo.scope === 'category') return isTargetMatched(promo.target_category_ids, product.category_id);
          if (promo.scope === 'branch') return branchIdRaw ? isTargetMatched(promo.target_branch_ids, branchIdRaw) : false;
          return promo.scope === 'all';
        });

        const applicableCoupons = activeCoupons.filter((coupon) => {
          if (isTargetMatched(coupon.excluded_product_ids, product._id)) return false;
          if (isTargetMatched(coupon.excluded_category_ids, product.category_id)) return false;

          if (coupon.scope === 'all') return true;
          if (coupon.scope === 'product') return isTargetMatched(coupon.target_product_ids, product._id);
          if (coupon.scope === 'category') return isTargetMatched(coupon.target_category_ids, product.category_id);
          if (coupon.scope === 'branch') return branchIdRaw ? isTargetMatched(coupon.target_branch_ids, branchIdRaw) : false;

          return false;
        });

        const badges = [];
        if (product.is_featured) badges.push({ type: 'featured', text: 'Nổi bật' });
        if (product.is_best_seller || branchProduct?.is_best_seller) badges.push({ type: 'best_seller', text: 'Bán chạy' });
        if (product.is_new || branchProduct?.is_new) badges.push({ type: 'new', text: 'Mới' });
        if ((branchProduct?.stock ?? product.stock ?? 0) <= 0) badges.push({ type: 'stock', text: 'Hết hàng' });
        if (branchProduct?.is_expiring_soon || product?.is_expiring_soon) badges.push({ type: 'expiry', text: 'Sắp hết hạn' });
        applicablePromotions.slice(0, 2).forEach((promo) => {
          badges.push({ type: 'promo', text: promo.badge_text || 'Khuyến mãi' });
        });

        return {
          id: String(product._id),
          product_id: String(product._id),
          branch_product_id: branchProduct ? String(branchProduct._id) : null,
          name: product.name || 'Sản phẩm',
          image: (Array.isArray(product.images) && product.images[0]) || product.thumbnail || '',
          images: Array.isArray(product.images) ? product.images : [],
          price: pricing.effective_price,
          original_price: pricing.original_price,
          discount_percent: pricing.discount_percent,
          effective_price: pricing.effective_price,
          pricing_source: pricing.pricing_source,
          active_hot_deal: pricing.active_hot_deal,
          active_promotion: pricing.active_promotion,
          pricing,
          brand: product.brand || '',
          category_name: branchProduct?.category_name || product.category_name || '',
          origin: product.origin || '',
          expiry_date: branchProduct?.expiry_date || product.expiry_date || null,
          unit: product.unit || '',
          weight: product.weight || '',
          average_rating: product.average_rating ?? product.rating ?? 0,
          rating: product.rating ?? product.average_rating ?? 0,
          review_count: product.review_count ?? product.total_reviews ?? 0,
          sold_count: branchProduct?.sold_count ?? product.sold_count ?? 0,
          badges,
          stock: branchProduct?.stock ?? product.stock ?? 0,
          in_stock: branchProduct
            ? branchProduct.is_available !== false && Number(branchProduct.stock || 0) > 0
            : Number(product.stock || 0) > 0,
          short_description: product.short_description || product.description || '',
          description: product.description || '',
          specifications: product.specifications || {},
          promotions: applicablePromotions.slice(0, 3).map((promo) => ({
            id: String(promo._id),
            title: promo.title,
            badge_text: promo.badge_text || '',
          })),
          coupons: applicableCoupons.slice(0, 3).map((coupon) => ({
            id: String(coupon._id),
            code: coupon.code,
            title: coupon.title,
          })),
          policies: policiesData,
          shipping_fee_note: 'Miễn phí giao hàng cho đơn từ 300.000đ',
        };
      }));

    const filtered = data.filter(Boolean);
    return res.json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id — supports ObjectId, SEO slug, and legacy numeric ID
export const detail = async (req, res) => {
  try {
    const idParam = req.params.id;

    const product = await findProductByRouteParam(idParam);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let modified = false;
    if (!product.short_code) {
      product.short_code = generateShortCode(product._id);
      modified = true;
    }

    const expectedSlug = buildProductSlug(product.name, product._id, product.short_code);
    if (!product.slug || product.slug !== expectedSlug) {
      product.slug = expectedSlug;
      modified = true;
    }

    if (modified) {
      await product.save();
    }

    // Return the product with normalized `id` and slug
    const obj = product.toObject();
    obj.id = obj._id;

    const branchId = req.query.branchId || req.query.branch_id || null;
    let bp = null;
    if (branchId) {
      bp = await BranchProduct.findOne({ product_id: product._id, branch_id: parseBranchId(branchId) }).lean();
      if (bp) {
        obj.branch_product_id = bp._id;
        obj.price = bp.price;
        obj.original_price = bp.original_price;
        obj.discount_percent = bp.discount_percent;
        obj.stock = bp.stock;
        obj.branch_active = bp.is_available;
      }
    }

    const resolvedPricing = await resolveProductPricing(product, bp, branchId, { now: new Date() });
    obj.price = resolvedPricing.effective_price;
    obj.original_price = resolvedPricing.original_price;
    obj.discount_percent = resolvedPricing.discount_percent;
    obj.effective_price = resolvedPricing.effective_price;
    obj.pricing_source = resolvedPricing.pricing_source;
    obj.active_hot_deal = resolvedPricing.active_hot_deal;
    obj.active_promotion = resolvedPricing.active_promotion;
    obj.pricing = resolvedPricing;

    // Attach Hot Deal details if resolved pricing source is a Hot Deal
    if (resolvedPricing.pricing_source === 'HOT_DEAL' && resolvedPricing.active_hot_deal) {
      obj.hot_deal = resolvedPricing.active_hot_deal;
    }

    return res.json({ success: true, data: obj });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id/related
export const related = async (req, res) => {
  try {
    const idParam = req.params.id;
    const branchId = req.query.branchId || req.query.branch_id || null;
    const product = await findProductByRouteParam(idParam);

    if (!product) return res.json({ success: true, data: [] });

    const data = await Product.find({
      category_id: product.category_id,
      _id: { $ne: product._id },
      is_active: true
    }).limit(8).lean();

    const now = new Date();
    const mapped = await Promise.all(data.map(async (p) => {
      const obj = { ...p, id: p._id };
      const pricing = await resolveProductPricing(p, null, branchId, { now });
      obj.price = pricing.effective_price;
      obj.original_price = pricing.original_price;
      obj.discount_percent = pricing.discount_percent;
      obj.effective_price = pricing.effective_price;
      obj.pricing_source = pricing.pricing_source;
      obj.active_hot_deal = pricing.active_hot_deal;
      obj.active_promotion = pricing.active_promotion;
      obj.pricing = pricing;
      return obj;
    }));

    return res.json({ success: true, data: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id/questions
export const questions = async (req, res) => {
  try {
    const product = await findProductByRouteParam(req.params.id);
    if (!product) return res.json({ success: true, data: [] });

    const roleId = Number(req.user?.role_id);
    const filter = { product_id: product._id };
    if (roleId === 3 || !roleId) {
      filter.status = { $ne: 'hidden' };
    }

    const data = await ProductQuestion.find(filter).sort('-created_at').limit(100);
    return res.json({ success: true, data: data.map(normalizeQuestion) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products/:id/questions
export const askQuestion = async (req, res) => {
  try {
    if (!req.userId || !req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const product = await findProductByRouteParam(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const content = String(req.body?.question || req.body?.content || '').trim();
    if (content.length < 5) {
      return res.status(400).json({ success: false, message: 'Nội dung câu hỏi phải có ít nhất 5 ký tự' });
    }

    const created = await ProductQuestion.create({
      product_id: product._id,
      user_id: req.userId,
      user_name: req.user.full_name || req.user.username || 'Khach hang',
      question: content,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      data: normalizeQuestion(created),
      message: 'Đã gửi câu hỏi, Lotte Mart sẽ phản hồi sớm',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products/:id/questions/:questionId/reply
export const replyQuestion = async (req, res) => {
  try {
    const question = await ProductQuestion.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const content = String(req.body?.content || req.body?.answer || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'answer content is required' });
    }

    question.answer = {
      content,
      admin_id: req.userId,
      admin_name: req.user?.full_name || req.user?.username || 'Lotte Mart',
      answered_at: new Date(),
    };
    question.status = 'answered';
    await question.save();

    return res.json({
      success: true,
      data: normalizeQuestion(question),
      message: 'Đã phản hồi câu hỏi sản phẩm',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/recommendations
export const smartRecommendations = async (req, res) => {
  try {
    const { category_id, min_price, max_price, limit = 10 } = req.query;
    const branchId = req.query.branchId || req.query.branch_id || null;
    const filter = { is_deleted: { $ne: true }, is_active: true };

    if (category_id) {
      filter.category_id = isNaN(Number(category_id)) ? category_id : Number(category_id);
    }

    if (min_price || max_price) {
      filter.price = {};
      if (min_price) filter.price.$gte = Number(min_price);
      if (max_price) filter.price.$lte = Number(max_price);
    }

    const data = await Product.find(filter)
      .sort({ rating: -1, sold_count: -1 })
      .limit(Number(limit))
      .lean();

    const now = new Date();
    const mapped = await Promise.all(data.map(async (p) => {
      const obj = { ...p, id: p._id };
      const pricing = await resolveProductPricing(p, null, branchId, { now });
      obj.price = pricing.effective_price;
      obj.original_price = pricing.original_price;
      obj.discount_percent = pricing.discount_percent;
      obj.effective_price = pricing.effective_price;
      obj.pricing_source = pricing.pricing_source;
      obj.active_hot_deal = pricing.active_hot_deal;
      obj.active_promotion = pricing.active_promotion;
      obj.pricing = pricing;
      return obj;
    }));

    return res.json({ success: true, data: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id/recommendations
export const recommendations = async (req, res) => {
  try {
    const product = await findProductByRouteParam(req.params.id);
    if (!product) {
      return res.json({ success: true, data: { related: [], bought_together: [] } });
    }

    const relatedRaw = await Product.find({
      category_id: product.category_id,
      _id: { $ne: product._id },
      is_active: true,
    })
      .limit(8)
      .lean();

    const branchId = req.query.branchId || req.query.branch_id || null;
    const now = new Date();

    const related = await Promise.all(relatedRaw.map(async (p) => {
      const obj = { ...p, id: String(p._id) };
      const pricing = await resolveProductPricing(p, null, branchId, { now });
      obj.price = pricing.effective_price;
      obj.original_price = pricing.original_price;
      obj.discount_percent = pricing.discount_percent;
      obj.effective_price = pricing.effective_price;
      obj.pricing_source = pricing.pricing_source;
      obj.active_hot_deal = pricing.active_hot_deal;
      obj.active_promotion = pricing.active_promotion;
      obj.pricing = pricing;
      return obj;
    }));

    const orders = await Order.find({
      status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'RETURNED'] },
      'items.product_id': { $in: [product._id, String(product._id)] },
    })
      .select('items')
      .limit(500)
      .lean();

    const scoreMap = new Map();
    for (const order of orders) {
      for (const item of order.items || []) {
        const pid = String(item.product_id || '');
        if (!pid || pid === String(product._id)) continue;
        const previous = scoreMap.get(pid) || { score: 0, quantity: 0 };
        const quantity = Number(item.quantity || 1);
        scoreMap.set(pid, {
          score: previous.score + 1,
          quantity: previous.quantity + quantity,
        });
      }
    }

    const topCoBuyIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 8)
      .map(([pid]) => pid);

    const coBuyProductsRaw = topCoBuyIds.length > 0
      ? await Product.find({ _id: { $in: topCoBuyIds }, is_active: true }).lean()
      : [];

    const coBuyMap = new Map(coBuyProductsRaw.map((p) => [String(p._id), p]));
    const boughtTogether = await Promise.all(topCoBuyIds
      .map(async (pid) => {
        const productDoc = coBuyMap.get(pid);
        if (!productDoc) return null;
        const score = scoreMap.get(pid);
        const pricing = await resolveProductPricing(productDoc, null, branchId, { now });
        return {
          ...productDoc,
          id: String(productDoc._id),
          score: score?.score || 0,
          quantity: score?.quantity || 0,
          price: pricing.effective_price,
          original_price: pricing.original_price,
          discount_percent: pricing.discount_percent,
          effective_price: pricing.effective_price,
          pricing_source: pricing.pricing_source,
          active_hot_deal: pricing.active_hot_deal,
          active_promotion: pricing.active_promotion,
          pricing,
        };
      }));

    return res.json({
      success: true,
      data: {
        related,
        bought_together: boughtTogether.filter(Boolean),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id/promotions
export const promotionsDetail = async (req, res) => {
  try {
    const idParam = req.params.id;
    const branchId = req.query.branchId || null;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      product = await Product.findById(idParam);
    }
    if (!product && /^\d+$/.test(String(idParam))) {
      product = await Product.findOne({ id: Number(idParam) });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const minDate = new Date();
    const activePromotions = await Promotion.find({
      is_active: true,
      status: 'active',
      start_date: { $lte: minDate },
      end_date: { $gte: minDate },
      $or: [
        { usage_limit: null },
        { $expr: { $lt: ["$usage_count", "$usage_limit"] } }
      ]
    }).sort({ priority: -1 });

    const isTargetMatched = (scopeArray, idToMatch) => {
      if (!scopeArray || scopeArray.length === 0) return false;
      const stringArray = scopeArray.map(id => String(id));
      return stringArray.includes(String(idToMatch));
    };

    const applicablePromotions = activePromotions.filter(promo => {
      if (isTargetMatched(promo.excluded_product_ids, product._id)) return false;
      if (isTargetMatched(promo.excluded_category_ids, product.category_id)) return false;

      if (promo.scope === 'product') return isTargetMatched(promo.target_product_ids, product._id);
      if (promo.scope === 'category') return isTargetMatched(promo.target_category_ids, product.category_id);
      if (promo.scope === 'branch') return branchId ? isTargetMatched(promo.target_branch_ids, branchId) : false;
      return promo.scope === 'all';
    });

    return res.json({ success: true, data: applicablePromotions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id/coupons
export const couponsDetail = async (req, res) => {
  try {
    const idParam = req.params.id;
    const branchId = req.query.branchId || null;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      product = await Product.findById(idParam);
    }
    if (!product && /^\d+$/.test(String(idParam))) {
      product = await Product.findOne({ id: Number(idParam) });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const now = new Date();
    const coupons = await Coupon.find({
      is_active: true,
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
      ],
    }).sort({ created_at: -1 });

    const isTargetMatched = (scopeArray, idToMatch) => {
      if (!scopeArray || scopeArray.length === 0) return false;
      return scopeArray.map((id) => String(id)).includes(String(idToMatch));
    };

    const applicableCoupons = coupons.filter((coupon) => {
      if (isTargetMatched(coupon.excluded_product_ids, product._id)) return false;
      if (isTargetMatched(coupon.excluded_category_ids, product.category_id)) return false;

      if (coupon.scope === 'all') return true;
      if (coupon.scope === 'product') return isTargetMatched(coupon.target_product_ids, product._id);
      if (coupon.scope === 'category') return isTargetMatched(coupon.target_category_ids, product.category_id);
      if (coupon.scope === 'branch') return branchId ? isTargetMatched(coupon.target_branch_ids, branchId) : false;

      return false;
    });

    return res.json({ success: true, data: applicableCoupons });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const processProductData = (data) => {
  // ── Normalize image fields ──────────────────────────────────────────
  const parseImageArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.flatMap(item => parseImageArray(item));
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') return [];
      // Try parsing JSON arrays/strings
      if ((trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { return parseImageArray(JSON.parse(trimmed)); } catch { /* fall through */ }
      }
      return [trimmed];
    }
    return [];
  };

  // Merge all image sources into a single deduplicated list
  const allUrls = [
    ...parseImageArray(data.images),
    ...parseImageArray(data.gallery),
    ...parseImageArray(data.thumbnail),
  ];
  const uniqueUrls = [...new Set(allUrls)].filter(url => {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase().trim();
    return lower.length > 0 && lower !== 'null' && lower !== 'undefined' && lower !== 'nan';
  });

  if (uniqueUrls.length > 0) {
    data.images = uniqueUrls;
    data.gallery = uniqueUrls;
    data.thumbnail = data.thumbnail && typeof data.thumbnail === 'string' && data.thumbnail.trim() && data.thumbnail.trim() !== 'null'
      ? data.thumbnail.trim()
      : uniqueUrls[0];
  }

  // ── Process expiry date fields ──────────────────────────────────────
  if (data.expiry_date) {
    const expDate = new Date(data.expiry_date);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    data.is_expired = diffDays < 0;
    const warningDays = data.expiry_warning_days || 7;
    data.is_expiring_soon = diffDays >= 0 && diffDays <= warningDays;
  }
  return data;
};

// GET /api/products/expiring
export const getExpiringProducts = async (req, res) => {
  try {
    const { branchId } = req.query;

    // 1. Fetch products with expiry_date that are active
    const productsDoc = await Product.find({
      is_active: true,
      expiry_date: { $ne: null }
    }).lean();

    // 2. Fetch active promotions to avoid duplicates
    const activePromotions = await Promotion.find({
      is_active: true,
      status: 'active',
      end_date: { $gte: new Date() }
    }).lean();

    // Quick lookup for product_ids already in active promotion
    const promotedProductIds = new Set();
    activePromotions.forEach(promo => {
      if (promo.scope === 'product' && Array.isArray(promo.target_product_ids)) {
        promo.target_product_ids.forEach(id => promotedProductIds.add(String(id)));
      }
    });

    const expiringProducts = [];

    for (const product of productsDoc) {
      if (promotedProductIds.has(String(product._id))) continue;

      let stock = product.stock || 0;
      let isAvailable = true;

      if (branchId) {
        const bp = await BranchProduct.findOne({
          product_id: product._id,
          branch_id: parseBranchId(branchId),
          is_available: true
        }).lean();
        if (!bp || bp.stock <= 0) continue; // Out of stock
        stock = bp.stock;
      } else {
        if (stock <= 0) continue; // Total out of stock
      }

      const expDate = new Date(product.expiry_date);
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) continue; // Already expired

      const warningDays = product.expiry_warning_days ?? 7;

      if (diffDays <= warningDays) {
        expiringProducts.push({
          ...product,
          id: product._id,
          stock: stock,
          days_until_expiry: diffDays,
          expiry_status: diffDays <= (warningDays / 2) ? 'critical' : 'warning'
        });
      }
    }

    return res.json({
      success: true,
      data: expiringProducts
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products (admin)
export const create = async (req, res) => {
  try {
    const body = processProductData({ ...req.body });
    // Slug is auto-generated by the pre-save hook,
    // but we can also set a preliminary slug from the name
    if (body.name && !body.slug) {
      body.slug = slugify(body.name);
    }
    const product = await Product.create(body);
    // After creation, rebuild slug with the real _id
    if (product.name && product._id) {
      product.slug = buildProductSlug(product.name, product._id);
      await product.save();
    }
    return res.status(201).json({ success: true, data: product, message: 'Tạo sản phẩm thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/products/:id (admin)
export const update = async (req, res) => {
  try {
    const body = processProductData({ ...req.body });
    // Regenerate slug if name changed
    if (body.name) {
      body.slug = buildProductSlug(body.name, req.params.id);
    }
    const product = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (body.is_active !== undefined || body.stock !== undefined || body.is_deleted !== undefined) {
      await syncHotDealsForProductId(product._id, { hideOutOfStock: true });
    }
    return res.json({ success: true, data: product, message: 'Cập nhật thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/products/:id (admin) — safe soft delete
export const remove = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, is_deleted: { $ne: true } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or already deleted' });
    }

    // Soft-delete: mark as deleted and deactivate
    product.is_deleted = true;
    product.is_active = false;
    await product.save();
    await syncHotDealsForProductId(product._id, { hideOutOfStock: true });

    // Deactivate all BranchProducts linked to this product
    await BranchProduct.updateMany(
      { product_id: product._id },
      { $set: { is_available: false } }
    );

    // Invalidate product cache
    try {
      const { deleteCachePattern } = await import('../services/redisService.js');
      await deleteCachePattern('cache:*/api*products*');
    } catch (_cacheErr) { /* non-critical */ }

    return res.json({
      success: true,
      message: 'Sản phẩm đã được xóa (soft delete) và tất cả branch products đã bị vô hiệu hóa',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id/summary
export const summary = async (req, res) => {
  try {
    const idParam = req.params.id;
    const locale = req.query.locale || 'vi';

    const product = await findProductByRouteParam(idParam);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const aiReady = isProductAISummaryReady();
    if (!aiReady) {
      return res.json({
        success: true,
        aiReady: false,
        data: {
          overview: locale === 'en'
            ? 'AI Product Summary is currently unavailable (missing configuration).'
            : (locale === 'ja'
              ? 'AI製品概要は現在利用できません（設定がありません）。'
              : 'Tóm tắt sản phẩm AI hiện không khả dụng (thiếu cấu hình).'),
          strengths: [],
          cautions: [],
          recommendation: locale === 'en'
            ? 'Please contact system administrator to configure OpenRouter API credentials.'
            : (locale === 'ja'
              ? 'OpenRouter APIの資格情報を設定するには、システム管理者に連絡してください。'
              : 'Vui lòng liên hệ quản trị viên hệ thống để cấu hình thông tin API OpenRouter.'),
          notes: []
        }
      });
    }

    const summaryData = await buildProductAISummary({ product, locale });
    return res.json({
      success: true,
      aiReady: true,
      data: summaryData
    });
  } catch (err) {
    console.error('[productController] Error in AI summary:', err);
    // Safe fallback handling:
    const locale = req.query.locale || 'vi';
    return res.json({
      success: true,
      aiReady: false,
      error: err.message,
      data: {
        overview: locale === 'en'
          ? 'Failed to generate AI summary.'
          : (locale === 'ja' ? 'AI概要の生成に失敗しました。' : 'Không thể tạo tóm tắt AI.'),
        strengths: [],
        cautions: [],
        recommendation: locale === 'en'
          ? 'Please read the detailed product description below.'
          : (locale === 'ja' ? '以下の詳細な製品説明をお読みください。' : 'Vui lòng tham khảo chi tiết mô tả sản phẩm bên dưới.'),
        notes: [
          locale === 'en'
            ? 'The AI model might be temporarily busy or unreachable.'
            : (locale === 'ja' ? 'AIモデルが一時的にビジー状態か、アクセスできない可能性があります。' : 'Hệ thống AI có thể đang bận hoặc không thể kết nối.')
        ]
      }
    });
  }
};


