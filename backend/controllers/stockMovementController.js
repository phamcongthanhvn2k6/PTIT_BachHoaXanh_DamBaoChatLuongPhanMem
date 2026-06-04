import mongoose from 'mongoose';
import StockMovement from '../models/StockMovement.js';

const parseBranchId = (id) => {
  if (!id) return null;
  if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const buildQuery = (req) => {
  const q = {};
  if (req.query?.branch_id && req.query.branch_id !== 'ALL') {
    const parsed = parseBranchId(req.query.branch_id);
    if (parsed) q.branch_id = parsed;
  }
  if (req.query?.product_id) q.product_id = req.query.product_id;
  if (req.query?.branch_product_id) q.branch_product_id = req.query.branch_product_id;
  if (req.query?.type) q.type = req.query.type;
  if (req.query?.reference_type) q.reference_type = req.query.reference_type;
  if (req.query?.from || req.query?.to) {
    q.created_at = {};
    if (req.query.from) q.created_at.$gte = new Date(req.query.from);
    if (req.query.to) q.created_at.$lte = new Date(req.query.to);
  }
  return q;
};

export const list = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const query = buildQuery(req);

    const [total, data] = await Promise.all([
      StockMovement.countDocuments(query),
      StockMovement.find(query).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
    ]);

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
    const item = await StockMovement.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Stock movement not found' });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const summary = async (req, res) => {
  try {
    const query = buildQuery(req);
    const data = await StockMovement.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantity' },
          totalRecords: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
