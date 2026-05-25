import i18n from '../i18n';
import { resolveImageUrl, fallbackProductImage } from './imageUrl';

type AnyRecord = Record<string, any>;

const toStringId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.$oid) return String(value.$oid);
    if (typeof value.toString === 'function') return String(value.toString());
  }
  return String(value);
};

const toNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toArray = (value: any): any[] => {
  return Array.isArray(value) ? value : [];
};

const sanitizeText = (value: any, fallback = ''): string => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const normalizeImages = (raw: AnyRecord): string[] => {
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

const deriveCategoryShop = (raw: AnyRecord, categoryLookup?: Record<string, string>): string => {
  const directName = sanitizeText(raw.categoryShop || raw.category_name || raw.category?.name, '');
  if (directName) return directName;

  const nestedName = sanitizeText(raw.product?.categoryShop || raw.product?.category_name || raw.product?.category?.name, '');
  if (nestedName) return nestedName;

  const categoryId = toStringId(raw.category_id || raw.product?.category_id);
  if (categoryId && categoryLookup?.[categoryId]) return categoryLookup[categoryId];

  return i18n.t('common.other');
};

const deriveBadges = (raw: AnyRecord, discountPercent: number, isOutOfStock: boolean): string[] => {
  const badges: string[] = [];

  if (discountPercent > 0) badges.push('sale');
  if (isOutOfStock) badges.push('out_of_stock');
  if (raw.is_new || raw.product?.is_new) badges.push('new');
  if (raw.is_best_seller || raw.product?.is_best_seller) badges.push('best_seller');

  const semanticBadges = toArray(raw.badges).map((b) => {
    if (typeof b === 'string') return b;
    if (b?.type) return String(b.type);
    if (b?.text) return String(b.text);
    return '';
  }).filter(Boolean);

  return Array.from(new Set([...badges, ...semanticBadges]));
};

export interface NormalizedProduct {
  id: string;
  name: string;
  price: number;
  original_price: number;
  image: string;
  categoryShop: string;
  rating: number;
  stock: number;
  discount_percent: number;
  isOutOfStock: boolean;
  flashDeal: AnyRecord | null;
  endsIn: string;
  badges: string[];
  product_id?: string;
  branch_product_id?: string;
  images?: string[];
  product?: AnyRecord | null;
  branchProduct?: AnyRecord | null;
  source?: AnyRecord;
}

export const normalizeProduct = (raw: AnyRecord, categoryLookup?: Record<string, string>): NormalizedProduct => {
  const merged = raw || {};
  const branchProduct = merged.branchProduct || (merged.product_id && merged.branch_id ? merged : null);
  const product = merged.product || null;

  const id = toStringId(merged.id || merged._id || merged.branch_product_id || product?.id || product?._id);
  const productId = toStringId(merged.product_id || product?.id || product?._id || id);
  const branchProductId = toStringId(merged.branch_product_id || branchProduct?.id || branchProduct?._id || id);

  const images = normalizeImages({
    ...product,
    ...merged,
    images: merged.images || product?.images,
    image: merged.image || product?.image,
    thumbnail: merged.thumbnail || product?.thumbnail,
  });

  const basePrice = toNumber(merged.price ?? branchProduct?.price ?? product?.price, 0);
  const baseOriginalPrice = toNumber(
    merged.original_price ?? branchProduct?.original_price ?? product?.original_price,
    basePrice
  );

  const discountPercent = Math.max(
    0,
    toNumber(
      merged.discount_percent ?? branchProduct?.discount_percent,
      baseOriginalPrice > 0 && baseOriginalPrice > basePrice
        ? Math.round(((baseOriginalPrice - basePrice) / baseOriginalPrice) * 100)
        : 0
    )
  );

  const stock = Math.max(0, toNumber(merged.stock ?? branchProduct?.stock ?? product?.stock, 0));
  const isOutOfStock = stock <= 0;

  return {
    id,
    name: sanitizeText(merged.name || product?.name, i18n.t('common.product')),
    price: basePrice,
    original_price: baseOriginalPrice,
    image: images[0] || fallbackProductImage,
    categoryShop: deriveCategoryShop(merged, categoryLookup),
    rating: toNumber(merged.rating ?? merged.average_rating ?? product?.rating ?? product?.average_rating, 0),
    stock,
    discount_percent: discountPercent,
    isOutOfStock,
    flashDeal: merged.flashDeal || merged.hotDeal || null,
    endsIn: sanitizeText(merged.endsIn || merged.end_date || merged.valid_until, ''),
    badges: deriveBadges(merged, discountPercent, isOutOfStock),
    product_id: productId,
    branch_product_id: branchProductId,
    images,
    product,
    branchProduct,
    source: merged,
  };
};

export const normalizeProducts = (items: any[], categoryLookup?: Record<string, string>): NormalizedProduct[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeProduct(item, categoryLookup));
};

export const deriveCategoryLookup = (categories: any[]): Record<string, string> => {
  const lookup: Record<string, string> = {};
  if (!Array.isArray(categories)) return lookup;

  categories.forEach((category) => {
    const id = toStringId(category?.id || category?._id);
    const name = sanitizeText(category?.name, '');
    if (id && name) lookup[id] = name;
  });

  return lookup;
};
