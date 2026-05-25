import Review from '../models/Review.js';
import { paginateMeta } from '../utils/helpers.js';

export const list = async (req, res) => {
  try {
    const { page = 1, limit = 20, product_id, status, order_id } = req.query;
    const filter = {};
    if (product_id) filter.product_id = product_id;
    if (order_id) filter.order_id = order_id;
    
    // Admin can query any user, regular users always see their own (unless browsing product reviews)
    if (req.user?.role_id !== 3) {
      // Admin: optionally filter by user_id from query
      if (req.query.user_id) filter.user_id = req.query.user_id;
    } else {
      // Regular user: if no product_id specified, show only their own reviews
      if (!product_id) {
        filter.user_id = req.userId;
      }
      // If product_id is specified, show all reviews for that product (public)
    }
    
    // Search Support
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { content: { $regex: req.query.search, $options: 'i' } },
        { user_name: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (status) filter.status = status;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    
    // Sort logic
    const sort = {};
    sort[req.query.sortBy || 'created_at'] = req.query.sortOrder === 'asc' ? 1 : -1;
    
    const total = await Review.countDocuments(filter);
    const rawData = await Review.find(filter).sort(sort).skip((p - 1) * l).limit(l).lean();
    
    // Populate product name and image for each review
    const productIds = [...new Set(rawData.map(r => r.product_id).filter(Boolean))];
    let productMap = {};
    if (productIds.length > 0) {
      const mongoose = (await import('mongoose')).default;
      const Product = mongoose.model('Product');
      const productIdStrings = productIds.map(id => String(id));
      const validIds = productIdStrings.filter(id => mongoose.Types.ObjectId.isValid(id));
      const legacyIds = productIdStrings.filter(id => !mongoose.Types.ObjectId.isValid(id));

      const orFilters = [];
      if (validIds.length > 0) {
        orFilters.push({ _id: { $in: validIds } });
      }
      if (legacyIds.length > 0) {
        orFilters.push({ master_id: { $in: legacyIds } });
        orFilters.push({ sku: { $in: legacyIds } });
        orFilters.push({ barcode: { $in: legacyIds } });
      }

      if (orFilters.length > 0) {
        const products = await Product.find({ $or: orFilters })
          .select('name images thumbnail master_id sku barcode')
          .lean();

        for (const prod of products) {
          if (prod._id) productMap[String(prod._id)] = prod;
          if (prod.master_id) productMap[String(prod.master_id)] = prod;
          if (prod.sku) productMap[String(prod.sku)] = prod;
          if (prod.barcode) productMap[String(prod.barcode)] = prod;
        }
      }
    }

    const data = rawData.map(r => {
      const prod = r.product_id ? productMap[String(r.product_id)] : null;
      return {
        ...r,
        id: r._id,
        product_name: r.product_name || prod?.name || '',
        product_image: prod?.images?.[0] || prod?.thumbnail || '',
      };
    });

    return res.json({ success: true, data, meta: paginateMeta(total, { page: p, limit: l }) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/stats
export const stats = async (req, res) => {
  try {
    const total = await Review.countDocuments();
    const published = await Review.countDocuments({ status: 'published' });
    const pending = await Review.countDocuments({ status: 'pending' });
    const flagged = await Review.countDocuments({ status: 'flagged' }) + await Review.countDocuments({ status: 'reported' });
    
    const ratingAggregate = await Review.aggregate([
      { $match: { status: { $in: ['published', 'active'] } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const avgRating = ratingAggregate.length > 0 ? ratingAggregate[0].avgRating.toFixed(1) : 0;
    
    return res.json({ success: true, data: { total, published, pending, flagged, avgRating } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:productId/reviews (mounted in products route)
export const forProduct = async (req, res) => {
  try {
    const filter = { product_id: req.params.productId };
    
    if (req.userId) {
      filter.$or = [
        { status: { $in: ['active', 'published', 'approved'] } },
        { user_id: req.userId }
      ];
    } else {
      filter.status = { $in: ['active', 'published', 'approved'] };
    }
    
    const data = await Review.find(filter).sort('-created_at');
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products/:productId/reviews
export const create = async (req, res) => {
  try {
    if (!req.userId || !req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.params.productId && !req.body.product_id) {
      return res.status(400).json({ success: false, message: 'Missing product_id' });
    }
    // Always set user_id from authenticated user to prevent spoofing
    const userId = req.userId;

    const images = Array.isArray(req.body?.images)
      ? req.body.images.filter(Boolean).map((img) => String(img)).slice(0, 5)
      : [];

    const review = await Review.create({
      ...req.body,
      product_id: req.params.productId || req.body.product_id,
      user_id: userId,
      user_name: req.user?.full_name || req.user?.username || req.body.user_name || 'Khach hang',
      user_avatar: req.user?.avatar || req.body.user_avatar || null,
      content: req.body.content || req.body.comment || '',
      images,
    });
    return res.status(201).json({ success: true, data: review, message: 'Đánh giá thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reviews/:id
export const update = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    // Regular users can only edit their own reviews
    if (req.user?.role_id === 3 && String(review.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const updated = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/reviews/:id
export const remove = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    // Regular users can only delete their own reviews
    if (req.user?.role_id === 3 && String(review.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await Review.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Đã xóa đánh giá' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/reviews/:id/reply
export const reply = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const content = String(req.body.content || req.body.text || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }
    review.reply = { 
      content, 
      admin_name: req.body.admin_name || req.user?.username || 'Admin', 
      admin_id: req.userId,
      replied_at: new Date() 
    };
    await review.save();
    return res.json({ success: true, data: review, message: 'Đã phản hồi' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reviews/:id/status
export const updateStatus = async (req, res) => {
  try {
    const rv = await Review.findByIdAndUpdate(req.params.id, { 
      status: req.body.status, 
      moderation_reason: req.body.moderation_reason || '',
      admin_notes: req.body.admin_notes || ''
    }, { new: true });
    return res.json({ success: true, data: rv, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
