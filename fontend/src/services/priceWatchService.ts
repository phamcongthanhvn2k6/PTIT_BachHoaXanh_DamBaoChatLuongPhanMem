import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

export interface PriceWatchRecord {
  _id: string;
  user_id: string;
  branch_product_id: string;
  target_price: number;
  initial_price: number;
  current_price: number;
  notification_preference: 'in_app' | 'email' | 'both';
  status: 'active' | 'triggered' | 'cancelled';
  last_notified_at: string | null;
  created_at: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    images: string[];
    thumbnail: string;
    brand: string;
    category_name: string;
    is_active: boolean;
  };
  branchProduct: {
    _id: string;
    price: number;
    original_price: number;
    stock: number;
    is_available: boolean;
  };
}

export const priceWatchService = {
  create: async (branchProductId: string, targetPrice: number, notificationPreference = 'both'): Promise<PriceWatchRecord | null> => {
    try {
      const res = await httpClient.post(endpoints.priceWatch.create, {
        branch_product_id: branchProductId,
        target_price: targetPrice,
        notification_preference: notificationPreference
      });
      return res.data?.data || null;
    } catch (err) {
      console.error('Failed to create price watch:', err);
      throw err;
    }
  },

  list: async (): Promise<PriceWatchRecord[]> => {
    try {
      const res = await httpClient.get(endpoints.priceWatch.list);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch (err) {
      console.error('Failed to list price watches:', err);
      return [];
    }
  },

  update: async (id: string, payload: { target_price?: number; notification_preference?: string; status?: string }): Promise<PriceWatchRecord | null> => {
    try {
      const res = await httpClient.patch(endpoints.priceWatch.update(id), payload);
      return res.data?.data || null;
    } catch (err) {
      console.error('Failed to update price watch:', err);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await httpClient.delete(endpoints.priceWatch.delete(id));
      return true;
    } catch (err) {
      console.error('Failed to delete price watch:', err);
      return false;
    }
  }
};
