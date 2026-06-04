import { EventComment } from '../models/Event.js';
import { EventPost } from '../models/EventPost.js';
import mongoose from 'mongoose';

// Dynamic status resolution based on date and administrative status
export const resolveEventStatus = (event) => {
  const now = new Date();
  
  if (event.status === 'draft' || event.status === 'archived') {
    return event.status;
  }
  if (event.end_date && new Date(event.end_date) < now) {
    return 'expired';
  }
  if (event.start_date && new Date(event.start_date) > now) {
    return 'scheduled';
  }
  if (event.is_published || event.status === 'published') {
    return 'published';
  }
  return 'draft';
};

// Map DB object to the required API contract
export const mapEventToContract = (event) => {
  if (!event) return null;
  const obj = event.toObject ? event.toObject() : { ...event };
  
  const idStr = obj._id ? obj._id.toString() : '';
  
  const contract = {
    id: idStr,
    _id: idStr,
    title: obj.title || '',
    slug: obj.slug || '',
    summary: obj.summary || obj.excerpt || '',
    description: obj.description || (obj.content_blocks && Array.isArray(obj.content_blocks) ? obj.content_blocks.map(b => b.text || '').join('\n') : '') || '',
    image: obj.image || obj.thumbnail || '',
    banner: obj.banner || obj.banner_image || '',
    startDate: obj.startDate || obj.start_date || null,
    endDate: obj.endDate || obj.end_date || null,
    status: resolveEventStatus(obj),
    branch: obj.branch || obj.branch_id || null,
    isFeatured: obj.isFeatured || obj.is_featured || false,
    isTopFeatured: obj.isTopFeatured !== undefined ? obj.isTopFeatured : (obj.is_top_featured || false),
    featuredPriority: obj.featuredPriority !== undefined ? Number(obj.featuredPriority) : (obj.featured_priority || 0),
    featuredOrder: obj.featuredOrder !== undefined ? Number(obj.featuredOrder) : (obj.featured_order || 0),
    heroTitleOverride: obj.heroTitleOverride !== undefined ? obj.heroTitleOverride : (obj.hero_title_override || ''),
    heroExcerptOverride: obj.heroExcerptOverride !== undefined ? obj.heroExcerptOverride : (obj.hero_excerpt_override || ''),
    heroImageOverride: obj.heroImageOverride !== undefined ? obj.heroImageOverride : (obj.hero_image_override || ''),
    readTime: obj.readTime !== undefined ? Number(obj.readTime) : (obj.read_time || 5),
  };
  
  return {
    ...obj,
    ...contract,
  };
};

const toSlug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const generateUniqueSlug = async (title, excludeId = null) => {
  let baseSlug = toSlug(title);
  if (!baseSlug) baseSlug = 'event';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await EventPost.findOne(query);
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
};

export const list = async (req, res) => {
  try {
    const { featured, page, limit } = req.query;
    const isAdmin = req.user && Number(req.user.role_id) <= 2;
    
    let filter = {};
    if (!isAdmin) {
      const now = new Date();
      filter = {
        is_published: true,
        status: { $nin: ['draft', 'archived'] },
        $and: [
          { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
          { $or: [{ end_date: null }, { end_date: { $gte: now } }] }
        ]
      };
    }
    
    if (featured === 'true') filter.is_featured = true;

    let query = EventPost.find(filter).sort('-is_top_featured -is_featured -featured_priority -published_at');

    if (limit) {
      const skip = page ? (Number(page) - 1) * Number(limit) : 0;
      query = query.skip(skip).limit(Number(limit));
    }

    const data = await query;
    const mappedData = data.map(ev => mapEventToContract(ev));
    return res.json({ success: true, data: mappedData, items: mappedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const published = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      is_published: true,
      status: { $nin: ['draft', 'archived'] },
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] }
      ]
    };
    const data = await EventPost.find(filter).sort('-is_top_featured -is_featured -featured_priority -published_at');
    const mappedData = data.map(ev => mapEventToContract(ev));
    return res.json({ success: true, data: mappedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const featured = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      is_featured: true,
      is_published: true,
      status: { $nin: ['draft', 'archived'] },
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] }
      ]
    };
    const data = await EventPost.find(filter).sort('-is_top_featured -is_featured -featured_priority -published_at');
    const mappedData = data.map(ev => mapEventToContract(ev));
    return res.json({ success: true, data: mappedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const detail = async (req, res) => {
  try {
    const idParam = req.params.id;
    let ev = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      ev = await EventPost.findById(idParam);
    }
    if (!ev) {
      ev = await EventPost.findOne({ slug: idParam });
    }
    if (!ev) return res.status(404).json({ success: false, message: 'Not found' });

    ev.views = (ev.views || 0) + 1;
    await ev.save();
    return res.json({ success: true, data: mapEventToContract(ev) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { title, start_date, end_date, start_date: startDate, end_date: endDate } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const finalStartDate = start_date || startDate;
    const finalEndDate = end_date || endDate;
    if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    if (!req.body.slug) {
      req.body.slug = await generateUniqueSlug(title);
    }

    if (req.body.startDate) req.body.start_date = req.body.startDate;
    if (req.body.endDate) req.body.end_date = req.body.endDate;
    if (req.body.isFeatured !== undefined) req.body.is_featured = req.body.isFeatured;
    if (req.body.isTopFeatured !== undefined) req.body.is_top_featured = req.body.isTopFeatured;
    if (req.body.featuredPriority !== undefined) req.body.featured_priority = Number(req.body.featuredPriority) || 0;
    if (req.body.featuredOrder !== undefined) req.body.featured_order = Number(req.body.featuredOrder) || 0;
    if (req.body.heroTitleOverride !== undefined) req.body.hero_title_override = req.body.heroTitleOverride;
    if (req.body.heroExcerptOverride !== undefined) req.body.hero_excerpt_override = req.body.heroExcerptOverride;
    if (req.body.heroImageOverride !== undefined) req.body.hero_image_override = req.body.heroImageOverride;
    if (req.body.readTime !== undefined) req.body.read_time = Number(req.body.readTime) || 5;
    if (req.body.image) req.body.thumbnail = req.body.image;
    if (req.body.summary) req.body.excerpt = req.body.summary;
    if (req.body.description) req.body.content_blocks = [{ type: 'text', text: req.body.description }];

    const computedStatus = resolveEventStatus(req.body);
    req.body.status = computedStatus;
    req.body.is_published = computedStatus === 'published';
    req.body.published_at = req.body.is_published ? new Date() : null;

    if (req.body.is_top_featured) {
      if (!req.body.is_published || computedStatus !== 'published') {
        return res.status(400).json({ success: false, message: 'Top featured event must be active and published.' });
      }
      const hasImage = req.body.thumbnail || req.body.hero_image_override;
      const hasSummary = req.body.summary || req.body.excerpt || req.body.hero_excerpt_override;
      const hasDescription = req.body.description || (req.body.content_blocks && req.body.content_blocks.length > 0);
      if (!title || !hasImage || !hasSummary || !hasDescription) {
        return res.status(400).json({ success: false, message: 'Top featured event must have a title, summary, thumbnail/image, and description/content.' });
      }
    }

    const ev = await EventPost.create(req.body);
    if (ev.is_top_featured) {
      await EventPost.updateMany({ _id: { $ne: ev._id } }, { is_top_featured: false });
    }
    return res.status(201).json({ success: true, data: mapEventToContract(ev) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const idParam = req.params.id;
    const { title, start_date, end_date, start_date: startDate, end_date: endDate } = req.body;
    const finalStartDate = start_date || startDate;
    const finalEndDate = end_date || endDate;
    if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    let ev = await EventPost.findById(idParam);
    if (!ev) return res.status(404).json({ success: false, message: 'Not found' });

    if (title && title !== ev.title && !req.body.slug) {
      req.body.slug = await generateUniqueSlug(title, ev._id);
    }

    if (req.body.startDate !== undefined) req.body.start_date = req.body.startDate;
    if (req.body.endDate !== undefined) req.body.end_date = req.body.endDate;
    if (req.body.isFeatured !== undefined) req.body.is_featured = req.body.isFeatured;
    if (req.body.isTopFeatured !== undefined) req.body.is_top_featured = req.body.isTopFeatured;
    if (req.body.featuredPriority !== undefined) req.body.featured_priority = Number(req.body.featuredPriority) || 0;
    if (req.body.featuredOrder !== undefined) req.body.featured_order = Number(req.body.featuredOrder) || 0;
    if (req.body.heroTitleOverride !== undefined) req.body.hero_title_override = req.body.heroTitleOverride;
    if (req.body.heroExcerptOverride !== undefined) req.body.hero_excerpt_override = req.body.heroExcerptOverride;
    if (req.body.heroImageOverride !== undefined) req.body.hero_image_override = req.body.heroImageOverride;
    if (req.body.readTime !== undefined) req.body.read_time = Number(req.body.readTime) || 5;
    if (req.body.image !== undefined) req.body.thumbnail = req.body.image;
    if (req.body.summary !== undefined) req.body.excerpt = req.body.summary;
    if (req.body.description !== undefined) req.body.content_blocks = [{ type: 'text', text: req.body.description }];

    const tempObj = { ...ev.toObject(), ...req.body };
    const computedStatus = resolveEventStatus(tempObj);
    req.body.status = computedStatus;
    req.body.is_published = computedStatus === 'published';
    
    if (req.body.is_published && !ev.is_published) {
      req.body.published_at = new Date();
    }

    if (req.body.is_top_featured) {
      if (!req.body.is_published || computedStatus !== 'published') {
        return res.status(400).json({ success: false, message: 'Top featured event must be active and published.' });
      }
      const hasImage = tempObj.thumbnail || tempObj.hero_image_override;
      const hasSummary = tempObj.summary || tempObj.excerpt || tempObj.hero_excerpt_override;
      const hasDescription = tempObj.description || (tempObj.content_blocks && tempObj.content_blocks.length > 0);
      if (!tempObj.title || !hasImage || !hasSummary || !hasDescription) {
        return res.status(400).json({ success: false, message: 'Top featured event must have a title, summary, thumbnail/image, and description/content.' });
      }
    }

    const updated = await EventPost.findByIdAndUpdate(idParam, req.body, { new: true });
    if (updated.is_top_featured) {
      await EventPost.updateMany({ _id: { $ne: updated._id } }, { is_top_featured: false });
    }
    return res.json({ success: true, data: mapEventToContract(updated) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    await EventPost.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const publish = async (req, res) => {
  try {
    const updated = await EventPost.findByIdAndUpdate(
      req.params.id,
      { is_published: true, status: 'published', published_at: new Date() },
      { new: true }
    );
    return res.json({ success: true, data: mapEventToContract(updated) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const unpublish = async (req, res) => {
  try {
    const updated = await EventPost.findByIdAndUpdate(
      req.params.id,
      { is_published: false, status: 'draft' },
      { new: true }
    );
    return res.json({ success: true, data: mapEventToContract(updated) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleFeatured = async (req, res) => {
  try {
    const ev = await EventPost.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, message: 'Not found' });
    ev.is_featured = !ev.is_featured;
    await ev.save();
    return res.json({ success: true, data: mapEventToContract(ev) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkDelete = async (req, res) => {
  try {
    await EventPost.deleteMany({ _id: { $in: req.body.ids } });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const comments = async (req, res) => {
  try {
    const cmts = await EventComment.find({ event_id: req.params.id, status: 'active' })
      .sort('created_at')
      .lean();
      
    const userIds = cmts.map(c => c.user_id).filter(Boolean);
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const users = await mongoose.model('User').find({ _id: { $in: validUserIds } }).select('avatar full_name username').lean();
    
    const userMap = {};
    for (const u of users) {
      userMap[u._id.toString()] = u;
    }

    const data = cmts.map(c => {
      const u = c.user_id ? userMap[c.user_id.toString()] : null;
      if (u) {
        c.user_avatar = u.avatar || null;
        c.user_name = u.full_name || u.username || c.user_name;
      }
      return c;
    });

    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const comment = await EventComment.create({ ...req.body, event_id: req.params.id });
    await EventPost.findByIdAndUpdate(req.params.id, { $inc: { comments_count: 1 } });
    return res.status(201).json({ success: true, data: comment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const related = async (req, res) => {
  try {
    const idParam = req.params.id;
    let ev = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      ev = await EventPost.findById(idParam);
    }
    if (!ev) {
      ev = await EventPost.findOne({ slug: idParam });
    }
    const data = ev ? await EventPost.find({ category_id: ev.category_id, _id: { $ne: ev._id }, is_published: true }).limit(4) : [];
    const mappedData = data.map(item => mapEventToContract(item));
    return res.json({ success: true, data: mappedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const EVENT_CATEGORIES = [
  { id: 2, name: 'Khuyến mãi', slug: 'khuyen-mai' },
  { id: 3, name: 'Sự kiện', slug: 'su-kien' },
  { id: 4, name: 'Khai trương', slug: 'khai-truong' },
  { id: 5, name: 'Nội dung', slug: 'noi-dung' }
];

export const categories = async (req, res) => {
  try {
    return res.json({ success: true, data: EVENT_CATEGORIES });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const likeEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const ev = await EventPost.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });
    
    const idx = ev.liked_by.indexOf(userId);
    if (idx !== -1) {
      ev.liked_by.splice(idx, 1);
      ev.likes = Math.max(0, (ev.likes || 1) - 1);
    } else {
      ev.liked_by.push(userId);
      ev.likes = (ev.likes || 0) + 1;
    }
    await ev.save();
    return res.json({ success: true, likes: ev.likes, isLiked: idx === -1 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const comment = await EventComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    
    const idx = comment.liked_by.indexOf(userId);
    if (idx !== -1) {
      comment.liked_by.splice(idx, 1);
      comment.likes = Math.max(0, (comment.likes || 1) - 1);
    } else {
      comment.liked_by.push(userId);
      comment.likes = (comment.likes || 0) + 1;
    }
    await comment.save();
    return res.json({ success: true, likes: comment.likes, isLiked: idx === -1 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
