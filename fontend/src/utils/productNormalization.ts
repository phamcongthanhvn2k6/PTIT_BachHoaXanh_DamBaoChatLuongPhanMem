import i18n from '../i18n';
import { resolveImageUrl, fallbackProductImage } from './imageUrl';

const isRealImage = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  if (lower.includes('unsplash.com')) return false;
  if (lower.includes('/assets/products/') || lower.includes('assets/products/')) return false;
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
  if (lower.startsWith('/uploads') || lower.startsWith('uploads/')) return true;
  return false;
};

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
  const unique = Array.from(new Set(resolved));
  
  // Filter out mock images if there is at least one real image uploaded
  const hasReal = unique.some(isRealImage);
  if (hasReal) {
    return unique.filter(isRealImage);
  }
  return unique;
};

const deriveCategoryShop = (raw: any, categoryLookup?: Record<string, string>): string => {
  const directName = String(raw.categoryShop || raw.category_name || raw.category?.name || '').trim();
  if (directName) return directName;

  const nestedName = String(raw.product?.categoryShop || raw.product?.category_name || raw.product?.category?.name || '').trim();
  if (nestedName) return nestedName;

  const categoryId = toId(raw.category_id || raw.product?.category_id);
  if (categoryId && categoryLookup?.[categoryId]) return categoryLookup[categoryId];

  return i18n.t('common.other');
};

const deriveBadges = (raw: any, discountPercent: number, isOutOfStock: boolean): string[] => {
  const badges: string[] = [];

  if (discountPercent > 0) badges.push('sale');
  if (isOutOfStock) badges.push('out_of_stock');
  if (raw.is_new || raw.product?.is_new) badges.push('new');
  if (raw.is_best_seller || raw.product?.is_best_seller) badges.push('best_seller');

  const semanticBadges = (Array.isArray(raw.badges) ? raw.badges : []).map((b: any) => {
    if (typeof b === 'string') return b;
    if (b?.type) return String(b.type);
    if (b?.text) return String(b.text);
    return '';
  }).filter(Boolean);

  return Array.from(new Set([...badges, ...semanticBadges]));
};

const resolveProductImage = (merged: any, product: any, branchProduct: any): string => {
  const checkUrl = (url: any): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || ['null', 'undefined', 'nan', '[object object]'].includes(trimmed.toLowerCase())) return '';
    return trimmed;
  };

  // Collect all unique candidate images
  const candidates: string[] = [];
  const addCandidate = (val: any) => {
    const checked = checkUrl(val);
    if (checked && !candidates.includes(checked)) {
      candidates.push(checked);
    }
  };

  addCandidate(merged.thumbnail || product?.thumbnail || branchProduct?.thumbnail);
  addCandidate(merged.primaryImage || product?.primaryImage || branchProduct?.primaryImage || merged.image || product?.image || merged.imageUrl || product?.imageUrl);

  const rawImages = Array.isArray(merged.images) ? merged.images : (Array.isArray(product?.images) ? product.images : []);
  const rawGallery = Array.isArray(merged.gallery) ? merged.gallery : (Array.isArray(product?.gallery) ? product.gallery : []);
  for (const img of [...rawImages, ...rawGallery]) {
    addCandidate(img);
  }

  // 1. Try to find the first real uploaded image
  const realImage = candidates.find(isRealImage);
  if (realImage) {
    return resolveImageUrl(realImage);
  }

  // 2. Fallback to mock image if no real image exists
  if (candidates.length > 0) {
    return resolveImageUrl(candidates[0]);
  }

  // 3. Fallback placeholder
  return fallbackProductImage;
};

export const normalizeProduct = (raw: any, categoryLookup?: Record<string, string>): any => {
  const merged = raw || {};
  const id = toId(merged.id || merged._id);
  const product = merged.product || null;
  const branchProduct = merged.branchProduct || (merged.product_id && merged.branch_id ? merged : null);

  const categoryId = merged.category_id !== undefined && merged.category_id !== null
    ? toId(merged.category_id)
    : (product?.category_id !== undefined && product?.category_id !== null ? toId(product.category_id) : '');

  const supplierId = merged.supplier_id !== undefined && merged.supplier_id !== null
    ? toId(merged.supplier_id)
    : (product?.supplier_id !== undefined && product?.supplier_id !== null ? toId(product.supplier_id) : '');

  const categoryShop = deriveCategoryShop(merged, categoryLookup);
  const image = resolveProductImage(merged, product, branchProduct);
  const rawImagesList = toImageArray(merged).length > 0 ? toImageArray(merged) : toImageArray(product);
  const images = [
    image,
    ...rawImagesList.filter(img => img !== image)
  ].filter(Boolean);

  const price = toNumber(
    merged.effective_price ??
    product?.effective_price ??
    branchProduct?.effective_price ??
    merged.price ??
    product?.price ??
    branchProduct?.price,
    0
  );

  const originalPrice = toNumber(
    merged.original_price ??
    product?.original_price ??
    branchProduct?.original_price,
    price
  );

  const discountPercent = merged.discount_percent !== undefined && merged.discount_percent !== null
    ? toNumber(merged.discount_percent)
    : (product?.discount_percent !== undefined && product?.discount_percent !== null
      ? toNumber(product.discount_percent)
      : (branchProduct?.discount_percent !== undefined && branchProduct?.discount_percent !== null
        ? toNumber(branchProduct.discount_percent)
        : (originalPrice > 0 && originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0)));

  const pricingSource = merged.pricing_source ??
    product?.pricing_source ??
    branchProduct?.pricing_source ??
    'BASE_PRICE';

  const activeHotDeal = merged.active_hot_deal ?? merged.hotDeal ?? merged.hot_deal ??
    product?.active_hot_deal ?? product?.hotDeal ?? product?.hot_deal ??
    branchProduct?.active_hot_deal ?? branchProduct?.hotDeal ?? branchProduct?.hot_deal ??
    null;

  const activePromotion = merged.active_promotion ??
    product?.active_promotion ??
    branchProduct?.active_promotion ??
    null;

  const stock = toNumber(merged.stock ?? product?.stock ?? branchProduct?.stock, 0);
  const isOutOfStock = stock <= 0;

  return {
    ...merged,
    id,
    _id: merged._id || id || undefined,
    product_id: merged.product_id ? toId(merged.product_id) : (product?.id ? toId(product.id) : id),
    category_id: categoryId,
    supplier_id: supplierId,
    images,
    image,
    categoryShop,
    price,
    original_price: originalPrice,
    discount_percent: discountPercent,
    effective_price: price,
    pricing_source: pricingSource,
    active_hot_deal: activeHotDeal,
    active_promotion: activePromotion,
    stock,
    isOutOfStock,
    sold_count: toNumber(merged.sold_count ?? product?.sold_count ?? branchProduct?.sold_count, 0),
    review_count: toNumber(merged.review_count ?? merged.total_reviews ?? product?.review_count ?? product?.total_reviews, 0),
    rating: toNumber(merged.rating ?? merged.average_rating ?? product?.rating ?? product?.average_rating, 0),
    average_rating: toNumber(merged.average_rating ?? merged.rating ?? product?.average_rating ?? product?.rating, 0),
    is_active: toBool(merged.is_active ?? product?.is_active ?? branchProduct?.is_active, true),
    is_new: toBool(merged.is_new ?? product?.is_new ?? branchProduct?.is_new, false),
    is_featured: toBool(merged.is_featured ?? product?.is_featured ?? branchProduct?.is_featured, false),
    is_best_seller: toBool(merged.is_best_seller ?? product?.is_best_seller ?? branchProduct?.is_best_seller, false),
    flashDeal: merged.flashDeal || merged.hotDeal || null,
    endsIn: String(merged.endsIn || merged.end_date || merged.valid_until || ''),
    badges: deriveBadges(merged, discountPercent, isOutOfStock),
    product,
    branchProduct,
    source: merged,
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
  const merged = raw || {};
  const id = toId(merged.id || merged._id);
  const productId = toId(merged.product_id || merged.product?.id || merged.product?._id);
  const branchId = toId(merged.branch_id);
  const normalizedProduct = merged.product ? normalizeProduct(merged.product) : null;

  const supplierId = merged.supplier_id !== undefined && merged.supplier_id !== null && merged.supplier_id !== ''
    ? toId(merged.supplier_id)
    : (normalizedProduct?.supplier_id || '');

  const categoryShop = merged.categoryShop || merged.category_name || normalizedProduct?.categoryShop || i18n.t('common.other');
  const image = normalizedProduct?.image || resolveProductImage(merged, null, null);
  const stock = toNumber(merged.stock, 0);

  const price = toNumber(
    merged.effective_price ??
    merged.price ??
    normalizedProduct?.effective_price ??
    normalizedProduct?.price,
    0
  );

  const originalPrice = toNumber(
    merged.original_price ??
    normalizedProduct?.original_price,
    price
  );

  const discountPercent = merged.discount_percent !== undefined && merged.discount_percent !== null
    ? toNumber(merged.discount_percent)
    : (normalizedProduct?.discount_percent !== undefined && normalizedProduct?.discount_percent !== null
      ? toNumber(normalizedProduct.discount_percent)
      : (originalPrice > 0 && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0));

  const pricingSource = merged.pricing_source ??
    normalizedProduct?.pricing_source ??
    'BASE_PRICE';

  const activeHotDeal = merged.active_hot_deal ?? merged.hotDeal ?? merged.hot_deal ??
    normalizedProduct?.active_hot_deal ??
    null;

  const activePromotion = merged.active_promotion ??
    normalizedProduct?.active_promotion ??
    null;

  return {
    ...merged,
    id,
    _id: merged._id || id || undefined,
    product_id: productId,
    branch_id: branchId,
    category_id: merged.category_id ? toId(merged.category_id) : (normalizedProduct?.category_id || ''),
    supplier_id: supplierId,
    categoryShop,
    is_active: toBool(merged.is_active, toBool(merged.is_available, true)),
    is_available: toBool(merged.is_available, toBool(merged.is_active, true)),
    image,
    stock,
    price,
    original_price: originalPrice,
    discount_percent: discountPercent,
    effective_price: price,
    pricing_source: pricingSource,
    active_hot_deal: activeHotDeal,
    active_promotion: activePromotion,
    isOutOfStock: stock <= 0,
    sold_count: toNumber(merged.sold_count, 0),
    product: normalizedProduct,
  };
};

export const normalizeProducts = (input: any, categoryLookup?: Record<string, string>): any[] => {
  if (!Array.isArray(input)) return [];
  return input.map((item) => normalizeProduct(item, categoryLookup));
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

export const deriveCategoryLookup = (categories: any[]): Record<string, string> => {
  const lookup: Record<string, string> = {};
  if (!Array.isArray(categories)) return lookup;

  categories.forEach((category) => {
    const id = toId(category?.id || category?._id);
    const name = String(category?.name || '').trim();
    if (id && name) lookup[id] = name;
  });

  return lookup;
};
