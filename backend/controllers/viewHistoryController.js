import ViewedHistory from '../models/ViewedHistory.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import { resolveProductPricing } from '../services/pricingResolverService.js';

const toComparableId = (value) => String(value || '');
const MAX_LIST_LIMIT = 200;
const MERGE_BATCH_LIMIT = 200;
const TRACK_DEDUPE_WINDOW_MS = 30 * 1000;

const asObjectId = (value) => {
  const str = String(value || '').trim();
  if (!str || !mongoose.Types.ObjectId.isValid(str)) return null;
  return new mongoose.Types.ObjectId(str);
};

const buildIdCandidates = (value) => {
  const out = [];
  if (value !== undefined && value !== null && value !== '') out.push(value);
  const str = String(value || '').trim();
  if (str) out.push(str);
  const oid = asObjectId(str);
  if (oid) out.push(oid);

  const unique = [];
  const seen = new Set();
  out.forEach((item) => {
    const key = String(item);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique;
};

const toOptionalNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toDateOrNow = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const resolveUserId = (req) => {
  const roleId = Number(req.user?.role_id);
  if (roleId !== 3) {
    return req.query.user_id || req.body.user_id || req.params.userId || req.userId;
  }
  return req.userId;
};

const normalizeTrackPayload = (payload = {}) => {
  return {
    product_id: payload.product_id ? String(payload.product_id) : '',
    branch_product_id: payload.branch_product_id ? String(payload.branch_product_id) : null,
    product_name: String(payload.product_name || '').trim(),
    product_image: String(payload.product_image || '').trim(),
    price: toOptionalNumber(payload.price),
    original_price: toOptionalNumber(payload.original_price),
    category: String(payload.category || '').trim(),
    viewed_at: toDateOrNow(payload.viewed_at),
  };
};

const hydrateFromBranchProduct = async (payload) => {
  const out = { ...payload };
  if (!out.branch_product_id) return out;

  const branchObjectId = asObjectId(out.branch_product_id);
  if (!branchObjectId) return out;

  const branchProduct = await BranchProduct.findById(branchObjectId).lean();
  if (!branchProduct) return out;

  if (!out.product_id && branchProduct.product_id) {
    out.product_id = String(branchProduct.product_id);
  }

  if (out.price === undefined) out.price = toOptionalNumber(branchProduct.price);
  if (out.original_price === undefined) out.original_price = toOptionalNumber(branchProduct.original_price);
  return out;
};

const findLatestByUserAndProduct = async (userId, productId) => {
  return ViewedHistory.findOne({
    user_id: { $in: buildIdCandidates(userId) },
    product_id: { $in: buildIdCandidates(productId) },
  }).sort('-viewed_at');
};

const upsertHistoryForUser = async ({ userId, item, dedupeWindowMs = TRACK_DEDUPE_WINDOW_MS }) => {
  const normalized = {
    user_id: String(userId),
    product_id: String(item.product_id),
    branch_product_id: item.branch_product_id || null,
    product_name: item.product_name || '',
    product_image: item.product_image || '',
    price: toNumber(item.price, 0),
    original_price: toNumber(item.original_price, 0),
    category: item.category || '',
    viewed_at: toDateOrNow(item.viewed_at),
  };

  const existing = await findLatestByUserAndProduct(userId, normalized.product_id);
  if (!existing) {
    return ViewedHistory.create({
      ...normalized,
      view_count: 1,
    });
  }

  const previousViewedAt = existing.viewed_at ? new Date(existing.viewed_at).getTime() : 0;
  const nextViewedAt = normalized.viewed_at.getTime();
  const shouldIncreaseViewCount = !previousViewedAt || (nextViewedAt - previousViewedAt) >= dedupeWindowMs;

  existing.viewed_at = normalized.viewed_at;
  if (shouldIncreaseViewCount) {
    existing.view_count = Math.max(1, Number(existing.view_count || 1) + 1);
  }
  if (normalized.branch_product_id) existing.branch_product_id = normalized.branch_product_id;
  if (normalized.product_name) existing.product_name = normalized.product_name;
  if (normalized.product_image) existing.product_image = normalized.product_image;
  if (normalized.category) existing.category = normalized.category;
  if (item.price !== undefined) existing.price = normalized.price;
  if (item.original_price !== undefined) existing.original_price = normalized.original_price;

  await existing.save();

  await ViewedHistory.deleteMany({
    _id: { $ne: existing._id },
    user_id: { $in: buildIdCandidates(userId) },
    product_id: { $in: buildIdCandidates(normalized.product_id) },
  });

  return existing;
};

const dedupeRowsByProduct = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = toComparableId(row.product_id || row.branch_product_id || row._id);
    if (!key || map.has(key)) return;
    map.set(key, row);
  });
  return Array.from(map.values());
};

const buildHistorySnapshot = async (rows) => {
  const branchProductIds = rows
    .map((row) => asObjectId(row.branch_product_id))
    .filter(Boolean);

  const branchProductsRaw = branchProductIds.length > 0
    ? await BranchProduct.find({ _id: { $in: branchProductIds } }).lean()
    : [];

  const branchProductMap = new Map(branchProductsRaw.map((bp) => [toComparableId(bp._id), bp]));

  const productIds = new Set();
  rows.forEach((row) => {
    if (row.product_id) productIds.add(toComparableId(row.product_id));
    const bp = branchProductMap.get(toComparableId(row.branch_product_id));
    if (bp?.product_id) productIds.add(toComparableId(bp.product_id));
  });

  const productObjectIds = Array.from(productIds)
    .map((id) => asObjectId(id))
    .filter(Boolean);

  const productsRaw = productObjectIds.length > 0
    ? await Product.find({ _id: { $in: productObjectIds } }).lean()
    : [];

  const productMap = new Map(productsRaw.map((p) => [toComparableId(p._id), p]));

  const now = new Date();
  return Promise.all(rows.map(async (row) => {
    const rowObj = row.toObject ? row.toObject() : { ...row };
    const bp = branchProductMap.get(toComparableId(rowObj.branch_product_id));
    const productId = toComparableId(rowObj.product_id || bp?.product_id || '');
    const product = productMap.get(productId);

    let price = toNumber(rowObj.price, bp?.price ?? product?.price ?? 0);
    let originalPrice = toNumber(rowObj.original_price, bp?.original_price ?? product?.original_price ?? price);
    let discountPercent = bp?.discount_percent ?? product?.discount_percent ?? 0;
    let effectivePrice = price;
    let pricingSource = 'BASE_PRICE';
    let activeHotDeal = null;
    let activePromotion = null;

    if (product) {
      const pricing = await resolveProductPricing(product, bp, bp?.branch_id, { now });
      price = pricing.effective_price;
      originalPrice = pricing.original_price;
      discountPercent = pricing.discount_percent;
      effectivePrice = pricing.effective_price;
      pricingSource = pricing.pricing_source;
      activeHotDeal = pricing.active_hot_deal;
      activePromotion = pricing.active_promotion;
    }

    return {
      id: String(rowObj._id),
      user_id: rowObj.user_id,
      product_id: productId || null,
      branch_product_id: rowObj.branch_product_id || null,
      viewed_at: rowObj.viewed_at || rowObj.updated_at || rowObj.created_at,
      view_count: Number(rowObj.view_count || 1),
      product_name: rowObj.product_name || product?.name || '',
      product_image: rowObj.product_image || product?.images?.[0] || product?.thumbnail || '',
      price,
      original_price: originalPrice,
      discount_percent: discountPercent,
      effective_price: effectivePrice,
      pricing_source: pricingSource,
      active_hot_deal: activeHotDeal,
      active_promotion: activePromotion,
      category: rowObj.category || product?.category_name || product?.category?.name || '',
      stock: bp?.stock ?? product?.stock ?? 0,
      in_stock: bp ? Number(bp.stock || 0) > 0 && bp.is_available !== false : Number(product?.stock || 0) > 0,
    };
  }));
};

export const list = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const limitRaw = Number(req.query.limit || 100);
    const limit = Number.isNaN(limitRaw) ? 100 : Math.min(MAX_LIST_LIMIT, Math.max(1, limitRaw));

    const raw = await ViewedHistory.find({
      user_id: { $in: buildIdCandidates(userId) },
    })
      .sort('-viewed_at')
      .limit(limit * 2);

    const dedupedRows = dedupeRowsByProduct(raw).slice(0, limit);
    const data = await buildHistorySnapshot(dedupedRows);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const track = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    let payload = normalizeTrackPayload(req.body || {});
    payload = await hydrateFromBranchProduct(payload);

    if (!payload.product_id && !payload.branch_product_id) {
      return res.status(400).json({ success: false, message: 'product_id or branch_product_id is required' });
    }

    if (!payload.product_id) {
      return res.status(400).json({ success: false, message: 'Unable to resolve product_id' });
    }

    const history = await upsertHistoryForUser({ userId, item: payload });

    const [normalized] = await buildHistorySnapshot([history]);
    return res.status(201).json({ success: true, data: normalized, message: 'Đã lưu lịch sử xem' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const item = await ViewedHistory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'History item not found' });
    }

    if (
      Number(req.user?.role_id) === 3
      && !buildIdCandidates(req.userId).some((candidate) => toComparableId(candidate) === toComparableId(item.user_id))
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await ViewedHistory.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Đã xóa khỏi lịch sử đã xem' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const clear = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    await ViewedHistory.deleteMany({
      user_id: { $in: buildIdCandidates(userId) },
    });
    return res.json({ success: true, message: 'Đã xóa lịch sử đã xem' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const merge = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const rawItems = Array.isArray(req.body?.items)
      ? req.body.items
      : (Array.isArray(req.body?.history) ? req.body.history : []);

    const items = rawItems.slice(0, MERGE_BATCH_LIMIT);
    let merged = 0;
    let skipped = 0;

    for (const raw of items) {
      let payload = normalizeTrackPayload(raw || {});
      payload = await hydrateFromBranchProduct(payload);

      if (!payload.product_id && !payload.branch_product_id) {
        skipped += 1;
        continue;
      }

      if (!payload.product_id) {
        skipped += 1;
        continue;
      }

      await upsertHistoryForUser({ userId, item: payload });
      merged += 1;
    }

    return res.json({
      success: true,
      message: 'Đã đồng bộ lịch sử đã xem',
      data: {
        received: rawItems.length,
        merged,
        skipped,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
