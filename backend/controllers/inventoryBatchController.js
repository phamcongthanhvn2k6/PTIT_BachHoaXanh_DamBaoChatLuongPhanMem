import mongoose from 'mongoose';
import InventoryBatch from '../models/InventoryBatch.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import Promotion from '../models/Promotion.js';

const buildQuery = (req) => {
  const q = {};
  if (req.query?.branch_product_id) q.branch_product_id = req.query.branch_product_id;
  if (req.query?.batch_code) q.batch_code = req.query.batch_code;
  if (req.query?.supplier_id) q.supplier_id = req.query.supplier_id;
  if (req.query?.import_receipt_id) q.import_receipt_id = req.query.import_receipt_id;
  if (req.query?.exp_from || req.query?.exp_to) {
    q.exp_date = {};
    if (req.query.exp_from) q.exp_date.$gte = new Date(req.query.exp_from);
    if (req.query.exp_to) q.exp_date.$lte = new Date(req.query.exp_to);
  }
  return q;
};

// Helper: enrich batches with product, category, supplier, branch info
const enrichBatches = async (batches) => {
  if (!batches || batches.length === 0) return [];

  const bpIds = [...new Set(batches.map((b) => String(b.branch_product_id)).filter(Boolean))];
  const supplierIds = [...new Set(batches.map((b) => String(b.supplier_id)).filter(Boolean))];

  // Load branch products
  const bpDocs = await BranchProduct.find({ _id: { $in: bpIds } }).lean();
  const bpMap = {};
  bpDocs.forEach((bp) => { bpMap[String(bp._id)] = bp; });

  // Extract product_ids and branch_ids
  const productIds = [...new Set(bpDocs.map((bp) => String(bp.product_id)).filter(Boolean))];
  const branchIds = [...new Set(bpDocs.map((bp) => String(bp.branch_id)).filter(Boolean))];

  // Load products, branches, suppliers in parallel
  const [productDocs, branchDocs, supplierDocs] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).lean(),
    Branch.find({ _id: { $in: branchIds } }).lean(),
    supplierIds.length > 0 ? Supplier.find({ _id: { $in: supplierIds } }).lean() : Promise.resolve([]),
  ]);

  const productMap = {};
  productDocs.forEach((p) => { productMap[String(p._id)] = p; });

  const branchMap = {};
  branchDocs.forEach((b) => { branchMap[String(b._id)] = b; });

  const supplierMap = {};
  supplierDocs.forEach((s) => { supplierMap[String(s._id)] = s; });

  // Extract category_ids from products
  const categoryIds = [...new Set(productDocs.map((p) => String(p.category_id)).filter((id) => id && id !== 'null'))];
  const categoryDocs = categoryIds.length > 0 ? await Category.find({ _id: { $in: categoryIds } }).lean() : [];
  const categoryMap = {};
  categoryDocs.forEach((c) => { categoryMap[String(c._id)] = c; });

  const now = new Date();

  return batches.map((batch) => {
    const batchObj = batch.toObject ? batch.toObject() : { ...batch };
    const bp = bpMap[String(batchObj.branch_product_id)] || {};
    const product = productMap[String(bp.product_id)] || {};
    const branch = branchMap[String(bp.branch_id)] || {};
    const supplier = supplierMap[String(batchObj.supplier_id)] || {};
    const category = categoryMap[String(product.category_id)] || {};

    // Expiry calculation
    let days_until_expiry = null;
    let expiry_status = 'ok';
    if (batchObj.exp_date) {
      const expDate = new Date(batchObj.exp_date);
      const diffMs = expDate.getTime() - now.getTime();
      days_until_expiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (days_until_expiry < 0) expiry_status = 'expired';
      else if (days_until_expiry <= 7) expiry_status = 'critical';
      else if (days_until_expiry <= 30) expiry_status = 'warning';
    }

    // Badges
    const badges = [];
    if (category.name) badges.push({ type: 'category', text: category.name, color: 'blue' });
    if (expiry_status === 'expired') badges.push({ type: 'expiry', text: 'Hết hạn', color: 'red' });
    else if (expiry_status === 'critical') badges.push({ type: 'expiry', text: 'Sắp hết hạn', color: 'orange' });
    else if (expiry_status === 'warning') badges.push({ type: 'expiry', text: `Còn ${days_until_expiry} ngày`, color: 'yellow' });
    if (bp.stock <= (bp.min_stock || 5)) badges.push({ type: 'stock', text: 'Tồn kho thấp', color: 'red' });
    if ((bp.sold_count || 0) >= 100) badges.push({ type: 'sales', text: 'Best seller', color: 'green' });

    return {
      ...batchObj,
      // Product info
      product_id: String(bp.product_id || ''),
      product_name: product.name || '',
      sku: product.sku || '',
      master_id: String(product._id || ''),
      product_thumbnail: product.thumbnail || '',
      product_price: product.price || 0,
      product_original_price: product.original_price || 0,
      // Category info
      category_id: String(product.category_id || ''),
      category_name: category.name || '',
      // Supplier info
      supplier_id: String(batchObj.supplier_id || ''),
      supplier_name: supplier.name || '',
      supplier_code: supplier.code || '',
      // Branch info
      branch_id: String(bp.branch_id || ''),
      branch_name: branch.name || '',
      // Branch product info
      bp_stock: bp.stock || 0,
      bp_sold_count: bp.sold_count || 0,
      bp_price: bp.price || 0,
      bp_original_price: bp.original_price || 0,
      bp_is_available: bp.is_available !== false,
      bp_min_stock: bp.min_stock || 0,
      // Expiry info
      days_until_expiry,
      expiry_status,
      // Badges
      badges,
    };
  });
};

export const list = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 50)));
    const query = buildQuery(req);

    if (req.query?.branch_id && req.query.branch_id !== 'ALL') {
      const parseBranchId = (id) => {
        if (!id) return null;
        if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
        if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
        return id;
      };
      const parsedBranchId = parseBranchId(req.query.branch_id);
      if (parsedBranchId) {
        const bpDocs = await BranchProduct.find({ branch_id: parsedBranchId }).select('_id').lean();
        const bpIds = bpDocs.map(doc => doc._id);
        query.branch_product_id = { $in: bpIds };
      }
    }

    const [total, rawData] = await Promise.all([
      InventoryBatch.countDocuments(query),
      InventoryBatch.find(query)
        .sort({ exp_date: 1, received_date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const data = await enrichBatches(rawData);

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const item = await InventoryBatch.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory batch not found' });
    const enriched = await enrichBatches([item]);
    return res.json({ success: true, data: enriched[0] || item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payload = req.body || {};
    if (!payload.branch_product_id) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'branch_product_id is required' });
    }

    const bp = await BranchProduct.findById(payload.branch_product_id).session(session);
    if (!bp) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Branch product not found' });
    }

    const qty = Number(payload.quantity || 0);
    if (qty <= 0) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'quantity must be > 0' });
    }

    const batchCode = payload.batch_code || `LOT-${Date.now().toString(36).toUpperCase()}`;
    const [batch] = await InventoryBatch.create([{
      branch_product_id: payload.branch_product_id,
      batch_code: batchCode,
      quantity: qty,
      exp_date: payload.exp_date || null,
      received_date: payload.received_date || new Date(),
      cost_price: Number(payload.cost_price || 0),
      supplier_id: payload.supplier_id || null,
      purchase_order_id: payload.purchase_order_id || null,
      import_receipt_id: payload.import_receipt_id || null,
    }], { session });

    const beforeStock = Number(bp.stock || 0);
    const nextStock = beforeStock + qty;
    bp.stock = nextStock;
    await bp.save({ session });

    // Create Stock Movement Ledger entry
    const StockMovement = mongoose.model('StockMovement');
    const product = await Product.findById(bp.product_id).session(session);
    const productName = product ? (product.name || product.product_name) : '';

    await StockMovement.create([{
      branch_id: bp.branch_id,
      branch_name: bp.branch_name || '',
      product_id: bp.product_id,
      product_name: productName,
      branch_product_id: bp._id,
      batch_code: batchCode,
      movement_type: 'inbound',
      quantity: qty,
      before_stock: beforeStock,
      after_stock: nextStock,
      reference_type: 'manual_batch',
      reference_id: batch._id,
      created_by: req.userId,
      note: payload.note || 'Manual batch creation',
    }], { session });

    // Write Audit Log
    const { logActivity } = await import('../services/auditService.js');
    await logActivity({
      userId: req.userId,
      userName: req.user?.full_name || req.user?.username || 'Staff',
      action: 'CREATE_BATCH',
      entity: 'inventory_batch',
      entityId: batch._id,
      details: {
        product_name: productName,
        quantity: qty,
        batch_code: batchCode,
        before_stock: beforeStock,
        after_stock: nextStock
      },
      ip: req.ip
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ success: true, data: batch, message: 'Inventory batch created' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const item = await InventoryBatch.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory batch not found' });

    const updates = { ...req.body };
    delete updates._id;
    const updated = await InventoryBatch.findByIdAndUpdate(req.params.id, updates, { new: true });
    return res.json({ success: true, data: updated, message: 'Inventory batch updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const lowStockAlerts = async (_req, res) => {
  try {
    const data = await BranchProduct.find({
      is_available: true,
      $expr: { $lte: ['$stock', '$min_stock'] },
    }).sort({ stock: 1 }).limit(200);

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const expiringAlerts = async (req, res) => {
  try {
    const days = Math.max(1, Number(req.query.days || 30));
    const until = new Date();
    until.setDate(until.getDate() + days);

    const rawData = await InventoryBatch.find({
      quantity: { $gt: 0 },
      exp_date: { $ne: null, $lte: until },
    }).sort({ exp_date: 1 }).limit(500);

    const data = await enrichBatches(rawData);

    return res.json({ success: true, data, meta: { days } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/inventory-batches/draft-promotion
// Creates a draft promotion from stock alert data - DOES NOT auto-publish
export const draftPromotionFromAlert = async (req, res) => {
  try {
    const {
      title,
      description,
      type = 'percent',
      discount_value = 50,
      scope = 'product',
      target_product_ids = [],
      target_category_ids = [],
      target_branch_ids = [],
      start_date,
      end_date,
      total_quantity,
      per_user_limit,
      badge_text = '',
      min_quantity = 0,
      gift_quantity = 0,
      source = 'expiry_alert',
      is_auto_generated = true,
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ success: false, message: 'Tên khuyến mãi là bắt buộc' });
    }

    const promoData = {
      title,
      description: description || '',
      type,
      discount_value: Number(discount_value) || 0,
      scope,
      target_product_ids: Array.isArray(target_product_ids) ? target_product_ids : [],
      target_category_ids: Array.isArray(target_category_ids) ? target_category_ids : [],
      target_branch_ids: Array.isArray(target_branch_ids) ? target_branch_ids : [],
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : null,
      total_quantity: total_quantity ? Number(total_quantity) : null,
      usage_per_user: per_user_limit ? Number(per_user_limit) : 1,
      badge_text: badge_text || '',
      min_quantity: Number(min_quantity) || 0,
      gift_quantity: Number(gift_quantity) || 0,
      source: source || 'expiry_alert',
      is_auto_generated: Boolean(is_auto_generated),
      // CRITICAL: Always create as draft, never auto-publish
      status: 'draft',
      is_active: false,
      claimed_count: 0,
      usage_count: 0,
      priority: 0,
      created_by: req.user?._id || req.user?.id || null,
    };

    const promotion = await Promotion.create(promoData);

    return res.status(201).json({
      success: true,
      data: promotion,
      message: 'Đã tạo nháp khuyến mãi từ cảnh báo kho. Vui lòng xác nhận để kích hoạt.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/inventory-batches/reconciliation/drift-report
export const driftReport = async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    const query = {};
    if (branchId && branchId !== 'ALL') {
      const parseBranchId = (id) => {
        if (!id) return null;
        if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
        if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
        return id;
      };
      const parsed = parseBranchId(branchId);
      if (parsed) query.branch_id = parsed;
    }

    const bps = await BranchProduct.find(query).lean();
    const bpIds = bps.map(bp => bp._id);

    // Get all batches for these branch products
    const allBatches = await InventoryBatch.find({ branch_product_id: { $in: bpIds } }).lean();
    
    // Group batches by branch_product_id
    const batchesMap = {};
    allBatches.forEach(b => {
      const bpIdStr = String(b.branch_product_id);
      if (!batchesMap[bpIdStr]) batchesMap[bpIdStr] = [];
      batchesMap[bpIdStr].push(b);
    });

    // Enrich products
    const productIds = [...new Set(bps.map(bp => String(bp.product_id)).filter(Boolean))];
    const products = await Product.find({ _id: { $in: productIds } }).select('name sku thumbnail').lean();
    const productMap = {};
    products.forEach(p => { productMap[String(p._id)] = p; });

    // Enrich branches
    const branchIds = [...new Set(bps.map(bp => String(bp.branch_id)).filter(Boolean))];
    const branches = await Branch.find({ _id: { $in: branchIds } }).select('name').lean();
    const branchMap = {};
    branches.forEach(b => { branchMap[String(b._id)] = b; });

    const report = [];
    let totalChecked = 0;
    let totalDrifts = 0;
    const now = new Date();

    bps.forEach(bp => {
      totalChecked++;
      const bpIdStr = String(bp._id);
      const product = productMap[String(bp.product_id)] || {};
      const branch = branchMap[String(bp.branch_id)] || {};
      const batches = batchesMap[bpIdStr] || [];

      let batchSum = 0;
      let activeBatchSum = 0;
      let expiredBatchSum = 0;

      batches.forEach(b => {
        const qty = Number(b.quantity || 0);
        batchSum += qty;
        if (b.exp_date && new Date(b.exp_date) <= now) {
          expiredBatchSum += qty;
        } else {
          activeBatchSum += qty;
        }
      });

      const stock = Number(bp.stock || 0);
      const reserved = Number(bp.reserved_quantity || 0);
      const diff = stock - batchSum;
      const hasDrift = diff !== 0 || (batches.length === 0 && stock > 0);

      // Sellable stock logic
      let effectiveActiveQty = activeBatchSum;
      if (batches.length === 0 && stock > 0) {
        effectiveActiveQty = stock;
      }
      const sellable = Math.max(0, Math.min(stock, effectiveActiveQty) - reserved);

      if (hasDrift) {
        totalDrifts++;
        report.push({
          branch_product_id: bpIdStr,
          product_name: product.name || bp.name || '—',
          sku: product.sku || bp.sku || '—',
          thumbnail: product.thumbnail || '',
          branch_id: String(bp.branch_id),
          branch_name: branch.name || bp.branch_name || '—',
          stock,
          reserved,
          batchSum,
          activeBatchSum,
          expiredBatchSum,
          sellable,
          diff,
          batchesCount: batches.length,
          type: batches.length === 0 ? 'no_batches' : 'quantity_mismatch'
        });
      }
    });

    return res.json({
      success: true,
      summary: {
        totalChecked,
        totalDrifts,
        healthScore: totalChecked > 0 ? Math.round(((totalChecked - totalDrifts) / totalChecked) * 100) : 100
      },
      data: report
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/inventory-batches/reconciliation/auto-heal
export const autoHealProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { branch_product_id } = req.body;
    if (!branch_product_id) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'branch_product_id is required' });
    }

    const bp = await BranchProduct.findById(branch_product_id).session(session);
    if (!bp) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Branch product not found' });
    }

    const batches = await InventoryBatch.find({ branch_product_id }).session(session);
    const stock = Number(bp.stock || 0);

    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (batches.length === 0) {
      // Case 1: Stock > 0 but no batches exist. Auto-create a batch.
      if (stock > 0) {
        const batchCode = `HEAL-${Date.now().toString(36).toUpperCase()}`;
        await InventoryBatch.create([{
          branch_product_id: bp._id,
          batch_code: batchCode,
          quantity: stock,
          exp_date: oneYearFromNow,
          received_date: now,
          cost_price: 0,
          note: 'Auto-healed: Missing batch created'
        }], { session });
      }
    } else {
      // Case 2: Mismatch between bp.stock and sum of batches.
      const batchSum = batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
      const diff = stock - batchSum;

      if (diff > 0) {
        // We have more stock in BranchProduct than batches.
        // Add the diff to the latest unexpired batch, or create a new one.
        const activeBatches = batches.filter(b => !b.exp_date || new Date(b.exp_date) > now);
        if (activeBatches.length > 0) {
          // Sort active batches by exp_date ascending (FIFO style, edit the newest one)
          activeBatches.sort((a, b) => new Date(b.exp_date || 0).getTime() - new Date(a.exp_date || 0).getTime());
          const targetBatch = activeBatches[0];
          targetBatch.quantity = (targetBatch.quantity || 0) + diff;
          targetBatch.note = `${targetBatch.note || ''} (Auto-healed: added ${diff} drift)`.trim();
          await targetBatch.save({ session });
        } else {
          // No active batches, create a new one for the diff
          const batchCode = `HEAL-${Date.now().toString(36).toUpperCase()}`;
          await InventoryBatch.create([{
            branch_product_id: bp._id,
            batch_code: batchCode,
            quantity: diff,
            exp_date: oneYearFromNow,
            received_date: now,
            cost_price: 0,
            note: `Auto-healed: Created batch for ${diff} drift`
          }], { session });
        }
      } else if (diff < 0) {
        // We have fewer stock in BranchProduct than batches (batches sum is higher).
        // Reduce the quantity from batches starting from the newest ones.
        let toReduce = Math.abs(diff);
        // Sort batches: newest received_date or exp_date first, to deduct from newer batches
        const sortedBatches = [...batches].sort((a, b) => new Date(b.received_date || 0).getTime() - new Date(a.received_date || 0).getTime());
        
        for (const batch of sortedBatches) {
          if (toReduce <= 0) break;
          const currentQty = Number(batch.quantity || 0);
          if (currentQty >= toReduce) {
            batch.quantity = currentQty - toReduce;
            batch.note = `${batch.note || ''} (Auto-healed: reduced ${toReduce} drift)`.trim();
            await batch.save({ session });
            toReduce = 0;
          } else {
            batch.quantity = 0;
            batch.note = `${batch.note || ''} (Auto-healed: cleared ${currentQty} drift)`.trim();
            await batch.save({ session });
            toReduce -= currentQty;
          }
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
    return res.json({ success: true, message: 'Tự động sửa lỗi lệch kho thành công' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/inventory-batches/reconciliation/auto-heal-all
export const autoHealAll = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const branchId = req.body.branch_id;
    const query = {};
    if (branchId && branchId !== 'ALL') {
      const parseBranchId = (id) => {
        if (!id) return null;
        if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
        if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
        return id;
      };
      const parsed = parseBranchId(branchId);
      if (parsed) query.branch_id = parsed;
    }

    const bps = await BranchProduct.find(query).session(session);
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    let healedCount = 0;

    for (const bp of bps) {
      const batches = await InventoryBatch.find({ branch_product_id: bp._id }).session(session);
      const stock = Number(bp.stock || 0);
      const batchSum = batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

      const hasDrift = batchSum !== stock || (batches.length === 0 && stock > 0);
      if (!hasDrift) continue;

      healedCount++;

      if (batches.length === 0) {
        if (stock > 0) {
          const batchCode = `HEAL-${Date.now().toString(36).toUpperCase()}`;
          await InventoryBatch.create([{
            branch_product_id: bp._id,
            batch_code: batchCode,
            quantity: stock,
            exp_date: oneYearFromNow,
            received_date: now,
            cost_price: 0,
            note: 'Auto-healed: Missing batch created'
          }], { session });
        }
      } else {
        const diff = stock - batchSum;
        if (diff > 0) {
          const activeBatches = batches.filter(b => !b.exp_date || new Date(b.exp_date) > now);
          if (activeBatches.length > 0) {
            activeBatches.sort((a, b) => new Date(b.exp_date || 0).getTime() - new Date(a.exp_date || 0).getTime());
            const targetBatch = activeBatches[0];
            targetBatch.quantity = (targetBatch.quantity || 0) + diff;
            targetBatch.note = `${targetBatch.note || ''} (Auto-healed: added ${diff} drift)`.trim();
            await targetBatch.save({ session });
          } else {
            const batchCode = `HEAL-${Date.now().toString(36).toUpperCase()}`;
            await InventoryBatch.create([{
              branch_product_id: bp._id,
              batch_code: batchCode,
              quantity: diff,
              exp_date: oneYearFromNow,
              received_date: now,
              cost_price: 0,
              note: `Auto-healed: Created batch for ${diff} drift`
            }], { session });
          }
        } else if (diff < 0) {
          let toReduce = Math.abs(diff);
          const sortedBatches = [...batches].sort((a, b) => new Date(b.received_date || 0).getTime() - new Date(a.received_date || 0).getTime());
          
          for (const batch of sortedBatches) {
            if (toReduce <= 0) break;
            const currentQty = Number(batch.quantity || 0);
            if (currentQty >= toReduce) {
              batch.quantity = currentQty - toReduce;
              batch.note = `${batch.note || ''} (Auto-healed: reduced ${toReduce} drift)`.trim();
              await batch.save({ session });
              toReduce = 0;
            } else {
              batch.quantity = 0;
              batch.note = `${batch.note || ''} (Auto-healed: cleared ${currentQty} drift)`.trim();
              await batch.save({ session });
              toReduce -= currentQty;
            }
          }
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
    return res.json({ success: true, message: `Đã tự động sửa lệch kho cho ${healedCount} sản phẩm` });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: err.message });
  }
};

