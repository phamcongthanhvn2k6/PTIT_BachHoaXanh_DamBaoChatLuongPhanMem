import { getCache, setCache } from '../services/redisService.js';

export const recipeRateLimiter = async (req, res, next) => {
  try {
    let limit = 3; // default guest limit: 3/hr
    let identifier = req.ip || 'guest';

    if (req.user) {
      identifier = String(req.user._id);
      const roleId = Number(req.user.role_id);
      const roleKey = req.user.role_key || '';

      if (roleId === 1 || roleId === 2 || roleKey.includes('admin') || roleKey === 'staff') {
        limit = 50; // Admin: 50/hr
      } else {
        limit = 10; // User: 10/hr
      }
    }

    const key = `rate:recipe:gen:${identifier}`;
    const current = await getCache(key);

    if (current !== null) {
      const count = Number(current);
      if (count >= limit) {
        return res.status(429).json({
          success: false,
          message: `Qua gioi han luot tao cong thuc (${limit} yeu cau/gio). Vui long thu lai sau.`
        });
      }
      // Increment
      await setCache(key, count + 1, 3600);
    } else {
      // Initialize
      await setCache(key, 1, 3600);
    }

    next();
  } catch (err) {
    console.error('[RecipeRateLimiter] Error:', err.message);
    next(); // Fall through on error to ensure uptime
  }
};
