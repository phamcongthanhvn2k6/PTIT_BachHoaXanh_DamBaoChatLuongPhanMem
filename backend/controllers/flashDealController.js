import FlashDeal from '../models/FlashDeal.js';
import { cleanupOrphanHotDeals, validateHotDealProductReference } from '../services/hotDealIntegrityService.js';

const TRUTHY = ['1', 'true', 'yes', 'on'];
const ALLOWED_TYPES = ['percent', 'fixed_amount', 'flash_deal'];
const ALLOWED_STATUS = ['draft', 'active', 'expired'];

const toId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return TRUTHY.includes(String(value).trim().toLowerCase());
};

const toDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const parseOptionalQuantity = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return Math.max(0, toNumber(value, 0));
};

const isPrivilegedRequest = (req) => {
  if (!req.user) return false;
  const roleId = Number(req.user.role_id);
  return roleId !== 3 && req.user.role_key !== 'customer';
};

const deriveStatus = (deal, now = new Date()) => {
  const endDate = toDate(deal.end_date);
  const startDate = toDate(deal.start_date);
  if (endDate && endDate.getTime() <= now.getTime()) return 'expired';
  if (deal.is_active === false) return 'draft';
  if (startDate && startDate.getTime() > now.getTime()) return 'draft';
  const normalized = String(deal.status || '').toLowerCase();
  if (normalized === 'expired') return 'expired';
  if (normalized === 'active') return 'active';
  return 'active';
};

const evaluateVisibility = (deal, now = new Date()) => {
  const start = toDate(deal.start_date);
  const end = toDate(deal.end_date);
  const inWindow = (!start || start.getTime() <= now.getTime()) && (!end || end.getTime() > now.getTime());

  const effectiveLimit = toNumber(deal.total_quantity ?? deal.stock_limit ?? 0, 0);
  const hasLimit = effectiveLimit > 0;
  const remaining = deal.remaining_quantity === null || deal.remaining_quantity === undefined
    ? null
    : toNumber(deal.remaining_quantity, 0);
  const inStock = !hasLimit || remaining === null || remaining > 0;

  const activeState = deal.is_active === true && String(deal.status || '').toLowerCase() === 'active';

  const reasons = [];
  if (!activeState) reasons.push('inactive_or_non_active_status');
  if (!inWindow) reasons.push('outside_time_window');
  if (!inStock) reasons.push('out_of_stock');

  return {
    active_state: activeState,
    in_window: inWindow,
    in_stock: inStock,
    eligible_for_user: activeState && inWindow && inStock,
    reasons,
  };
};

const normalizeDeal = (doc) => {
  const source = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const now = new Date();
  const status = deriveStatus(source, now);

  const rawTotalQuantity = source.total_quantity !== null && source.total_quantity !== undefined
    ? toNumber(source.total_quantity, 0)
    : null;
  const totalQuantity = rawTotalQuantity !== null && rawTotalQuantity > 0 ? rawTotalQuantity : null;

  const rawStockLimit = source.stock_limit !== null && source.stock_limit !== undefined
    ? toNumber(source.stock_limit, 0)
    : null;
  const fallbackRemaining = rawStockLimit !== null && rawStockLimit > 0 ? rawStockLimit : null;

  const remainingRaw = source.remaining_quantity !== null && source.remaining_quantity !== undefined
    ? toNumber(source.remaining_quantity, 0)
    : (totalQuantity ?? fallbackRemaining);
  const remainingQuantity = remainingRaw === null
    ? null
    : ((remainingRaw === 0 && totalQuantity === null && fallbackRemaining === null) ? null : Math.max(0, remainingRaw));

  const normalizedType = ALLOWED_TYPES.includes(String(source.type || '').toLowerCase())
    ? String(source.type).toLowerCase()
    : 'percent';

  return {
    ...source,
    id: String(source._id || source.id || ''),
    _id: String(source._id || source.id || ''),
    type: normalizedType,
    status,
    is_active: status === 'active',
    total_quantity: totalQuantity,
    remaining_quantity: remainingQuantity,
    start_date: source.start_date || null,
    end_date: source.end_date || null,
    product_id: toId(source.product_id),
    branch_product_id: toId(source.branch_product_id),
    branch_id: toId(source.branch_id),
    target_product_ids: Array.isArray(source.target_product_ids) ? source.target_product_ids.map(String) : [],
    target_category_ids: Array.isArray(source.target_category_ids) ? source.target_category_ids.map(String) : [],
    target_branch_ids: Array.isArray(source.target_branch_ids) ? source.target_branch_ids.map(String) : [],
  };
};

const normalizePayload = (body, isUpdate = false) => {
  const payload = {};

  const assign = (key, value) => {
    if (!isUpdate || value !== undefined) payload[key] = value;
  };

  const title = body?.title !== undefined ? String(body.title || '').trim() : undefined;
  const description = body?.description !== undefined ? String(body.description || '').trim() : undefined;
  const imageUrl = body?.image_url !== undefined ? String(body.image_url || '').trim() : undefined;
  const badgeText = body?.badge_text !== undefined ? String(body.badge_text || '').trim() : undefined;
  const productId = body?.product_id !== undefined ? toId(body.product_id) : undefined;
  const branchProductId = body?.branch_product_id !== undefined ? toId(body.branch_product_id) : undefined;
  const branchId = body?.branch_id !== undefined ? toId(body.branch_id) : undefined;
  const rawType = body?.type !== undefined ? String(body.type || '').trim().toLowerCase() : undefined;
  const status = body?.status !== undefined ? String(body.status || '').trim().toLowerCase() : undefined;

  if (!isUpdate && !title) throw new Error('Flash deal title is required');

  if (rawType !== undefined && !ALLOWED_TYPES.includes(rawType)) {
    throw new Error('Invalid flash deal type');
  }

  if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
    throw new Error('Invalid flash deal status');
  }

  const startDate = body?.start_date !== undefined ? toDate(body.start_date) : undefined;
  const endDate = body?.end_date !== undefined ? toDate(body.end_date) : undefined;
  if ((body?.start_date !== undefined && !startDate) || (body?.end_date !== undefined && !endDate)) {
    throw new Error('Invalid start_date or end_date');
  }
  if (startDate && endDate && startDate.getTime() >= endDate.getTime()) {
    throw new Error('end_date must be greater than start_date');
  }

  const totalQuantity = parseOptionalQuantity(body?.total_quantity);
  const remainingQuantity = parseOptionalQuantity(body?.remaining_quantity);

  assign('title', title);
  assign('description', description);
  assign('image_url', imageUrl);
  assign('badge_text', badgeText);
  assign('product_id', productId);
  assign('branch_product_id', branchProductId);
  assign('branch_id', branchId);
  assign('type', rawType);
  assign('discount_value', body?.discount_value !== undefined ? Math.max(0, toNumber(body.discount_value, 0)) : undefined);
  assign('discount_percent', body?.discount_percent !== undefined ? Math.max(0, toNumber(body.discount_percent, 0)) : undefined);
  assign('deal_price', body?.deal_price !== undefined ? Math.max(0, toNumber(body.deal_price, 0)) : undefined);
  assign('original_price', body?.original_price !== undefined ? Math.max(0, toNumber(body.original_price, 0)) : undefined);
  assign('total_quantity', totalQuantity);
  assign('remaining_quantity', remainingQuantity);
  assign('sold_count', body?.sold_count !== undefined ? Math.max(0, toNumber(body.sold_count, 0)) : undefined);
  assign('start_date', startDate);
  assign('end_date', endDate);
  assign('is_active', body?.is_active !== undefined ? toBoolean(body.is_active, true) : undefined);
  assign('status', status);
  assign('priority', body?.priority !== undefined ? toNumber(body.priority, 0) : undefined);

  if (Array.isArray(body?.target_product_ids)) assign('target_product_ids', body.target_product_ids.map(toId));
  if (Array.isArray(body?.target_category_ids)) assign('target_category_ids', body.target_category_ids.map(toId));
  if (Array.isArray(body?.target_branch_ids)) assign('target_branch_ids', body.target_branch_ids.map(toId));

  if (!isUpdate && !(payload.product_id || payload.branch_product_id)) {
    throw new Error('product_id or branch_product_id is required');
  }

  if (payload.type === 'percent' && payload.discount_percent === undefined && payload.discount_value !== undefined) {
    payload.discount_percent = Math.max(0, toNumber(payload.discount_value, 0));
  }

  if (payload.total_quantity !== undefined && payload.total_quantity !== null && payload.remaining_quantity === undefined && !isUpdate) {
    payload.remaining_quantity = payload.total_quantity;
  }

  if (payload.is_active === false && payload.status === undefined) {
    payload.status = 'draft';
  }

  if (payload.is_active === true && payload.status === undefined) {
    payload.status = 'active';
  }

  if (payload.is_active === false && payload.status === 'active') {
    payload.status = 'draft';
  }

  if (payload.is_active === true && payload.status === 'draft') {
    payload.status = 'active';
  }

  return payload;
};

export const listFlashDeals = async (req, res) => {
  try {
    const includeInactive = toBoolean(req.query?.include_inactive, false) && isPrivilegedRequest(req);
    const debugMode = toBoolean(req.query?.debug, false);
    const query = {};

    if (req.query?.product_id) query.product_id = toId(req.query.product_id);
    if (req.query?.branch_product_id) query.branch_product_id = toId(req.query.branch_product_id);
    if (req.query?.is_active !== undefined) query.is_active = toBoolean(req.query.is_active, true);

    const docs = await FlashDeal.find(query).sort({ priority: -1, created_at: -1, createdAt: -1 });
    const normalized = docs.map(normalizeDeal);
    const now = new Date();

    let data = normalized;
    if (!includeInactive) {
      data = normalized.filter((deal) => {
        return evaluateVisibility(deal, now).eligible_for_user;
      });
    }

    if (req.query?.status) {
      const targetStatus = String(req.query.status).toLowerCase();
      data = data.filter((deal) => String(deal.status).toLowerCase() === targetStatus);
    }

    const visibilityLog = data.slice(0, 5).map((deal) => ({
      id: deal.id,
      is_active: deal.is_active,
      status: deal.status,
      start_date: deal.start_date,
      end_date: deal.end_date,
      remaining_quantity: deal.remaining_quantity,
      ...evaluateVisibility(deal, now),
    }));

    console.info('[FlashDeal][list]', {
      includeInactive,
      query,
      total_found: normalized.length,
      total_returned: data.length,
      sample: visibilityLog,
    });

    const meta = debugMode
      ? {
          total_found: normalized.length,
          total_returned: data.length,
          sample: visibilityLog,
        }
      : undefined;

    return res.json({ success: true, data, meta });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detailFlashDeal = async (req, res) => {
  try {
    const doc = await FlashDeal.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Flash deal not found' });
    return res.json({ success: true, data: normalizeDeal(doc) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createFlashDeal = async (req, res) => {
  try {
    const payload = await validateHotDealProductReference(normalizePayload(req.body, false), {
      hideOutOfStock: false,
      enforceProductExistence: true,
    });
    const created = await FlashDeal.create(payload);
    return res.status(201).json({ success: true, data: normalizeDeal(created), message: 'Flash deal created' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateFlashDeal = async (req, res) => {
  try {
    const payload = await validateHotDealProductReference(normalizePayload(req.body, true), {
      hideOutOfStock: false,
      enforceProductExistence: true,
    });
    const updated = await FlashDeal.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Flash deal not found' });
    return res.json({ success: true, data: normalizeDeal(updated), message: 'Flash deal updated' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const removeFlashDeal = async (req, res) => {
  try {
    const deleted = await FlashDeal.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Flash deal not found' });
    return res.json({ success: true, message: 'Flash deal deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleFlashDeal = async (req, res) => {
  try {
    const doc = await FlashDeal.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Flash deal not found' });

    const before = normalizeDeal(doc);
    const currentRawActive = doc.is_active !== false;
    const nextActive = !currentRawActive;

    console.info('[FlashDeal][toggle][before]', {
      id: before.id,
      is_active: before.is_active,
      status: before.status,
      start_date: before.start_date,
      end_date: before.end_date,
      remaining_quantity: before.remaining_quantity,
    });

    doc.is_active = nextActive;
    doc.status = deriveStatus({
      ...doc.toObject(),
      is_active: nextActive,
      status: nextActive ? 'active' : 'draft',
    });
    await doc.save();

    const after = normalizeDeal(doc);
    const visibility = evaluateVisibility(after, new Date());

    console.info('[FlashDeal][toggle][after]', {
      id: after.id,
      is_active: after.is_active,
      status: after.status,
      start_date: after.start_date,
      end_date: after.end_date,
      remaining_quantity: after.remaining_quantity,
      visibility,
    });

    return res.json({ success: true, data: after, visibility, message: 'Flash deal toggled' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const cleanupFlashDeals = async (req, res) => {
  try {
    const hideOutOfStock = toBoolean(req.query?.hide_out_of_stock, false);
    const result = await cleanupOrphanHotDeals({ hideOutOfStock });
    return res.json({ success: true, data: result, message: 'Hot deal cleanup completed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
