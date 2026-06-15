import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export const popupAdService = {
  getPopupAds: async (params?: Record<string, any>) => {
    try {
      const res = await httpClient.get(endpoints.popupAds.list, { params });
      const rawData = res?.data || res;
      return {
        success: true,
        data: asArray(rawData?.data !== undefined ? rawData.data : rawData),
        pagination: rawData?.pagination,
      };
    } catch (err: any) {
      console.error('getPopupAds error:', err);
      return { success: false, data: [] };
    }
  },

  createPopupAd: async (data: any) => {
    return httpClient.post(endpoints.popupAds.create, data).then(res => res.data || res);
  },

  updatePopupAd: async (id: string, data: any) => {
    return httpClient.put(endpoints.popupAds.update(id), data).then(res => res.data || res);
  },

  deletePopupAd: async (id: string) => {
    return httpClient.delete(endpoints.popupAds.delete(id)).then(res => res.data || res);
  },
};
