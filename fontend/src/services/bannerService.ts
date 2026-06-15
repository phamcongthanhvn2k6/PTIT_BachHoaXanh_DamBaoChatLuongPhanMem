import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};



export const bannerService = {
  getBanners: async (params?: Record<string, any>) => {
    try {
      const res = await httpClient.get(endpoints.banners.list, { params });
      const rawData = res?.data || res;
      return {
        success: true,
        data: asArray(rawData?.data !== undefined ? rawData.data : rawData),
        pagination: rawData?.pagination,
      };
    } catch (err: any) {
      console.error('getBanners error:', err);
      return { success: false, data: [] };
    }
  },

  getHomeBanners: async () => {
    try {
      const res = await httpClient.get(endpoints.banners.home);
      return { success: true, data: asArray(res?.data || res) };
    } catch (err: any) {
      console.error('getHomeBanners error:', err);
      return { success: false, data: [] };
    }
  },

  getPromoBanners: async () => {
    try {
      const res = await httpClient.get(endpoints.banners.promo);
      return { success: true, data: asArray(res?.data || res) };
    } catch (err: any) {
      console.error('getPromoBanners error:', err);
      return { success: false, data: [] };
    }
  },

  createBanner: async (data: any) => {
    return httpClient.post(endpoints.banners.create, data).then(res => res.data || res);
  },

  updateBanner: async (id: string, data: any) => {
    return httpClient.put(endpoints.banners.update(id), data).then(res => res.data || res);
  },

  deleteBanner: async (id: string) => {
    return httpClient.delete(endpoints.banners.delete(id)).then(res => res.data || res);
  },
};
