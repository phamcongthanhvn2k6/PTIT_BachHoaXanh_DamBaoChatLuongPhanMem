import Review from '../models/Review.js';
import { paginateMeta } from '../utils/helpers.js';
import mongoose from 'mongoose';
import { requestJsonCompletion, isAIClientReady } from '../utils/aiClient.js';

const updateProductRatingStats = async (productId) => {
  try {
    const Product = mongoose.model('Product');

    let product = null;
    const paramStr = String(productId).trim();
    if (mongoose.Types.ObjectId.isValid(paramStr) && /^[0-9a-fA-F]{24}$/.test(paramStr)) {
      product = await Product.findById(paramStr);
    }
    if (!product) {
      product = await Product.findOne({ short_code: paramStr });
    }
    if (!product && /^\d+$/.test(paramStr)) {
      product = await Product.findOne({ id: Number(paramStr) });
    }

    if (!product) {
      console.warn(`[RatingSync] Product not found for ID: ${productId}`);
      return;
    }

    const matchingProductIds = [product._id, String(product._id), product.id, String(product.id), product.short_code].filter(Boolean);
    const reviews = await Review.find({
      product_id: { $in: matchingProductIds },
      status: { $in: ['active', 'published', 'approved'] }
    });

    const reviewCount = reviews.length;
    let averageRating = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (reviewCount > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = Number((sum / reviewCount).toFixed(1));
      
      reviews.forEach(r => {
        const ratingKey = String(Math.round(r.rating));
        if (ratingBreakdown[ratingKey] !== undefined) {
          ratingBreakdown[ratingKey] += 1;
        }
      });
    }

    product.rating = averageRating;
    product.average_rating = averageRating;
    product.review_count = reviewCount;
    product.total_reviews = reviewCount;
    product.rating_breakdown = ratingBreakdown;
    
    product.markModified('rating_breakdown');
    await product.save();
    console.log(`[RatingSync] Updated product ${product.name} (${product._id}): rating=${averageRating}, count=${reviewCount}`);
  } catch (err) {
    console.error(`Failed to update product rating stats for product ${productId}:`, err);
  }
};

export const moderateReviewWithAI = async (reviewText, rating, productName) => {
  if (!isAIClientReady()) {
    console.log('[AI-Review-Moderation] AI Client not configured, bypassing...');
    return null;
  }

  try {
    const systemPrompt = `You are an AI grocery review moderator and assistant for Bách Hóa XANH supermarket. 
Analyze the customer's product review text and rating. 
Detect if the review contains toxic content, hate speech, spam, advertisement links, phone numbers, or off-topic complaints (e.g., complaining about the app or delivery instead of the product itself).
Determine the sentiment of the review as positive, neutral, or negative, and give a sentiment score between 0.0 and 1.0.
Finally, if the review is safe and has a positive sentiment, write a short, polite, and helpful suggested store reply in Vietnamese (max 2 sentences) thanking the customer and wishing them a nice day.`;

    const userPrompt = `Product: ${productName}
Rating: ${rating}/5 stars
Review Content: "${reviewText}"`;

    const schema = {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        sentiment_score: { type: "number" },
        is_flagged: { type: "boolean" },
        flag_reason: { type: "string" },
        suggested_reply: { type: "string" }
      },
      required: ["sentiment", "sentiment_score", "is_flagged", "flag_reason", "suggested_reply"]
    };

    console.info('[AI-Review-Moderation] Calling OpenRouter to analyze review...');
    const result = await requestJsonCompletion({ systemPrompt, userPrompt, schema });
    console.info('[AI-Review-Moderation] AI Analysis Result:', result);
    return result;
  } catch (err) {
    console.error('[AI-Review-Moderation] AI Moderation failed:', err.message);
    return null;
  }
};

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
// Note: Product router uses /:id/reviews (param = 'id'),
//       Top-level alias uses /:productId/reviews (param = 'productId').
//       We accept both to ensure compatibility.
export const forProduct = async (req, res) => {
  try {
    const productId = req.params.productId || req.params.id;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Missing product identifier' });
    }

    const Product = mongoose.model('Product');
    let product = null;
    const paramStr = String(productId).trim();
    if (mongoose.Types.ObjectId.isValid(paramStr) && /^[0-9a-fA-F]{24}$/.test(paramStr)) {
      product = await Product.findById(paramStr);
    }
    if (!product) {
      product = await Product.findOne({ short_code: paramStr });
    }
    if (!product && /^\d+$/.test(paramStr)) {
      product = await Product.findOne({ id: Number(paramStr) });
    }

    const queryIds = [];
    if (product) {
      queryIds.push(product._id);
      if (product.id) queryIds.push(product.id);
      if (product.short_code) queryIds.push(product.short_code);
    } else {
      queryIds.push(productId);
    }

    const filter = { product_id: { $in: queryIds } };
    
    if (req.userId) {
      filter.$or = [
        { status: { $in: ['active', 'published', 'approved'] } },
        { user_id: req.userId }
      ];
    } else {
      filter.status = { $in: ['active', 'published', 'approved'] };
    }
    
    const data = await Review.find(filter).sort('-created_at');
    const mappedData = data.map(r => {
      const obj = r.toObject ? r.toObject() : { ...r };
      obj.id = obj._id;
      return obj;
    });

    return res.json({ success: true, data: mappedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products/:productId/reviews
// Note: Same param compatibility as forProduct — accept both :id and :productId.
export const create = async (req, res) => {
  try {
    if (!req.userId || !req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const productId = req.params.productId || req.params.id || req.body.product_id;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Missing product_id' });
    }
    const userId = req.userId;

    const Product = mongoose.model('Product');
    let product = null;
    const paramStr = String(productId).trim();
    if (mongoose.Types.ObjectId.isValid(paramStr) && /^[0-9a-fA-F]{24}$/.test(paramStr)) {
      product = await Product.findById(paramStr);
    }
    if (!product) {
      product = await Product.findOne({ short_code: paramStr });
    }
    if (!product && /^\d+$/.test(paramStr)) {
      product = await Product.findOne({ id: Number(paramStr) });
    }

    const resolvedProductId = product ? product._id : productId;
    const resolvedProductName = product ? product.name : (req.body.product_name || '');

    const images = Array.isArray(req.body?.images)
      ? req.body.images.filter(Boolean).map((img) => String(img)).slice(0, 5)
      : [];

    // Perform AI Moderation
    let aiResult = null;
    let finalStatus = 'published';
    let flagReason = '';

    try {
      const content = req.body.content || req.body.comment || '';
      aiResult = await moderateReviewWithAI(content, Number(req.body.rating || 5), resolvedProductName);
      
      if (aiResult) {
        if (aiResult.is_flagged) {
          finalStatus = 'reported'; // hide and flag for review
          flagReason = aiResult.flag_reason || 'AI flagged as unsafe/spam';
        }
      }
    } catch (aiErr) {
      console.error('[AI-Review] Error processing AI moderation:', aiErr.message);
    }

    const review = await Review.create({
      ...req.body,
      product_id: resolvedProductId,
      product_name: resolvedProductName,
      user_id: userId,
      user_name: req.user?.full_name || req.user?.username || req.body.user_name || 'Khach hang',
      user_avatar: req.user?.avatar || req.body.user_avatar || null,
      content: req.body.content || req.body.comment || '',
      images,
      status: finalStatus,
      moderation_reason: flagReason,
      ai_sentiment: aiResult?.sentiment || null,
      ai_sentiment_score: aiResult?.sentiment_score || null,
      ai_is_flagged: aiResult?.is_flagged || false,
      ai_flag_reason: flagReason,
      ai_suggested_reply: aiResult?.suggested_reply || null,
    });

    // Update product rating stats dynamically
    await updateProductRatingStats(resolvedProductId);

    const obj = review.toObject();
    obj.id = obj._id;

    return res.status(201).json({ success: true, data: obj, message: 'Đánh giá thành công' });
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
    
    // Recalculate and update the product's ratings stats
    if (updated) {
      await updateProductRatingStats(updated.product_id);
    }
    
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
    
    // Recalculate and update the product's ratings stats
    await updateProductRatingStats(review.product_id);
    
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
    
    // Recalculate and update the product's ratings stats since status changed
    if (rv) {
      await updateProductRatingStats(rv.product_id);
    }
    
    return res.json({ success: true, data: rv, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
