import React from 'react';
import FadeInSection from '../components/FadeInSection';

const NewsEvents: React.FC = () => {
  const articles = [
    {
      tag: "Tin tức",
      date: "23 Tháng 6, 2026",
      title: "Bách hóa XANH khai trương thêm 10 cửa hàng xanh kiểu mẫu mới",
      desc: "Hành trình phủ xanh các gia đình Việt tiếp tục mở rộng với 10 siêu thị mới hiện đại tích hợp quầy thanh toán tự động và hệ thống giữ lạnh thịt cá tươi sống chuẩn quốc tế.",
      img: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600"
    },
    {
      tag: "Sự kiện",
      date: "15 Tháng 6, 2026",
      title: "Chương trình thiện nguyện 'Bữa cơm yêu thương' đồng hành cùng vùng cao",
      desc: "Trích 1% doanh thu từ mỗi đơn hàng online trong tháng 6, Bách hóa XANH đã phối hợp tổ chức trao tặng 5.000 phần quà nhu yếu phẩm thiết yếu cho các hộ gia đình khó khăn.",
      img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600"
    },
    {
      tag: "Khuyến mãi",
      date: "01 Tháng 6, 2026",
      title: "Lễ hội trái cây nhiệt đới – Ưu đãi giải nhiệt mùa hè lên đến 50%",
      desc: "Đại tiệc trái cây Việt Nam hội tụ hàng chục mặt hàng xoài cát, dưa hấu, chôm chôm tươi ngon cắt trực tiếp tại vườn được phân phối độc quyền với giá bình ổn.",
      img: "https://images.unsplash.com/photo-1610832958506-ee56336191a1?q=80&w=600"
    }
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Tin tức & Sự kiện nổi bật
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Bách hóa XANH Newsroom
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Cập nhật những thông tin mới nhất về sản phẩm, các chiến dịch khuyến mãi hấp dẫn và hoạt động cộng đồng ý nghĩa từ chúng tôi.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-7xl mx-auto px-6 mt-16">
        <div className="grid md:grid-cols-3 gap-8">
          {articles.map((art, idx) => (
            <FadeInSection key={idx} delay={idx * 150}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full group">
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src={art.img}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    {art.tag}
                  </span>
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  <span className="text-xs text-slate-400 font-bold mb-2">{art.date}</span>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {art.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed flex-1">
                    {art.desc}
                  </p>
                  <button className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm mt-6 hover:translate-x-1 transition-transform self-start">
                    Đọc tiếp
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>
    </div>
  );
};

export default NewsEvents;
