import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';
import { normalizeBranchProducts, normalizeCategories, normalizeProduct, normalizeProducts } from '../utils/productNormalization';

// Helper to normalize array responses and prevent .map/.filter crashes
const normalizeArray = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && typeof res.data === 'object' && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && typeof res.data === 'object' && Array.isArray(res.data.items)) return res.data.items;
  if (res.data && typeof res.data === 'object' && Array.isArray(res.data.result)) return res.data.result;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.result)) return res.result;
  return [];
};

// Helper to extract a single object from a response
const normalizeObject = (res: any): any => {
  if (!res) return null;
  if (res.data && typeof res.data === 'object' && res.data.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
    return res.data.data;
  }
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (typeof res === 'object' && (res.name || res._id || res.id)) return res;
  return res;
};

export const productService = {
  // PRODUCTS
  getProducts: async (params?: any) => {
    try {
      const res = await httpClient.get(endpoints.products.list, { params });
      return {
        data: normalizeProducts(normalizeArray(res.data)),
        pagination: res.data?.pagination || null
      };
    } catch (err) { return { data: [], pagination: null }; }
  },

  getCompareProducts: async (ids: string[], branchId?: string) => {
    try {
      const safeIds = Array.from(new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))).slice(0, 4);
      if (safeIds.length === 0) return [];

      const res = await httpClient.get(endpoints.products.compare, {
        params: {
          ids: safeIds.join(','),
          branch_id: branchId || undefined,
        },
      });
      return normalizeArray(res.data);
    } catch {
      return [];
    }
  },

  /**
   * Fetch a single product by ID.
   * Returns the product object directly (not wrapped), or throws on 404.
   */
  getProductById: async (id: number | string) => {
    const res = await httpClient.get(endpoints.products.detail(id));
    const product = normalizeProduct(normalizeObject(res.data));
    if (!product) throw new Error('Product not found');
    return product;
  },

  getProductSummary: async (id: number | string, locale = 'vi') => {
    try {
      const res = await httpClient.get(endpoints.products.summary(id), { params: { locale } });
      return res.data;
    } catch {
      return {
        success: true,
        aiReady: false,
        data: {
          overview: locale === 'en' ? 'Failed to load summary.' : (locale === 'ja' ? '概要の読み込みに失敗しました。' : 'Không thể tải tóm tắt.'),
          strengths: [],
          cautions: [],
          recommendation: '',
          notes: []
        }
      };
    }
  },

  getRelatedProducts: async (id: number | string) => {
    try {
      const res = await httpClient.get(endpoints.products.related(id)).catch(() => ({ data: { data: [] } }));
      return normalizeArray(res.data);
    } catch { return []; }
  },

  getProductQuestions: async (id: number | string) => {
    try {
      const res = await httpClient.get(endpoints.products.questions(id)).catch(() => ({ data: { data: [] } }));
      return normalizeArray(res.data);
    } catch { return []; }
  },

  askProductQuestion: async (id: number | string, content: string) => {
    const res = await httpClient.post(endpoints.products.askQuestion(id), { content });
    return normalizeObject(res.data);
  },

  getProductRecommendations: async (id: number | string) => {
    try {
      const res = await httpClient.get(endpoints.products.recommendations(id));
      const raw = res?.data?.data || res?.data || {};
      return {
        related: Array.isArray(raw.related) ? raw.related : [],
        bought_together: Array.isArray(raw.bought_together) ? raw.bought_together : [],
      };
    } catch {
      return { related: [], bought_together: [] };
    }
  },

  getProductPolicies: async () => {
    try {
      const res = await httpClient.get(endpoints.products.policies).catch(() => ({ data: { data: [] } }));
      return normalizeArray(res.data);
    } catch { return []; }
  },

  searchProducts: async (query: string, params?: any) => {
    try {
      const normalizedParams: any = {
        q: query,
        ...params,
      };
      if (params?.branch_id && !normalizedParams.branchId) normalizedParams.branchId = params.branch_id;
      if (params?.category_id && !normalizedParams.category) normalizedParams.category = params.category_id;
      const res = await httpClient.get(endpoints.products.search, { params: normalizedParams });
      return {
        data: normalizeProducts(normalizeArray(res.data)),
        pagination: res.data?.pagination || res.data?.data?.pagination || null
      };
    } catch { return { data: [], pagination: null }; }
  },

  createProduct: async (payload: any) => {
    const res = await httpClient.post(endpoints.products.create, payload);
    return normalizeObject(res.data);
  },

  uploadProductImages: async (files: File[]) => {
    if (!Array.isArray(files) || files.length === 0) return [];
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    const res = await httpClient.post('/uploads/product-images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const payload = res?.data ?? res;
    const urls = payload?.data?.urls || payload?.urls || [];
    return Array.isArray(urls) ? urls : [];
  },

  updateProduct: async (id: number | string, payload: any) => {
    const res = await httpClient.put(endpoints.products.update(id), payload);
    return normalizeObject(res.data);
  },

  deleteProduct: async (id: number | string) => {
    const res = await httpClient.delete(endpoints.products.delete(id));
    return res.data;
  },

  toggleProductActive: async (id: number | string, is_active: boolean) => {
    try {
      const res = await httpClient.patch(`/products/${id}/active`, { is_active });
      return normalizeObject(res.data);
    } catch (err: any) { throw err?.response?.data || err; }
  },

  // BRANCH PRODUCTS
  getBranchProducts: async (params?: any) => {
    try {
      const res = await httpClient.get(endpoints.branchProducts.list, { params });
      return normalizeBranchProducts(normalizeArray(res.data));
    } catch { return []; }
  },

  createBranchProduct: async (payload: any) => {
    const res = await httpClient.post(endpoints.branchProducts.create, payload);
    return normalizeObject(res.data);
  },

  updateBranchProduct: async (id: number | string, payload: any) => {
    const res = await httpClient.put(endpoints.branchProducts.update(id), payload);
    return normalizeObject(res.data);
  },

  deleteBranchProduct: async (id: number | string) => {
    const res = await httpClient.delete(endpoints.branchProducts.delete(id));
    return res.data;
  },

  adjustBranchStock: async (id: number | string, quantity: number, reason?: string) => {
    const res = await httpClient.post(endpoints.branchProducts.adjustStock(id), { quantity, reason });
    return normalizeObject(res.data);
  },

  // CATEGORIES
  getCategories: async (params?: any) => {
    try {
      const res = await httpClient.get(endpoints.categories.list, { params });
      return normalizeCategories(normalizeArray(res.data));
    } catch { return []; }
  },

  createCategory: async (payload: any) => {
    const res = await httpClient.post(endpoints.categories.create, payload);
    return normalizeObject(res.data);
  },

  updateCategory: async (id: number | string, payload: any) => {
    const res = await httpClient.put(endpoints.categories.update(id), payload);
    return normalizeObject(res.data);
  },

  deleteCategory: async (id: number | string) => {
    const res = await httpClient.delete(endpoints.categories.delete(id));
    return res.data;
  },
  
  getProductPromotions: async (productId: string, branchId?: string) => {
    try {
      const url = branchId
        ? `${endpoints.products.promotions(productId)}?branchId=${encodeURIComponent(branchId)}`
        : endpoints.products.promotions(productId);
      const response = await httpClient.get(url);
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  getProductCoupons: async (productId: string, branchId?: string) => {
    try {
      const url = branchId
        ? `${endpoints.products.coupons(productId)}?branchId=${encodeURIComponent(branchId)}`
        : endpoints.products.coupons(productId);
      const response = await httpClient.get(url);
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  getPromotionBadges: async (productId: string, branchId?: string) => {
    try {
      const promotions = await productService.getProductPromotions(productId, branchId);
      return (Array.isArray(promotions) ? promotions : []).map((promo: any) => ({
        id: promo._id || promo.id,
        text: promo.badge_text || promo.title || 'PROMO',
        type: promo.type,
      }));
    } catch {
      return [];
    }
  },
};
