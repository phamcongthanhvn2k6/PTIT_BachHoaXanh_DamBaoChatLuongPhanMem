import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';
import { normalizeFlashDeal, normalizeFlashDealArray } from '../utils/flashDeal';

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const asObject = (value: any): any => {
  if (value && typeof value === 'object' && value.data && typeof value.data === 'object') return value.data;
  return value;
};

const noCacheHeaders = {};

const emitFlashDealRefreshSignal = () => {
  try {
    localStorage.setItem('flash_deals_updated_at', String(Date.now()));
  } catch {
    // no-op
  }
};

const unwrap = (value: any): any => {
  const payload = value?.data ?? value;
  if (payload && typeof payload === 'object' && payload.success === false) {
    throw new Error(payload.message || 'Flash deal request failed');
  }
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
};

export const flashDealService = {
  getFlashDeals: async (
    params?: Record<string, any>,
    options?: { forceRefresh?: boolean; debug?: boolean },
  ) => {
    const requestParams = {
      ...(params || {}),
      ...(options?.forceRefresh ? { _ts: Date.now() } : {}),
      ...(options?.debug ? { debug: true } : {}),
    };

    const res = await httpClient.get(endpoints.flashDeals.list, {
      params: requestParams,
      headers: noCacheHeaders,
    });
    const deals = normalizeFlashDealArray(asArray(unwrap(res)));

    if (options?.debug) {
      console.info('[flashDealService][getFlashDeals]', {
        query: requestParams,
        count: deals.length,
        sample: deals.slice(0, 5).map((deal) => ({
          id: deal.id,
          is_active: deal.is_active,
          status: deal.status,
          start_date: deal.start_date,
          end_date: deal.end_date,
          remaining_quantity: deal.remaining_quantity,
        })),
      });
    }

    return { success: true, data: deals, pagination: res.data?.pagination };
  },

  getFlashDealById: async (id: string | number) => {
    const res = await httpClient.get(endpoints.flashDeals.detail(id), { headers: noCacheHeaders });
    const normalized = normalizeFlashDeal(asObject(unwrap(res)));
    return { success: true, data: normalized };
  },

  createFlashDeal: async (payload: any) => {
    const res = await httpClient.post(endpoints.flashDeals.create, payload);
    emitFlashDealRefreshSignal();
    return normalizeFlashDeal(asObject(unwrap(res)));
  },

  updateFlashDeal: async (id: string | number, payload: any) => {
    const res = await httpClient.put(endpoints.flashDeals.update(id), payload);
    emitFlashDealRefreshSignal();
    return normalizeFlashDeal(asObject(unwrap(res)));
  },

  deleteFlashDeal: async (id: string | number) => {
    const res = await httpClient.delete(endpoints.flashDeals.delete(id));
    emitFlashDealRefreshSignal();
    return asObject(unwrap(res));
  },

  toggleFlashDeal: async (id: string | number) => {
    try {
      const res = await httpClient.patch(endpoints.flashDeals.toggle(id));
      const normalized = normalizeFlashDeal(asObject(unwrap(res)));
      emitFlashDealRefreshSignal();
      console.info('[flashDealService][toggleFlashDeal]', {
        id,
        result: normalized
          ? {
              is_active: normalized.is_active,
              status: normalized.status,
              start_date: normalized.start_date,
              end_date: normalized.end_date,
              remaining_quantity: normalized.remaining_quantity,
            }
          : null,
      });
      return normalized;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || err?.message || 'Toggle flash deal failed');
    }
  },
};

export default flashDealService;
