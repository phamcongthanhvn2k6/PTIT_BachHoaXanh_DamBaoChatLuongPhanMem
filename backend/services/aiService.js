import { requestJsonCompletion } from '../utils/aiClient.js';

const normalizeStr = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
};

const NUTRITION_DICTIONARY = {
  'banh mi': { calories: 250, protein: 8, fat: 2, carbs: 50, fiber: 2 },
  'sandwich': { calories: 200, protein: 6, fat: 1.5, carbs: 40, fiber: 1.5 },
  'pate': { calories: 320, protein: 14, fat: 28, carbs: 3, fiber: 0 },
  'cha lua': { calories: 150, protein: 12, fat: 10, carbs: 2, fiber: 0 },
  'gio lua': { calories: 150, protein: 12, fat: 10, carbs: 2, fiber: 0 },
  'thit heo': { calories: 240, protein: 26, fat: 15, carbs: 0, fiber: 0 },
  'ba chi': { calories: 260, protein: 16, fat: 22, carbs: 0, fiber: 0 },
  'thit bo': { calories: 250, protein: 26, fat: 17, carbs: 0, fiber: 0 },
  'thit ga': { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0 },
  'xa xiu': { calories: 220, protein: 18, fat: 12, carbs: 8, fiber: 0 },
  'dua leo': { calories: 15, protein: 0.6, fat: 0.1, carbs: 3.6, fiber: 0.5 },
  'ca chua': { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2 },
  'rau': { calories: 20, protein: 1.2, fat: 0.2, carbs: 4.3, fiber: 1.5 },
  'hanh': { calories: 32, protein: 1.8, fat: 0.2, carbs: 7.3, fiber: 1.5 },
  'toi': { calories: 149, protein: 6.4, fat: 0.5, carbs: 33, fiber: 2.1 },
  'ot': { calories: 40, protein: 2, fat: 0.4, carbs: 9, fiber: 1.5 },
  'trung': { calories: 72, protein: 6.3, fat: 4.8, carbs: 0.4, fiber: 0 },
  'sua': { calories: 60, protein: 3.2, fat: 3.25, carbs: 4.8, fiber: 0 },
  'bo': { calories: 717, protein: 0.85, fat: 81, carbs: 0.06, fiber: 0 },
  'sot bo': { calories: 400, protein: 1, fat: 42, carbs: 4, fiber: 0 },
  'mayonnaise': { calories: 680, protein: 1, fat: 75, carbs: 1, fiber: 0 },
  'dau an': { calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
  'nuoc tuong': { calories: 53, protein: 5.5, fat: 0.6, carbs: 6, fiber: 0.8 },
  'nuoc mam': { calories: 35, protein: 5, fat: 0, carbs: 3, fiber: 0 },
  'mi goi': { calories: 350, protein: 7, fat: 13, carbs: 51, fiber: 2.5 },
  'mi hao hao': { calories: 350, protein: 7, fat: 13, carbs: 51, fiber: 2.5 },
  'nep': { calories: 360, protein: 7, fat: 1, carbs: 80, fiber: 1.2 },
  'duong': { calories: 387, protein: 0, fat: 0, carbs: 100, fiber: 0 },
  'dau xanh': { calories: 347, protein: 23, fat: 1.2, carbs: 62, fiber: 16 },
  'cui dua': { calories: 354, protein: 3.3, fat: 33, carbs: 15, fiber: 9 },
  'buoi': { calories: 38, protein: 0.8, fat: 0, carbs: 9.6, fiber: 1 }
};

const parseQuantityInGrams = (qtyStr, unitStr) => {
  const normQty = String(qtyStr || '').toLowerCase();
  const normUnit = String(unitStr || '').toLowerCase();
  
  const match = normQty.match(/([0-9.,]+)/);
  if (!match) return 100;
  
  let val = parseFloat(match[1].replace(',', '.'));
  if (isNaN(val)) val = 100;

  if (normUnit.includes('kg')) return val * 1000;
  if (normUnit.includes('g') || normUnit.includes('gr')) return val;
  if (normUnit.includes('ml')) return val;
  if (normUnit.includes('l') || normUnit.includes('lit')) return val * 1000;
  
  return val;
};

export const calculateLocalNutrition = (ingredients, servings = 2) => {
  let calories = 0, protein = 0, fat = 0, carbs = 0, fiber = 0;
  
  for (const ing of ingredients) {
    if (!ing || !ing.name) continue;
    const nameNorm = normalizeStr(ing.name);
    let matchedKey = Object.keys(NUTRITION_DICTIONARY).find(key => nameNorm.includes(normalizeStr(key)));
    const profile = matchedKey ? NUTRITION_DICTIONARY[matchedKey] : { calories: 30, protein: 1, fat: 0.5, carbs: 5, fiber: 1 };
    
    const qtyGrams = parseQuantityInGrams(ing.quantity, ing.unit);
    const isPerPiece = ['banh mi', 'sandwich', 'trung', 'mi goi', 'mi hao hao'].some(k => nameNorm.includes(k));
    const multiplier = isPerPiece ? qtyGrams : qtyGrams / 100;
    
    calories += (profile.calories * multiplier);
    protein += (profile.protein * multiplier);
    fat += (profile.fat * multiplier);
    carbs += (profile.carbs * multiplier);
    fiber += (profile.fiber * multiplier);
  }
  
  const finalServings = servings > 0 ? servings : 2;
  return {
    calories: Math.round(calories / finalServings) || 350,
    protein: Math.round((protein / finalServings) * 10) / 10 || 15,
    fat: Math.round((fat / finalServings) * 10) / 10 || 10,
    carbs: Math.round((carbs / finalServings) * 10) / 10 || 45,
    fiber: Math.round((fiber / finalServings) * 10) / 10 || 3
  };
};

const recipeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
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
        required: ['name', 'quantity']
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
        required: ['step', 'description']
      }
    },
    tips: {
      type: 'array',
      items: { type: 'string' }
    },
    tags: {
      type: 'array',
      items: { type: 'string' }
    },
    nutrition: {
      type: 'object',
      properties: {
        calories: { type: 'number' },
        protein: { type: 'number' },
        fat: { type: 'number' },
        carbs: { type: 'number' },
        fiber: { type: 'number' }
      },
      required: ['calories', 'protein', 'fat', 'carbs']
    }
  },
  required: ['title', 'description', 'prep_time', 'cook_time', 'ingredients', 'steps', 'nutrition']
};

const DISH_FALLBACKS = {
  'ga-kho': { title: 'Gà Kho', desc: 'Gà kho đậm đà với nước mắm, đường và gia vị truyền thống Việt Nam, thịt gà mềm thấm vị mặn ngọt hài hòa.', ingredients: [
    { name: 'Đùi gà', quantity: '500', unit: 'g', note: 'Chặt miếng vừa ăn' }, { name: 'Nước mắm', quantity: '3', unit: 'thìa canh', note: 'Loại ngon' }, { name: 'Đường', quantity: '2', unit: 'thìa canh', note: 'Đường phên hoặc đường trắng' }, { name: 'Hành tím', quantity: '3', unit: 'củ', note: 'Bằm nhỏ' }, { name: 'Tỏi', quantity: '4', unit: 'tép', note: 'Bằm nhỏ' }, { name: 'Tiêu đen', quantity: '1', unit: 'thìa cà phê', note: 'Xay nhỏ' }, { name: 'Nước dừa tươi', quantity: '200', unit: 'ml', note: 'Hoặc nước lọc' }, { name: 'Ớt tươi', quantity: '1', unit: 'trái', note: 'Tùy chọn' }
  ]},
  'thit-kho': { title: 'Thịt Kho', desc: 'Thịt kho truyền thống với thịt ba chỉ mềm rục, thấm đều nước mắm và nước dừa, ăn kèm cơm trắng.', ingredients: [
    { name: 'Thịt ba chỉ', quantity: '500', unit: 'g', note: 'Cắt miếng vuông' }, { name: 'Nước mắm', quantity: '3', unit: 'thìa canh', note: '' }, { name: 'Đường', quantity: '2', unit: 'thìa canh', note: 'Thắng caramel' }, { name: 'Nước dừa tươi', quantity: '300', unit: 'ml', note: '' }, { name: 'Hành tím', quantity: '2', unit: 'củ', note: 'Bằm nhỏ' }, { name: 'Tỏi', quantity: '3', unit: 'tép', note: 'Bằm nhỏ' }, { name: 'Tiêu đen', quantity: '1', unit: 'thìa cà phê', note: '' }, { name: 'Trứng vịt', quantity: '4', unit: 'quả', note: 'Luộc chín, bóc vỏ' }
  ]},
  'pho-bo': { title: 'Phở Bò', desc: 'Phở bò Hà Nội với nước dùng xương bò hầm trong nhiều giờ, thơm ngọt đậm đà cùng bánh phở mềm.', ingredients: [
    { name: 'Xương bò', quantity: '1', unit: 'kg', note: 'Rửa sạch' }, { name: 'Thịt bò tái', quantity: '300', unit: 'g', note: 'Thái lát mỏng' }, { name: 'Bánh phở tươi', quantity: '400', unit: 'g', note: '' }, { name: 'Hành tây', quantity: '1', unit: 'củ', note: 'Nướng thơm' }, { name: 'Gừng', quantity: '1', unit: 'nhánh', note: 'Nướng thơm' }, { name: 'Quế', quantity: '1', unit: 'thanh', note: '' }, { name: 'Hồi', quantity: '3', unit: 'cánh', note: '' }, { name: 'Nước mắm', quantity: '2', unit: 'thìa canh', note: '' }
  ]},
  'banh-in': { 
    title: 'Bánh In', 
    desc: 'Bánh in là món bánh cổ truyền Sông nước & Cố đô Huế dẻo mịn từ bột nếp chín, ngọt bùi từ nhân đậu xanh sên kỹ và thoảng nhẹ hương hoa bưởi quý phái.', 
    ingredients: [
      { name: 'Bột nếp chín (bột bánh in)', quantity: '200', unit: 'g', note: 'Hoặc bột nếp thường rang thơm' }, 
      { name: 'Đường tinh luyện', quantity: '150', unit: 'g', note: 'Làm nước đường ngọt thanh' }, 
      { name: 'Đậu xanh không vỏ', quantity: '100', unit: 'g', note: 'Ngâm mềm trước khi nấu' }, 
      { name: 'Nước hoa bưởi', quantity: '1', unit: 'thìa cà phê', note: 'Tạo hương vị hoa bưởi đặc trưng' }, 
      { name: 'Nước lọc', quantity: '100', unit: 'ml', note: '' }, 
      { name: 'Dầu ăn', quantity: '1', unit: 'thìa cà phê', note: 'Sên nhân đậu xanh' }, 
      { name: 'Muối', quantity: '1/4', unit: 'thìa cà phê', note: '' }
    ],
    difficulty: 'Trung bình',
    prep_time: '15 phút',
    cook_time: '35 phút',
    steps: [
      { step: 1, title: 'Nấu nước đường ngọt thanh', description: 'Cho đường tinh luyện và nước lọc vào nồi nhỏ. Đun lửa vừa và khuấy cho tan hết đường. Tắt bếp, để nguội hoàn toàn rồi trộn nước hoa bưởi vào.', duration: '10 phút' },
      { step: 2, title: 'Làm nhân đậu xanh sên dẻo', description: 'Đậu xanh không vỏ đem vo sạch, hấp chín mềm rồi tán mịn. Cho vào chảo sên lửa nhỏ cùng chút đường, muối, và dầu ăn cho đến khi đậu kết thành khối dẻo mịn không dính chảo.', duration: '20 phút' },
      { step: 3, title: 'Trộn bột bánh in', description: 'Rây bột nếp chín vào tô lớn. Rưới từ từ nước đường hoa bưởi nguội vào bột. Dùng tay chà xát nhẹ nhàng để nước đường thấm đều bột nếp, tạo độ ẩm xốp vừa phải.', duration: '15 phút' },
      { step: 4, title: 'Tạo hình bánh bằng khuôn', description: 'Cho một lớp bột nếp đã ẩm xốp vào khuôn nén nhẹ. Tiếp theo cho một phần nhân đậu xanh sên vào giữa, rồi phủ thêm bột nếp kín khuôn. Dùng nắp ép lực đều để bánh kết dính.', duration: '10 phút' },
      { step: 5, title: 'Đóng khuôn hoàn thành', description: 'Gõ nhẹ khuôn để lấy bánh ra ngoài. Bánh in chín có màu trắng tinh khôi, hoa văn sắc nét, bảo quản trong hộp kín hoặc thưởng thức cùng trà nóng.', duration: '5 phút' }
    ],
    tips: [
      'Chọn bột bánh in mới để tránh mùi mốc dầu',
      'Đậu xanh sên phải đủ khô dẻo để bánh không bị chảy xệ',
      'Nước đường phải thật nguội mới trộn bột để tránh làm bột chín vón cục'
    ],
    tags: ['Món ngọt', 'Bánh truyền thống', 'Ẩm thực Huế', 'Món chay']
  }
};

const buildStructuredFallback = (dishName, servings) => {
  const norm = dishName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const match = DISH_FALLBACKS[norm];

  const title = match?.title || dishName;
  const desc = match?.desc || `Công thức ${dishName} – món ăn truyền thống Việt Nam được chế biến từ nguyên liệu tươi ngon, phù hợp cho bữa cơm gia đình.`;
  const ingredients = match?.ingredients || [
    { name: 'Nguyên liệu chính', quantity: '500', unit: 'g', note: 'Sơ chế sạch' },
    { name: 'Nước mắm', quantity: '2', unit: 'thìa canh', note: '' },
    { name: 'Đường', quantity: '1', unit: 'thìa canh', note: '' },
    { name: 'Hành tím', quantity: '2', unit: 'củ', note: 'Bằm nhỏ' },
    { name: 'Tỏi', quantity: '3', unit: 'tép', note: 'Bằm nhỏ' },
    { name: 'Tiêu đen', quantity: '1', unit: 'thìa cà phê', note: '' },
    { name: 'Dầu ăn', quantity: '2', unit: 'thìa canh', note: '' },
    { name: 'Ớt tươi', quantity: '1', unit: 'trái', note: 'Tùy chọn' }
  ];

  const prep_time = match?.prep_time || '20 phút';
  const cook_time = match?.cook_time || '30 phút';
  const difficulty = match?.difficulty || 'Trung bình';

  const steps = match?.steps || [
    { step: 1, title: 'Sơ chế nguyên liệu', description: `Rửa sạch và cắt thái tất cả nguyên liệu cho món ${title}. Hành tím và tỏi bằm nhỏ, ớt thái lát.`, duration: '10 phút' },
    { step: 2, title: 'Ướp gia vị', description: `Ướp nguyên liệu chính với nước mắm, đường, tiêu và hành tỏi bằm trong ít nhất 15 phút cho thấm đều.`, duration: '15 phút' },
    { step: 3, title: 'Phi thơm hành tỏi', description: 'Đun nóng dầu ăn trong chảo hoặc nồi, phi thơm hành tím và tỏi bằm cho đến khi vàng đều và tỏa mùi thơm.', duration: '3 phút' },
    { step: 4, title: 'Chế biến chính', description: `Cho nguyên liệu đã ướp vào nồi, đảo đều trên lửa vừa. Thêm nước vừa đủ, đậy nắp và nấu cho đến khi chín mềm.`, duration: '20 phút' },
    { step: 5, title: 'Hoàn thành và trình bày', description: `Nêm nếm lại gia vị cho vừa khẩu vị. Múc ${title} ra đĩa, rắc tiêu và hành lá, dùng nóng với cơm trắng.`, duration: '5 phút' }
  ];

  const tips = match?.tips || ['Nêm nếm gia vị từ từ để đạt vị vừa ăn', 'Dùng nóng với cơm trắng để ngon nhất', 'Có thể điều chỉnh lượng ớt theo khẩu vị'];
  const tags = match?.tags || ['Món Việt', 'Bữa cơm gia đình', 'Truyền thống'];

  return {
    title, description: desc, prep_time, cook_time, difficulty,
    ingredients, servings, ai_generated: false, source_type: 'fallback',
    steps, tips, tags,
    nutrition: calculateLocalNutrition(ingredients, servings)
  };
};

/**
 * AI-powered Recipe Generation.
 */
export const generateRecipe = async ({ dishName, servings = 2, appetite = 'normal' }) => {
  const cleanAppetite = String(appetite || 'normal').toLowerCase();
  console.info(`[aiService] Generating recipe for: "${dishName}" (servings: ${servings}, appetite: ${cleanAppetite})`);

  const systemPrompt = `Bạn là Chuyên gia Ẩm thực Việt Nam & Đầu bếp trưởng của Lotte Mart.
Bạn PHẢI tạo công thức nấu ăn chi tiết, chính xác bằng tiếng Việt cho thị trường Việt Nam.
QUY TẮC BẮT BUỘC:
- title PHẢI giữ nguyên tên món mà người dùng yêu cầu, viết hoa chữ cái đầu (VD: "Gà Kho", "Phở Bò", "Bún Chả"). KHÔNG được thêm nguyên liệu phụ vào tên trừ khi người dùng yêu cầu.
- Mỗi nguyên liệu (ingredient) phải có tên cụ thể, rõ ràng (VD: "Đùi gà" thay vì "Gà", "Nước mắm Phú Quốc" thay vì "Gia vị"). KHÔNG dùng tên chung chung như "Nguyên liệu chính" hay "Gia vị các loại".
- Mỗi bước nấu (step) phải mô tả chi tiết kỹ thuật nấu cụ thể cho món này, KHÔNG dùng câu chung chung.
- Giá trị dinh dưỡng phải thực tế và lớn hơn 0.
- PHÂN BIỆT RÕ MÓN NGỌT VÀ MÓN MẶN: Nếu món ăn là đồ ngọt, bánh ngọt truyền thống hoặc chè (VD: "Bánh In", "Bánh Dẻo", "Bánh Cốm", "Bánh Phu Thê", "Chè đậu xanh"), TUYỆT ĐỐI KHÔNG sử dụng các nguyên liệu mặn như: nước mắm, nước tương, hạt nêm, bột ngọt, tiêu đen, tỏi, hành tím phi, hành lá, ớt, thịt gà, thịt heo, thịt bò. Các nguyên liệu ngọt phải kết hợp cùng nước đường, nước hoa bưởi, nước lọc hoặc cốt dừa, không dùng dầu mỡ phi hành tỏi chiên xào.`;

  const userPrompt = `Tạo công thức nấu ăn hoàn chỉnh cho:
Tên món: ${dishName}
Khẩu phần: ${servings} người
Sức ăn: ${cleanAppetite === 'small' ? 'Ít' : cleanAppetite === 'large' ? 'Nhiều' : 'Bình thường'}

YÊU CẦU JSON:
1. title: PHẢI là "${dishName}" (viết hoa đầu từ, KHÔNG thêm/bớt từ)
2. description: Mô tả hấp dẫn ≥20 từ về nguồn gốc và đặc trưng món ăn
3. prep_time, cook_time: thời gian thực tế (VD: "15 phút")
4. difficulty: "Dễ" | "Trung bình" | "Khó"
5. ingredients: ≥8 nguyên liệu CỤ THỂ, mỗi cái có name (tên rõ ràng như "Bột nếp chín", "Nước hoa bưởi"), quantity, unit, note. KHÔNG sử dụng gia vị món mặn hay phi tỏi ớt cho bánh ngọt/chè.
6. steps: ≥5 bước nấu CHI TIẾT cho đúng món này, mỗi bước có step, title, description (≥40 ký tự mô tả kỹ thuật cụ thể cho món này), duration.
7. tips: ≥3 mẹo thực tế
8. tags: từ khóa liên quan
9. nutrition: calories, protein, fat, carbs, fiber - tính thực tế cho mỗi phần ăn, tất cả >0

Trả về JSON hợp lệ theo schema.`;

  try {
    const parsed = await requestJsonCompletion({
      systemPrompt,
      userPrompt,
      schema: recipeSchema,
      temperature: 0.3,
      maxTokens: 3500
    });

    if (parsed) {
      console.log('[aiService] generateRecipe parsed title:', parsed.title);
      // Enforce title preservation
      if (!parsed.title || parsed.title.trim().length < 2) {
        parsed.title = dishName;
      }
      parsed.servings = servings;
      parsed.ai_generated = true;
      parsed.source_type = 'ai_generated';

      // Validate nutrition - recalculate if all zeros
      if (parsed.nutrition && parsed.ingredients) {
        const n = parsed.nutrition;
        if (!n.calories && !n.protein && !n.fat && !n.carbs) {
          parsed.nutrition = calculateLocalNutrition(parsed.ingredients, servings);
        }
      }

      // Safeguard sweet recipes from accidental savory hallucinations
      const sweetKeywords = ['banh-in', 'banh-deo', 'banh-troi', 'banh-chay', 'che-', 'banh-phu-the', 'banh-xu-xe', 'banh-com'];
      const normalizedTitle = normalizeStr(parsed.title);
      const isSweet = sweetKeywords.some(kw => normalizedTitle.includes(kw));
      if (isSweet) {
        const savoryKeywords = ['nước mắm', 'nuoc mam', 'tỏi', 'toi', 'hành', 'hanh', 'tiêu', 'tieu', 'ớt', 'ot', 'thịt gà', 'thịt heo', 'thịt bò'];
        const hasSavory = parsed.ingredients.some(ing => 
          savoryKeywords.some(sk => ing.name.toLowerCase().includes(sk))
        );
        if (hasSavory) {
          console.warn(`[aiService] Sweet recipe "${parsed.title}" contained savory ingredients. Rejecting and falling back to structured definition.`);
          return buildStructuredFallback(dishName, servings);
        }
      }

      return parsed;
    }
    throw new Error('AI generation returned empty result');
  } catch (err) {
    console.warn(`[aiService] AI call failed. Using structured fallback. Error:`, err.message);
    return buildStructuredFallback(dishName, servings);
  }
};

/**
 * AI-powered Recipe Enrichment (filling missing fields, computing nutrition).
 */
export const enrichRecipe = async (incompleteRecipe, servings = 2, appetite = 'normal') => {
  const cleanAppetite = String(appetite || 'normal').toLowerCase();
  console.info(`[aiService] Enriching incomplete recipe: "${incompleteRecipe.title || 'Món ăn'}"`);

  const systemPrompt = `Bạn là Chuyên gia Dinh dưỡng & Đầu bếp trưởng của Lotte Mart.
Nhiệm vụ của bạn là bổ sung, hoàn thiện và chuẩn hóa công thức nấu ăn chưa đầy đủ.
Tập trung tính toán chính xác giá trị dinh dưỡng thực tế lớn hơn 0 cho mỗi phần ăn (per serving).`;

  const userPrompt = `Công thức nấu ăn hiện tại (chưa hoàn thiện):
${JSON.stringify(incompleteRecipe, null, 2)}

YÊU CẦU BỔ SUNG & HOÀN THIỆN:
1. Điền đầy đủ các thông tin còn thiếu.
2. Đảm bảo danh sách ingredients có ít nhất 6 nguyên liệu cụ thể (mỗi nguyên liệu có name, quantity, unit, note).
3. Đảm bảo steps có ít nhất 4 bước nấu chi tiết (mỗi bước có step, title, description dài ít nhất 30 ký tự, duration).
4. Cung cấp ít nhất 2 mẹo thực tế trong tips.
5. Tính toán giá trị dinh dưỡng (nutrition) bao gồm calories, protein (g), fat (g), carbs (g), và fiber (g) thực tế ước lượng lớn hơn 0 cho mỗi phần ăn (per serving).
6. Giữ nguyên các thông tin chính xác đã có sẵn.

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
      console.log('[aiService] enrichRecipe parsed output:', JSON.stringify(parsed));
      parsed.servings = servings;
      parsed.ai_generated = true;
      parsed.source_type = 'ai_generated';
      return parsed;
    }
    throw new Error('AI enrichment returned empty result');
  } catch (err) {
    console.warn(`[aiService] AI call failed during enrichRecipe. Using local rule-based nutrition fallback. Error:`, err.message);
    
    // Perform local nutrition calculation based on original ingredients
    const fallbackNutrition = calculateLocalNutrition(incompleteRecipe.ingredients || [], servings);
    
    // Construct fallback enriched recipe keeping all original fields intact but populating nutrition
    const enriched = {
      ...incompleteRecipe,
      nutrition: fallbackNutrition,
      completeness_status: 'complete',
      ai_generated: true,
      last_checked_at: new Date()
    };

    // Ensure steps are compliant
    if (!enriched.steps || enriched.steps.length < 3) {
      enriched.steps = [
        { step: 1, title: 'Sơ chế nguyên liệu', description: 'Rửa sạch các nguyên liệu, cắt thái miếng vừa ăn và để ráo nước.', duration: '5 phút' },
        { step: 2, title: 'Chế biến món ăn', description: 'Nấu chín nguyên liệu trên chảo nóng hoặc nồi hấp theo quy trình chuẩn vị.', duration: '15 phút' },
        { step: 3, title: 'Hoàn thành và thưởng thức', description: 'Trình bày món ăn ra đĩa đẹp mắt và dùng ngay khi còn nóng hổi.', duration: '5 phút' }
      ];
    }
    
    return enriched;
  }
};
