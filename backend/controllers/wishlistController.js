import WishlistItem from '../models/WishlistItem.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import { resolveProductPricing } from '../services/pricingResolverService.js';

const toComparableId = (value) => String(value || '');

const resolveUserId = (req) => {
  const roleId = Number(req.user?.role_id);
  if (roleId !== 3) {
    return req.query.user_id || req.body.user_id || req.params.userId || req.userId;
  }
  return req.userId;
};

const buildProductSnapshot = async (rows) => {
  const branchProductIds = rows
    .map((item) => item.branch_product_id)
    .filter(Boolean);

  const branchProductsRaw = branchProductIds.length > 0
    ? await BranchProduct.find({ _id: { $in: branchProductIds } }).lean()
    : [];

  const branchProductMap = new Map(branchProductsRaw.map((bp) => [toComparableId(bp._id), bp]));

  const productIds = new Set();
  rows.forEach((item) => {
    if (item.product_id) productIds.add(toComparableId(item.product_id));
    const bp = branchProductMap.get(toComparableId(item.branch_product_id));
    if (bp?.product_id) productIds.add(toComparableId(bp.product_id));
  });

  const productsRaw = productIds.size > 0
    ? await Product.find({ _id: { $in: Array.from(productIds) } }).lean()
    : [];

  const productMap = new Map(productsRaw.map((p) => [toComparableId(p._id), p]));

  const now = new Date();
  return Promise.all(rows.map(async (row) => {
    const rowObj = row.toObject ? row.toObject() : { ...row };
    const bp = branchProductMap.get(toComparableId(rowObj.branch_product_id));
    const productId = toComparableId(rowObj.product_id || bp?.product_id || '');
    const product = productMap.get(productId);

    let price = bp?.price ?? product?.price ?? 0;
    let originalPrice = bp?.original_price ?? product?.original_price ?? price;
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
      created_at: rowObj.created_at,
      product_name: product?.name || '',
      product_image: product?.images?.[0] || product?.thumbnail || '',
      price,
      original_price: originalPrice,
      discount_percent: discountPercent,
      effective_price: effectivePrice,
      pricing_source: pricingSource,
      active_hot_deal: activeHotDeal,
      active_promotion: activePromotion,
      stock: bp?.stock ?? product?.stock ?? 0,
      in_stock: bp ? Number(bp.stock || 0) > 0 && bp.is_available !== false : Number(product?.stock || 0) > 0,
    };
  }));
};

const findExistingWishlistItem = async ({ userId, productId, branchProductId }) => {
  const baseFilter = {
    $or: [{ user_id: userId }, { user_id: String(userId) }],
  };

  if (branchProductId) {
    return WishlistItem.findOne({
      ...baseFilter,
      branch_product_id: branchProductId,
    });
  }

  return WishlistItem.findOne({
    ...baseFilter,
    product_id: productId,
    branch_product_id: null,
  });
};

export const list = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const raw = await WishlistItem.find({
      $or: [{ user_id: userId }, { user_id: String(userId) }],
    }).sort('-created_at');

    const data = await buildProductSnapshot(raw);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const add = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    let { product_id: productId, branch_product_id: branchProductId } = req.body || {};

    if (!productId && !branchProductId) {
      return res.status(400).json({ success: false, message: 'product_id or branch_product_id is required' });
    }

    if (branchProductId && !productId) {
      const bp = await BranchProduct.findById(branchProductId).lean();
      if (!bp) {
        return res.status(404).json({ success: false, message: 'Branch product not found' });
      }
      productId = bp.product_id;
    }

    const existed = await findExistingWishlistItem({
      userId,
      productId,
      branchProductId,
    });

    if (existed) {
      const [normalized] = await buildProductSnapshot([existed]);
      return res.json({ success: true, data: normalized, message: 'Sản phẩm đã có trong danh sách yêu thích' });
    }

    const created = await WishlistItem.create({
      user_id: userId,
      product_id: productId || null,
      branch_product_id: branchProductId || null,
    });

    const [normalized] = await buildProductSnapshot([created]);
    return res.status(201).json({ success: true, data: normalized, message: 'Đã thêm vào yêu thích' });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(200).json({ success: true, message: 'Sản phẩm đã có trong danh sách yêu thích' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggle = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    let { product_id: productId, branch_product_id: branchProductId } = req.body || {};

    if (!productId && !branchProductId) {
      return res.status(400).json({ success: false, message: 'product_id or branch_product_id is required' });
    }

    if (branchProductId && !productId) {
      const bp = await BranchProduct.findById(branchProductId).lean();
      productId = bp?.product_id || null;
    }

    const existed = await findExistingWishlistItem({ userId, productId, branchProductId });

    if (existed) {
      await WishlistItem.findByIdAndDelete(existed._id);
      return res.json({ success: true, data: { wished: false }, message: 'Đã bỏ khỏi yêu thích' });
    }

    const created = await WishlistItem.create({
      user_id: userId,
      product_id: productId || null,
      branch_product_id: branchProductId || null,
    });

    const [normalized] = await buildProductSnapshot([created]);
    return res.status(201).json({ success: true, data: { wished: true, item: normalized }, message: 'Đã thêm vào yêu thích' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { id } = req.params;

    let deleted = null;

    if (id) {
      const found = await WishlistItem.findById(id);
      if (!found) {
        return res.status(404).json({ success: false, message: 'Wishlist item not found' });
      }

      if (Number(req.user?.role_id) === 3 && toComparableId(found.user_id) !== toComparableId(req.userId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      deleted = await WishlistItem.findByIdAndDelete(id);
    } else {
      const branchProductId = req.body?.branch_product_id || req.query?.branch_product_id;
      const productId = req.body?.product_id || req.query?.product_id;
      if (!branchProductId && !productId) {
        return res.status(400).json({ success: false, message: 'id or product identifier is required' });
      }

      const filter = {
        $or: [{ user_id: userId }, { user_id: String(userId) }],
      };
      if (branchProductId) filter.branch_product_id = branchProductId;
      if (productId) filter.product_id = productId;

      deleted = await WishlistItem.findOneAndDelete(filter);
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Wishlist item not found' });
    }

    return res.json({ success: true, message: 'Đã xóa khỏi yêu thích' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const clear = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    await WishlistItem.deleteMany({
      $or: [{ user_id: userId }, { user_id: String(userId) }],
    });
    return res.json({ success: true, message: 'Đã xóa toàn bộ sản phẩm yêu thích' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
