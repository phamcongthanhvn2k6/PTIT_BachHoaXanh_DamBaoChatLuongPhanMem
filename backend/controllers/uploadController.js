import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Only image files (jpg, png, webp, gif) are allowed'));
  }
  cb(null, true);
};

export const promotionImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).single('image');

export const reviewImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const supportImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const evidenceImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const brandLogoUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

export const productImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const productSingleImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).single('image');

const uploadToGridFS = (file, category) => {
  return new Promise((resolve, reject) => {
    if (!mongoose.connection.db) {
      return reject(new Error('Database connection not established'));
    }
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico'].includes(ext) ? ext : '.jpg';
    const stamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `${category}_${stamp}_${random}${safeExt}`;
    
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.mimetype,
      metadata: { category }
    });
    
    uploadStream.end(file.buffer);
    
    uploadStream.on('finish', () => {
      resolve(filename);
    });
    
    uploadStream.on('error', reject);
  });
};

const uploadSingleFileHelper = async (file, category, host) => {
  // 1. Try Cloudinary
  try {
    const secureUrl = await uploadToCloudinary(file.buffer, category);
    if (secureUrl) {
      return {
        url: secureUrl,
        relative_url: secureUrl,
        filename: secureUrl.split('/').pop(),
        size: file.size,
        mimetype: file.mimetype,
      };
    }
  } catch (err) {
    console.error(`[upload] Cloudinary upload failed for ${category}, falling back to GridFS:`, err);
  }

  // 2. Fallback to GridFS
  const filename = await uploadToGridFS(file, category);
  let folder = `${category}s`;
  if (category === 'support') folder = 'support';
  if (category === 'evidence') folder = 'evidence';
  if (category === 'brand_logo') folder = 'brand';
  const relativePath = `/uploads/${folder}/${filename}`;

  return {
    url: `${host}${relativePath}`,
    relative_url: relativePath,
    filename,
    size: file.size,
    mimetype: file.mimetype,
  };
};

export const uploadPromotionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const fileData = await uploadSingleFileHelper(req.file, 'promotion', host);

    return res.status(201).json({
      success: true,
      data: fileData,
      message: 'Upload successful',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadReviewImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const mapped = await Promise.all(files.map(file => uploadSingleFileHelper(file, 'review', host)));

    return res.status(201).json({
      success: true,
      data: {
        urls: mapped.map((item) => item.url),
        files: mapped,
      },
      message: 'Upload successful',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadSupportImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const mapped = await Promise.all(files.map(file => uploadSingleFileHelper(file, 'support', host)));

    return res.status(201).json({
      success: true,
      data: {
        urls: mapped.map((item) => item.url),
        files: mapped,
      },
      message: 'Upload successful',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadEvidenceImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const mapped = await Promise.all(files.map(file => uploadSingleFileHelper(file, 'evidence', host)));

    return res.status(201).json({
      success: true,
      data: {
        urls: mapped.map((item) => item.url),
        files: mapped,
      },
      message: 'Upload successful',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadBrandLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Logo image file is required' });
    }
    
    const host = `${req.protocol}://${req.get('host')}`;
    const fileData = await uploadSingleFileHelper(req.file, 'brand_logo', host);
    
    return res.status(201).json({
      success: true,
      data: fileData,
      message: 'Logo uploaded successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadProductImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const mapped = await Promise.all(files.map(file => uploadSingleFileHelper(file, 'product', host)));

    return res.status(201).json({
      success: true,
      data: {
        urls: mapped.map((item) => item.url),
        files: mapped,
      },
      message: 'Product images uploaded successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const serveFile = async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    if (mongoose.connection.db) {
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
      const files = await bucket.find({ filename }).toArray();
      
      if (files.length > 0) {
        const file = files[0];
        res.set('Content-Type', file.contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        const downloadStream = bucket.openDownloadStream(file._id);
        return downloadStream.pipe(res);
      }
    }
    
    // Fallback to local disk for backward compatibility
    const localPath = path.resolve(__dirname, '..', '..', 'uploads', category, filename);
    if (fs.existsSync(localPath)) {
      res.set('Cache-Control', 'public, max-age=31536000');
      return res.sendFile(localPath);
    }
    
    return res.status(404).send('File not found');
  } catch (err) {
    return res.status(500).send('Error serving file');
  }
};

export const eventImageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).single('image');

export const uploadEventImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const fileData = await uploadSingleFileHelper(req.file, 'event', host);

    return res.status(201).json({
      success: true,
      data: fileData,
      message: 'Upload successful',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


