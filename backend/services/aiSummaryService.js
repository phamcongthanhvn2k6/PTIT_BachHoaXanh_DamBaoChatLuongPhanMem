import { isAIClientReady, requestJsonCompletion, requestTextCompletion } from '../utils/aiClient.js';

const summarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'pros', 'cons', 'recommendation', 'notes'],
  properties: {
    title: { type: 'string' },
    pros: {
      type: 'array',
      items: { type: 'string' }
    },
    cons: {
      type: 'array',
      items: { type: 'string' }
    },
    recommendation: { type: 'string' },
    notes: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const productSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['overview', 'strengths', 'cautions', 'recommendation', 'notes'],
  properties: {
    overview: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' }
    },
    cautions: {
      type: 'array',
      items: { type: 'string' }
    },
    recommendation: { type: 'string' },
    notes: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const normalizeLocale = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ja')) return 'ja';
  return 'vi';
};

const languageName = (locale) => {
  const norm = normalizeLocale(locale);
  if (norm === 'en') return 'English';
  if (norm === 'ja') return 'Japanese';
  return 'Vietnamese';
};

const languageRuleByLocale = (locale) => {
  const norm = normalizeLocale(locale);
  if (norm === 'en') return 'Reply strictly in English. Do not include Vietnamese or Japanese. Do not produce bilingual output.';
  if (norm === 'ja') return 'Reply strictly in Japanese. Do not include English or Vietnamese. Do not produce bilingual output.';
  return 'Reply strictly in Vietnamese. Do not include English or Japanese. Do not produce bilingual output.';
};

const hasVietnameseDiacritics = (text) => /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(String(text || ''));

const englishKeywordRegex = /\b(recommended|budget|users|highlights|consider|comparison|best|value|strong|weak|advantages|disadvantages|product|products|suitable|option)\b/i;

const detectLanguageFromText = (text) => {
  const value = String(text || '').trim();
  if (!value) return 'unknown';

  const hasJapaneseChars = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/i.test(value);
  if (hasJapaneseChars) return 'ja';

  const hasVietnameseDiacritics = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(value);
  if (hasVietnameseDiacritics) return 'vi';

  const hasEnglishChars = /[a-z]/i.test(value);
  if (hasEnglishChars) return 'en';

  return 'unknown';
};

const detectSummaryLanguage = (summary) => {
  if (!summary || typeof summary !== 'object') return 'unknown';
  const text = [
    summary.title,
    summary.overview,
    ...(Array.isArray(summary.pros) ? summary.pros : []),
    ...(Array.isArray(summary.strengths) ? summary.strengths : []),
    ...(Array.isArray(summary.cons) ? summary.cons : []),
    ...(Array.isArray(summary.cautions) ? summary.cautions : []),
    summary.recommendation,
    ...(Array.isArray(summary.notes) ? summary.notes : []),
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' ');

  return detectLanguageFromText(text);
};

const summarySegments = (summary) => [
  summary?.title,
  summary?.overview,
  ...(Array.isArray(summary?.pros) ? summary.pros : []),
  ...(Array.isArray(summary?.strengths) ? summary.strengths : []),
  ...(Array.isArray(summary?.cons) ? summary.cons : []),
  ...(Array.isArray(summary?.cautions) ? summary.cautions : []),
  summary?.recommendation,
  ...(Array.isArray(summary?.notes) ? summary.notes : []),
]
  .map((x) => String(x || '').trim())
  .filter(Boolean);

const hasLocaleViolation = (summary, locale) => {
  const normalizedLocale = normalizeLocale(locale);
  const parts = summarySegments(summary);

  if (normalizedLocale === 'ja' || normalizedLocale === 'en') {
    return parts.some((part) => hasVietnameseDiacritics(part));
  }

  return parts.some((part) => englishKeywordRegex.test(part) && !hasVietnameseDiacritics(part));
};

const isMeaningfulSummary = (raw) => {
  if (!raw || typeof raw !== 'object') return false;
  return Boolean(raw.title && raw.title.length > 5 && raw.recommendation && raw.recommendation.length > 10);
};

const normalizeSummary = (raw, locale = 'vi', products = []) => {
  const normalizedLocale = normalizeLocale(locale);
  const fallback = {
    title: normalizedLocale === 'en'
      ? 'Product Comparison Summary'
      : (normalizedLocale === 'ja' ? '製品比較の概要' : 'Tóm tắt so sánh sản phẩm'),
    pros: [],
    cons: [],
    recommendation: normalizedLocale === 'en'
      ? 'Comparison based on current data.'
      : (normalizedLocale === 'ja' ? '現在のデータに基づく比較。' : 'So sánh dựa trên dữ liệu hiện tại.'),
    notes: [
      normalizedLocale === 'en'
        ? 'AI only summarizes based on real comparison data shown on this page.'
        : (normalizedLocale === 'ja'
          ? 'AIは、このページに表示されている実際の比較 data のみに基づいて要約します。'
          : 'AI chỉ tổng hợp từ dữ liệu so sánh thực tế đang hiển thị trên trang này.')
    ],
  };
  
  if (!raw || typeof raw !== 'object') return fallback;
  
  return {
    title: String(raw.title || fallback.title),
    pros: Array.isArray(raw.pros) ? raw.pros.map(String).filter(Boolean).slice(0, 5) : fallback.pros,
    cons: Array.isArray(raw.cons) ? raw.cons.map(String).filter(Boolean).slice(0, 5) : fallback.cons,
    recommendation: String(raw.recommendation || fallback.recommendation),
    notes: Array.isArray(raw.notes) && raw.notes.length ? raw.notes.map(String).filter(Boolean).slice(0, 5) : fallback.notes,
  };
};

const enforceSummaryLocale = async ({ summary, locale, products }) => {
  const normalizedLocale = normalizeLocale(locale);
  const detectedBefore = detectSummaryLanguage(summary);
  const violation = hasLocaleViolation(summary, normalizedLocale);
  console.info(`[compare-summary] AI response language detected: ${detectedBefore} | violation=${violation}`);

  if ((detectedBefore === 'unknown' || detectedBefore === normalizedLocale) && !violation) {
    return normalizeSummary(summary, normalizedLocale, products);
  }

  try {
    const rewritten = await requestJsonCompletion({
      systemPrompt: [
        'You rewrite product comparison summaries while preserving original meaning and facts.',
        languageRuleByLocale(normalizedLocale),
      ].join(' '),
      userPrompt: JSON.stringify({
        task: 'Rewrite this summary into the target language strictly, keep facts unchanged.',
        target_locale: normalizedLocale,
        summary,
      }),
      schema: summarySchema,
      temperature: 0.1,
      maxTokens: 2000,
    });

    const normalized = normalizeSummary(rewritten, normalizedLocale, products);
    const detectedAfter = detectSummaryLanguage(normalized);
    const violationAfter = hasLocaleViolation(normalized, normalizedLocale);
    console.info(`[compare-summary] AI response language after rewrite: ${detectedAfter} | violation=${violationAfter}`);
    return normalized;
  } catch (rewriteErr) {
    console.warn(`[compare-summary] language rewrite failed: ${rewriteErr?.message || 'unknown'}`);
    return normalizeSummary(summary, normalizedLocale, products);
  }
};

export const isCompareAISummaryReady = () => isAIClientReady();

export const buildCompareAISummary = async ({ products, locale = 'vi' }) => {
  if (!Array.isArray(products) || products.length < 2) {
    const err = new Error('Không đủ dữ liệu sản phẩm để tóm tắt');
    err.code = 'INVALID_COMPARE_PRODUCTS';
    throw err;
  }

  const normalizedLocale = normalizeLocale(locale);
  const languageRule = languageRuleByLocale(normalizedLocale);

  console.info(`[compare-summary] prompt locale: ${normalizedLocale}`);
  console.info(`[compare-summary] prompt language rule: ${languageRule}`);

  const systemPrompt = [
    'You are an assistant for e-commerce product comparison analysis.',
    languageRule,
    'Never mix multiple languages in one answer.',
    'Only use the provided JSON data in products; never speculate outside the data.',
    'Do not add fields outside the output schema.',
    'If data is missing, explicitly mention missing data instead of inventing values.',
    'Keep output concise, practical, and UI-ready.',
  ].join(' ');

  const userPrompt = `
Dựa vào dữ liệu sản phẩm sau:
${JSON.stringify(products)}

Hãy phân tích CHI TIẾT và đưa ra so sánh bằng ngôn ngữ: ${languageName(normalizedLocale)}.

Yêu cầu cấu trúc kết quả trả về là một JSON object khớp chính xác với schema:
{
  "title": "Tiêu đề so sánh ngắn gọn bằng ngôn ngữ ${languageName(normalizedLocale)}",
  "pros": ["Liệt kê 2-4 điểm mạnh của các sản phẩm"],
  "cons": ["Liệt kê 2-4 điểm yếu/điều cần lưu ý khi mua"],
  "recommendation": "Khuyến nghị chi tiết nên mua sản phẩm nào, phù hợp với nhu cầu nào",
  "notes": ["Ghi chú thêm về thông tin so sánh hoặc tồn kho"]
}

Lưu ý quan trọng:
- Toàn bộ nội dung text (bao gồm cả title, pros, cons, recommendation, notes) PHẢI được viết bằng ngôn ngữ ${languageName(normalizedLocale)}.
- Không được trộn lẫn các ngôn ngữ khác nhau.
- Không được bịa đặt thông tin không có trong dữ liệu sản phẩm được cung cấp.
`;

  try {
    const raw = await requestJsonCompletion({
      systemPrompt,
      userPrompt,
      schema: summarySchema,
      temperature: 0.1,
      maxTokens: 2000,
    });

    if (isMeaningfulSummary(raw)) {
      return await enforceSummaryLocale({
        summary: normalizeSummary(raw, normalizedLocale, products),
        locale: normalizedLocale,
        products,
      });
    }

    return normalizeSummary(null, normalizedLocale, products);
  } catch (err) {
    if (err?.code === 'AI_NOT_READY' || err?.code === 'AI_AUTH_FAILED' || err?.code === 'AI_TIMEOUT' || err?.code === 'AI_QUOTA_EXCEEDED' || err?.code === 'AI_MODEL_NOT_FOUND' || err?.code === 'AI_REQUEST_FAILED') {
      throw err;
    }
    console.error('[compare-summary] AI json generation failed:', err.message);
    throw new Error('AI generation failed');
  }
};

// ═══════════════════════════════════════════════
// SINGLE PRODUCT AI SUMMARY
// ═══════════════════════════════════════════════

const isMeaningfulProductSummary = (raw) => {
  if (!raw || typeof raw !== 'object') return false;
  return Boolean(raw.overview && raw.overview.length > 10 && raw.recommendation && raw.recommendation.length > 10);
};

const normalizeProductSummary = (raw, locale = 'vi', product = {}) => {
  const normalizedLocale = normalizeLocale(locale);
  const fallback = {
    overview: normalizedLocale === 'en'
      ? `Summary for ${product.name || 'this product'}.`
      : (normalizedLocale === 'ja' ? `${product.name || 'この製品'}の概要。` : `Thông tin tóm tắt cho sản phẩm ${product.name || 'này'}.`),
    strengths: [],
    cautions: [],
    recommendation: normalizedLocale === 'en'
      ? 'Recommended based on product description and specifications.'
      : (normalizedLocale === 'ja' ? '製品の説明と仕様に基づいて推奨されます。' : 'Khuyến nghị dựa trên mô tả và thông số kỹ thuật của sản phẩm.'),
    notes: [
      normalizedLocale === 'en'
        ? 'AI summary is generated from official product data only.'
        : (normalizedLocale === 'ja'
          ? 'AI要約は、公式の製品データのみから生成されます。'
          : 'Tóm tắt AI chỉ được tổng hợp từ dữ liệu chính thức của sản phẩm.')
    ],
  };

  if (!raw || typeof raw !== 'object') return fallback;

  return {
    overview: String(raw.overview || fallback.overview),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String).filter(Boolean).slice(0, 5) : fallback.strengths,
    cautions: Array.isArray(raw.cautions) ? raw.cautions.map(String).filter(Boolean).slice(0, 5) : fallback.cautions,
    recommendation: String(raw.recommendation || fallback.recommendation),
    notes: Array.isArray(raw.notes) && raw.notes.length ? raw.notes.map(String).filter(Boolean).slice(0, 5) : fallback.notes,
  };
};

const enforceProductSummaryLocale = async ({ summary, locale, product }) => {
  const normalizedLocale = normalizeLocale(locale);
  const detectedBefore = detectSummaryLanguage(summary);
  const violation = hasLocaleViolation(summary, normalizedLocale);
  console.info(`[product-summary] AI response language detected: ${detectedBefore} | violation=${violation}`);

  if ((detectedBefore === 'unknown' || detectedBefore === normalizedLocale) && !violation) {
    return normalizeProductSummary(summary, normalizedLocale, product);
  }

  try {
    const rewritten = await requestJsonCompletion({
      systemPrompt: [
        'You rewrite product summaries while preserving original meaning and facts.',
        languageRuleByLocale(normalizedLocale),
      ].join(' '),
      userPrompt: JSON.stringify({
        task: 'Rewrite this product summary into the target language strictly, keep facts unchanged.',
        target_locale: normalizedLocale,
        summary,
      }),
      schema: productSummarySchema,
      temperature: 0.1,
      maxTokens: 2000,
    });

    const normalized = normalizeProductSummary(rewritten, normalizedLocale, product);
    const detectedAfter = detectSummaryLanguage(normalized);
    const violationAfter = hasLocaleViolation(normalized, normalizedLocale);
    console.info(`[product-summary] AI response language after rewrite: ${detectedAfter} | violation=${violationAfter}`);
    return normalized;
  } catch (rewriteErr) {
    console.warn(`[product-summary] language rewrite failed: ${rewriteErr?.message || 'unknown'}`);
    return normalizeProductSummary(summary, normalizedLocale, product);
  }
};

export const isProductAISummaryReady = () => isAIClientReady();

export const buildProductAISummary = async ({ product, locale = 'vi' }) => {
  if (!product || typeof product !== 'object') {
    const err = new Error('Dữ liệu sản phẩm không hợp lệ');
    err.code = 'INVALID_PRODUCT_DATA';
    throw err;
  }

  const normalizedLocale = normalizeLocale(locale);
  const languageRule = languageRuleByLocale(normalizedLocale);

  console.info(`[product-summary] prompt locale: ${normalizedLocale}`);
  console.info(`[product-summary] prompt language rule: ${languageRule}`);

  const systemPrompt = [
    'You are an assistant for e-commerce product detail analysis and summarizing.',
    languageRule,
    'Never mix multiple languages in one answer.',
    'Only use the provided JSON data in the product; never speculate, hallucinate, or invent details outside the provided data.',
    'Do not make generic claims that are not backed by the product description or specifications. For example, if ingredients or allergens are not explicitly listed in the data, do not guess or list them. If storage instructions are not in the data, do not guess them.',
    'Do not add fields outside the output schema.',
    'If data is missing, explicitly mention missing data instead of inventing values.',
    'Keep output concise, practical, and UI-ready.',
  ].join(' ');

  // Grounding & sanitizing product fields to send to AI
  const cleanProduct = {
    name: product.name,
    brand: product.brand,
    category_name: product.category_name,
    origin: product.origin,
    weight: product.weight,
    unit: product.unit,
    description: product.description || product.short_description,
    highlights: product.highlights,
    specifications: product.specifications,
    usage_guide: product.usage_guide,
    storage_guide: product.storage_guide || product.storage_instructions,
    notes: product.notes,
    recipe_suggestions: product.recipe_suggestions,
    average_rating: product.average_rating || product.rating,
    review_count: product.review_count || product.total_reviews,
  };

  const userPrompt = `
Dựa vào dữ liệu sản phẩm sau:
${JSON.stringify(cleanProduct)}

Hãy phân tích CHI TIẾT và đưa ra tóm tắt sản phẩm bằng ngôn ngữ: ${languageName(normalizedLocale)}.

Yêu cầu cấu trúc kết quả trả về là một JSON object khớp chính xác với schema:
{
  "overview": "Đoạn văn ngắn (2-3 câu) tóm tắt tổng quan sản phẩm chuyên nghiệp bằng ngôn ngữ ${languageName(normalizedLocale)}",
  "strengths": ["Liệt kê 2-4 điểm mạnh chính của sản phẩm, trích xuất chính xác từ dữ liệu"],
  "cautions": ["Liệt kê 1-3 lưu ý, hạn chế, lưu ý bảo quản hoặc dị ứng của sản phẩm"],
  "recommendation": "Khuyến nghị chi tiết đối tượng sử dụng và mục đích phù hợp",
  "notes": ["Ghi chú bổ sung (nếu có), không được tự bịa ra thông tin"]
}

Lưu ý quan trọng:
- Toàn bộ nội dung text (bao gồm cả overview, strengths, cautions, recommendation, notes) PHẢI được viết bằng ngôn ngữ ${languageName(normalizedLocale)}.
- Không được trộn lẫn các ngôn ngữ khác nhau.
- Không được bịa đặt thông tin không có trong dữ liệu sản phẩm được cung cấp. Nếu dữ liệu không đề cập đến một thông tin cụ thể (ví dụ: dị ứng, cách bảo quản), hãy ghi rõ 'Không có thông tin từ nhà sản xuất' hoặc tương tự trong phần tương ứng, hoặc không thêm nó vào danh sách.
`;

  try {
    const raw = await requestJsonCompletion({
      systemPrompt,
      userPrompt,
      schema: productSummarySchema,
      temperature: 0.1,
      maxTokens: 2000,
    });

    if (isMeaningfulProductSummary(raw)) {
      return await enforceProductSummaryLocale({
        summary: normalizeProductSummary(raw, normalizedLocale, product),
        locale: normalizedLocale,
        product,
      });
    }

    return normalizeProductSummary(null, normalizedLocale, product);
  } catch (err) {
    if (err?.code === 'AI_NOT_READY' || err?.code === 'AI_AUTH_FAILED' || err?.code === 'AI_TIMEOUT' || err?.code === 'AI_QUOTA_EXCEEDED' || err?.code === 'AI_MODEL_NOT_FOUND' || err?.code === 'AI_REQUEST_FAILED') {
      throw err;
    }
    console.error('[product-summary] AI json generation failed:', err.message);
    throw new Error('AI generation failed');
  }
};
