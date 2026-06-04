import PriceWatch from '../models/PriceWatch.js';
import BranchProduct from '../models/BranchProduct.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const parseId = (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

// POST /api/price-watch
export const createPriceWatch = async (req, res) => {
  try {
    const { branch_product_id, target_price, notification_preference = 'both' } = req.body;

    if (!branch_product_id) {
      return res.status(400).json({ success: false, message: 'branch_product_id la bat buoc' });
    }

    const bpId = parseId(branch_product_id);
    if (!bpId) {
      return res.status(400).json({ success: false, message: 'branch_product_id khong hop le' });
    }

    const branchProduct = await BranchProduct.findById(bpId);
    if (!branchProduct) {
      return res.status(404).json({ success: false, message: 'Khong tim thay san pham chi nhanh' });
    }

    const product = await Product.findOne({ _id: branchProduct.product_id, is_deleted: { $ne: true }, is_active: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'San pham da bi xoa hoac ngung hoat dong' });
    }

    const targetPriceNum = Number(target_price);
    if (isNaN(targetPriceNum) || targetPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Gia muc tieu phai la so duong' });
    }

    // Check if user is already watching this product
    let watch = await PriceWatch.findOne({ user_id: req.userId, branch_product_id: bpId });

    if (watch) {
      // Update existing watch
      watch.target_price = targetPriceNum;
      watch.initial_price = branchProduct.price;
      watch.current_price = branchProduct.price;
      watch.notification_preference = notification_preference;
      watch.status = 'active'; // Reset to active if it was triggered or cancelled
      await watch.save();
      return res.json({ success: true, message: 'Cap nhat theo doi gia thanh cong', data: watch });
    }

    // Create new watch record
    watch = await PriceWatch.create({
      user_id: req.userId,
      branch_product_id: bpId,
      target_price: targetPriceNum,
      initial_price: branchProduct.price,
      current_price: branchProduct.price,
      notification_preference,
      status: 'active'
    });

    return res.status(201).json({ success: true, message: 'Da bat dau theo doi gia san pham', data: watch });
  } catch (err) {
    console.error('[PriceWatchController] Create error:', err.message);
    return res.status(500).json({ success: false, message: 'Loi he thong' });
  }
};

// GET /api/price-watch
export const getPriceWatches = async (req, res) => {
  try {
    const watches = await PriceWatch.find({ user_id: req.userId }).lean();
    
    // Resolve products details
    const populated = [];
    for (const watch of watches) {
      const bp = await BranchProduct.findById(watch.branch_product_id).lean();
      if (!bp) continue;

      const product = await Product.findOne({ _id: bp.product_id, is_deleted: { $ne: true }, is_active: true }).lean();
      if (!product) continue;

      populated.push({
        ...watch,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          images: product.images,
          thumbnail: product.thumbnail,
          brand: product.brand,
          category_name: product.category_name,
          is_active: product.is_active
        },
        branchProduct: {
          _id: bp._id,
          price: bp.price,
          original_price: bp.original_price,
          stock: bp.stock,
          is_available: bp.is_available
        }
      });
    }

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error('[PriceWatchController] Get error:', err.message);
    return res.status(500).json({ success: false, message: 'Loi he thong' });
  }
};

// PATCH /api/price-watch/:id
export const updatePriceWatch = async (req, res) => {
  try {
    const watchId = parseId(req.params.id);
    if (!watchId) {
      return res.status(400).json({ success: false, message: 'ID khong hop le' });
    }

    const watch = await PriceWatch.findById(watchId);
    if (!watch) {
      return res.status(404).json({ success: false, message: 'Khong tim thay ban ghi theo doi gia' });
    }

    // Ownership check (IDOR protection)
    if (String(watch.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Ban khong co quyen cap nhat yeu cau nay' });
    }

    const { target_price, notification_preference, status } = req.body;

    if (target_price !== undefined) {
      const targetPriceNum = Number(target_price);
      if (isNaN(targetPriceNum) || targetPriceNum <= 0) {
        return res.status(400).json({ success: false, message: 'Gia muc tieu phai la so duong' });
      }
      watch.target_price = targetPriceNum;
    }

    if (notification_preference !== undefined) {
      if (!['in_app', 'email', 'both'].includes(notification_preference)) {
        return res.status(400).json({ success: false, message: 'Tùy chọn thông báo không hợp lệ' });
      }
      watch.notification_preference = notification_preference;
    }

    if (status !== undefined) {
      if (!['active', 'triggered', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }
      watch.status = status;
    }

    await watch.save();
    return res.json({ success: true, message: 'Cap nhat thanh cong', data: watch });
  } catch (err) {
    console.error('[PriceWatchController] Update error:', err.message);
    return res.status(500).json({ success: false, message: 'Loi he thong' });
  }
};

// DELETE /api/price-watch/:id
export const deletePriceWatch = async (req, res) => {
  try {
    const watchId = parseId(req.params.id);
    if (!watchId) {
      return res.status(400).json({ success: false, message: 'ID khong hop le' });
    }

    const watch = await PriceWatch.findById(watchId);
    if (!watch) {
      return res.status(404).json({ success: false, message: 'Khong tim thay ban ghi theo doi gia' });
    }

    // Ownership check (IDOR protection)
    if (String(watch.user_id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Ban khong co quyen xoa yeu cau nay' });
    }

    await PriceWatch.findByIdAndDelete(watchId);
    return res.json({ success: true, message: 'Da ngung theo doi gia san pham' });
  } catch (err) {
    console.error('[PriceWatchController] Delete error:', err.message);
    return res.status(500).json({ success: false, message: 'Loi he thong' });
  }
};
