import { Banner, HotDeal, FeaturedCollection, DeliverySlot } from '../models/Misc.js';
import { validateHotDealProductReference } from '../services/hotDealIntegrityService.js';

const isTruthy = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const isPrivilegedRequest = (req) => {
  if (!req.user) return false;
  const roleId = Number(req.user.role_id);
  return roleId !== 3 && req.user.role_key !== 'customer';
};

export const listBanners = async (req, res) => {
  try {
    const query = {};
    const includeInactive = isTruthy(req.query.include_inactive) && isPrivilegedRequest(req);
    if (!includeInactive) {
      query.is_active = true;
    } else if (req.query.is_active !== undefined) {
      query.is_active = isTruthy(req.query.is_active);
    }
    if (req.query.position) query.position = req.query.position;

    const data = await Banner.find(query).sort('sort_order');
    return res.json({ success: true, data });
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const homeBanners = async (req, res) => {
  try { return res.json({ success: true, data: await Banner.find({ position: 'home', is_active: true }).sort('sort_order') }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const promoBanners = async (req, res) => {
  try { return res.json({ success: true, data: await Banner.find({ position: 'promo', is_active: true }).sort('sort_order') }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
const normalizeBannerPayload = (body) => {
  const data = { ...body };
  // Sync image <=> image_url for backwards compat
  if (data.image && !data.image_url) data.image_url = data.image;
  if (data.image_url && !data.image) data.image = data.image_url;
  
  if (data.text_color) {
    const isHex = /^#([0-9a-fA-F]{3}){1,2}$/i.test(data.text_color);
    const isRgb = /^(rgb|rgba)\(/.test(data.text_color);
    if (!isHex && !isRgb) throw new Error('text_color phải là mã HEX hoặc RGB/RGBA hợp lệ');
  }

  if (data.overlay_color) {
    // Basic CSS color validation (hex, rgb, rgba, hsl, hsla, or named color words)
    const isCssColor = /^(rgba?|hsla?|#[0-9A-Fa-f]{3,8}|[a-zA-Z]+)[^;]*$/i.test(data.overlay_color);
    if (!isCssColor) throw new Error('overlay_color phải là màu CSS hợp lệ');
  }

  return data;
};

export const createBanner = async (req, res) => {
  try { return res.status(201).json({ success: true, data: await Banner.create(normalizeBannerPayload(req.body)) }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const updateBanner = async (req, res) => {
  try { return res.json({ success: true, data: await Banner.findByIdAndUpdate(req.params.id, normalizeBannerPayload(req.body), { new: true }) }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const deleteBanner = async (req, res) => {
  try { await Banner.findByIdAndDelete(req.params.id); return res.json({ success: true, message: 'Deleted' }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const listHotDeals = async (req, res) => {
  try {
    const query = {};
    const includeInactive = isTruthy(req.query.include_inactive) && isPrivilegedRequest(req);
    if (!includeInactive) {
      query.is_active = true;
    } else if (req.query.is_active !== undefined) {
      query.is_active = isTruthy(req.query.is_active);
    }
    if (req.query.product_id) query.product_id = req.query.product_id;

    const data = await HotDeal.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data });
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const createHotDeal = async (req, res) => {
  try {
    const payload = await validateHotDealProductReference({ ...req.body }, { hideOutOfStock: false, enforceProductExistence: true });
    return res.status(201).json({ success: true, data: await HotDeal.create(payload) });
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const updateHotDeal = async (req, res) => {
  try {
    const payload = await validateHotDealProductReference({ ...req.body }, { hideOutOfStock: false, enforceProductExistence: true });
    return res.json({ success: true, data: await HotDeal.findByIdAndUpdate(req.params.id, payload, { new: true }) });
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
export const deleteHotDeal = async (req, res) => {
  try { await HotDeal.findByIdAndDelete(req.params.id); return res.json({ success: true, message: 'Deleted' }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const listFeaturedCollections = async (req, res) => {
  try { return res.json({ success: true, data: await FeaturedCollection.find({ is_active: true }).sort('sort_order') }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const listDeliverySlots = async (req, res) => {
  try {
    const filter = { is_available: true };
    if (req.query.branch_id) filter.branch_id = req.query.branch_id;
    return res.json({ success: true, data: await DeliverySlot.find(filter) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
