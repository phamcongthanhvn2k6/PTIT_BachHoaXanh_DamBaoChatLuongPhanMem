import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promotionUploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'promotions');
const reviewUploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'reviews');
const supportUploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'support');
const evidenceUploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'evidence');
const brandUploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'brand');

const ensureUploadRoot = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureUploadRoot(promotionUploadRoot);
ensureUploadRoot(reviewUploadRoot);
ensureUploadRoot(supportUploadRoot);
ensureUploadRoot(evidenceUploadRoot);
ensureUploadRoot(brandUploadRoot);

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const buildStorage = ({ dir, prefix }) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico'].includes(ext) ? ext : '.jpg';
    const stamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    cb(null, `${prefix}_${stamp}_${random}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Only image files (jpg, png, webp, gif) are allowed'));
  }
  cb(null, true);
};

export const promotionImageUploadMiddleware = multer({
  storage: buildStorage({ dir: promotionUploadRoot, prefix: 'promotion' }),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).single('image');

export const reviewImageUploadMiddleware = multer({
  storage: buildStorage({ dir: reviewUploadRoot, prefix: 'review' }),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const supportImageUploadMiddleware = multer({
  storage: buildStorage({ dir: supportUploadRoot, prefix: 'support' }),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const evidenceImageUploadMiddleware = multer({
  storage: buildStorage({ dir: evidenceUploadRoot, prefix: 'evidence' }),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
}).array('images', 5);

export const brandLogoUploadMiddleware = multer({
  storage: buildStorage({ dir: brandUploadRoot, prefix: 'brand_logo' }),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

export const uploadPromotionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const relativePath = `/uploads/promotions/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      data: {
        url: `${host}${relativePath}`,
        relative_url: relativePath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
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
    const mapped = files.map((file) => {
      const relativePath = `/uploads/reviews/${file.filename}`;
      return {
        url: `${host}${relativePath}`,
        relative_url: relativePath,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

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
    const mapped = files.map((file) => {
      const relativePath = `/uploads/support/${file.filename}`;
      return {
        url: `${host}${relativePath}`,
        relative_url: relativePath,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

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
    const mapped = files.map((file) => {
      const relativePath = `/uploads/evidence/${file.filename}`;
      return {
        url: `${host}${relativePath}`,
        relative_url: relativePath,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

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
    const relativePath = `/uploads/brand/${req.file.filename}`;
    return res.status(201).json({
      success: true,
      data: {
        url: `${host}${relativePath}`,
        relative_url: relativePath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: 'Logo uploaded successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
