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
    _id: item._id,
    product_id: item.product_id || item.product?._id || item.branchProduct?.product?._id || item.branchProduct?.product?.id,
    branch_product_id: item.branch_product_id || item.branchProduct?._id || item.branchProduct?.id || item._id,
    category_id: item.category_id || item.product?.category_id || item.branchProduct?.product?.category_id || null,
    name: item.name || item.product_name || item.product?.name || item.branchProduct?.product?.name || 'Sản phẩm',
    quantity: Number(item.quantity || 1),
    price: Number(item.price ?? item.unit_price ?? 0),
  }));
};

export const promotionService = {
  getPromotions: async (params?: Record<string, any>) => {
    try {
      const res = await httpClient.get(endpoints.promotions.list, { params });
      const rawData = res?.data || res;
      return {
        success: true,
        data: asArray(rawData?.data !== undefined ? rawData.data : rawData),
        pagination: rawData?.pagination,
      };
    } catch (err: any) {
      console.error('getPromotions error:', err);
      return { success: false, data: [] };
    }
  },

  getPromotionById: async (id: string) => {
    try {
      const res = await httpClient.get(endpoints.promotions.detail(id));
      return { success: true, data: asObject(res?.data || res) };
    } catch (err: any) {
      console.error('getPromotionById error:', err);
      return { success: false, data: null };
    }
  },

  getPromotionDetail: async (id: string) => {
    return promotionService.getPromotionById(id);
  },

  getApplicablePromotions: async (branchId: string, cartItems: any[]) => {
    try {
      const cart = encodeURIComponent(JSON.stringify(mapCartItems(cartItems)));
      const res = await httpClient.get(`${endpoints.promotions.applicable}?branchId=${encodeURIComponent(branchId)}&cart=${cart}`);
      return { success: true, data: asArray(res?.data || res) };
    } catch (err: any) {
      console.error('getApplicablePromotions error:', err);
      return { success: false, data: [] };
    }
  },

  calculatePromotionBreakdown: async (cartItems: any[], branchId: string, couponCode?: string, shippingFeeBase?: number, productVoucherId?: string, shippingVoucherId?: string) => {
    const mappedItems = mapCartItems(cartItems);

    try {
      const res = await httpClient.post(endpoints.promotions.calculate, {
        cartItems: mappedItems,
        branchId,
        couponCode,
        shippingFeeBase,
        product_voucher_id: productVoucherId,
        shipping_voucher_id: shippingVoucherId,
      });
      return { success: true, data: asObject(res?.data || res) };
    } catch {
      return {
        success: false,
        data: {
          original_total: 0,
          subtotal: 0,
          discount_amount: 0,
          item_discounts: 0,
          promotion_discount: 0,
          coupon_discount: 0,
          shipping_fee: 0,
          total: 0,
          final_total: 0,
          items: [],
          gift_items: [],
          points_earned: 0,
          promotions_applied: [],
          coupon_applied: null,
          coupon_error: 'Không thể tính khuyến mãi lúc này',
        },
      };
    }
  },

  calculateCheckoutTotals: async (cartItems: any[], branchId: string, couponCode?: string, shippingFeeBase?: number, productVoucherId?: string, shippingVoucherId?: string) => {
    return promotionService.calculatePromotionBreakdown(cartItems, branchId, couponCode, shippingFeeBase, productVoucherId, shippingVoucherId);
  },

  activatePromotion: async (id: string) => {
    const res = await httpClient.post(endpoints.promotions.activate(id));
    return res?.data || res;
  },

  pausePromotion: async (id: string) => {
    const res = await httpClient.post(endpoints.promotions.pause(id));
    return res?.data || res;
  },

  claimPromotion: async (id: string, branchId?: string) => {
    const res = await httpClient.post(endpoints.promotions.claim(id), { branch_id: branchId || null });
    return res?.data || res;
  },

  /** Get promotions the current user has claimed (their wallet) */
  getMyPromotionWallet: async () => {
    try {
      const res = await httpClient.get(endpoints.promotions.myWallet);
      return { success: true, data: asArray(res?.data || res) };
    } catch (err: any) {
      console.error('getMyPromotionWallet error:', err);
      return { success: false, data: [] };
    }
  },

  getPromotionClaims: async (params?: Record<string, string>) => {
    const res = await httpClient.get(endpoints.promotions.claims, { params });
    return asArray(res?.data || res);
  },

  getPromotionUsage: async (id: string) => {
    const res = await httpClient.get(endpoints.promotions.usage(id));
    return asArray(res?.data || res);
  },

  uploadCampaignImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await httpClient.post(endpoints.uploads.promotionImage, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return asObject(res?.data || res);
  },

  createPromotion: async (data: any) => httpClient.post(endpoints.promotions.create, data).then(res => res.data || res),
  updatePromotion: async (id: string, data: any) => httpClient.put(endpoints.promotions.update(id), data).then(res => res.data || res),
  deletePromotion: async (id: string) => httpClient.delete(endpoints.promotions.delete(id)).then(res => res.data || res),
};
