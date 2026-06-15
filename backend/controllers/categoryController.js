import Category from '../models/Category.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const toSlug = (value = '') => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const normalizeParentId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const normalizedCategory = (doc) => {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...obj,
    id: String(obj._id || obj.id || ''),
    _id: String(obj._id || obj.id || ''),
  };
};

export const list = async (req, res) => {
  try {
    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';
    const filter = includeInactive ? {} : { is_active: true };
    const data = await Category.find(filter).sort({ sort_order: 1, name: 1 });
    return res.json({ success: true, data: data.map(normalizedCategory) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    return res.json({ success: true, data: normalizedCategory(cat) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = String(req.body?.slug || '').trim() || toSlug(name);
    const category = await Category.create({
      name,
      slug,
      icon: req.body?.icon || '',
      icon_type: req.body?.icon_type || 'material_icon',
      icon_url: req.body?.icon_url || '',
      icon_name: req.body?.icon_name || '',
      icon_emoji: req.body?.icon_emoji || '',
      image: req.body?.image || '',
      description: req.body?.description || '',
      parent_id: normalizeParentId(req.body?.parent_id),
      sort_order: Number(req.body?.sort_order || 0),
      is_active: req.body?.is_active !== undefined ? Boolean(req.body.is_active) : true,
      product_count: Number(req.body?.product_count || 0),
    });

    return res.status(201).json({ success: true, data: normalizedCategory(category), message: 'Category created' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.name !== undefined) {
      payload.name = String(payload.name).trim();
      if (!payload.name) return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (payload.parent_id !== undefined) payload.parent_id = normalizeParentId(payload.parent_id);
    if (payload.slug !== undefined) payload.slug = String(payload.slug).trim() || toSlug(payload.name || 'category');
    if (payload.sort_order !== undefined) payload.sort_order = Number(payload.sort_order || 0);

    const updated = await Category.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Category not found' });

    return res.json({ success: true, data: normalizedCategory(updated), message: 'Category updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const productFilter = { category_id: categoryId };
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      productFilter.$or = [
        { category_id: categoryId },
        { category_id: new mongoose.Types.ObjectId(categoryId) },
      ];
      delete productFilter.category_id;
    }

    const linkedProducts = await Product.countDocuments(productFilter);
    if (linkedProducts > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete category with linked products' });
    }

    const deleted = await Category.findByIdAndDelete(categoryId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });

    return res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
