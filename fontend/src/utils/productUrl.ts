/**
 * Product URL utilities for SEO-friendly and locale-aware routing.
 *
 * URL format: /{locale-prefix}/product/{name-slug}-{shortCode}
 *
 * Examples:
 *   /vi-nsg/product/ca-chua-da-lat-vietgap-p007
 *   /kr-nsg/product/ot-tau-juliet-phap-tui-1kg-p009
 */

// Vietnamese diacritics → ASCII mapping
const VIETNAMESE_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'đ': 'd',
  'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
  'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
  'Đ': 'D',
};

/** Remove Vietnamese diacritics from a string */
function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str.split('').map(ch => VIETNAMESE_MAP[ch] || ch).join('');
}

/** Generate a URL-safe slug from a product name */
function slugify(name: string): string {
  if (!name) return '';
  return removeVietnameseTones(name)
    .toLowerCase()
    .trim()
    .replace(/[&/\\#,+()$~%.'":*?<>{}|@!^=`;[\]]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
    .replace(/-+$/, '');
}

/** Generate the short code for a given Mongo ObjectId */
export function generateShortCode(id: string): string {
  const idStr = String(id || '');
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    const cleanId = idStr.replace(/^0+/, '');
    if (cleanId.length <= 4) {
      return `p${cleanId.padStart(3, '0')}`;
    }
    return `p${idStr.slice(-6).toLowerCase()}`;
  }
  return `p${idStr}`;
}

/** Convert a language code to prefix format (e.g. ko -> kr-nsg) */
export function getPrefixFromLocale(locale: string): string {
  const clean = (locale || 'vi').toLowerCase();
  if (clean === 'ko' || clean === 'kr') return 'kr-nsg';
  return `${clean}-nsg`;
}

/** Convert prefix back to standard language code */
export function getLocaleFromPrefix(prefix: string): string {
  if (!prefix) return 'vi';
  const clean = prefix.toLowerCase().replace('-nsg', '');
  if (clean === 'kr') return 'kr';
  return clean;
}

/**
 * Build the canonical locale-aware product URL path.
 *
 * @param product - Any object with `id`/`_id`, `name`, and optionally `slug`/`short_code`
 * @returns The canonical URL path like `/vi-nsg/product/ca-chua-da-lat-p007`
 */
export function getProductUrl(product: any): string {
  if (!product) return '/products';

  // Determine locale prefix based on current pathname (to stay under same prefix) or localStorage fallback
  let localePrefix = 'vi-nsg';
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/^\/([a-z]+-nsg)/);
    if (match) {
      localePrefix = match[1];
    } else {
      const currentLang = window.localStorage.getItem('lotte_language') || 'vi';
      localePrefix = getPrefixFromLocale(currentLang);
    }
  }

  const id = String(product.product_id || product.id || product._id || '');
  if (!id) return `/${localePrefix}/products`;

  // Get or generate short code
  const shortCode = product.short_code || generateShortCode(id);

  // If the product already has a slug and it ends with the short code
  if (product.slug && typeof product.slug === 'string' && product.slug.endsWith(shortCode)) {
    return `/${localePrefix}/product/${product.slug}`;
  }

  // Generate on the fly
  const name = String(product.name || '');
  const nameSlug = slugify(name);

  if (!nameSlug) {
    return `/${localePrefix}/product/${shortCode}`;
  }

  return `/${localePrefix}/product/${nameSlug}-${shortCode}`;
}

/**
 * Extract the product identifier (short code, legacy ID) from a slug or ID parameter.
 */
export function extractProductId(slugOrId: string): string {
  if (!slugOrId) return '';
  const trimmed = slugOrId.trim();

  // Short code format at the end (e.g. -p009 or is p009)
  const matchCode = trimmed.match(/-?(p[0-9a-fA-F]+)$/i) || trimmed.match(/^(p[0-9a-fA-F]+)$/i);
  if (matchCode) {
    return matchCode[1].toLowerCase();
  }

  // Bare 24-hex ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) return trimmed;

  // Slug with trailing 24-hex ObjectId
  const matchHex = trimmed.match(/([0-9a-fA-F]{24})$/);
  if (matchHex) return matchHex[1];

  // Legacy numeric
  if (/^\d+$/.test(trimmed)) return trimmed;

  return trimmed;
}
