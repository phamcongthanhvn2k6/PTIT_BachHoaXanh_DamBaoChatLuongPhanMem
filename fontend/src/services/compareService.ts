import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';
import i18n from '../i18n';
import type { CompareAISummary, CompareProduct } from '../types/product';

const stripHtml = (value: any) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toNumOrNull = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const compact = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }),
  ) as Partial<T>;
};

const normalizeForAI = (product: CompareProduct) => {
  return compact({
    product_id: String(product.product_id || product.id || '').trim(),
    name: stripHtml(product.name),
    image: stripHtml(product.image || product.images?.[0]),
    brand: stripHtml(product.brand),
    price: toNumOrNull(product.price),
    original_price: toNumOrNull(product.original_price),
    discount_percent: toNumOrNull(product.discount_percent),
    rating: toNumOrNull(product.average_rating ?? product.rating),
    review_count: toNumOrNull(product.review_count),
    category_name: stripHtml(product.category_name),
    supplier_name: stripHtml((product as any).supplier_name || ''),
    expiry_date: product.expiry_date ? String(product.expiry_date) : undefined,
    stock: toNumOrNull(product.stock),
    description: stripHtml(product.description),
    badges: Array.isArray(product.badges) ? product.badges.map((badge) => stripHtml(badge?.text)).filter(Boolean) : [],
    promotions: Array.isArray(product.promotions)
      ? product.promotions.map((promo) => stripHtml(promo?.badge_text || promo?.title)).filter(Boolean)
      : [],
    shipping_info: stripHtml(product.shipping_fee_note),
  });
};

const normalizeSummary = (raw: any): CompareAISummary => {
  const fallback: CompareAISummary = {
    title: 'Tóm tắt so sánh sản phẩm',
    pros: [],
    cons: [],
    recommendation: 'Hiện chưa có đủ dữ liệu để đưa ra gợi ý.',
    notes: ['AI chỉ tổng hợp từ dữ liệu có trong bảng so sánh.'],
  };

  if (!raw || typeof raw !== 'object') return fallback;

  const safeList = (value: any) => Array.isArray(value)
    ? value.map((x) => stripHtml(x)).filter(Boolean).slice(0, 5)
    : [];

  return {
    title: stripHtml(raw.title) || fallback.title,
    pros: safeList(raw.pros),
    cons: safeList(raw.cons),
    recommendation: stripHtml(raw.recommendation) || fallback.recommendation,
    notes: safeList(raw.notes).length ? safeList(raw.notes) : fallback.notes,
  };
};

const normalizeLocale = (locale?: string): 'vi' | 'en' | 'ja' => {
  const value = String(locale || '').trim().toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('ja')) return 'ja';
  return 'vi';
};

const resolveWebsiteLocale = (explicitLocale?: string): 'vi' | 'en' | 'ja' => {
  if (explicitLocale) return normalizeLocale(explicitLocale);

  const fromI18n = normalizeLocale(i18n.resolvedLanguage || i18n.language || '');
  if (fromI18n) return fromI18n;

  try {
    const fromStorage = normalizeLocale(localStorage.getItem('lotte_language') || '');
    if (fromStorage) return fromStorage;
  } catch {
    // ignore storage errors
  }

  return 'vi';
};

const localeText = (locale: 'vi' | 'en' | 'ja', vi: string, en: string, ja?: string) => {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja || en;
  return vi;
};

export const compareService = {
  async getAISummaryStatus() {
    try {
      const res = await httpClient.get(endpoints.compare.summaryStatus);
      const payload = res?.data || {};
      return {
        aiReady: typeof payload.aiReady === 'boolean' ? payload.aiReady : null,
        provider: payload.provider || 'openrouter',
        reason: payload.reason || null,
      };
    } catch {
      return { aiReady: null, provider: 'openrouter', reason: null };
    }
  },

  async summarizeWithAI(products: CompareProduct[], locale?: string) {
    const resolvedLocale = resolveWebsiteLocale(locale);
    console.info(`[compare-summary][frontend] locale resolved: ${resolvedLocale}`);

    const safeProducts = Array.isArray(products)
      ? products.map(normalizeForAI).filter((p) => p.product_id).slice(0, 4)
      : [];

    if (safeProducts.length < 2) {
      throw new Error(localeText(resolvedLocale, 'Cần ít nhất 2 sản phẩm để tóm tắt', 'At least 2 products are required for AI summary', '少なくとも2つの製品が必要です'));
    }

    let res;
    try {
      res = await httpClient.post(
        endpoints.compare.summary,
        {
          products: safeProducts,
          locale: resolvedLocale,
        },
        {
          // AI summary can take longer than regular API requests.
          timeout: 120000,
        },
      );
    } catch (err: any) {
      if (err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout')) {
        throw new Error(localeText(
          resolvedLocale,
          'Yêu cầu tóm tắt AI đang mất nhiều thời gian hơn dự kiến. Vui lòng thử lại sau ít phút.',
          'AI summary is taking longer than expected. Please try again in a few minutes.',
          'AI要約に時間がかかっています。数分後に再試行してください。',
        ));
      }
      throw err;
    }

    if (!res?.data?.success) {
      throw new Error(res?.data?.message || 'Không thể tóm tắt bằng AI');
    }

    return normalizeSummary(res.data.summary);
  },
};
