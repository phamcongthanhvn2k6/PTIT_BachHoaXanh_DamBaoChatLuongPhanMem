import { HotDeal } from '../models/Misc.js';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import mongoose from 'mongoose';

const toId = (value) => (value === null || value === undefined || value === '' ? '' : String(value));

const asObjectId = (value) => {
  const id = toId(value);
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

export const validateHotDealProductReference = async (payload, options = {}) => {
  const { hideOutOfStock = false, enforceProductExistence = true } = options;
  const productId = toId(payload?.product_id);
  const branchProductId = toId(payload?.branch_product_id);

  if (!branchProductId) {
    if (enforceProductExistence) {
      throw new Error('Hot deal branch_product_id is required');
    }
    return payload;
  }

  const bpObjectId = asObjectId(branchProductId);
  const bp = bpObjectId ? await BranchProduct.findById(bpObjectId).lean() : null;
  if (!bp) {
    if (enforceProductExistence) {
      throw new Error('Hot deal branch_product_id does not exist');
    }
    return { ...payload, is_active: false, status: 'draft' };
  }

  const bpProductId = toId(bp.product_id);
  if (productId && productId !== bpProductId) {
    throw new Error('Hot deal product_id does not match the branch product');
  }

  payload.product_id = bpProductId;

  const bpBranchId = toId(bp.branch_id);
  // Auto-fill branch_id from the branch product
  if (!payload.branch_id) {
    payload.branch_id = bpBranchId;
  }
  if (!payload.target_branch_ids || payload.target_branch_ids.length === 0) {
    payload.target_branch_ids = [bpBranchId];
  } else if (!payload.target_branch_ids.includes(bpBranchId)) {
    payload.target_branch_ids.push(bpBranchId);
  }

  const prodObjectId = asObjectId(bpProductId);
  const product = prodObjectId ? await Product.findById(prodObjectId).select('_id is_active is_deleted').lean() : null;

  const mainActive = product && product.is_active !== false && product.is_deleted !== true;
  const bpActive = bp.is_available !== false;
  const inStock = Number(bp.stock || 0) > 0;

  const isActive = mainActive && bpActive && (!hideOutOfStock || inStock);

  if (!isActive) {
    payload.is_active = false;
    payload.status = 'draft';
  }

  if (payload.original_price === undefined || payload.original_price === 0) {
    payload.original_price = bp.price || bp.original_price || 0;
  }
  if (payload.total_quantity === undefined || payload.total_quantity === null) {
    payload.total_quantity = bp.stock || 0;
  }
  if (payload.remaining_quantity === undefined || payload.remaining_quantity === null) {
    payload.remaining_quantity = bp.stock || 0;
  }

  return payload;
};

export const cleanupOrphanHotDeals = async (options = {}) => {
  const { hideOutOfStock = false } = options;
  const docs = await HotDeal.find().select('_id product_id branch_product_id is_active status').lean();
  let deactivated = 0;
  let checked = 0;

  for (const doc of docs) {
    const branchProductId = toId(doc.branch_product_id);
    if (!branchProductId) {
      const result = await HotDeal.updateOne({ _id: doc._id }, { $set: { is_active: false, status: 'draft' } });
      if (result.modifiedCount > 0) deactivated += 1;
      checked += 1;
      continue;
    }

    checked += 1;
    const bpObjectId = asObjectId(branchProductId);
    const bp = bpObjectId ? await BranchProduct.findById(bpObjectId).lean() : null;
    if (!bp) {
      const result = await HotDeal.updateOne({ _id: doc._id }, { $set: { is_active: false, status: 'draft' } });
      if (result.modifiedCount > 0) deactivated += 1;
      continue;
    }

    const productId = toId(bp.product_id);
    const prodObjectId = asObjectId(productId);
    const product = prodObjectId ? await Product.findById(prodObjectId).select('_id is_active is_deleted').lean() : null;

    const mainActive = product && product.is_active !== false && product.is_deleted !== true;
    const bpActive = bp.is_available !== false;
    const inStock = Number(bp.stock || 0) > 0;

    const shouldBeActive = mainActive && bpActive && (!hideOutOfStock || inStock);

    if (!shouldBeActive && doc.is_active !== false) {
      const result = await HotDeal.updateOne({ _id: doc._id }, { $set: { is_active: false, status: 'draft' } });
      if (result.modifiedCount > 0) deactivated += 1;
    }
  }

  return { checked, deactivated };
};

export const syncHotDealsForProductId = async (productId, options = {}) => {
  const { hideOutOfStock = false } = options;
  const pid = toId(productId);
  if (!pid) return { matched: 0, modified: 0 };

  const objectId = asObjectId(pid);
  const product = objectId ? await Product.findById(objectId).select('_id is_active is_deleted').lean() : null;
  const mainActive = product && product.is_active !== false && product.is_deleted !== true;

  let matched = 0;
  let modified = 0;

  const deals = await HotDeal.find({ product_id: pid }).lean();
  for (const deal of deals) {
    matched += 1;
    let shouldBeActive = mainActive;

    if (deal.branch_product_id) {
      const bp = await BranchProduct.findById(deal.branch_product_id).lean();
      if (!bp || bp.is_available === false || (hideOutOfStock && Number(bp.stock || 0) <= 0)) {
        shouldBeActive = false;
      }
    } else {
      shouldBeActive = false;
    }

    if (!shouldBeActive && deal.is_active !== false) {
      const result = await HotDeal.updateOne({ _id: deal._id }, { $set: { is_active: false, status: 'draft' } });
      if (result.modifiedCount > 0) modified += 1;
    }
  }

  return { matched, modified };
};
