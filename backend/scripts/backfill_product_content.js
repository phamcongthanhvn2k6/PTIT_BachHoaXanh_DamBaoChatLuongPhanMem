import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../models/Product.js';

const richProductsData = [
  {
    nameMatch: 'Nước rửa chén Sunlight',
    brand: 'Sunlight',
    origin: 'Việt Nam',
    unit: 'Chai',
    weight: '750ml',
    images: [
      'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?q=80&w=800',
      'https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800'
    ],
    description: 'Nước rửa chén Sunlight Chanh Mới với công thức đậm đặc gấp 2 lần kết hợp chiết xuất chanh tươi tự nhiên giúp đánh bay dầu mỡ nhanh chóng, khử sạch mùi tanh khó chịu trên chén đĩa chỉ trong một lần rửa. Sản phẩm dịu nhẹ với da tay, thân thiện với môi trường.',
    short_description: 'Nước rửa chén Sunlight hương chanh đậm đặc đánh bay dầu mỡ hiệu quả.',
    specifications: {
      "Dung tích": "750ml",
      "Thành phần": "Chiết xuất chanh tươi, chất hoạt động bề mặt, hương chanh tự nhiên",
      "Thương hiệu": "Sunlight (Unilever)",
      "Nơi sản xuất": "Việt Nam",
      "Hạn sử dụng": "36 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Đổ trực tiếp sản phẩm vào miếng rửa chén đã thấm nước, bóp nhẹ để tạo bọt rồi tiến hành rửa chén đĩa. Rửa lại bằng nước sạch.',
    storage_guide: 'Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Để xa tầm tay trẻ em.',
    highlights: [
      'Chiết xuất chanh tươi tự nhiên 100%',
      'Công thức x2 đậm đặc tiết kiệm gấp đôi',
      'Dịu nhẹ, bảo vệ da tay người sử dụng',
      'Được kiểm nghiệm da liễu an toàn'
    ]
  },
  {
    nameMatch: 'Cà chua Đà Lạt',
    brand: 'Lotte Farm',
    origin: 'Đà Lạt, Việt Nam',
    unit: 'Khay',
    weight: '500g',
    images: [
      'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=800',
      'https://images.unsplash.com/photo-1592928303261-0b93b2c8c6c7?q=80&w=800',
      'https://images.unsplash.com/photo-1561136594-7f68413baa99?q=80&w=800'
    ],
    description: 'Cà chua Đà Lạt được trồng theo tiêu chuẩn VietGAP tại các nhà vườn liên kết ở Lâm Đồng. Trái cà chua chín tự nhiên, căng mọng, thịt quả dày, vị ngọt thanh và chứa nhiều Vitamin A, C tốt cho sức khỏe và làn da của bạn.',
    short_description: 'Cà chua chín tự nhiên, sạch chuẩn VietGAP tươi ngon mỗi ngày.',
    specifications: {
      "Khối lượng": "500g",
      "Tiêu chuẩn": "VietGAP",
      "Thương hiệu": "Lotte Farm",
      "Xuất xứ": "Đà Lạt, Lâm Đồng",
      "Đặc điểm": "Trái chín tự nhiên, không chất bảo quản"
    },
    usage_guide: 'Sử dụng trực tiếp làm salad, nấu canh, làm nước sốt hoặc ép nước uống giải nhiệt.',
    storage_guide: 'Bảo quản ở nhiệt độ phòng nơi thoáng mát hoặc ngăn mát tủ lạnh (4-8 độ C) để giữ độ tươi ngon lâu hơn.',
    highlights: [
      'Chuẩn VietGAP, an toàn cho cả gia đình',
      'Tươi ngon hái mới mỗi ngày từ nông trại Đà Lạt',
      'Giàu Vitamin A, C, Lycopene chống oxy hóa mạnh mẽ',
      'Mọng nước, vị ngọt thanh mát tự nhiên'
    ]
  },
  {
    nameMatch: 'Pepsi Cola',
    brand: 'Pepsi',
    origin: 'Việt Nam',
    unit: 'Chai',
    weight: '1.5L',
    images: [
      'https://images.unsplash.com/photo-1622484212850-eb596d769edc?q=80&w=800',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=800',
      'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?q=80&w=800'
    ],
    description: 'Nước ngọt Pepsi Cola với hương vị cola đặc trưng, sảng khoái cực độ giúp bạn giải tỏa cơn khát tức thì. Pepsi kích thích vị giác, cho các bữa ăn gia đình, tiệc tùng của bạn thêm phần trọn vị và hứng khởi.',
    short_description: 'Nước giải khát Pepsi hương vị sảng khoái, đã khát tột đỉnh.',
    specifications: {
      "Thể tích thực": "1.5L",
      "Thành phần": "Nước bão hòa CO2, đường mía, màu tổng hợp, chất điều chỉnh độ axit, hương tự nhiên",
      "Thương hiệu": "PepsiCo Việt Nam",
      "Xuất xứ": "Việt Nam",
      "Hạn sử dụng": "12 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Uống trực tiếp. Ngon hơn khi uống lạnh hoặc dùng kèm với đá.',
    storage_guide: 'Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp hoặc nguồn nhiệt cao.',
    highlights: [
      'Vị Cola nguyên bản sảng khoái, bừng tỉnh năng lượng',
      'Chai lớn 1.5L tiện lợi cho các bữa tiệc gia đình',
      'Thương hiệu giải khát hàng đầu thế giới',
      'Kích thích tiêu hóa, giúp bữa ăn ngon miệng hơn'
    ]
  },
  {
    nameMatch: 'Bột giặt Omo',
    brand: 'Omo',
    origin: 'Việt Nam',
    unit: 'Túi',
    weight: '3kg',
    images: [
      'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?q=80&w=800',
      'https://images.unsplash.com/photo-1581579188871-45ea61f2a97f?q=80&w=800',
      'https://images.unsplash.com/photo-1616627980059-9d8e3e1c390f?q=80&w=800'
    ],
    description: 'Bột giặt Omo Hệ Ba Tác Động mới đánh bay mọi vết bẩn cứng đầu chỉ trong một lần giặt mà không gây phai màu hay hư tổn sợi vải. Hương thơm ngát tươi mát bám sâu vào từng sợi vải giúp quần áo luôn thơm tho suốt cả ngày dài.',
    short_description: 'Bột giặt Omo xoáy bay vết bẩn cứng đầu nhanh chóng, hương thơm mát lành.',
    specifications: {
      "Khối lượng": "3kg",
      "Loại bột giặt": "Giặt tay và giặt máy cửa trên",
      "Thương hiệu": "OMO (Unilever)",
      "Xuất xứ": "Việt Nam",
      "Hạn sử dụng": "36 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Hòa tan 1 muỗng bột giặt Omo với khoảng 3-4 lít nước. Ngâm quần áo trong 15 phút sau đó vò nhẹ và xả lại bằng nước sạch.',
    storage_guide: 'Bảo quản nơi khô ráo, sạch sẽ. Tránh xa tầm tay trẻ em. Không được nuốt.',
    highlights: [
      'Hệ xoáy bẩn thông minh đánh bay vết bẩn sau 1 lần vò',
      'Thấm sâu vào từng sợi vải, lưu hương thơm tho suốt cả ngày',
      'Không làm mòn vải, an toàn cho da tay',
      'Bao bì túi lớn 3kg tiết kiệm tối đa cho gia đình'
    ]
  },
  {
    nameMatch: 'Sữa tươi Vinamilk',
    brand: 'Vinamilk',
    origin: 'Việt Nam',
    unit: 'Hộp',
    weight: '1L',
    images: [
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=800',
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800',
      'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=800'
    ],
    description: 'Sữa tươi tiệt trùng Vinamilk 100% Sữa Tươi nguyên chất từ hệ thống trang trại đạt chuẩn quốc tế của Vinamilk. Sữa dồi dào Vitamin D3, Calci, và các dưỡng chất thiết yếu giúp hỗ trợ hệ miễn dịch, cho cả gia đình luôn khỏe mạnh và tràn đầy năng lượng mỗi ngày.',
    short_description: '100% sữa tươi nguyên chất tiệt trùng thơm ngon dồi dào dinh dưỡng.',
    specifications: {
      "Dung tích": "1L",
      "Thành phần": "Sữa bò tươi nguyên chất 100%, vitamin D3, vitamin A, khoáng chất",
      "Thương hiệu": "Vinamilk Việt Nam",
      "Xuất xứ": "Việt Nam",
      "Hạn sử dụng": "6 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Lắc đều trước khi uống. Sử dụng trực tiếp. Nên dùng hết trong vòng 3 ngày sau khi mở nắp hộp.',
    storage_guide: 'Bảo quản nơi khô ráo, thoáng mát. Sau khi mở hộp, bảo quản lạnh ở nhiệt độ 4-8 độ C và dùng hết trong 3 ngày.',
    highlights: [
      '100% sữa tươi nguyên chất chất lượng cao',
      'Bổ sung Vitamin D3, A, Calci giúp phát triển chiều cao',
      'Được xử lý tiệt trùng bằng công nghệ UHT hiện đại',
      'Không chứa chất bảo quản nhân tạo, an toàn sức khỏe'
    ]
  },
  {
    nameMatch: 'Mì Hảo Hảo',
    brand: 'Acecook',
    origin: 'Việt Nam',
    unit: 'Gói',
    weight: '75g',
    images: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800',
      'https://images.unsplash.com/photo-1612966608967-3e2b497cb73f?q=80&w=800'
    ],
    description: 'Mì ăn liền Hảo Hảo vị Tôm Chua Cay truyền thống được sản xuất theo công nghệ Nhật Bản hiện đại. Sợi mì dai giòn vàng óng kết hợp cùng nước súp tôm chua cay đậm đà khó cưỡng, mang đến bữa ăn ngon nhanh chóng và tiện lợi.',
    short_description: 'Mì ăn liền Hảo Hảo vị Tôm Chua Cay thơm ngon chuẩn vị truyền thống.',
    specifications: {
      "Khối lượng": "75g",
      "Hương vị": "Tôm chua cay",
      "Thành phần": "Bột mì, dầu cọ, muối, bột tôm, ớt, sả, hành khô",
      "Thương hiệu": "Acecook Việt Nam",
      "Xuất xứ": "Việt Nam",
      "Hạn sử dụng": "5 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Cho vắt mì và các gói gia vị vào tô. Chế khoảng 400ml nước sôi vào, đậy nắp lại chờ trong 3 phút. Trộn đều và thưởng thức.',
    storage_guide: 'Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp và các hóa chất có mùi mạnh.',
    highlights: [
      'Mì gói quốc dân được yêu thích nhất Việt Nam',
      'Sợi mì vàng dai giòn tự nhiên từ lúa mì thượng hạng',
      'Vị tôm chua cay đậm đà, thơm nức mũi',
      'Sản xuất theo tiêu chuẩn công nghệ Nhật Bản an toàn tuyệt đối'
    ]
  },
  {
    nameMatch: 'Coca Cola',
    brand: 'Coca-Cola',
    origin: 'Việt Nam',
    unit: 'Chai',
    weight: '1.5L',
    images: [
      'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=800',
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800'
    ],
    description: 'Nước giải khát Coca-Cola Original Taste mang lại hương vị sảng khoái dâng tràn, khơi dậy tinh thần sảng khoái và gắn kết mọi người xích lại gần nhau hơn trong mỗi bữa ăn hoặc các dịp lễ hội vui vẻ.',
    short_description: 'Nước ngọt Coca-Cola vị nguyên bản, đã khát tột đỉnh trong mọi cuộc vui.',
    specifications: {
      "Thể tích thực": "1.5L",
      "Thành phần": "Nước bão hòa CO2, đường mía, màu thực phẩm caramen nhóm IV, hương tự nhiên",
      "Thương hiệu": "Coca-Cola Việt Nam",
      "Xuất xứ": "Việt Nam",
      "Hạn sử dụng": "12 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Dùng uống trực tiếp. Ngon hơn khi uống lạnh.',
    storage_guide: 'Bảo quản ở nơi mát mẻ, khô ráo, tránh ánh nắng mặt trời trực tiếp.',
    highlights: [
      'Hương vị Coca-Cola Original truyền thống sảng khoái cực độ',
      'Kích thích hệ tiêu hóa hoạt động tốt hơn khi ăn đồ nhiều dầu mỡ',
      'Đồ uống không thể thiếu trong mọi bữa tiệc liên hoan',
      'Chai lớn 1.5L tiết kiệm cho nhóm đông người'
    ]
  },
  {
    nameMatch: 'Lê Đỏ Mỹ',
    brand: 'Lotte Import',
    origin: 'Mỹ',
    unit: 'Khay',
    weight: '1kg',
    images: [
      'https://images.unsplash.com/photo-1514986879303-36dfe422c882?q=80&w=800',
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800'
    ],
    description: 'Lê đỏ Mỹ nhập khẩu chính ngạch trực tiếp từ các trang trại trái cây hàng đầu Hoa Kỳ. Quả lê có vỏ màu đỏ tía bắt mắt, thịt quả trắng ngần, giòn ngọt, mọng nước và có mùi thơm nhẹ đặc trưng, chứa hàm lượng chất xơ dồi dào.',
    short_description: 'Lê đỏ nhập khẩu Mỹ giòn ngọt mọng nước dồi dào chất xơ.',
    specifications: {
      "Khối lượng": "1kg (từ 4-5 quả)",
      "Xuất xứ": "Mỹ (USA)",
      "Nhập khẩu bởi": "Lotte Mart Việt Nam",
      "Độ ngọt": "Ngọt đậm đà tự nhiên",
      "Giá trị dinh dưỡng": "Giàu chất xơ, kali và vitamin C"
    },
    usage_guide: 'Rửa sạch lớp vỏ ngoài bằng nước muối loãng, gọt vỏ ăn trực tiếp hoặc cắt lát làm salad trái cây mát lạnh.',
    storage_guide: 'Bảo quản lạnh ngăn mát tủ lạnh ở nhiệt độ từ 2-4 độ C để giữ độ tươi giòn và ngọt nước lâu nhất.',
    highlights: [
      'Nhập khẩu chính ngạch trực tiếp từ Mỹ, chất lượng loại 1',
      'Vỏ đỏ tía độc đáo sang trọng, thịt lê giòn ngọt tan trong miệng',
      'Cung cấp nhiều nước và Kali tốt cho huyết áp',
      'Tốt cho hệ tiêu hóa nhờ lượng chất xơ dồi dào'
    ]
  },
  {
    nameMatch: 'Chuối Cavendish',
    brand: 'Lotte Farm',
    origin: 'Việt Nam',
    unit: 'Nải',
    weight: '1kg',
    images: [
      'https://images.unsplash.com/photo-1574226516831-e1dff420e12e?q=80&w=800',
      'https://images.unsplash.com/photo-1603833665858-e61d17a86224?q=80&w=800',
      'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?q=80&w=800'
    ],
    description: 'Chuối già lùn Cavendish trồng hữu cơ tại các nông trại đạt tiêu chuẩn GlobalGAP của Lotte Mart. Chuối chín vàng đều, thơm ngọt dịu, kết cấu dẻo mịn. Đây là nguồn cung cấp Kali, Vitamin B6 và năng lượng tự nhiên dồi dào cho cơ thể.',
    short_description: 'Chuối Cavendish chín tự nhiên thơm ngọt chuẩn hữu cơ nông trại sạch.',
    specifications: {
      "Khối lượng": "1kg",
      "Giống chuối": "Cavendish",
      "Tiêu chuẩn": "GlobalGAP / VietGAP",
      "Xuất xứ": "Đồng Nai, Việt Nam",
      "Quy cách đóng gói": "Nải từ 6-8 trái"
    },
    usage_guide: 'Ăn trực tiếp khi chuối chín vàng, làm sinh tố trái cây dinh dưỡng hoặc làm bánh chuối nướng.',
    storage_guide: 'Bảo quản ở nhiệt độ phòng nơi thoáng gió. Không bọc kín túi nilon. Tránh đè nén mạnh gây dập quả.',
    highlights: [
      'Chuẩn GlobalGAP an toàn sinh học tuyệt đối',
      'Chín tự nhiên không ủ hóa chất kích thích',
      'Bổ sung lượng Kali dồi dào giúp hồi phục cơ bắp nhanh chóng',
      'Món ăn dặm hoàn hảo cho trẻ em và người tập thể thao'
    ]
  },
  {
    nameMatch: 'Kem Nivea',
    brand: 'Nivea',
    origin: 'Đức',
    unit: 'Hộp',
    weight: '50ml',
    images: [
      'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800'
    ],
    description: 'Kem dưỡng ẩm da mặt và cơ thể Nivea Creme chứa hoạt chất Eucerit độc quyền giúp bổ sung độ ẩm chuyên sâu cho da khô ráp. Sản phẩm bảo vệ làn da mịn màng, ngăn ngừa nứt nẻ hiệu quả trong mọi thời tiết lạnh và khô hanh.',
    short_description: 'Kem dưỡng ẩm chuyên sâu Nivea Creme cho da luôn mịn màng, căng mọng.',
    specifications: {
      "Dung tích": "50ml",
      "Thành phần chính": "Eucerit, Glycerin, Panthenol, Aqua",
      "Loại da phù hợp": "Da thường đến da khô ráp, da nhạy cảm",
      "Thương hiệu": "Nivea (Beiersdorf)",
      "Xuất xứ": "Đức"
    },
    usage_guide: 'Thoa đều một lớp kem mỏng lên vùng da mặt, tay, chân hoặc cơ thể đã làm sạch. Sử dụng hàng ngày vào mỗi tối để đạt hiệu quả tối ưu.',
    storage_guide: 'Bảo quản nơi khô thoáng, tránh ánh sáng trực tiếp và nhiệt độ cao.',
    highlights: [
      'Hoạt chất dưỡng ẩm Eucerit độc quyền của Nivea Đức',
      'Cấp ẩm tức thì, làm dịu và phục hồi vùng da bị nứt nẻ',
      'Thích hợp dưỡng ẩm cho toàn bộ cơ thể (mặt, tay, gót chân...)',
      'Công thức dịu nhẹ, lành tính không gây kích ứng da'
    ]
  },
  {
    nameMatch: 'Bánh quy Cosy',
    brand: 'Cosy',
    origin: 'Việt Nam',
    unit: 'Gói',
    weight: '150g',
    images: [
      'https://images.unsplash.com/photo-1558961309-dbdf71799f5a?q=80&w=800',
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800'
    ],
    description: 'Bánh quy thơm ngon Cosy giòn xốp rụm với vị ngọt béo hài hòa từ sữa dừa tự nhiên. Bánh quy bổ sung năng lượng nhanh chóng cho những buổi chiều bận rộn hay làm quà ăn vặt thú vị cho trẻ em.',
    short_description: 'Bánh quy ngọt Cosy giòn tan rụm vị sữa dừa béo bùi thơm ngon.',
    specifications: {
      "Khối lượng": "150g",
      "Thành phần": "Bột mì, dầu cọ, đường, sữa bột, bột cốt dừa, chất tạo xốp",
      "Thương hiệu": "Kinh Đô Mondelez Việt Nam",
      "Xuất xứ": "Việt Nam",
      "Hạn sử dụng": "12 tháng kể từ ngày sản xuất"
    },
    usage_guide: 'Ăn trực tiếp ngay sau khi mở bao bì gói. Thích hợp dùng kèm với trà ấm hoặc sữa tươi ngon.',
    storage_guide: 'Nơi khô ráo, thoáng mát, tránh ẩm ướt. Đậy kín hoặc kẹp chặt miệng túi nếu chưa dùng hết để giữ bánh luôn giòn.',
    highlights: [
      'Sản xuất bởi thương hiệu Kinh Đô danh tiếng',
      'Vị ngọt nhẹ, giòn xốp rụm kết hợp sữa dừa béo ngậy cực kỳ bắt miệng',
      'Đóng gói nhỏ gọn, tiện mang đi học, đi làm hoặc dã ngoại',
      'Bổ sung canxi và các chất dinh dưỡng cơ bản cho ngày dài năng động'
    ]
  },
  {
    nameMatch: 'Táo Fuji Nhật Bản',
    brand: 'Lotte Import',
    origin: 'Nhật Bản',
    unit: 'Khay',
    weight: '1kg',
    images: [
      'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=800',
      'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=800',
      'https://images.unsplash.com/photo-1579613832125-5d34a13ffe2a?q=80&w=800'
    ],
    description: 'Táo Fuji Nhật Bản cao cấp nhập khẩu chính ngạch trực tiếp từ các nhà vườn danh tiếng ở Aomori. Táo quả to, tròn đều, vỏ căng bóng màu đỏ hồng, thịt quả giòn ngọt đậm đà xen lẫn vị chua nhẹ tự nhiên, đặc biệt mọng nước.',
    short_description: 'Táo Fuji nhập khẩu Nhật Bản cao cấp quả to giòn ngọt mọng nước.',
    specifications: {
      "Khối lượng": "1kg (từ 3-4 quả)",
      "Nơi trồng": "Tỉnh Aomori, Nhật Bản",
      "Nhập khẩu bởi": "Lotte Mart Việt Nam",
      "Độ ngọt ngọt trung bình": "14-16 Brix",
      "Đặc điểm quả": "Căng bóng, vỏ đỏ sọc hồng đẹp mắt"
    },
    usage_guide: 'Rửa sạch dưới vòi nước và ăn trực tiếp cả vỏ để giữ trọn vẹn vitamin quý giá hoặc làm nước ép táo chua ngọt thanh mát.',
    storage_guide: 'Bảo quan tủ lạnh ngăn mát (0-4 độ C) để duy trì vị ngọt thanh, độ giòn và mọng nước lâu nhất của quả.',
    highlights: [
      'Táo Fuji Aomori nhập khẩu trực tiếp chất lượng cao nhất',
      'Độ giòn xuất sắc, cực kỳ mọng nước, vị ngọt đậm đà khác biệt',
      'Được kiểm định chất lượng gắt gao chuẩn hữu cơ Nhật Bản',
      'Món quà sức khỏe sang trọng tặng người thân, đối tác'
    ]
  }
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Running rich backfill for products...');

    // 1. Delete garbage test products
    const garbageKeywords = ['c', 'bbbbbb', 'xxxxx', 'dđ', 'aaa', 'qqqq', 'test'];
    const deleteResult = await Product.deleteMany({
      $or: [
        { name: { $in: garbageKeywords } },
        { name: { $regex: /^[a-z0-9]$/i } }, // Single character names
        { name: { $regex: /^(aaa+|bbb+|xxx+|qqq+)/i } }
      ]
    });
    console.log(`Deleted ${deleteResult.deletedCount} junk/test products from DB.`);

    // 2. Backfill details for real products
    const products = await Product.find({});
    console.log(`Auditing ${products.length} products for rich content...`);

    let updatedCount = 0;
    for (let p of products) {
      const richData = richProductsData.find(item => p.name.toLowerCase().includes(item.nameMatch.toLowerCase()));
      if (richData) {
        p.brand = richData.brand;
        p.origin = richData.origin;
        p.unit = richData.unit;
        p.weight = richData.weight;
        p.images = richData.images;
        p.thumbnail = richData.images[0];
        p.gallery = richData.images;
        p.description = richData.description;
        p.short_description = richData.short_description;
        p.specifications = richData.specifications;
        p.usage_guide = richData.usage_guide;
        p.storage_instructions = richData.storage_guide;
        p.storage_guide = richData.storage_guide;
        p.highlights = richData.highlights;
        p.is_active = true;

        await p.save();
        console.log(`-> Backfilled product [${p.name}] with rich specifications and high-res images.`);
        updatedCount++;
      } else {
        // Fallback check for arbitrary products
        let changed = false;
        if (!p.brand) { p.brand = 'LOTTE Selection'; changed = true; }
        if (!p.origin) { p.origin = 'Việt Nam'; changed = true; }
        if (!p.unit) { p.unit = 'Cái'; changed = true; }
        if (!p.description) { p.description = `${p.name} là sản phẩm chất lượng cao được kinh doanh tại Lotte Mart, đảm bảo an toàn vệ sinh thực phẩm và nguồn gốc xuất xứ rõ ràng.`; changed = true; }
        if (!p.specifications || Object.keys(p.specifications).length === 0) {
          p.specifications = {
            "Thương hiệu": p.brand || "LOTTE Selection",
            "Xuất xứ": p.origin || "Việt Nam",
            "Đơn vị tính": p.unit || "Cái",
            "Nhà phân phối": "Hệ thống siêu thị Lotte Mart toàn quốc"
          };
          changed = true;
        }
        if (changed) {
          await p.save();
          console.log(`-> Updated basic fallback details for product: [${p.name}]`);
          updatedCount++;
        }
      }
    }

    console.log(`Successfully completed backfill. Total updated/verified products: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill script failed:', err);
    process.exit(1);
  }
};

run();
