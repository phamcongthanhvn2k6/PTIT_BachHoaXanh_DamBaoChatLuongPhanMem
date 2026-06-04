import Order from '../models/Order.js';
import Product from '../models/Product.js';
import BranchProduct from '../models/BranchProduct.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';

const parseId = (id) => {
  if (!id) return null;
  if (id === 'HCM01' || String(id) === '1') return new mongoose.Types.ObjectId('000000000000000000000001');
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

// GET /api/recommendations
export const getRecommendations = async (req, res) => {
  try {
    const branchIdStr = req.query.branchId;
    const limit = parseInt(req.query.limit) || 8;

    if (!branchIdStr) {
      return res.status(400).json({ success: false, message: 'branchId la bat buoc' });
    }

    const branchId = parseId(branchIdStr);

    // 1. Fetch available branch products for this branch that are active and in stock
    const branchProducts = await BranchProduct.find({
      branch_id: branchId,
      stock: { $gt: 0 },
      is_available: true
    }).lean();

    const branchProductMap = new Map();
    const productIds = [];

    for (const bp of branchProducts) {
      branchProductMap.set(String(bp.product_id), bp);
      productIds.push(bp.product_id);
    }

    // 2. Fetch corresponding active products
    const activeProducts = await Product.find({
      _id: { $in: productIds },
      is_active: true,
      is_deleted: { $ne: true }
    }).lean();

    const activeProductMap = new Map();
    for (const p of activeProducts) {
      activeProductMap.set(String(p._id), p);
    }

    // Helper to form a detailed normalized product response
    const formProductResponse = (product, bp) => ({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      images: product.images,
      thumbnail: product.thumbnail,
      rating: product.rating,
      review_count: product.review_count,
      is_best_seller: product.is_best_seller,
      is_new: product.is_new,
      branch_product_id: bp._id,
      price: bp.price,
      original_price: bp.original_price,
      discount_percent: bp.discount_percent,
      stock: bp.stock,
      is_available: bp.is_available,
      sold_count: bp.sold_count || product.sold_count || 0
    });

    const buyAgainList = [];
    const recommendedForYouList = [];
    const frequentlyBoughtTogetherList = [];
    const seasonalList = [];

    // Check if user is authenticated to customize feed
    if (req.userId) {
      // ════════════════════ BUY AGAIN ════════════════════
      // Find completed orders for current user
      const userOrders = await Order.find({
        user_id: req.userId,
        status: { $nin: ['CANCELLED', 'REFUNDED', 'RETURNED'] }
      }).lean();

      // Count purchase frequencies
      const productPurchaseCounts = {};
      for (const order of userOrders) {
        if (!order.items) continue;
        for (const item of order.items) {
          const pId = String(item.product_id);
          productPurchaseCounts[pId] = (productPurchaseCounts[pId] || 0) + Number(item.quantity || 1);
        }
      }

      const sortedPurchasedProductIds = Object.keys(productPurchaseCounts).sort(
        (a, b) => productPurchaseCounts[b] - productPurchaseCounts[a]
      );

      for (const pId of sortedPurchasedProductIds) {
        const prod = activeProductMap.get(pId);
        const bp = branchProductMap.get(pId);
        if (prod && bp) {
          buyAgainList.push(formProductResponse(prod, bp));
        }
      }

      // ════════════════════ RECOMMENDED FOR YOU (Personalized category affinity) ════════════════════
      // Find the categories user buys most
      const categoryPurchaseCounts = {};
      for (const order of userOrders) {
        if (!order.items) continue;
        for (const item of order.items) {
          if (item.category_name) {
            categoryPurchaseCounts[item.category_name] = (categoryPurchaseCounts[item.category_name] || 0) + Number(item.quantity || 1);
          }
        }
      }

      const sortedCategories = Object.keys(categoryPurchaseCounts).sort(
        (a, b) => categoryPurchaseCounts[b] - categoryPurchaseCounts[a]
      );

      const topCategories = sortedCategories.slice(0, 3);

      if (topCategories.length > 0) {
        // Find products in top categories
        for (const prod of activeProducts) {
          if (topCategories.includes(prod.category_name) || topCategories.includes(String(prod.category_id))) {
            // Avoid duplicates with buy again
            if (!buyAgainList.some(item => String(item._id) === String(prod._id))) {
              const bp = branchProductMap.get(String(prod._id));
              if (bp) {
                recommendedForYouList.push(formProductResponse(prod, bp));
              }
            }
          }
        }
      }
    }

    // Cold start fallbacks
    if (buyAgainList.length === 0) {
      // Return top-selling active branch products
      const topSellingBps = [...branchProducts]
        .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
        .slice(0, limit);
      for (const bp of topSellingBps) {
        const prod = activeProductMap.get(String(bp.product_id));
        if (prod) {
          buyAgainList.push(formProductResponse(prod, bp));
        }
      }
    }

    if (recommendedForYouList.length === 0) {
      // Recommend top rated products
      const topRatedProds = [...activeProducts]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
      for (const prod of topRatedProds) {
        const bp = branchProductMap.get(String(prod._id));
        if (bp) {
          recommendedForYouList.push(formProductResponse(prod, bp));
        }
      }
    }

    // ════════════════════ FREQUENTLY BOUGHT TOGETHER ════════════════════
    // Analyze OrderItems for product co-occurrence pairs
    let targetProductIds = [];
    if (req.userId) {
      const cart = await Cart.findOne({ user_id: req.userId }).lean();
      if (cart && cart.items && cart.items.length > 0) {
        targetProductIds = cart.items.map(item => String(item.product_id));
      }
    }

    // Find co-occurring products from other orders
    const coOccurrenceCounts = {};
    const relevantOrders = await Order.find({
      status: { $nin: ['CANCELLED', 'REFUNDED', 'RETURNED'] }
    }).limit(100).lean();

    for (const order of relevantOrders) {
      if (!order.items || order.items.length < 2) continue;
      const orderProdIds = order.items.map(item => String(item.product_id));

      const hasTarget = targetProductIds.length === 0 || orderProdIds.some(id => targetProductIds.includes(id));
      if (hasTarget) {
        for (const pId of orderProdIds) {
          if (!targetProductIds.includes(pId)) {
            coOccurrenceCounts[pId] = (coOccurrenceCounts[pId] || 0) + 1;
          }
        }
      }
    }

    const sortedCoOccurring = Object.keys(coOccurrenceCounts).sort(
      (a, b) => coOccurrenceCounts[b] - coOccurrenceCounts[a]
    );

    for (const pId of sortedCoOccurring) {
      const prod = activeProductMap.get(pId);
      const bp = branchProductMap.get(pId);
      if (prod && bp) {
        frequentlyBoughtTogetherList.push(formProductResponse(prod, bp));
      }
    }

    // Global pairing fallback
    if (frequentlyBoughtTogetherList.length === 0) {
      // Find the items that appear in the largest number of multi-item orders
      const popularPairings = {};
      for (const order of relevantOrders) {
        if (!order.items || order.items.length < 2) continue;
        for (const item of order.items) {
          const pId = String(item.product_id);
          popularPairings[pId] = (popularPairings[pId] || 0) + 1;
        }
      }
      const sortedPairings = Object.keys(popularPairings).sort(
        (a, b) => popularPairings[b] - popularPairings[a]
      );
      for (const pId of sortedPairings) {
        const prod = activeProductMap.get(pId);
        const bp = branchProductMap.get(pId);
        if (prod && bp) {
          frequentlyBoughtTogetherList.push(formProductResponse(prod, bp));
        }
      }
    }

    // ════════════════════ SEASONAL RECOMMENDATIONS ════════════════════
    const month = new Date().getMonth() + 1; // 1-12
    let seasonQueries = [];

    if (month >= 5 && month <= 8) {
      // Summer: drinks, ice cream, sunscreen, fresh fruits
      seasonQueries = ['nuoc', 'kem', 'trai cay', 'chong nang', 'giai khat', 'he', 'summer'];
    } else if (month === 12 || month === 1 || month === 2) {
      // Tet / Winter: candy, jams, gifts, cakes
      seasonQueries = ['tet', 'mut', 'keo', 'banh', 'gio qua', 'ruou'];
    } else if (month === 9 || month === 10) {
      // Mid-Autumn: mooncakes, lanterns, tea
      seasonQueries = ['trung thu', 'banh trung thu', 'long den', 'tra'];
    }

    if (seasonQueries.length > 0) {
      for (const prod of activeProducts) {
        const nameLower = prod.name.toLowerCase();
        const matchesSeason = seasonQueries.some(q => nameLower.includes(q) || prod.tags?.some(t => t.toLowerCase().includes(q)));
        if (matchesSeason) {
          const bp = branchProductMap.get(String(prod._id));
          if (bp) {
            seasonalList.push(formProductResponse(prod, bp));
          }
        }
      }
    }

    // Weekend promo fallback
    if (seasonalList.length === 0) {
      const promoBps = [...branchProducts]
        .filter(bp => bp.discount_percent > 10 || bp.promotion_tag)
        .slice(0, limit);
      for (const bp of promoBps) {
        const prod = activeProductMap.get(String(bp.product_id));
        if (prod) {
          seasonalList.push(formProductResponse(prod, bp));
        }
      }
    }

    return res.json({
      success: true,
      data: {
        buyAgain: buyAgainList.slice(0, limit),
        recommendedForYou: recommendedForYouList.slice(0, limit),
        frequentlyBoughtTogether: frequentlyBoughtTogetherList.slice(0, limit),
        seasonalRecommendations: seasonalList.slice(0, limit)
      }
    });
  } catch (err) {
    console.error('[RecommendationController] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Loi he thong' });
  }
};
