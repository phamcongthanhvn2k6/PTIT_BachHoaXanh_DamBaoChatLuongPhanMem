import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import logger from './utils/logger.js';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import supportRoutes from './routes/support.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import addressRoutes from './routes/addresses.js';
import branchRoutes from './routes/branches.js';
import branchProductRoutes from './routes/branchProducts.js';
import promotionRoutes from './routes/promotions.js';
import couponRoutes from './routes/coupons.js';
import eventRoutes from './routes/events.js';
import loyaltyRoutes from './routes/loyalty.js';
import gamificationRoutes from './routes/gamification.js';
import paymentRoutes from './routes/payments.js';
import checkoutRoutes from './routes/checkout.js';
import bannerRoutes from './routes/banners.js';
import compareRoutes from './routes/compare.js';
import wishlistRoutes from './routes/wishlist.js';
import viewHistoryRoutes from './routes/viewHistory.js';
import returnRequestRoutes from './routes/returnRequests.js';
import adminRoutes from './routes/admin.js';
import roleRoutes from './routes/roles.js';
import permissionRoutes from './routes/permissions.js';
import auditLogRoutes from './routes/auditLogs.js';
import stockMovementRoutes from './routes/stockMovements.js';
import importOrderRoutes from './routes/importOrders.js';
import importReceiptRoutes from './routes/importReceipts.js';
import uploadRoutes from './routes/uploads.js';
import recipeRoutes from './routes/recipes.js';
import questionRoutes from './routes/questions.js';
import recommendationRoutes from './routes/recommendations.js';
import priceWatchRoutes from './routes/priceWatch.js';
import Order from './models/Order.js';
import SearchHistory from './models/SearchHistory.js';
import MembershipTier from './models/MembershipTier.js';
import { AdminSetting, AuditLog, Banner, HotDeal, FeaturedCollection, DeliverySlot, NotificationTemplate } from './models/Misc.js';
import popupAdRoutes from './routes/popupAds.js';

// Enterprise Modules
import supplierRoutes from './routes/suppliers.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import inventoryBatchRoutes from './routes/inventoryBatches.js';
import stockTakeRoutes from './routes/stockTakes.js';
import reqRoutes from './routes/internalRequisitions.js';
import flashDealRoutes from './routes/flashDeals.js';
import { ensureRbacSeed } from './services/rbacService.js';
import { ensureMarketingSeed } from './services/marketingSeedService.js';

import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { localizationMiddleware } from './middlewares/localization.js';
import { authLimiter, orderLimiter } from './middlewares/rateLimiters.js';
import { configurePassportFacebook } from './config/passportFacebook.js';
import { setupSwagger } from './config/swagger.js';
import { seedDefaultFlags } from './services/featureFlagService.js';
import { startBackupScheduler } from './services/backupScheduler.js';
import { startReconciliationScheduler } from './services/reconciliationService.js';
import { startPaymentTimeoutScheduler } from './services/paymentTimeoutService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

try {
  configurePassportFacebook();
} catch (err) {
  console.error('[Auth][Facebook] Strategy init failed:', err.message);
}

const app = express();

ensureRbacSeed().catch((err) => {
  console.error('RBAC seed bootstrap failed:', err.message);
});

ensureMarketingSeed().catch((err) => {
  console.error('Marketing seed bootstrap failed:', err.message);
});

seedDefaultFlags().catch((err) => {
  console.error('Feature flag seed failed:', err.message);
});

startBackupScheduler();
startReconciliationScheduler();
startPaymentTimeoutScheduler();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // allow serving /uploads cross-origin
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // Prevent inline scripts and XSS
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      connectSrc: ["'self'", "http:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

import { cacheMiddleware } from './middlewares/cacheMiddleware.js';
import { trackPerformance } from './middlewares/metricsMiddleware.js';
import { dbCircuitBreakerMiddleware } from './middlewares/dbCircuitBreaker.js';
import { maintenanceGuard } from './middlewares/maintenanceGuard.js';

// Request ID & Logging Middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  logger.info(`Incoming ${req.method} ${req.url}`, { requestId: req.id, ip: req.ip });

  res.on('finish', () => {
    logger.info(`Completed ${req.method} ${req.url} with status ${res.statusCode}`, { requestId: req.id });
  });
  next();
});

// Health check — MUST be before circuit breaker so it always responds
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const cbState = (dbState === 1) ? 'CLOSED' : (dbState === 2 ? 'HALF-OPEN' : 'OPEN');
  
  res.json({
    success: true,
    status: dbState === 1 ? 'OK' : 'DEGRADED',
    message: dbState === 1 ? 'Lotte Mart API is fully operational' : 'Lotte Mart API is operating in degraded mode',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    dbStatus: dbStates[dbState] || 'unknown',
    circuitBreaker: {
      status: cbState,
      tripped: cbState === 'OPEN',
      mode: 'automatic'
    },
    schedulers: {
      payment_timeout: { status: 'active', frequency: 'every minute' },
      reconciliation: { status: 'active', frequency: 'daily at 03:00 AM' },
      backup: { status: 'active', frequency: 'daily at 02:00 AM' }
    },
    timestamp: new Date().toISOString()
  });
});

// Apply DB Circuit Breaker (checks real mongoose.connection.readyState)
app.use(dbCircuitBreakerMiddleware);

// Performance tracking middleware
app.use(trackPerformance);

app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(mongoSanitize());
app.use(morgan('dev'));
app.use(passport.initialize());
app.use(localizationMiddleware);
import { serveFile } from './controllers/uploadController.js';
app.get('/uploads/:category/:filename', serveFile);

// Swagger API Documentation
setupSwagger(app);

// Rate limiters are imported from ./middlewares/rateLimiters.js

// Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authLimiter, authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/cart', maintenanceGuard, cartRoutes);
apiRouter.use('/orders', orderLimiter, maintenanceGuard, orderRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/addresses', addressRoutes);
apiRouter.use('/branches', branchRoutes);
apiRouter.use('/branch-products', branchProductRoutes);
apiRouter.use('/promotions', promotionRoutes);
apiRouter.use('/coupons', orderLimiter, maintenanceGuard, couponRoutes);
apiRouter.use('/events', eventRoutes);
apiRouter.use('/loyalty', loyaltyRoutes);
apiRouter.use('/gamification', gamificationRoutes);
apiRouter.use('/payments', maintenanceGuard, paymentRoutes);
apiRouter.use('/checkout', maintenanceGuard, checkoutRoutes);
apiRouter.use('/banners', bannerRoutes);
apiRouter.use('/compare', compareRoutes);
apiRouter.use('/wishlist', wishlistRoutes);
apiRouter.use('/view-history', viewHistoryRoutes);
apiRouter.use('/return-requests', maintenanceGuard, returnRequestRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/roles', roleRoutes);
apiRouter.use('/permissions', permissionRoutes);
apiRouter.use('/audit-logs', auditLogRoutes);
apiRouter.use('/stock-movements', stockMovementRoutes);
apiRouter.use('/import-orders', importOrderRoutes);
apiRouter.use('/import-receipts', importReceiptRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/recipes', recipeRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/price-watch', priceWatchRoutes);

apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/purchase-orders', purchaseOrderRoutes);
apiRouter.use('/inventory-batches', inventoryBatchRoutes);
apiRouter.use('/stock-takes', stockTakeRoutes);
apiRouter.use('/internal-requisitions', reqRoutes);
apiRouter.use('/flash-deals', flashDealRoutes);
apiRouter.use('/popup-ads', popupAdRoutes);

// Maintenance Status public endpoint (no auth required)
apiRouter.get('/system/maintenance-status', async (req, res) => {
  try {
    const { AdminSetting, AuditLog } = await import('./models/Misc.js');
    const setting = await AdminSetting.findOne({ key: 'maintenance_mode' });
    const isMaintenance = setting ? (setting.value === true || setting.value === 'true') : false;

    const lastLog = await AuditLog.findOne({
      entity: 'admin_setting',
      entityId: 'maintenance_mode',
      action: 'UPDATE'
    }).sort({ created_at: -1 }).lean();

    return res.json({
      maintenance: isMaintenance,
      updated_at: lastLog ? lastLog.created_at : (setting?.updatedAt || new Date().toISOString()),
      updated_by: lastLog ? (lastLog.user_name || 'System') : 'System',
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Mount with versioning
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter); // Backward compatibility

// Top-level aliases that frontend endpoints.ts expects
import { listHotDeals, createHotDeal, updateHotDeal, deleteHotDeal, listFeaturedCollections, listDeliverySlots } from './controllers/bannerController.js';
import { forProduct as productReviews, create as createReview } from './controllers/reviewController.js';
import { auth as authMw, admin as adminMw, optionalAuth as optionalAuthMw } from './middlewares/auth.js';

app.get('/api/hot-deals', optionalAuthMw, listHotDeals);
app.post('/api/hot-deals', authMw, adminMw, createHotDeal);
app.put('/api/hot-deals/:id', authMw, adminMw, updateHotDeal);
app.delete('/api/hot-deals/:id', authMw, adminMw, deleteHotDeal);
app.get('/api/featured-collections', listFeaturedCollections);
app.get('/api/delivery-slots', listDeliverySlots);
app.get('/api/membership-tiers', async (req, res) => {
  try {
    const tiers = await MembershipTier.find({}).sort({ min_points: 1 }).lean();
    return res.json({ success: true, data: tiers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/search/products', optionalAuthMw, (req, res) => { req.query.search = req.query.q || ''; import('./controllers/productController.js').then(m => m.search(req, res)); });
app.get('/api/search/history/:userId', authMw, async (req, res) => {
  try {
    if (String(req.userId) !== String(req.params.userId) && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot access another user\'s history.' });
    }
    const history = await SearchHistory.find({ user_id: req.params.userId }).sort({ created_at: -1 }).limit(50).lean();
    return res.json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/purchase-history/:userId', authMw, async (req, res) => {
  try {
    if (String(req.userId) !== String(req.params.userId) && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot access another user\'s history.' });
    }
    const orders = await Order.find({ user_id: req.params.userId }).sort({ created_at: -1 }).limit(50).lean();
    return res.json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Product sub-routes for reviews (mounted under /api/products/:productId/reviews)
app.get('/api/products/:productId/reviews', optionalAuthMw, productReviews);
app.post('/api/products/:productId/reviews', authMw, createReview);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
