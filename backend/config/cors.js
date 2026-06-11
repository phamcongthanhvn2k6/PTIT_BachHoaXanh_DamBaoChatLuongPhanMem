import cors from 'cors';

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://lottemart-frontend.vercel.app'
];

/**
 * Checks if the request origin matches the allowed list or vercel.app subdomains.
 * Supports:
 * - Localhost developers
 * - Specific Vercel custom domains
 * - Wildcard *.vercel.app preview / branch deployments
 */
export const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow server-to-server or same-origin requests
  
  // Clean up origin
  const cleanedOrigin = origin.trim();

  // Check static list
  if (allowedOrigins.includes(cleanedOrigin)) return true;

  // Check env variable FRONTEND_URL if set
  if (process.env.FRONTEND_URL && cleanedOrigin === process.env.FRONTEND_URL.trim()) return true;

  // Match https://*.vercel.app (and optional http for dev/previews)
  const vercelPattern = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*vercel\.app$/;
  if (vercelPattern.test(cleanedOrigin)) return true;

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Language', 'Cache-Control', 'Pragma', 'Expires'],
};

export default () => cors(corsOptions);
