import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let isConnected = false;
let connectionAttempted = false;
const memoryCache = new Map();
const memoryLocks = new Set();

// ─── Create Redis client with safe defaults ─────────────────────
let redis = null;
try {
  redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times > 3) {
        // Stop retrying — stay in in-memory mode
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
    reconnectOnError: () => false, // do not auto-reconnect on command errors
  });

  // Suppress unhandled error events (ioredis emits these repeatedly)
  redis.on('error', (err) => {
    if (!connectionAttempted) return; // will log during connect attempt
    if (isConnected) {
      console.warn('[Redis] Connection lost:', err.message);
      isConnected = false;
    }
    // Suppress repeated ECONNREFUSED spam — already logged once
  });

  redis.on('connect', () => {
    isConnected = true;
    console.log('✅ Redis connected successfully.');
  });

  redis.on('close', () => {
    if (isConnected) {
      console.warn('[Redis] Connection closed.');
      isConnected = false;
    }
  });
} catch (err) {
  console.warn('[Redis] Client creation failed:', err.message);
}

let resolveRedisReady;
export const redisReady = new Promise((resolve) => {
  resolveRedisReady = resolve;
});

export const getIsConnected = () => isConnected;

// Attempt initial connection (non-blocking)
if (redis) {
  connectionAttempted = true;
  redis.connect().then(() => {
    isConnected = true;
    resolveRedisReady(true);
  }).catch((err) => {
    console.warn('⚠️ Redis unavailable — using in-memory fallback.', err.message);
    isConnected = false;
    resolveRedisReady(false);
  });
} else {
  resolveRedisReady(false);
}

// ─── Memory cache cleanup (prevent memory leak) ─────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache) {
    if (now > item.exp) memoryCache.delete(key);
  }
}, 60000); // clean every 60s

// ─── Cache operations with safe fallback ────────────────────────

export const setCache = async (key, value, ttlSeconds = 60) => {
  if (isConnected && redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch (e) {
      // Silently fall through to memory cache
    }
  }
  memoryCache.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
};

export const getCache = async (key) => {
  if (isConnected && redis) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      // Fall through to memory cache
    }
  }
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.exp) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};

export const deleteCachePattern = async (pattern) => {
  if (isConnected && redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
      return;
    } catch (e) {
      // Fall through to memory cleanup
    }
  }
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) memoryCache.delete(key);
  }
};

export const acquireLock = async (key, ttlSeconds = 5) => {
  if (isConnected && redis) {
    try {
      // Atomic SET NX EX — prevents lock leak if process crashes between setnx and expire
      const result = await redis.set(`lock:${key}`, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (e) {
      // Fall through to memory lock
    }
  }
  if (memoryLocks.has(key)) return false;
  memoryLocks.add(key);
  setTimeout(() => memoryLocks.delete(key), ttlSeconds * 1000);
  return true;
};

export const releaseLock = async (key) => {
  if (isConnected && redis) {
    try {
      await redis.del(`lock:${key}`);
      return;
    } catch (e) {
      // Fall through to memory lock cleanup
    }
  }
  memoryLocks.delete(key);
};

export default redis;
