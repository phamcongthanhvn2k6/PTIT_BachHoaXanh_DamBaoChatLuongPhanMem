import i18n from '../i18n';
import { resolveImageUrl, fallbackProductImage } from './imageUrl';

const toId = (value: any): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value !== null) {
    if ((value as any).$oid) return String((value as any).$oid);
    if ((value as any).toString) return String((value as any).toString());
  }
  return String(value);
};

const toNumber = (value: any, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toBool = (value: any, fallback = false): boolean => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return Boolean(value);
};

const toImageArray = (raw: any): string[] => {
  if (!raw) return [];
  const list: string[] = [];
  if (Array.isArray(raw.images)) {
    list.push(...raw.images);
  }
  if (Array.isArray(raw.gallery)) {
    list.push(...raw.gallery);
  }
  if (typeof raw.image === 'string' && raw.image.trim()) {
    list.push(raw.image.trim());
  }
  if (typeof raw.thumbnail === 'string' && raw.thumbnail.trim()) {
    list.push(raw.thumbnail.trim());
  }
  const resolved = list.map((img: any) => resolveImageUrl(String(img))).filter(Boolean);
  return Array.from(new Set(resolved));
};

export const normalizeProduct = (raw: any): any => {
  const id = toId(raw?.id || raw?._id);
  const categoryId = raw?.category_id !== undefined && raw?.category_id !== null
    ? toId(raw.category_id)
    : '';
  const supplierId = raw?.supplier_id !== undefined && raw?.supplier_id !== null
    ? toId(raw.supplier_id)
    : '';
  const categoryShop = raw?.category?.name || raw?.categoryShop || raw?.category_name || i18n.t('common.other');
  const image = toImageArray(raw)[0] || fallbackProductImage;
  const price = toNumber(raw?.price, 0);
  const originalPrice = toNumber(raw?.original_price, price);
  const stock = toNumber(raw?.stock, 0);
  const discountPercent = toNumber(
    raw?.discount_percent,
    originalPrice > 0 && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0
  );

  return {
    ...raw,
    id,
    _id: raw?._id || id || undefined,
    product_id: raw?.product_id ? toId(raw.product_id) : id,
    category_id: categoryId,
    supplier_id: supplierId,
    images: toImageArray(raw),
    image,
    categoryShop,
    price,
    original_price: originalPrice,
    discount_percent: discountPercent,
    stock,
    isOutOfStock: stock <= 0,
    sold_count: toNumber(raw?.sold_count, 0),
    review_count: toNumber(raw?.review_count ?? raw?.total_reviews, 0),
    rating: toNumber(raw?.rating ?? raw?.average_rating, 0),
    average_rating: toNumber(raw?.average_rating ?? raw?.rating, 0),
    is_active: toBool(raw?.is_active, true),
    is_new: toBool(raw?.is_new, false),
    is_featured: toBool(raw?.is_featured, false),
    is_best_seller: toBool(raw?.is_best_seller, false),
  };
};

export const normalizeCategory = (raw: any): any => {
  const id = toId(raw?.id || raw?._id);
  const parentId = raw?.parent_id === undefined || raw?.parent_id === null || raw?.parent_id === ''
    ? null
    : toId(raw?.parent_id);

  return {
    ...raw,
    id,
    _id: raw?._id || id || undefined,
    parent_id: parentId,
    sort_order: toNumber(raw?.sort_order, 0),
    product_count: toNumber(raw?.product_count, 0),
    is_active: toBool(raw?.is_active, true),
  };
};

export const normalizeBranchProduct = (raw: any): any => {
  const id = toId(raw?.id || raw?._id);
  const productId = toId(raw?.product_id || raw?.product?.id || raw?.product?._id);
  const branchId = toId(raw?.branch_id);
  const normalizedProduct = raw?.product ? normalizeProduct(raw.product) : null;
  const supplierId = raw?.supplier_id !== undefined && raw?.supplier_id !== null && raw?.supplier_id !== ''
    ? toId(raw.supplier_id)
    : (normalizedProduct?.supplier_id || '');
  const categoryShop = raw?.categoryShop || raw?.category_name || normalizedProduct?.categoryShop || i18n.t('common.other');
  const image = normalizedProduct?.image || toImageArray(raw)[0] || fallbackProductImage;
  const stock = toNumber(raw?.stock, 0);
  const price = toNumber(raw?.price, 0);
  const originalPrice = toNumber(raw?.original_price, price);
  const discountPercent = toNumber(
    raw?.discount_percent,
    originalPrice > 0 && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0
  );

  return {
    ...raw,
    id,
    _id: raw?._id || id || undefined,
    product_id: productId,
    branch_id: branchId,
    category_id: raw?.category_id ? toId(raw.category_id) : (normalizedProduct?.category_id || ''),
    supplier_id: supplierId,
    categoryShop,
    is_active: toBool(raw?.is_active, toBool(raw?.is_available, true)),
    is_available: toBool(raw?.is_available, toBool(raw?.is_active, true)),
    image,
    stock,
    price,
    original_price: originalPrice,
    discount_percent: discountPercent,
    isOutOfStock: stock <= 0,
    sold_count: toNumber(raw?.sold_count, 0),
    product: normalizedProduct,
  };
};

export const normalizeProducts = (input: any): any[] => {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeProduct);
};

export const normalizeCategories = (input: any): any[] => {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeCategory);
};

export const normalizeBranchProducts = (input: any): any[] => {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeBranchProduct);
};

export const normalizeProductLike = (raw: any): any => {
  if (!raw || typeof raw !== 'object') return raw;
  if (raw.product_id || raw.branch_id || raw.is_available !== undefined) {
    return normalizeBranchProduct(raw);
  }
  return normalizeProduct(raw);
};
