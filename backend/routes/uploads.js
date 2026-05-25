import { Router } from 'express';
import { auth, admin } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';
import {
  promotionImageUploadMiddleware,
  reviewImageUploadMiddleware,
  supportImageUploadMiddleware,
  evidenceImageUploadMiddleware,
  uploadPromotionImage,
  uploadReviewImages,
  uploadSupportImages,
  uploadEvidenceImages,
  brandLogoUploadMiddleware,
  uploadBrandLogo,
  productImageUploadMiddleware,
  productSingleImageUploadMiddleware,
  uploadProductImages,
} from '../controllers/uploadController.js';

const router = Router();

// Rate limit uploads to prevent abuse: 10 uploads per 15 min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Quá nhiều yêu cầu upload, vui lòng thử lại sau.' }
});

router.post('/promotion-image', auth, admin, uploadLimiter, (req, res, next) => {
  promotionImageUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadPromotionImage);

router.post('/review-images', auth, uploadLimiter, (req, res, next) => {
  reviewImageUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadReviewImages);

router.post('/support-images', auth, uploadLimiter, (req, res, next) => {
  supportImageUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadSupportImages);

router.post('/evidence-images', auth, uploadLimiter, (req, res, next) => {
  evidenceImageUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadEvidenceImages);

router.post('/brand-logo', auth, admin, uploadLimiter, (req, res, next) => {
  brandLogoUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadBrandLogo);

router.post('/product-images', auth, admin, uploadLimiter, (req, res, next) => {
  productImageUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadProductImages);

router.post('/product-image', auth, admin, uploadLimiter, (req, res, next) => {
  productSingleImageUploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    return next();
  });
}, uploadProductImages);

export default router;

