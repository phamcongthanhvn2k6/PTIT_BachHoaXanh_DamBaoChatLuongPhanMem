import axios, { AxiosError } from 'axios';

const SUPPORTED_LOCALES = ['vi', 'en', 'ja'];

const normalizeLocale = (value: string | null | undefined) => {
  if (!value) return null;
  const token = String(value).trim().toLowerCase();
  if (!token) return null;
  const primary = token.split(',')[0].split('-')[0].trim();
  return SUPPORTED_LOCALES.includes(primary) ? primary : null;
};

const getPreferredLocale = () => {
  if (typeof window === 'undefined') return 'vi';
  const saved = normalizeLocale(window.localStorage.getItem('lotte_language'));
  if (saved) return saved;
  const navigatorLang = normalizeLocale(window.navigator?.language);
  return navigatorLang || 'vi';
};

// Only load mock data if explicitly enabled via env flag
const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK === 'true';
let mockData: any = null;
if (USE_MOCK_FALLBACK) {
  try {
    // Use a variable to prevent Vite/Rollup from statically resolving the path
    const mockPath = '../../mockData.json';
    mockData = (await import(/* @vite-ignore */ mockPath)).default;
  } catch {
    console.warn('[httpClient] VITE_USE_MOCK_FALLBACK=true but mockData.json not found. Mock fallback disabled.');
  }
}

// @ts-expect-error Kept for mock fallback mode (VITE_USE_MOCK_FALLBACK)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getMockDataForUrl = (url: string = '', method: string = 'get'): any => {
  const urlLower = url.toLowerCase();
  
  if (method === 'post' || method === 'put' || method === 'delete' || method === 'patch') {
    if (urlLower.includes('/login') || urlLower.includes('/register') || urlLower.includes('/verify')) {
      return { token: 'mock_token_12345', user: mockData.users?.[0] || { id: 1, role_id: 1, username: 'mockuser' } };
    }
    if (urlLower.includes('/cart')) return { success: true, message: 'Đã cập nhật giỏ hàng' };
    if (urlLower.includes('/orders')) return mockData.orders?.[0] || { id: 'ORD-MOCK', status: 'PENDING', total_amount: 100000 };
    if (urlLower.includes('/addresses')) return mockData.addresses?.[0] || {};
    return { success: true, message: 'Thành công (Mock Mode)', data: {} };
  }

  const parts = urlLower.split('?')[0].split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1];
  const isDetail = lastPart && !isNaN(Number(lastPart)) && parts.length > 1 && !urlLower.includes('list');

  if (urlLower.includes('/admin/settings')) return mockData.admin_settings || mockData.settings || {};
  if (urlLower.includes('/flash-deals')) return mockData.flash_deals || mockData.hot_deals || mockData.products?.slice(0, 5) || [];
  if (urlLower.includes('/hot-deals')) return mockData.hot_deals || mockData.flash_deals || mockData.products?.slice(0, 5) || [];
  if (urlLower.includes('/featured-collections')) return mockData.featured_collections || mockData.categories || [];
  if (urlLower.includes('/banners/home')) return mockData.home_banners || mockData.banners || [];
  if (urlLower.includes('/banners/promo')) return mockData.promo_banners || mockData.banners || [];
  if (urlLower.includes('/banners')) return mockData.banners || [];
  if (urlLower.includes('/branch-products')) {
    const list = mockData.branch_products || mockData.products || [];
    return isDetail ? (list.find((p:any) => String(p.id) === lastPart) || list[0]) : list;
  }
  if (urlLower.includes('/products')) {
    const list = mockData.products || [];
    return isDetail ? (list.find((p:any) => String(p.id) === lastPart) || list[0]) : list;
  }
  if (urlLower.includes('/categories')) return mockData.categories || [];
  
  if (urlLower.includes('/events')) {
     const list = mockData.event_posts || mockData.events || [];
     if (isDetail || urlLower.includes('/detail')) return list.find((e: any) => String(e.id) === lastPart || String(e.slug) === lastPart) || list[0] || null;
     return list;
  }
  if (urlLower.includes('/orders')) {
    const list = mockData.orders || [];
    return isDetail ? (list.find((o:any) => String(o.id) === lastPart) || list[0]) : list;
  }
  if (urlLower.includes('/cart/all-branches')) return { success: true, data: {} };
  if (urlLower.includes('/cart')) {
    if (method === 'get') return { success: true, data: { items: [] } };
    return mockData.carts || [];
  }
  if (urlLower.includes('/coupons')) {
    const list = mockData.coupons || [];
    return isDetail ? (list.find((c:any) => String(c.code) === lastPart) || list[0]) : list;
  }
  if (urlLower.includes('/addresses')) return mockData.addresses || [];
  if (urlLower.includes('/payments/methods')) return mockData.payment_methods || [];
  if (urlLower.includes('/payments/transactions')) return mockData.payment_transactions || [];
  if (urlLower.includes('/payments/providers')) return mockData.payment_providers || [];
  if (urlLower.includes('/reviews')) return mockData.reviews || [];
  if (urlLower.includes('/support')) return mockData.support_tickets || [];
  if (urlLower.includes('/notifications')) return mockData.notifications || [];
  if (urlLower.includes('/loyalty')) return mockData.loyalty_transactions || mockData.loyalty_rules || [];
  if (urlLower.includes('/promotions')) return mockData.promotions || [];
  if (urlLower.includes('/users')) {
    const list = mockData.users || [];
    return isDetail ? (list.find((u:any) => String(u.id) === lastPart) || list[0]) : list;
  }
  if (urlLower.includes('/roles')) return mockData.roles || [];
  if (urlLower.includes('/membership')) return mockData.membership_tiers || [];
  if (urlLower.includes('/audit')) return mockData.audit_logs || [];
  if (urlLower.includes('/branches')) {
    const list = mockData.branches || [];
    return isDetail ? (list.find((b:any) => String(b.id) === lastPart) || list[0]) : list;
  }
  if (urlLower.includes('/search')) return mockData.search_history || [];
  if (urlLower.includes('/purchase')) return mockData.purchase_history || [];
  if (urlLower.includes('/auth/profile-summary')) return mockData.users?.[0] || {};
  if (urlLower.includes('/auth/verify')) return mockData.users?.[0] || {};

  return [];
};
const envApiHost = (import.meta.env.VITE_API_HOST || '').trim();
let apiBaseURL = '/api';

if (envApiHost && envApiHost !== 'http://localhost:3001' && envApiHost !== 'http://127.0.0.1:3001') {
  const normalizedHost = envApiHost.replace(/\/+$/, '');
  apiBaseURL = normalizedHost.endsWith('/api') ? normalizedHost : `${normalizedHost}/api`;
}



const httpClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh calls simultaneously
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};



const safeRedirectToLogin = (isAdminFlow: boolean = false) => {
  const path = window.location.pathname;
  if (path === '/login' || path === '/register' || path === '/admin/login') return;

  const currentPath = window.location.pathname + window.location.search;
  const isCurrentlyAdminRoute = currentPath.startsWith('/admin');

  if (isAdminFlow || isCurrentlyAdminRoute) {
    if (!currentPath.startsWith('/admin/login')) {
      window.location.href = `/admin/login`;
    }
  } else {
    const shouldAddRedirect =
      currentPath !== '/' &&
      !currentPath.startsWith('/login') &&
      !currentPath.startsWith('/register') &&
      !currentPath.includes('redirect=');

    if (shouldAddRedirect) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    } else {
      window.location.href = '/login';
    }
  }
};

// Request Interceptor: add auth token
httpClient.interceptors.request.use(
  (config: any) => {
    const requestUrl = String(config.url || '');
    const isApiAdminPath = requestUrl.startsWith('/admin');

    // Check if the user is currently browsing admin pages
    const isOnAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    const adminToken = localStorage.getItem('admin_token');
    const userToken = localStorage.getItem('lottemart_token');

    // Token selection logic:
    // 1. API paths starting with /admin → always use admin_token
    // 2. User is on admin page and has admin token → prefer admin_token
    //    (admin dashboard calls /orders, /users etc. which need admin auth)
    // 3. Otherwise → use user token
    let token: string | null = null;
    if (isApiAdminPath) {
      token = adminToken;
    } else if (isOnAdminPage && adminToken) {
      // Admin is browsing dashboard — use admin token for data endpoints
      // (like /orders, /users, /support/tickets) that require auth
      token = adminToken;
    } else {
      token = userToken;
    }
      
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const locale = getPreferredLocale();
    if (config.headers) {
      config.headers['Accept-Language'] = locale;
    }
    if (String(config.method || 'get').toLowerCase() === 'get') {
      config.params = { ...(config.params || {}), lang: locale };
    }
    
    // Debug: log actual URL for inventory-batches to catch double /api
    if (String(config.url).includes('inventory-batches')) {
      const fullUrl = `${config.baseURL || ''}${config.url}`;
      console.log('[httpClient] inventory-batches request:', {
        baseURL: config.baseURL,
        url: config.url,
        fullUrl,
        hasDoubleApi: fullUrl.includes('/api/api/')
      });
    }
    
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response Interceptor: handle 401 & refresh token + fallback
httpClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error?.config;
    
    // OFFLINE / FALLBACK MOCK MODE - Removed to prevent fake success returns

    // Handle 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = String(originalRequest?.url || '');
      
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.includes('/auth/google') ||
        requestUrl.includes('/auth/facebook');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      const isApiAdminPath = requestUrl.startsWith('/admin');
      const isOnAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

      if (isApiAdminPath) {
        // Don't clear tokens / redirect for admin verify requests — let the
        // adminVerifySession thunk handle the rejection gracefully so the guard
        // can decide what to do.
        const isAdminVerify = requestUrl.includes('/admin/auth/verify');
        if (!isAdminVerify) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          safeRedirectToLogin(true);
        }
        return Promise.reject(new Error(error?.response?.data?.message || 'Unauthorized admin'));
      }

      // If on admin page but the API path is NOT /admin/* (e.g. /orders, /users),
      // the 401 means the admin token is invalid. Redirect to admin login,
      // do NOT try user token refresh.
      if (isOnAdminPage) {
        return Promise.reject(new Error(error?.response?.data?.message || 'Admin token invalid'));
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return httpClient.request(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(new Error(err?.response?.data?.message || err?.message || 'Request failed during refresh'));
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('lottemart_refresh_token') || localStorage.getItem('refreshToken');
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        safeRedirectToLogin(false);
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${httpClient.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        }, { timeout: 15000 });

        const refreshPayload = response.data || {};
        const newAccessToken = refreshPayload.token || refreshPayload.accessToken;
        const newRefreshToken = refreshPayload.refreshToken;

        if (!newAccessToken) {
          throw new Error('Invalid refresh response: missing access token');
        }

        localStorage.setItem('lottemart_token', newAccessToken);
        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('lottemart_refresh_token', newRefreshToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;

        return httpClient.request(originalRequest);
      } catch (err: any) {
        processQueue(err as AxiosError, null);
        localStorage.removeItem('lottemart_token');
        localStorage.removeItem('lottemart_refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        safeRedirectToLogin(false);
        return Promise.reject(new Error(err?.response?.data?.message || err?.message || 'Token refresh failed'));
      } finally {
        isRefreshing = false;
      }
    }

    const apiError = new Error(error?.response?.data?.message || error?.message || 'API Error');
    if (error?.response) {
      (apiError as any).response = error.response;
      (apiError as any).status = error.response.status;
      (apiError as any).code = error.response.data?.code;
    }
    return Promise.reject(apiError);
  }
);

export default httpClient;
