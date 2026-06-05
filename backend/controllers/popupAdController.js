import { PopupAd } from '../models/PopupAd.js';
import { logActivity } from '../services/auditService.js';

// List popup ads
export const listPopupAds = async (req, res) => {
  try {
    const isClient = req.query.client === 'true';
    const query = {};
    
    if (isClient) {
      // Client (storefront) only sees active ads within date range
      const now = new Date();
      query.status = 'active';
      query.start_date = { $lte: now };
      query.end_date = { $gte: now };
      
      if (req.query.branch_id && req.query.branch_id !== 'all') {
        query.target_branch = { $in: [req.query.branch_id, 'all'] };
      }
      
      const data = await PopupAd.find(query).sort({ priority: -1, created_at: -1 });
      return res.json({ success: true, data });
    } else {
      // Admin sees everything
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
      const data = await PopupAd.find(query).sort({ created_at: -1 });
      return res.json({ success: true, data });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get popup ad detail
export const detailPopupAd = async (req, res) => {
  try {
    const data = await PopupAd.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Popup Ad not found' });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create popup ad
export const createPopupAd = async (req, res) => {
  try {
    const { title, image_url } = req.body;
    if (!title || !image_url) {
      return res.status(400).json({ success: false, message: 'Title and image_url are required' });
    }

    const payload = {
      ...req.body,
      created_by: req.user ? req.user._id : null
    };

    const data = await PopupAd.create(payload);

    // Audit log
    if (req.user) {
      await logActivity({
        userId: req.user._id,
        userName: req.user.username || req.user.email,
        action: 'CREATE',
        entity: 'popup_ad',
        entityId: data._id,
        details: payload,
        ip: req.ip
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update popup ad
export const updatePopupAd = async (req, res) => {
  try {
    const { title, image_url } = req.body;
    if (!title || !image_url) {
      return res.status(400).json({ success: false, message: 'Title and image_url are required' });
    }

    const payload = {
      ...req.body,
      updated_by: req.user ? req.user._id : null
    };

    const data = await PopupAd.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!data) {
      return res.status(404).json({ success: false, message: 'Popup Ad not found' });
    }

    // Audit log
    if (req.user) {
      await logActivity({
        userId: req.user._id,
        userName: req.user.username || req.user.email,
        action: 'UPDATE',
        entity: 'popup_ad',
        entityId: data._id,
        details: payload,
        ip: req.ip
      });
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete popup ad
export const deletePopupAd = async (req, res) => {
  try {
    const data = await PopupAd.findByIdAndDelete(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Popup Ad not found' });
    }

    // Audit log
    if (req.user) {
      await logActivity({
        userId: req.user._id,
        userName: req.user.username || req.user.email,
        action: 'DELETE',
        entity: 'popup_ad',
        entityId: data._id,
        details: { title: data.title },
        ip: req.ip
      });
    }

    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
