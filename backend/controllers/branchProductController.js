import mongoose from 'mongoose';
import BranchProduct from '../models/BranchProduct.js';
import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import { resolveProductPricing } from '../services/pricingResolverService.js';

const parseBranchId = (id) => {
  if (!id) return null;
  if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const buildBranchIdFilter = (raw) => {
  if (!raw) return null;
  const rawStr = String(raw);
  const parsed = parseBranchId(raw);
  const candidates = [parsed, rawStr];

  if (/^\d+$/.test(rawStr)) {
    candidates.push(Number(rawStr));
  }

  const uniq = Array.from(new Set(candidates.filter((v) => v !== undefined && v !== null && v !== '')));
  if (uniq.length <= 1) return uniq[0] ?? rawStr;
  return { $in: uniq };
};

/**
 * Parse product_id filter - handles both ObjectId strings and legacy numeric IDs.
 * Returns a query condition that matches the product_id field.
 */
const parseProductIdFilter = (id) => {
  if (!id) return null;
  // If it's a valid 24-hex ObjectId string
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return new mongoose.Types.ObjectId(id);
  }
  // If it's a numeric string or number, try both string and ObjectId
  if (/^\d+$/.test(String(id))) {
    return id; // stored as-is (Mixed type)
  }
  return id;
};

const pickNonEmpty = (...values) => values.find((v) => v !== undefined && v !== null && v !== '') ?? null;

import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import InventoryBatch from '../models/InventoryBatch.js';

export const list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.branch_id) filter.branch_id = buildBranchIdFilter(req.query.branch_id);
    if (req.query.product_id) {
      const parsedPid = parseProductIdFilter(req.query.product_id);
      if (parsedPid) filter.product_id = parsedPid;
    }

    const bps = await BranchProduct.find(filter).lean();

    // Populate product data
    const productIds = [...new Set(bps.map(bp => bp.product_id))];
    const objectIds = [];
    const numericIds = [];
    productIds.forEach(id => {
      if (!id) return;
      if (/^[0-9a-fA-F]{24}$/.test(String(id))) objectIds.push(new mongoose.Types.ObjectId(id));
      else if (/^\d+$/.test(String(id))) numericIds.push(Number(id));
    });

    const products = [];
    if (objectIds.length > 0) {
      const prods = await Product.find({ _id: { $in: objectIds } }).lean();
      products.push(...prods);
    }
    if (numericIds.length > 0) {
      const prods = await Product.find({ id: { $in: numericIds } }).lean();
      products.push(...prods);
    }
    const productMap = {};
    products.forEach(p => { 
      productMap[String(p._id)] = p; 
      if (p.id) productMap[String(p.id)] = p;
    });

    const isInventoryView = req.query.inventory === 'true';

    const bpIds = bps.map(bp => bp._id);

    // Fetch batches to find expiry and supplier ONLY if inventory view
    const batches = isInventoryView ? await InventoryBatch.find({ branch_product_id: { $in: bpIds }, quantity: { $gt: 0 } }).lean() : [];
    
    // Process batches per branch product
    const bpBatchesMap = {};
    if (isInventoryView) {
      batches.forEach(b => {
        const bpid = String(b.branch_product_id);
        if (!bpBatchesMap[bpid]) bpBatchesMap[bpid] = [];
        bpBatchesMap[bpid].push(b);
      });
    }

    // Extract categories & suppliers
    const categoryIds = [...new Set(products.map(p => p.category_id).filter(id => id && id !== 'null'))];
    const supplierIds = isInventoryView ? [...new Set(batches.map(b => b.supplier_id).filter(Boolean))] : [];

    const [categories, suppliers] = await Promise.all([
      categoryIds.length > 0 ? Category.find({ _id: { $in: categoryIds } }).lean() : Promise.resolve([]),
      supplierIds.length > 0 ? Supplier.find({ _id: { $in: supplierIds } }).lean() : Promise.resolve([])
    ]);

    const catMap = {};
    categories.forEach(c => { catMap[String(c._id)] = c; });

    const suppMap = {};
    if (isInventoryView) {
      suppliers.forEach(s => { suppMap[String(s._id)] = s; });
    }

    const now = new Date();

    const data = await Promise.all(bps.map(async (bp) => {
      const obj = { ...bp, id: bp._id };
      const prod = productMap[String(bp.product_id)] || null;
      let category = null;

      if (prod) {
        obj.product = { ...prod, id: prod._id };
        if (prod.category_id && catMap[String(prod.category_id)]) {
          category = catMap[String(prod.category_id)];
          obj.category_name = category.name;
        } else {
          // Fallback: use BP's own or product's saved category_name
          obj.category_name = bp.category_name || prod.category_name || '';
        }
        obj.category_id = pickNonEmpty(bp.category_id, prod.category_id);
        obj.supplier_id = pickNonEmpty(bp.supplier_id, prod.supplier_id);
        obj.supplier_name = pickNonEmpty(bp.supplier_name, prod.supplier_name);
        obj.sku = pickNonEmpty(bp.sku, prod.sku, obj.sku);
        obj.master_id = pickNonEmpty(bp.master_id, prod.master_id, obj.master_id);

        const resolvedPricing = await resolveProductPricing(prod, bp, bp.branch_id, { now });
        obj.price = resolvedPricing.effective_price;
        obj.original_price = resolvedPricing.original_price;
        obj.discount_percent = resolvedPricing.discount_percent;
        obj.effective_price = resolvedPricing.effective_price;
        obj.pricing_source = resolvedPricing.pricing_source;
        obj.active_hot_deal = resolvedPricing.active_hot_deal;
        obj.active_promotion = resolvedPricing.active_promotion;
        obj.pricing = resolvedPricing;
      } else {
        obj.product = null;
        obj.category_name = bp.category_name || '';
      }

      let days_until_expiry = null;
      let expiry_status = 'ok';
      let earliestBatch = null;

      if (isInventoryView) {
        // Find earliest expiring batch for this BP
        const myBatches = bpBatchesMap[String(bp._id)] || [];
        const expBatches = myBatches.filter(b => b.exp_date).sort((a, b) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
        earliestBatch = expBatches.length > 0 ? expBatches[0] : (myBatches.length > 0 ? myBatches[0] : null);

        // Use batch exp_date first, fallback to BP's own expiry_date
        const effectiveExpDate = (earliestBatch && earliestBatch.exp_date)
          ? earliestBatch.exp_date
          : (bp.expiry_date || null);
        if (effectiveExpDate) {
          const diffMs = new Date(effectiveExpDate).getTime() - now.getTime();
          days_until_expiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (days_until_expiry < 0) expiry_status = 'expired';
          else if (days_until_expiry <= 7) expiry_status = 'critical';
          else if (days_until_expiry <= 30) expiry_status = 'warning';
        }

        const supplier = earliestBatch && earliestBatch.supplier_id ? suppMap[String(earliestBatch.supplier_id)] : null;

        obj.exp_date = earliestBatch ? earliestBatch.exp_date : (bp.expiry_date || null);
        obj.days_until_expiry = days_until_expiry;
        obj.expiry_status = expiry_status;
        // Fallback: use BP's own or product's saved supplier_name if join returns nothing
        obj.supplier_name = supplier ? supplier.name : pickNonEmpty(bp.supplier_name, prod?.supplier_name);
        obj.supplier_id = pickNonEmpty(obj.supplier_id, supplier ? supplier._id : null, bp.supplier_id, prod?.supplier_id);
        obj.supplier_code = supplier ? supplier.code : null;
      }

      // Calculate Semantic Badges
      const badges = [];
      if (category) badges.push({ type: 'category', text: category.name, color: 'blue' });
      
      if (isInventoryView) {
        if (expiry_status === 'expired') badges.push({ type: 'expiry', text: 'Hết hạn', color: 'red' });
        else if (expiry_status === 'critical') badges.push({ type: 'expiry', text: 'Sắp hết hạn', color: 'orange' });
        else if (expiry_status === 'warning') badges.push({ type: 'expiry', text: `Tới hạn: ${days_until_expiry} ngày`, color: 'yellow' });
      }
      
      if (obj.stock <= (obj.min_stock || 5)) badges.push({ type: 'stock', text: 'Tồn thấp', color: 'red' });
      if (prod && prod.is_new) badges.push({ type: 'new', text: 'Nhập mới', color: 'emerald' });
      if (prod && prod.is_best_seller) badges.push({ type: 'sales', text: 'Best seller', color: 'emerald' });
      if (prod && prod.is_featured) badges.push({ type: 'featured', text: 'Nổi bật', color: 'blue' });

      obj.badges = badges;

      return obj;
    }));

    return res.json({ success: true, data });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const detail = async (req, res) => {
  try {
    const bp = await BranchProduct.findById(req.params.id);
    if (!bp) return res.status(404).json({ success: false, message: 'Not found' });
    const product = await Product.findById(bp.product_id);
    const bpObj = bp.toObject();
    bpObj.id = bpObj._id;
    if (product) {
      const prodObj = product.toObject();
      prodObj.id = prodObj._id;
      bpObj.product = prodObj;

      const resolvedPricing = await resolveProductPricing(product, bp, bp.branch_id, { now: new Date() });
      bpObj.price = resolvedPricing.effective_price;
      bpObj.original_price = resolvedPricing.original_price;
      bpObj.discount_percent = resolvedPricing.discount_percent;
      bpObj.effective_price = resolvedPricing.effective_price;
      bpObj.pricing_source = resolvedPricing.pricing_source;
      bpObj.active_hot_deal = resolvedPricing.active_hot_deal;
      bpObj.active_promotion = resolvedPricing.active_promotion;
      bpObj.pricing = resolvedPricing;
    }
    return res.json({ success: true, data: bpObj });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

const processBranchProductData = (data) => {
  if (data.expiry_date) {
    const expDate = new Date(data.expiry_date);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    data.is_expired = diffDays < 0;
    data.is_expiring_soon = diffDays >= 0 && diffDays <= 7;
  }
  return data;
};

export const create = async (req, res) => {
  try {
    const body = processBranchProductData({ ...req.body });
    return res.status(201).json({ success: true, data: await BranchProduct.create(body) }); 
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const update = async (req, res) => {
  try {
    const body = processBranchProductData({ ...req.body });
    return res.json({ success: true, data: await BranchProduct.findByIdAndUpdate(req.params.id, body, { new: true }) }); 
  }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const remove = async (req, res) => {
  try { await BranchProduct.findByIdAndDelete(req.params.id); return res.json({ success: true, message: 'Deleted' }); }
  catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const adjustStock = async (req, res) => {
  try {
    const bp = await BranchProduct.findById(req.params.id);
    if (!bp) return res.status(404).json({ success: false, message: 'Not found' });
    const { quantity, type = 'adjustment', reason = '' } = req.body;
    const previous = bp.stock;
    bp.stock = Math.max(0, bp.stock + quantity);
    await bp.save();
    await StockMovement.create({ branch_product_id: bp._id, type, quantity, previous_stock: previous, new_stock: bp.stock, reason, performed_by: req.userId });
    return res.json({ success: true, data: bp, message: 'Điều chỉnh tồn kho thành công' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
