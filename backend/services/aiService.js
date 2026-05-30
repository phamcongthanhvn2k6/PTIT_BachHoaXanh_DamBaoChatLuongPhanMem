import { GoogleGenerativeAI } from "@google/generative-ai";
import { requestTextCompletion } from "../utils/aiClient.js";

/**
 * Generate a detailed Vietnamese recipe using Gemini AI.
 * @param {string} dishName
 * @param {number} servings
 * @param {string} appetite
 * @returns {object|null}
 */
export const generateRecipe = async (dishName, servings = 2, appetite = 'normal') => {
  const apiKey = process.env.GEMINI_RECIPE_KEY;
  if (!apiKey) {
    console.error("[aiService] FATAL: GEMINI_RECIPE_KEY is not set in .env");
    throw new Error("Missing GEMINI_RECIPE_KEY — configure in backend/.env");
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  console.log(`[aiService] Generating: "${dishName}" (servings=${servings}, appetite=${appetite}, model=${modelName})`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const appetiteText = appetite === 'small'
    ? 'ít ăn (giảm 20% lượng nguyên liệu so với chuẩn)'
    : appetite === 'large'
      ? 'ăn nhiều (tăng 30% lượng nguyên liệu so với chuẩn)'
      : 'vừa (khẩu phần tiêu chuẩn)';

  const buildPrompt = (attempt = 1) => {
    const stricterNote = attempt > 1
      ? `\n⚠️ LẦN THỬ TRƯỚC BỊ LỖI. Lần này BẮT BUỘC phải:\n- Trả về ĐÚNG cấu trúc JSON\n- KHÔNG dùng markdown, KHÔNG có text nào ngoài JSON\n- Mỗi nguyên liệu PHẢI có quantity là số cụ thể\n- Mỗi bước PHẢI có description dài ít nhất 50 ký tự\n`
      : '';

    return `Bạn là đầu bếp chuyên nghiệp Việt Nam với 20 năm kinh nghiệm nấu ăn thực tế.
${stricterNote}
══════════════════════════════════
YÊU CẦU TẠO CÔNG THỨC NẤU ĂN
══════════════════════════════════

TÊN MÓN: ${dishName}
SỐ NGƯỜI ĂN: chính xác ${servings} người
MỨC ĂN: ${appetiteText}

══════════════════════════════════
QUY TẮC TUYỆT ĐỐI — VI PHẠM SẼ BỊ TỪ CHỐI
══════════════════════════════════

CẤM DÙNG các cụm từ sau (bất kỳ chỗ nào trong JSON):
- "Nguyên liệu chính", "Gia vị cơ bản", "Gia vị nêm"
- "Vừa đủ", "Tùy khẩu phần", "Tùy khẩu vị", "Tùy ý"
- "Cho vừa ăn", "Một ít", "Vài lát", "Một chút"
- "Nêm nếm vừa miệng", "Nêm gia vị"
- "Sơ chế nguyên liệu", "Nấu đến khi chín", "Tiến hành nấu"
- "Chế biến món ăn", "Hoàn thành món ăn"
- "Thêm gia vị cho vừa miệng"
- "Các loại rau", "Các loại gia vị"

══════════════════════════════════
NGUYÊN LIỆU — TỐI THIỂU 8 nguyên liệu
══════════════════════════════════

Mỗi nguyên liệu PHẢI có đầy đủ 4 trường:
- name: tên cụ thể (VD: "Thịt ba chỉ", KHÔNG phải "Thịt")
- quantity: SỐ CỤ THỂ dạng text (VD: "400", "2", "3", "1/2")
- unit: đơn vị đo (VD: "g", "ml", "muỗng canh", "quả", "củ", "nhánh", "lát")
- note: ghi chú sơ chế cụ thể (VD: "thái miếng vuông 3x4cm", "băm nhuyễn")

✅ VÍ DỤ ĐÚNG:
{"name":"Thịt ba chỉ","quantity":"400","unit":"g","note":"rửa sạch, thái miếng vuông 3x4cm"}
{"name":"Hành tím","quantity":"3","unit":"củ","note":"bóc vỏ, băm nhuyễn"}
{"name":"Nước mắm ngon","quantity":"2","unit":"muỗng canh","note":"loại Phú Quốc"}
{"name":"Đường phèn","quantity":"30","unit":"g","note":"đập nhỏ"}
{"name":"Tiêu đen","quantity":"1","unit":"muỗng cà phê","note":"xay mịn"}

❌ VÍ DỤ SAI (CẤM):
{"name":"Gia vị","quantity":"vừa đủ","unit":"","note":""}
{"name":"Rau các loại","quantity":"1","unit":"ít","note":""}
{"name":"Thịt","quantity":"","unit":"","note":"sơ chế sạch"}

══════════════════════════════════
CÁC BƯỚC NẤU — TỐI THIỂU 5 bước
══════════════════════════════════

Mỗi bước PHẢI có:
- step: số thứ tự (1, 2, 3...)
- title: tiêu đề ngắn gọn, cụ thể
- description: MÔ TẢ CHI TIẾT (ít nhất 60 ký tự), bao gồm:
  + Hành động cụ thể (phi, xào, luộc, hầm...)
  + Thời gian chính xác (2 phút, 30 giây...)
  + Mức lửa (lửa nhỏ, lửa vừa, lửa lớn...)
  + Dấu hiệu nhận biết (vàng thơm, sôi bọt, săn lại, mềm nhừ...)
- duration: thời gian bước đó (VD: "2 phút", "15 phút")

✅ VÍ DỤ BƯỚC ĐÚNG:
{
  "step": 1,
  "title": "Ướp thịt",
  "description": "Cho 400g thịt ba chỉ đã thái miếng vào tô lớn. Thêm 2 muỗng canh nước mắm, 1 muỗng canh đường, 1/2 muỗng cà phê tiêu, 3 củ hành tím băm nhuyễn. Trộn đều và ướp trong tủ lạnh ít nhất 30 phút để thịt thấm gia vị.",
  "duration": "30 phút"
}

❌ VÍ DỤ BƯỚC SAI (CẤM):
{"step":1,"title":"Sơ chế","description":"Sơ chế nguyên liệu sạch sẽ","duration":""}
{"step":2,"title":"Nấu","description":"Nấu đến khi chín","duration":""}

══════════════════════════════════
MẸO & LƯU Ý — TỐI THIỂU 3 mẹo
══════════════════════════════════
Mỗi mẹo phải cụ thể, thực tế, áp dụng được ngay.
✅ Đúng: "Để thịt kho mềm nhừ, hầm với lửa nhỏ liu riu và đậy nắp kín, không mở nắp trong 45 phút đầu"
❌ Sai: "Nấu cẩn thận cho ngon"

══════════════════════════════════
CẤU TRÚC JSON — BẮT BUỘC
══════════════════════════════════

servings trong JSON PHẢI ĐÚNG là ${servings}.

Trả về DUY NHẤT JSON object, KHÔNG có bất kỳ text hay markdown nào bao quanh:
{
  "title": "Tên món tiếng Việt đầy đủ",
  "description": "Mô tả 2-3 câu hấp dẫn, kể về nguồn gốc hoặc đặc trưng món ăn",
  "servings": ${servings},
  "prep_time": "X phút",
  "cook_time": "Y phút",
  "difficulty": "Dễ" hoặc "Trung bình" hoặc "Khó",
  "ingredients": [{"name":"...","quantity":"...","unit":"...","note":"..."}],
  "steps": [{"step":1,"title":"...","description":"...mô tả chi tiết...","duration":"X phút"}],
  "tips": ["mẹo cụ thể 1","mẹo cụ thể 2","mẹo cụ thể 3"],
  "tags": ["tag1","tag2","tag3"]
}`;
  };

  let responseText = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const prompt = buildPrompt(attempt);
      console.log(`[aiService] Attempt ${attempt}/2 — sending prompt (${prompt.length} chars)...`);

      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      console.log(`[aiService] Attempt ${attempt} — response length: ${responseText.length}`);

      const parsed = safeParseJSON(responseText);
      if (!parsed) {
        console.error(`[aiService] Attempt ${attempt}: JSON parse failed. Raw preview:\n${responseText.substring(0, 500)}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        console.error('[aiService] All attempts failed to parse JSON.');
        return null;
      }

      const qualityError = validateRecipeQuality(parsed);
      if (qualityError) {
        console.warn(`[aiService] Attempt ${attempt}: Quality validation failed: ${qualityError}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        // On last attempt, try to fix what we can and return
        console.warn('[aiService] Last attempt — returning with quality warnings.');
      }

      // Force correct servings
      parsed.servings = servings;
      parsed.ai_generated = true;
      parsed.source_type = 'ai_generated';

      // Sanitize ingredients
      if (Array.isArray(parsed.ingredients)) {
        parsed.ingredients = parsed.ingredients
          .filter(ing => ing && ing.name && typeof ing.name === 'string' && ing.name.trim().length > 0)
          .map(ing => ({
            name: String(ing.name).trim(),
            quantity: String(ing.quantity || '').trim(),
            unit: String(ing.unit || '').trim(),
            note: String(ing.note || '').trim()
          }));
      }

      // Sanitize steps
      if (Array.isArray(parsed.steps)) {
        parsed.steps = parsed.steps
          .filter(s => s && s.description && typeof s.description === 'string' && s.description.trim().length > 5)
          .map((s, idx) => ({
            step: s.step || idx + 1,
            title: String(s.title || `Bước ${idx + 1}`).trim(),
            description: String(s.description).trim(),
            duration: String(s.duration || '').trim()
          }));
      }

      // Sanitize tips
      if (Array.isArray(parsed.tips)) {
        parsed.tips = parsed.tips.filter(t => typeof t === 'string' && t.trim().length > 5).map(t => t.trim());
      }

      // Sanitize tags
      if (Array.isArray(parsed.tags)) {
        parsed.tags = parsed.tags.filter(t => typeof t === 'string' && t.trim().length > 0).map(t => t.trim());
      }

      console.log(`[aiService] ✅ "${parsed.title}" — ${parsed.ingredients?.length || 0} ingredients, ${parsed.steps?.length || 0} steps, ${parsed.tips?.length || 0} tips`);
      return parsed;

    } catch (error) {
      console.error(`[aiService] Attempt ${attempt} EXCEPTION:`, error.message);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      console.error(`[aiService] All attempts failed. Last response preview:\n${responseText.substring(0, 500)}`);
      return null;
    }
  }
  return null;
};

/**
 * Safely parse JSON from AI response, stripping markdown fences and extracting JSON object.
 */
function safeParseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Also handle if it starts with ```json but doesn't have closing
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
  }

  // Attempt 1: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch (_) { /* continue */ }

  // Attempt 2: Extract first { ... last }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch (e2) {
      console.error('[aiService] JSON extraction (brace-match) failed:', e2.message);
    }
  }

  console.error('[aiService] All JSON parse strategies failed.');
  return null;
}

/**
 * Validate recipe quality — returns error string if bad, null if OK.
 */
function validateRecipeQuality(recipe) {
  if (!recipe || typeof recipe !== 'object') return 'Not an object';
  if (!recipe.title || typeof recipe.title !== 'string' || recipe.title.trim().length < 2) return 'Missing or invalid title';
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 4) return `Too few ingredients (${recipe.ingredients?.length || 0}, need ≥4)`;
  if (!Array.isArray(recipe.steps) || recipe.steps.length < 3) return `Too few steps (${recipe.steps?.length || 0}, need ≥3)`;

  // Banned phrases check
  const banned = [
    'tùy khẩu phần', 'vừa đủ', 'tùy khẩu vị', 'tùy ý',
    'cho vừa ăn', 'nguyên liệu chính', 'gia vị cơ bản',
    'gia vị nêm', 'một ít', 'vài lát', 'một chút',
    'nêm nếm vừa miệng', 'sơ chế nguyên liệu',
    'nấu đến khi chín', 'tiến hành nấu',
    'chế biến món ăn', 'hoàn thành món ăn',
    'các loại rau', 'các loại gia vị',
    'thêm gia vị cho vừa miệng'
  ];
  const fullText = JSON.stringify(recipe).toLowerCase();
  for (const phrase of banned) {
    if (fullText.includes(phrase)) return `Banned phrase detected: "${phrase}"`;
  }

  // Check each ingredient has a name and a quantity
  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    if (!ing.name || typeof ing.name !== 'string') return `Ingredient #${i + 1}: missing name`;
    if (!ing.quantity || String(ing.quantity).trim().length === 0) return `Ingredient "${ing.name}": missing quantity`;
  }

  // Check steps have meaningful descriptions
  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    if (!step.description || typeof step.description !== 'string') return `Step #${i + 1}: missing description`;
    if (step.description.trim().length < 20) return `Step #${i + 1}: description too short (${step.description.length} chars)`;
  }

  return null; // All good
}

/**
 * Generate AI comparison summary for products.
 */
export const generateComparisonSummary = async (products) => {
  const productDescriptions = products.map((p, i) =>
    `Sản phẩm ${i + 1}: ${p.name} - Giá: ${p.price}đ - Thương hiệu: ${p.brand || 'N/A'} - Mô tả: ${p.description || 'N/A'}`
  ).join('\n');

  const systemPrompt = "Bạn là chuyên gia tư vấn mua sắm.";
  const userPrompt = `So sánh chi tiết các sản phẩm sau và đưa ra nhận xét chuyên sâu bằng tiếng Việt:\n${productDescriptions}\n\nTrả lời bằng markdown với tiêu đề, bảng so sánh, ưu/nhược điểm, và khuyến nghị mua.`;

  return await requestTextCompletion({ systemPrompt, userPrompt });
};
