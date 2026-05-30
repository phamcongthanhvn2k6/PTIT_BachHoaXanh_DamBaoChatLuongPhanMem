import { requestJsonCompletion } from "../utils/aiClient.js";

// JSON Schema for recipes to enforce structure
const recipeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    servings: { type: 'number' },
    prep_time: { type: 'string' },
    cook_time: { type: 'string' },
    difficulty: { type: 'string', enum: ['Dễ', 'Trung bình', 'Khó'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'string' },
          unit: { type: 'string' },
          note: { type: 'string' }
        },
        required: ['name', 'quantity', 'unit', 'note']
      }
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'number' },
          title: { type: 'string' },
          description: { type: 'string' },
          duration: { type: 'string' }
        },
        required: ['step', 'title', 'description', 'duration']
      }
    },
    tips: {
      type: 'array',
      items: { type: 'string' }
    },
    tags: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['title', 'description', 'servings', 'prep_time', 'cook_time', 'difficulty', 'ingredients', 'steps', 'tips', 'tags']
};

/**
 * Generate a detailed Vietnamese recipe using OpenRouter.
 * @param {string} dishName
 * @param {number} servings
 * @param {string} appetite
 * @returns {object|null}
 */
export const generateRecipe = async (dishName, servings = 2, appetite = 'normal') => {
  console.log(`[aiService] Generating: "${dishName}" (servings=${servings}, appetite=${appetite})`);

  const appetiteText = appetite === 'small'
    ? 'ít ăn (giảm 20% lượng nguyên liệu so với chuẩn)'
    : appetite === 'large'
      ? 'ăn nhiều (tăng 30% lượng nguyên liệu so với chuẩn)'
      : 'vừa (khẩu phần tiêu chuẩn)';

  const systemPrompt = `Bạn là đầu bếp chuyên nghiệp Việt Nam với 20 năm kinh nghiệm nấu ăn thực tế.`;
  
  const userPrompt = `══════════════════════════════════
YÊU CẦU TẠO CÔNG THỨC NẤU ĂN CHI TIẾT
══════════════════════════════════

TÊN MÓN: ${dishName}
SỐ NGƯỜI ĂN: chính xác ${servings} người
MỨC ĂN: ${appetiteText}

QUY TẮC BẮT BUỘC:
1. NGUYÊN LIỆU: Phải có ít nhất 6 nguyên liệu chi tiết. Mỗi nguyên liệu có name, quantity (số cụ thể dạng chuỗi), unit, và note (sơ chế).
2. CÁC BƯỚC NẤU: Phải có ít nhất 4 bước chi tiết. Mỗi bước có step, title, description (ít nhất 30 ký tự mô tả hành động, thời gian, lửa, dấu hiệu), và duration.
3. MẸO & LƯU Ý: Ít nhất 2 mẹo thực tế.
4. Trả về đúng định dạng JSON khớp với schema yêu cầu.`;

  try {
    const parsed = await requestJsonCompletion({
      systemPrompt,
      userPrompt,
      schema: recipeSchema,
      temperature: 0.1,
      maxTokens: 2000
    });

    if (parsed) {
      parsed.servings = servings;
      parsed.ai_generated = true;
      parsed.source_type = 'ai_generated';
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('[aiService] generateRecipe error:', err.message);
    throw err;
  }
};

/**
 * Enrich/Complete an incomplete recipe using OpenRouter.
 * @param {object} incompleteRecipe
 * @param {number} servings
 * @param {string} appetite
 * @returns {object|null}
 */
export const enrichRecipe = async (incompleteRecipe, servings = 2, appetite = 'normal') => {
  console.log(`[aiService] Enriching incomplete recipe: "${incompleteRecipe.title || 'Món ăn'}"`);

  const systemPrompt = `Bạn là đầu bếp chuyên nghiệp Việt Nam. Hãy bổ sung các phần còn thiếu hoặc sơ sài trong công thức nấu ăn được cung cấp để tạo nên một công thức hoàn chỉnh, chi tiết và chất lượng cao.`;

  const userPrompt = `Công thức nấu ăn hiện tại (chưa hoàn thiện):
${JSON.stringify(incompleteRecipe, null, 2)}

YÊU CẦU BỔ SUNG & HOÀN THIỆN:
1. Điền đầy đủ các thông tin còn thiếu.
2. Đảm bảo danh sách ingredients có ít nhất 6 nguyên liệu cụ thể (mỗi nguyên liệu có name, quantity, unit, note).
3. Đảm bảo steps có ít nhất 4 bước nấu chi tiết (mỗi bước có step, title, description dài ít nhất 30 ký tự, duration).
4. Cung cấp ít nhất 2 mẹo thực tế trong tips.
5. Giữ nguyên các thông tin chính xác đã có sẵn.

Hãy trả về công thức nấu ăn đã hoàn chỉnh dưới dạng JSON khớp với cấu trúc schema.`;

  try {
    const parsed = await requestJsonCompletion({
      systemPrompt,
      userPrompt,
      schema: recipeSchema,
      temperature: 0.1,
      maxTokens: 2000
    });

    if (parsed) {
      parsed.servings = servings;
      parsed.ai_generated = true;
      parsed.source_type = 'ai_generated';
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('[aiService] enrichRecipe error:', err.message);
    throw err;
  }
};
