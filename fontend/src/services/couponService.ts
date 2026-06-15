import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const asObject = (value: any): any => {
  if (!value) return null;
  if (value?.data && typeof value.data === 'object' && !Array.isArray(value.data)) return value.data;
  return value;
};

const mapCartItems = (cartItems: any[]) => {
  return (Array.isArray(cartItems) ? cartItems : []).map((item) => ({
    product_id: item.product_id || item.branchProduct?.product?._id || item.branchProduct?.product?.id,
    branch_product_id: item.branch_product_id || item.branchProduct?._id || item.branchProduct?.id || item._id,
    category_id: item.category_id || item.branchProduct?.product?.category_id || null,
    quantity: Number(item.quantity || 1),
    price: Number(item.price ?? item.unit_price ?? 0),
    name: item.name || item.product_name || item.branchProduct?.product?.name,
  }));
};

export const couponService = {
  getCoupons: async (params?: Record<string, any>) => {
    try {
      const res = await httpClient.get(endpoints.coupons.list, { params });
      const rawData = res?.data || res;
      return {
        success: true,
        data: asArray(rawData?.data !== undefined ? rawData.data : rawData),
        pagination: rawData?.pagination,
      };
    } catch (err: any) {
      console.error('getCoupons error:', err);
      return { success: false, data: [] };
    }
  },

  list: async () => couponService.getCoupons(),
  
  getCouponByCode: async (code: string) => {
    try {
      const res = await httpClient.get(endpoints.coupons.detail(code));
      return { success: true, data: asObject(res?.data || res) };
    } catch (err: any) {
      console.error('getCouponByCode error:', err);
      return { success: false, data: null };
    }
  },

  getDetail: async (code: string) => couponService.getCouponByCode(code),

  // ─────────────────────────────────────────────
  // CLAIM-BASED WALLET FLOW
  // ─────────────────────────────────────────────

  /** User claims a coupon into their wallet */
  claimCoupon: async (couponId: string) => {
    try {
      const res = await httpClient.post(endpoints.coupons.claim(couponId));
      const payload = res?.data || res;
      return { success: !!payload?.success, data: payload, message: payload?.message };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Không thể nhận voucher lúc này',
      };
    }
  },

  /** Get coupons the current user has claimed (their wallet) */
  getMyWallet: async () => {
    try {
      const res = await httpClient.get(endpoints.coupons.myWallet);
      return { success: true, data: asArray(res?.data || res) };
    } catch (err: any) {
      console.error('getMyWallet error:', err);
      return { success: false, data: [] };
    }
  },
  
  validateCoupon: async (couponCode: string, branchId: string, cartItems: any[]) => {
    try {
      const res = await httpClient.post(endpoints.coupons.validate, {
        code: couponCode,
        branchId,
        cartItems: mapCartItems(cartItems),
      });
      const payload = res?.data || res;
      return { success: !!payload?.success, data: asObject(payload), message: payload?.message };
    } catch {
      return { success: false, message: 'Lỗi kiểm tra mã giảm giá' };
    }
  },

  validate: async (couponCode: string, total: number) => {
    try {
      const res = await httpClient.post(endpoints.coupons.validate, { code: couponCode, total });
      const payload = res?.data || res;
      return { success: !!payload?.success, data: asObject(payload), message: payload?.message };
    } catch {
      return { success: false, message: 'Lỗi kiểm tra mã giảm giá' };
    }
  },

  applyCoupon: async (couponCode: string, branchId: string, cartItems: any[]) => {
    try {
      const res = await httpClient.post(endpoints.coupons.apply, {
        code: couponCode,
        branchId,
        cartItems: mapCartItems(cartItems),
      });
      const payload = res?.data || res;
      return { success: !!payload?.success, data: asObject(payload), message: payload?.message };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Không thể áp dụng mã giảm giá' };
    }
  },

  removeCoupon: async () => {
    try {
      const res = await httpClient.post(endpoints.coupons.remove);
      const payload = res?.data || res;
      return { success: !!payload?.success, message: payload?.message || 'Đã bỏ mã giảm giá' };
    } catch {
      return { success: false, message: 'Không thể bỏ mã giảm giá' };
    }
  },
  
  listUsageByUser: async (userId: string | number) => {
    try {
      const res = await httpClient.get(`${endpoints.coupons.usage}${userId ? `?user_id=${userId}` : ''}`);
      return { success: true, data: asArray(res?.data || res) };
    } catch (err: any) {
      console.error('listUsageByUser error:', err);
      return { success: false, data: [] };
    }
  },

  // Admin CRUD
  createCoupon: async (data: any) => {
    return httpClient.post(endpoints.coupons.create, data).then(res => res.data || res);
  },
  
  updateCoupon: async (id: string, data: any) => {
    return httpClient.put(endpoints.coupons.update(id), data).then(res => res.data || res);
  },
  
  deleteCoupon: async (id: string) => {
    return httpClient.delete(endpoints.coupons.delete(id)).then(res => res.data || res);
  },
};
