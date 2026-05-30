import mongoose from 'mongoose';
import '../../backend/config/loadEnv.js';
import Recipe from '../models/Recipe.js';

const popularRecipes = [
  {
    title: "Phở Bò Hà Nội (Hanoi Beef Pho)",
    normalized_name: "pho",
    canonical_key: "pho-2-normal",
    description: "Món phở bò truyền thống Việt Nam với nước dùng trong, ngọt thơm từ xương bò và hương vị thảo mộc tự nhiên.",
    prep_time: "20 phút",
    cook_time: "8 tiếng (hoặc dùng nước cốt xương)",
    servings: 2,
    difficulty: "Trung bình",
    image_url: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop",
    source_type: "admin",
    ai_generated: false,
    status: "active",
    completeness_status: "complete",
    aliases: ["pho", "pho-bo", "pho-ga", "phở", "phở-bò", "phở-gà", "hanoi-beef-pho", "pho-2-normal", "pho-2-small", "pho-2-large"],
    ingredients: [
      { name: "Bánh phở tươi", quantity: "500", unit: "g", note: "Chần sơ qua nước sôi" },
      { name: "Thịt bò fillet (thăn bò)", quantity: "200", unit: "g", note: "Thái lát mỏng" },
      { name: "Xương ống bò", quantity: "1", unit: "kg", note: "Ninh lấy nước dùng" },
      { name: "Hành tây, hành tím", quantity: "2", unit: "củ", note: "Nướng thơm" },
      { name: "Gừng tươi", quantity: "1", unit: "nhánh", note: "Nướng thơm, đập dập" },
      { name: "Quế, hồi, thảo quả, hạt mùi", quantity: "15", unit: "g", note: "Rang thơm, cho vào túi vải" },
      { name: "Gia vị (nước mắm, muối, đường phèn)", quantity: "3", unit: "muỗng", note: "Nêm nước dùng" },
      { name: "Hành lá, rau mùi, húng quế", quantity: "100", unit: "g", note: "Rửa sạch, thái nhỏ" }
    ],
    steps: [
      {
        step: 1,
        title: "Sơ chế và ninh xương",
        description: "Rửa sạch xương ống bò, chần nước sôi rồi rửa lại. Ninh xương bò với 3 lít nước trong 6-8 tiếng cùng hành tây nướng, gừng nướng để nước ngọt trong.",
        duration: "420 phút"
      },
      {
        step: 2,
        title: "Chuẩn bị hương vị nước dùng",
        description: "Rang thơm quế, hồi, thảo quả, hạt mùi. Cho tất cả vào túi vải thả vào nồi nước dùng ninh thêm 1 tiếng trước khi ăn. Nêm nếm nước mắm, đường phèn và muối cho vừa vị.",
        duration: "60 phút"
      },
      {
        step: 3,
        title: "Chuẩn bị bánh phở và thịt",
        description: "Thái lát mỏng thịt bò fillet. Chần bánh phở tươi qua nước sôi rồi chia đều ra các tô.",
        duration: "10 phút"
      },
      {
        step: 4,
        title: "Trình bày và chan nước dùng",
        description: "Xếp thịt bò sống/chần sơ lên trên bánh phở, rắc hành lá thái nhỏ. Đun nước dùng sôi sùng sục rồi chan nóng trực tiếp lên tô phở để làm tái thịt bò.",
        duration: "5 phút"
      }
    ],
    tips: [
      "Nướng hành tây và gừng thật thơm trước khi cho vào nước dùng để tạo màu vàng nhẹ tự nhiên và mùi thơm quyến rũ.",
      "Luôn hớt bọt thường xuyên trong quá trình ninh xương để giữ nước dùng luôn trong trẻo."
    ],
    tags: ["Món nước", "Món truyền thống", "Thịt bò", "Bữa sáng"]
  },
  {
    title: "Bánh Mì Kẹp Thịt Việt Nam (Vietnamese Banh Mi)",
    normalized_name: "banhmi",
    canonical_key: "banhmi-2-normal",
    description: "Bánh mì Việt Nam giòn rụm kết hợp với pate gan thơm béo, chả lụa thịt nguội đặc trưng và đồ chua thanh mát.",
    prep_time: "15 phút",
    cook_time: "10 phút",
    servings: 2,
    difficulty: "Dễ",
    image_url: "https://images.unsplash.com/photo-1600454641103-0b19ebc53c43?w=800&auto=format&fit=crop",
    source_type: "admin",
    ai_generated: false,
    status: "active",
    completeness_status: "complete",
    aliases: ["banhmi", "banh-mi", "bánh-mì", "vietnamese-banh-mi", "banhmi-2-normal", "banhmi-2-small", "banhmi-2-large"],
    ingredients: [
      { name: "Ổ bánh mì", quantity: "2", unit: "ổ", note: "Nướng lại cho giòn rụm" },
      { name: "Pate gan heo", quantity: "80", unit: "g", note: "Dùng phết bánh mì" },
      { name: "Chả lụa (Giò lụa)", quantity: "100", unit: "g", note: "Thái lát mỏng dài" },
      { name: "Thịt xá xíu hoặc thịt nguội", quantity: "100", unit: "g", note: "Thái mỏng" },
      { name: "Đồ chua (củ cải và cà rốt ngâm giấm)", quantity: "60", unit: "g", note: "Vắt bớt nước" },
      { name: "Sốt bơ trứng gà", quantity: "2", unit: "muỗng canh", note: "Tạo độ ngậy" },
      { name: "Dưa leo, ngò rí, ớt tươi", quantity: "50", unit: "g", note: "Thái mỏng dưa leo, rửa sạch ngò" },
      { name: "Nước tương (xì dầu) hoặc sốt bánh mì", quantity: "2", unit: "muỗng cà phê", note: "Nêm nếm gia vị" }
    ],
    steps: [
      {
        step: 1,
        title: "Làm nóng bánh mì",
        description: "Cho ổ bánh mì vào lò nướng hoặc nồi chiên không dầu nướng ở 180 độ C trong 2-3 phút đến khi vỏ ngoài giòn rụm.",
        duration: "3 phút"
      },
      {
        step: 2,
        title: "Phết bơ và pate",
        description: "Dùng dao rạch dọc hông bánh mì. Phết một lớp sốt bơ trứng mỏng lên một bên và pate gan thơm béo lên bên đối diện.",
        duration: "2 phút"
      },
      {
        step: 3,
        title: "Xếp nhân thịt và chả",
        description: "Xếp lần lượt chả lụa thái lát, thịt xá xíu và dưa leo thái lát dọc theo chiều dài bánh mì.",
        duration: "3 phút"
      },
      {
        step: 4,
        title: "Thêm rau thơm, đồ chua và hoàn thiện",
        description: "Gắp đồ chua, ngò rí và vài lát ớt vào giữa. Rưới một chút nước tương thơm hoặc nước sốt thịt xá xíu nóng, kẹp lại và thưởng thức.",
        duration: "2 phút"
      }
    ],
    tips: [
      "Không ngâm đồ chua quá lâu trong giấm đường để giữ được độ giòn sần sật đặc trưng của cà rốt và củ cải.",
      "Bạn có thể tự làm sốt bơ trứng bằng cách đánh lòng đỏ trứng gà tươi với dầu ăn theo một chiều đến khi bông mịn."
    ],
    tags: ["Món khô", "Bánh mì", "Ăn nhanh", "Đường phố"]
  },
  {
    title: "Bún Chả Hà Nội (Hanoi Bun Cha)",
    normalized_name: "buncha",
    canonical_key: "buncha-2-normal",
    description: "Món ăn quốc hồn quốc túy của thủ đô Hà Nội với chả viên và chả miếng nướng than hoa thơm lừng thả trong chén nước mắm chua ngọt ấm nóng kèm đu đủ xanh.",
    prep_time: "30 phút",
    cook_time: "20 phút",
    servings: 2,
    difficulty: "Trung bình",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop",
    source_type: "admin",
    ai_generated: false,
    status: "active",
    completeness_status: "complete",
    aliases: ["buncha", "bun-cha", "bún-chả", "hanoi-bun-cha", "buncha-2-normal", "buncha-2-small", "buncha-2-large"],
    ingredients: [
      { name: "Thịt ba chỉ heo", quantity: "250", unit: "g", note: "Thái miếng mỏng để làm chả miếng" },
      { name: "Thịt nạc vai heo băm nhuyễn", quantity: "250", unit: "g", note: "Làm chả viên" },
      { name: "Bún tươi", quantity: "600", unit: "g", note: "Bày ra đĩa" },
      { name: "Đu đủ xanh và cà rốt làm dưa góp", quantity: "150", unit: "g", note: "Thái mỏng, bóp muối giấm đường" },
      { name: "Nước mắm ngon", quantity: "5", unit: "muỗng canh", note: "Pha nước chấm" },
      { name: "Tỏi băm, ớt băm, hành tím băm", quantity: "30", unit: "g", note: "Để ướp thịt và pha nước chấm" },
      { name: "Đường cát, giấm ăn hoặc nước cốt chanh", quantity: "3", unit: "muỗng canh", note: "Pha nước dùng chua ngọt" },
      { name: "Rau sống (xà lách, tía tô, kinh giới, húng láng)", quantity: "150", unit: "g", note: "Rửa sạch, ráo nước" }
    ],
    steps: [
      {
        step: 1,
        title: "Ướp thịt heo",
        description: "Ướp chả miếng và chả viên băm nhuyễn riêng biệt với hành tím băm, tỏi băm, nước mắm, đường, dầu hào và một chút nước hàng (nước màu) tạo màu vàng bóng đẹp. Ướp ít nhất 30 phút.",
        duration: "30 phút"
      },
      {
        step: 2,
        title: "Nướng chả trên than hoa",
        description: "Nặn chả viên thành các viên tròn dẹt vừa ăn. Xếp chả miếng và chả viên lên vỉ. Nướng trên bếp than hoa (hoặc lò nướng) đến khi xém vàng hai mặt và dậy mùi thơm đặc trưng.",
        duration: "20 phút"
      },
      {
        step: 3,
        title: "Pha nước chấm chua ngọt",
        description: "Pha nước mắm ngon với nước lọc ấm, đường, giấm (hoặc nước chanh) theo tỷ lệ chua ngọt hài hòa. Đun ấm nhẹ nước chấm trước khi dùng. Thêm tỏi, ớt băm và dưa góp đu đủ cà rốt giòn vào bát nước mắm.",
        duration: "10 phút"
      },
      {
        step: 4,
        title: "Thưởng thức bún chả",
        description: "Bày bún tươi và đĩa rau sống ra đĩa. Thả chả viên và chả miếng nướng nóng hổi vào bát nước mắm chua ngọt ấm, ăn kèm bún tươi và rau sống.",
        duration: "5 phút"
      }
    ],
    tips: [
      "Hãy ướp thịt băm vai heo với một chút mỡ phần hoặc bơ để viên chả nướng không bị khô xác mà mọng nước ngọt ngào.",
      "Nướng chả bằng than hoa là bí quyết số một để tạo hương thơm khói ngậy không thể thay thế."
    ],
    tags: ["Món nướng", "Món khô", "Ăn trưa", "Đặc sản Hà Nội"]
  },
  {
    title: "Cơm Tấm Sườn Bì Chả (Saigon Broken Rice)",
    normalized_name: "comtam",
    canonical_key: "comtam-2-normal",
    description: "Đĩa cơm tấm Sài Gòn kinh điển với sườn nướng mộc mạc thơm lừng, bì thính dai giòn, chả trứng hấp béo ngậy cùng nước mắm kẹo đặc trưng.",
    prep_time: "30 phút",
    cook_time: "25 phút",
    servings: 2,
    difficulty: "Khó",
    image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop",
    source_type: "admin",
    ai_generated: false,
    status: "active",
    completeness_status: "complete",
    aliases: ["comtam", "com-tam", "cơm-tấm", "saigon-broken-rice", "comtam-2-normal", "comtam-2-small", "comtam-2-large"],
    ingredients: [
      { name: "Gạo tấm thơm", quantity: "250", unit: "g", note: "Vo sạch, nấu chín bằng xửng hấp hoặc nồi cơm điện ít nước" },
      { name: "Sườn cốt lết heo có xương", quantity: "2", unit: "miếng", note: "Đập giập nhẹ cho mềm thịt trước khi ướp" },
      { name: "Thịt heo nạc băm & Trứng gà", quantity: "150", unit: "g", note: "Làm chả trứng cùng bún tàu, nấm mèo băm nhuyễn" },
      { name: "Bì heo (da heo) & Thính gạo rang", quantity: "100", unit: "g", note: "Bì luộc chín thái chỉ mỏng trộn thính gạo thơm" },
      { name: "Sả băm, tỏi băm, mật ong", quantity: "40", unit: "g", note: "Ướp sườn nướng" },
      { name: "Mỡ hành (hành lá thái nhỏ phi thơm với dầu ăn nóng)", quantity: "3", unit: "muỗng canh", note: "Phết lên đĩa cơm" },
      { name: "Nước mắm kẹo chua ngọt đặc", quantity: "4", unit: "muỗng canh", note: "Nước mắm nấu sệt với đường và tỏi ớt" },
      { name: "Dưa leo, cà chua, đồ chua dưa kiệu", quantity: "100", unit: "g", note: "Thái lát bày kèm đĩa cơm" }
    ],
    steps: [
      {
        step: 1,
        title: "Nấu cơm tấm và làm bì thính",
        description: "Nấu chín gạo tấm. Da heo rửa sạch luộc chín cùng một lát gừng, vớt ra ngâm nước đá rồi thái sợi cực mỏng. Trộn đều da heo thái sợi với thính gạo rang vàng thơm và một chút tỏi phi.",
        duration: "30 phút"
      },
      {
        step: 2,
        title: "Làm chả trứng hấp",
        description: "Trộn đều thịt heo băm với bún tàu ngâm nở cắt khúc, nấm mèo thái sợi, hành tím băm và 2 quả trứng gà. Nêm gia vị muối, tiêu, đường. Hấp chín hỗn hợp trong 20 phút. Phết một lòng đỏ trứng lên mặt chả hấp thêm 5 phút tạo màu vàng đẹp.",
        duration: "25 phút"
      },
      {
        step: 3,
        title: "Ướp và nướng sườn",
        description: "Ướp sườn cốt lết với tỏi băm, sả băm, mật ong, nước tương, dầu hào, dầu ăn và một chút sữa đặc để giữ sườn mềm ngọt. Nướng trên than hoa đến khi sườn vàng đều hai mặt và mọng nước.",
        duration: "20 phút"
      },
      {
        step: 4,
        title: "Pha nước mắm kẹo và hoàn thành đĩa cơm",
        description: "Nấu sôi nước mắm ngon với đường cát tỷ lệ 1:1 đến khi sệt lại, để nguội rồi thêm tỏi ớt băm nhuyễn và nước cốt chanh. Xới cơm tấm nóng ra đĩa, đặt sườn nướng, chả trứng, bì thính lên trên. Rưới mỡ hành lá và rưới nước mắm kẹo, dùng kèm dưa leo, cà chua.",
        duration: "100 phút"
      }
    ],
    tips: [
      "Ướp sườn với sữa đặc hoặc một ít nước ép cam/khóm sẽ giúp thịt sườn cốt lết khi nướng trở nên cực kỳ mềm mọng và không bị khô.",
      "Cơm tấm phải nấu bằng gạo tấm chuẩn, khi chín hạt cơm tơi xốp hơi khô một chút chứ không dẻo dính như gạo tẻ thường."
    ],
    tags: ["Món khô", "Cơm", "Đặc sản Sài Gòn", "Bữa sáng", "Ăn trưa"]
  },
  {
    title: "Gỏi Cuốn Tôm Thịt (Fresh Vietnamese Spring Rolls)",
    normalized_name: "goicuon",
    canonical_key: "goicuon-2-normal",
    description: "Món gỏi cuốn thanh mát, tốt cho sức khỏe với tôm luộc đỏ au, thịt ba chỉ ngọt mềm cùng rau sống cuộn trong lớp bánh tráng dai dai ăn kèm tương đen xào gan béo ngậy.",
    prep_time: "20 phút",
    cook_time: "15 phút",
    servings: 2,
    difficulty: "Dễ",
    image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop",
    source_type: "admin",
    ai_generated: false,
    status: "active",
    completeness_status: "complete",
    aliases: ["goicuon", "goi-cuon", "gỏi-cuốn", "fresh-spring-rolls", "goicuon-2-normal", "goicuon-2-small", "goicuon-2-large"],
    ingredients: [
      { name: "Bánh tráng dẻo", quantity: "1", unit: "xấp", note: "Chọn loại bánh tráng phơi sương mỏng dẻo" },
      { name: "Tôm thẻ tươi", quantity: "200", unit: "g", note: "Rửa sạch, luộc chín bóc vỏ xẻ đôi dọc lưng" },
      { name: "Thịt ba chỉ (ba rọi) heo", quantity: "250", unit: "g", note: "Luộc chín thái lát mỏng vừa ăn" },
      { name: "Bún tươi sợi nhỏ", quantity: "300", unit: "g", note: "Để cuộn kèm" },
      { name: "Hẹ lá, xà lách, rau thơm các loại", quantity: "150", unit: "g", note: "Rửa sạch, nhặt rau tươi ngon" },
      { name: "Tương hột đen xào", quantity: "100", unit: "ml", note: "Làm nước chấm sốt tương đen ngọt bùi" },
      { name: "Bơ đậu phộng (peanut butter)", quantity: "2", unit: "muỗng canh", note: "Trộn cùng tương đen tạo độ béo ngậy" },
      { name: "Đậu phộng rang giã nhỏ, đồ chua", quantity: "30", unit: "g", note: "Rắc lên bát nước chấm" }
    ],
    steps: [
      {
        step: 1,
        title: "Luộc tôm thịt",
        description: "Luộc chín thịt ba chỉ heo trong nước sôi có nêm chút muối và hành củ đập dập, vớt ra thái mỏng. Luộc chín tôm thẻ tươi trong 3-5 phút, lột vỏ, bỏ chỉ đen và cắt dọc đôi tôm theo chiều dài.",
        duration: "15 phút"
      },
      {
        step: 2,
        title: "Chuẩn bị nước chấm tương đen",
        description: "Phi thơm tỏi băm với chút dầu ăn. Cho tương hột đen xay nhuyễn vào chảo cùng bơ đậu phộng và chút nước lọc nấu sôi nhẹ. Nêm chút đường cho vị ngọt dịu béo ngậy bùi bùi.",
        duration: "10 phút"
      },
      {
        step: 3,
        title: "Cuộn gỏi cuốn tôm thịt",
        description: "Thấm ẩm nhẹ bánh tráng dẻo. Đặt xà lách, rau thơm, một nhúm bún tươi lên phía dưới bánh tráng. Đặt 2-3 lát thịt ba chỉ. Cuộn lại một vòng rồi xếp 3 con tôm (mặt đỏ quay xuống dưới để nổi màu đẹp) và cọng hẹ thò ra ngoài. Tiếp tục cuộn chặt tay.",
        duration: "15 phút"
      },
      {
        step: 4,
        title: "Trình bày và thưởng thức",
        description: "Xếp các cuốn gỏi cuốn tôm thịt ra đĩa. Múc sốt tương đen ra chén nhỏ, rắc đậu phộng rang giã nhỏ, hành phi và đồ chua lên trên rồi thưởng thức trực tiếp.",
        duration: "5 phút"
      }
    ],
    tips: [
      "Khi luộc tôm nên luộc lửa lớn thật nhanh và thả ngay vào tô nước đá lạnh để giữ thịt tôm ngọt giòn sần sật và có màu đỏ đỏ cam cam đẹp mắt.",
      "Cuộn gỏi cuốn vừa tay, không quá lỏng cũng không quá chặt để bánh tráng không bị rách và đẹp mắt."
    ],
    tags: ["Món khô", "Ăn nhẹ", "Gỏi cuốn", "Tốt cho sức khỏe", "Healthy"]
  },
  {
    title: "Cà Ri Gà Nước Cốt Dừa (Vietnamese Chicken Curry)",
    normalized_name: "caritga",
    canonical_key: "caritga-2-normal",
    description: "Món cà ri gà mang phong vị Việt Nam đậm đà, béo ngậy từ nước cốt dừa tươi, thịt gà ta dai ngon hòa quyện cùng khoai tây, khoai lang ngọt bùi.",
    prep_time: "25 phút",
    cook_time: "35 phút",
    servings: 2,
    difficulty: "Trung bình",
    image_url: "https://images.unsplash.com/photo-1608500218900-88f32117cd95?w=800&auto=format&fit=crop",
    source_type: "admin",
    ai_generated: false,
    status: "active",
    completeness_status: "complete",
    aliases: ["caritga", "caritga-2-normal", "caritga-2-small", "caritga-2-large", "cariga", "ca-ri-ga", "cà-ri-gà", "vietnamese-chicken-curry"],
    ingredients: [
      { name: "Thịt đùi gà hoặc ức gà ta", quantity: "500", unit: "g", note: "Chặt miếng vừa ăn" },
      { name: "Khoai lang, khoai tây", quantity: "250", unit: "g", note: "Gọt vỏ cắt miếng vuông, chiên sơ cho cứng cạnh" },
      { name: "Nước cốt dừa đậm đặc", quantity: "200", unit: "ml", note: "Dùng để tạo độ béo thơm" },
      { name: "Bột cà ri & Dầu cà ri", quantity: "15", unit: "g", note: "Gia vị tạo màu và mùi đặc trưng" },
      { name: "Sả tươi đập dập", quantity: "3", unit: "nhánh", note: "Cắt khúc" },
      { name: "Hành tây, tỏi, hành tím băm", quantity: "40", unit: "g", note: "Gia vị phi thơm" },
      { name: "Sữa tươi không đường", quantity: "150", unit: "ml", note: "Nấu cùng nước cốt dừa làm ngọt nước dùng" },
      { name: "Gia vị (hạt nêm, nước mắm, đường)", quantity: "3", unit: "muỗng", note: "Ướp gà và nêm nếm" }
    ],
    steps: [
      {
        step: 1,
        title: "Ướp thịt gà và chuẩn bị khoai",
        description: "Ướp thịt gà chặt miếng với bột cà ri, hành tỏi băm, hạt nêm, muối, đường và sả đập dập trong 20 phút. Khoai lang, khoai tây gọt vỏ thái miếng vuông lớn rồi đem chiên vàng đều các mặt để khoai không bị nát khi nấu.",
        duration: "25 phút"
      },
      {
        step: 2,
        title: "Xào thơm thịt gà",
        description: "Phi thơm hành tím, tỏi băm và sả đập dập với dầu cà ri. Cho gà đã ướp vào xào săn trên lửa lớn đến khi thịt gà rút gia vị thơm ngon.",
        duration: "10 phút"
      },
      {
        step: 3,
        title: "Nấu cà ri gà với sữa và nước dão dừa",
        description: "Đổ nước lọc hoặc nước dão dừa loãng ngập thịt gà, cho sả cắt khúc vào đun sôi rồi hạ nhỏ lửa ninh gà chín mềm trong 20 phút. Trút toàn bộ khoai lang khoai tây đã chiên vào nồi nấu thêm 10 phút đến khi khoai mềm chín mềm ngọt bùi.",
        duration: "30 phút"
      },
      {
        step: 4,
        title: "Thêm cốt dừa và hoàn thiện",
        description: "Cho sữa tươi không đường và nước cốt dừa béo đặc vào nồi đun sôi nhẹ trở lại (không đun quá lâu làm tách dầu). Nêm nếm lại nước mắm, đường cho vừa vị béo ngọt mặn mà. Thêm hành tây cắt múi cau vào đun thêm 2 phút rồi tắt bếp. Thưởng thức kèm bánh mì hoặc bún tươi.",
        duration: "5 phút"
      }
    ],
    tips: [
      "Luôn chiên sơ cạnh khoai lang và khoai tây trước khi thả vào nồi cà ri để khi hầm khoai chín bùi ngọt mà không bị vỡ vụn làm đục nước cà ri.",
      "Nước cốt dừa chỉ nên cho vào ở công đoạn cuối cùng đun sôi lăn tăn trở lại rồi tắt bếp ngay để giữ nguyên hương vị béo ngậy nguyên bản của cốt dừa tươi."
    ],
    tags: ["Món nước", "Món lẩu", "Béo ngậy", "Ăn kèm bánh mì", "Bữa tối"]
  }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding popular recipes.");

    // Delete existing records matching our normalized names
    const names = popularRecipes.map(r => r.normalized_name);
    const deleteResult = await Recipe.deleteMany({ normalized_name: { $in: names } });
    console.log(`Deleted ${deleteResult.deletedCount} existing matching popular recipes.`);

    // Insert new records
    const inserted = await Recipe.insertMany(popularRecipes);
    console.log(`Successfully seeded ${inserted.length} popular Vietnamese recipes.`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

run();
