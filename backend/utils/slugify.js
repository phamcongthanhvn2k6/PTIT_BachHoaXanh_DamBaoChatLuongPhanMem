/**
 * Vietnamese-aware slug generator.
 *
 * Converts Vietnamese diacritics to ASCII, lowercases, replaces spaces and
 * special characters with hyphens, and deduplicates consecutive hyphens.
 *
 * Example:
 *   slugify("Ớt Tàu Juliet Pháp Túi 1kg") → "ot-tau-juliet-phap-tui-1kg"
 */

const VIETNAMESE_MAP = {
  // lowercase
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
  // uppercase (just in case)
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

/**
 * Remove Vietnamese diacritics from a string.
 */
export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str.split('').map(ch => VIETNAMESE_MAP[ch] || ch).join('');
};

/**
 * Generate a URL-safe slug from a Vietnamese (or any) product name.
 *
 * @param {string} name - The product name
 * @returns {string} A lowercase, hyphen-separated slug
 */
export const slugify = (name) => {
  if (!name || typeof name !== 'string') return '';

  return removeVietnameseTones(name)
    .toLowerCase()
    .trim()
    // Replace common separators with hyphens
    .replace(/[&\/\\#,+()$~%.'":*?<>{}|@!^=`;[\]]/g, '')
    // Replace whitespace and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Collapse multiple hyphens
    .replace(/-{2,}/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to keep URLs reasonable (max 80 chars for the slug part)
    .substring(0, 80)
    // Clean up any trailing hyphen from truncation
    .replace(/-+$/, '');
};

/**
 * Build a full SEO-friendly product slug with the Mongo ID suffix.
 *
 * Format: {name-slug}-{mongoId}
 *
 * Example:
 *   buildProductSlug("Ớt Tàu Juliet Pháp Túi 1kg", "683469...") →
 *   "ot-tau-juliet-phap-tui-1kg-683469..."
 *
 * This ensures:
 *   - Human-readable, SEO-friendly text
 *   - Stable unique suffix via Mongo ObjectId
 *   - Old links can still be parsed (extract trailing ID)
 *
 * @param {string} name - Product name
 * @param {string} mongoId - The Mongo ObjectId as a hex string
 * @returns {string}
 */
export const generateShortCode = (id) => {
  const idStr = String(id);
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    const cleanId = idStr.replace(/^0+/, '');
    if (cleanId.length <= 4) {
      return `p${cleanId.padStart(3, '0')}`;
    }
    return `p${idStr.slice(-6).toLowerCase()}`;
  }
  return `p${idStr}`;
};

export const buildProductSlug = (name, mongoId, shortCode) => {
  const nameSlug = slugify(name);
  const code = shortCode || generateShortCode(mongoId);
  if (!nameSlug && !code) return '';
  if (!nameSlug) return code;
  if (!code) return nameSlug;
  return `${nameSlug}-${code}`;
};

/**
 * Extract the Mongo ObjectId from a product URL slug.
 *
 * The slug format is: "some-name-text-{24hexId}"
 * We grab the last segment that looks like a 24-char hex ObjectId.
 *
 * Also supports receiving a bare ObjectId string (backward compat).
 *
 * @param {string} slugOrId - The slug from the URL parameter
 * @returns {string|null} The extracted ObjectId hex string, or null
 */
export const extractIdFromSlug = (slugOrId) => {
  if (!slugOrId || typeof slugOrId !== 'string') return null;
  const trimmed = slugOrId.trim();

  // Case 1: It's a bare 24-hex ObjectId (backward compatibility)
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    return trimmed;
  }

  // Case 2: Slug format — extract trailing 24-hex ID
  const match = trimmed.match(/([0-9a-fA-F]{24})$/);
  if (match) {
    return match[1];
  }

  // Case 3: Numeric legacy ID
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
};
