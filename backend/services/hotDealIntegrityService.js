import { HotDeal } from '../models/Misc.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const toId = (value) => (value === null || value === undefined || value === '' ? '' : String(value));

const asObjectId = (value) => {
  const id = toId(value);
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

const productAvailability = (product) => {
  if (!product) {
    return { exists: false, isActive: false, inStock: false };
  }
  const isActive = product.is_active !== false && product.is_deleted !== true;
  const inStock = Number(product.stock || 0) > 0;
  return { exists: true, isActive, inStock };
};

const deactivationPatch = (availability, hideOutOfStock = true) => {
  if (!availability.exists) return { is_active: false, status: 'draft' };
  if (!availability.isActive) return { is_active: false, status: 'draft' };
  if (hideOutOfStock && !availability.inStock) return { is_active: false, status: 'draft' };
  return null;
};

export const validateHotDealProductReference = async (payload, options = {}) => {
  const { hideOutOfStock = false, enforceProductExistence = true } = options;
  const productId = toId(payload?.product_id);
  if (!productId) return payload;

  const objectId = asObjectId(productId);
  const product = objectId ? await Product.findById(objectId).select('_id is_active is_deleted stock').lean() : null;
  const availability = productAvailability(product);
  const patch = deactivationPatch(availability, hideOutOfStock);

  if (!availability.exists && enforceProductExistence) {
    throw new Error('Hot deal product_id does not exist');
  }

  if (patch) return { ...payload, ...patch };
  return payload;
};

export const cleanupOrphanHotDeals = async (options = {}) => {
  const { hideOutOfStock = false } = options;
  const docs = await HotDeal.find({ product_id: { $ne: null } }).select('_id product_id is_active status').lean();
  let deactivated = 0;
  let checked = 0;

  for (const doc of docs) {
    const productId = toId(doc.product_id);
    if (!productId) continue;
    checked += 1;
    const objectId = asObjectId(productId);
    const product = objectId ? await Product.findById(objectId).select('_id is_active is_deleted stock').lean() : null;
    const patch = deactivationPatch(productAvailability(product), hideOutOfStock);
    if (!patch) continue;
    const result = await HotDeal.updateOne({ _id: doc._id }, { $set: patch });
    if (result.modifiedCount > 0) deactivated += 1;
  }

  return { checked, deactivated };
};

export const syncHotDealsForProductId = async (productId, options = {}) => {
  const { hideOutOfStock = false } = options;
  const pid = toId(productId);
  if (!pid) return { matched: 0, modified: 0 };
  const objectId = asObjectId(pid);
  const product = objectId ? await Product.findById(objectId).select('_id is_active is_deleted stock').lean() : null;
  const patch = deactivationPatch(productAvailability(product), hideOutOfStock);
  if (!patch) return { matched: 0, modified: 0 };
  const result = await HotDeal.updateMany({ product_id: pid }, { $set: patch });
  return { matched: result.matchedCount || 0, modified: result.modifiedCount || 0 };
};
