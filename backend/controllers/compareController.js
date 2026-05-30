import mongoose from 'mongoose';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import CompareSummary from '../models/CompareSummary.js';
import { buildCompareAISummary, isCompareAISummaryReady } from '../services/aiSummaryService.js';

const MAX_PRODUCTS = 4;

const normalizeLocale = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ja')) return 'ja';
  return 'vi';
};

const localeText = (locale, vi, en, ja) => {
  const norm = normalizeLocale(locale);
  if (norm === 'en') return en;
  if (norm === 'ja') return ja || en;
  return vi;
};

const toPlainText = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringOrNull = (value) => {
  const text = toPlainText(value);
  return text || null;
};

const truncateText = (value, maxLength) => {
  const text = toStringOrNull(value);
  if (!text) return null;
  if (!Number.isFinite(maxLength) || maxLength <= 0) return text;
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const toStringArray = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map((item) => toPlainText(item)).filter(Boolean);
};

const compactObject = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }),
);

const normalizeRequestedProducts = (rawProducts) => {
  if (!Array.isArray(rawProducts)) return [];

  const dedup = new Map();
  for (const item of rawProducts) {
    const pid = String(item?.product_id || item?.id || '').trim();
    if (!pid || dedup.has(pid)) continue;
    dedup.set(pid, item || {});
    if (dedup.size >= MAX_PRODUCTS) break;
  }

  return Array.from(dedup.values());
};

const normalizeIncomingOnlyProduct = (item) => {
  if (!item || typeof item !== 'object') return null;
  const id = String(item?.product_id || item?.id || '').trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

  const safeBadges = toStringArray((item.badges || []).map((b) => (typeof b === 'string' ? b : b?.text)));
  const safePromotions = toStringArray((item.promotions || []).map((p) => p?.title || p?.badge_text || p));

  return compactObject({
    product_id: id,
    name: truncateText(item.name, 140),
    image: toStringOrNull(item.image || item.images?.[0]),
    price: toNumberOrNull(item.price),
    original_price: toNumberOrNull(item.original_price),
    discount_percent: toNumberOrNull(item.discount_percent),
    brand: truncateText(item.brand, 80),
    category_name: truncateText(item.category_name, 100),
    supplier_name: truncateText(item.supplier_name, 100),
    rating: toNumberOrNull(item.average_rating ?? item.rating),
    review_count: toNumberOrNull(item.review_count),
    expiry_date: truncateText(item.expiry_date, 40),
    stock: toNumberOrNull(item.stock),
    description: truncateText(item.description || item.short_description, 700),
    badges: safeBadges,
    promotions: safePromotions,
    shipping_info: truncateText(item.shipping_info || item.shipping_fee_note, 180),
  });
};

export const summaryStatus = async (_req, res) => {
  const ready = isCompareAISummaryReady();
  
  let reason = 'ok';
  if (!ready) {
    const key = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free';
    
    if (!key || String(key).trim().length === 0 || key === 'undefined' || key === 'null' || key === 'placeholder') {
      reason = 'missing_key';
    } else if (!model || String(model).trim().length === 0 || model === 'undefined' || model === 'null') {
      reason = 'invalid_model';
    } else {
      reason = 'unknown_reason';
    }
  }

  console.info(`[compare-summary] status requested | openRouterReady=${ready} | reason=${reason} | model=${process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free'}`);

  return res.json({
    success: true,
    aiReady: ready,
    reason,
    provider: 'openrouter',
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free',
  });
};

export const summary = async (req, res) => {
  const localeRaw = String(req.body?.locale || '').trim();
  const locale = normalizeLocale(localeRaw || 'vi');

  try {
    const requestedProducts = normalizeRequestedProducts(req.body?.products);

    console.info(`[compare-summary] summary requested | localeRaw=${localeRaw || 'N/A'} | locale=${locale} | products=${requestedProducts.length}`);

    if (requestedProducts.length < 2) {
      return res.status(400).json({
        success: false,
        message: localeText(locale, 'Can it nhat 2 san pham de tao tom tat so sanh', 'At least 2 products are required to generate a comparison summary'),
      });
    }

    if (requestedProducts.length > MAX_PRODUCTS) {
      return res.status(400).json({
        success: false,
        message: localeText(locale, `Chi ho tro toi da ${MAX_PRODUCTS} san pham`, `Only up to ${MAX_PRODUCTS} products are supported`),
      });
    }

    const requestedIds = requestedProducts
      .map((p) => String(p?.product_id || p?.id || '').trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (requestedIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: localeText(locale, 'Danh sach san pham khong hop le', 'Invalid product list'),
      });
    }

    const sortedIds = requestedIds.slice().sort();
    const cacheHash = `${sortedIds.join('-')}-${locale}`;

    try {
      const cached = await CompareSummary.findOne({ hash: cacheHash });
      if (cached) {
        console.info(`[compare-summary] Cache hit for hash=${cacheHash}`);
        cached.access_count += 1;
        cached.last_accessed_at = new Date();
        await cached.save();
        return res.json({ success: true, summary: cached.summary });
      }
    } catch (cacheErr) {
      console.warn('[compare-summary] Cache lookup failed:', cacheErr.message);
    }

    const incomingMap = new Map(
      requestedProducts.map((item) => [String(item?.product_id || item?.id || '').trim(), item || {}]),
    );

    let normalizedProducts = [];

    try {
      const objectIds = requestedIds.map((id) => new mongoose.Types.ObjectId(id));
      const products = await Product.find({ _id: { $in: objectIds }, is_active: true }).lean();
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      const branchProducts = await BranchProduct.aggregate([
        { $match: { product_id: { $in: objectIds }, is_available: true } },
        { $sort: { stock: -1, updated_at: -1 } },
        { $group: { _id: '$product_id', doc: { $first: '$$ROOT' } } },
      ]);
      const branchMap = new Map(branchProducts.map((x) => [String(x._id), x.doc]));

      normalizedProducts = requestedIds
        .map((id) => {
          const dbProduct = productMap.get(id);
          const incoming = incomingMap.get(id) || {};
          if (!dbProduct) return normalizeIncomingOnlyProduct(incoming);

          const branch = branchMap.get(id);
          const safeBadges = toStringArray((incoming.badges || []).map((b) => (typeof b === 'string' ? b : b?.text)));
          const safePromotions = toStringArray((incoming.promotions || []).map((p) => p?.title || p?.badge_text || p));

          return compactObject({
            product_id: id,
            name: truncateText(dbProduct.name, 140) || truncateText(incoming.name, 140),
            image: toStringOrNull(incoming.image || incoming.images?.[0] || dbProduct.image || dbProduct.images?.[0]),
            price: toNumberOrNull(branch?.price ?? dbProduct.price ?? incoming.price),
            original_price: toNumberOrNull(branch?.original_price ?? dbProduct.original_price ?? incoming.original_price),
            discount_percent: toNumberOrNull(branch?.discount_percent ?? dbProduct.discount_percent ?? incoming.discount_percent),
            brand: truncateText(dbProduct.brand, 80) || truncateText(incoming.brand, 80),
            category_name: truncateText(dbProduct.category_name, 100) || truncateText(incoming.category_name, 100),
            supplier_name: truncateText(dbProduct.supplier_name || dbProduct.supplier?.name || incoming.supplier_name, 100),
            rating: toNumberOrNull(dbProduct.average_rating ?? dbProduct.rating ?? incoming.rating ?? incoming.average_rating),
            review_count: toNumberOrNull(dbProduct.review_count ?? incoming.review_count),
            expiry_date: truncateText(branch?.expiry_date || dbProduct.expiry_date || incoming.expiry_date, 40),
            stock: toNumberOrNull(branch?.stock ?? dbProduct.stock ?? incoming.stock),
            description: truncateText(dbProduct.description || incoming.description, 700),
            badges: safeBadges,
            promotions: safePromotions,
            shipping_info: truncateText(incoming.shipping_info || incoming.shipping_fee_note, 180),
          });
        })
        .filter(Boolean)
        .slice(0, MAX_PRODUCTS);
    } catch (dbErr) {
      console.warn(`[compare-summary] DB enrichment failed, fallback to request payload: ${dbErr?.message || 'unknown'}`);
      normalizedProducts = requestedProducts
        .map((item) => normalizeIncomingOnlyProduct(item))
        .filter(Boolean)
        .slice(0, MAX_PRODUCTS);
    }

    if (normalizedProducts.length < 2) {
      return res.status(400).json({
        success: false,
        message: localeText(locale, 'Khong du du lieu san pham hop le de tom tat', 'Not enough valid product data to summarize'),
      });
    }

    const aiSummary = await buildCompareAISummary({
      products: normalizedProducts,
      locale,
    });

    try {
      await CompareSummary.create({
        product_ids: sortedIds,
        hash: cacheHash,
        locale,
        summary: aiSummary
      });
      console.info(`[compare-summary] Cached new summary for hash=${cacheHash}`);
    } catch (saveErr) {
      console.warn('[compare-summary] Failed to cache summary:', saveErr.message);
    }

    return res.json({
      success: true,
      summary: aiSummary,
    });
  } catch (err) {
    console.error(`[compare-summary] AI error code=${err?.code || 'UNKNOWN'} status=${err?.status || 'N/A'} message=${err?.message || 'unknown'}`);

    if (err?.code === 'AI_NOT_READY') {
      return res.status(503).json({
        success: false,
        aiReady: false,
        message: localeText(
          locale,
          'AI chưa sẵn sàng. Vui lòng cấu hình OPENROUTER_API_KEY ở backend.',
          'AI is not ready. Please configure OPENROUTER_API_KEY in backend.',
          'AIの準備ができていません。バックエンドでOPENROUTER_API_KEYを設定してください。'
        ),
      });
    }

    if (err?.code === 'AI_QUOTA_EXCEEDED') {
      return res.status(429).json({
        success: false,
        message: localeText(
          locale,
          'OpenRouter API đã hết hạn mức hoặc bị giới hạn tạm thời. Vui lòng kiểm tra quota/billing rồi thử lại.',
          'OpenRouter API quota is exhausted or temporarily rate-limited. Please check quota/billing and try again.',
          'OpenRouter APIのクォータが使い果たされているか、一時的にレート制限されています。クォータまたは請求を確認して再試行してください。'
        ),
      });
    }

    if (err?.code === 'AI_MODEL_NOT_FOUND') {
      return res.status(503).json({
        success: false,
        message: localeText(
          locale,
          'Model OpenRouter hiện tại không khả dụng. Hãy đổi OPENROUTER_MODEL trong backend/.env.',
          'Current OpenRouter model is unavailable. Please update OPENROUTER_MODEL in backend/.env.',
          '現在のOpenRouterモデルは利用できません。backend/.envのOPENROUTER_MODELを更新してください。'
        ),
      });
    }

    if (err?.code === 'AI_AUTH_FAILED' || err?.code === 'AI_TIMEOUT' || err?.code === 'AI_REQUEST_FAILED') {
      return res.status(503).json({
        success: false,
        message: err?.message || localeText(
          locale,
          'Không thể tạo tóm tắt AI lúc này. Vui lòng thử lại.',
          'Unable to generate AI summary right now. Please try again.',
          '現在AI要約を生成できません。後でもう一度お試しください。'
        ),
      });
    }

    return res.status(500).json({
      success: false,
      message: err?.message || localeText(
        locale,
        'Không thể tạo tóm tắt AI lúc này. Vui lòng thử lại.',
        'Unable to generate AI summary right now. Please try again.',
        '現在AI要約を生成できません。後でもう一度お試しください。'
      ),
    });
  }
};
