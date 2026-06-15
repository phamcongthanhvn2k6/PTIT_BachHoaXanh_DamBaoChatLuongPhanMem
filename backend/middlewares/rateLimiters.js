import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // Relaxed limit to accommodate HMR reloads and multi-tab verify sessions
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }
});

export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict limit to prevent brute force on sensitive password/OTP routes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, message: 'Quá nhiều yêu cầu đăng nhập/đăng ký. Vui lòng thử lại sau 15 phút.' }
});

export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }
});
