import React, { useState } from 'react';
import FadeInSection from '../components/FadeInSection';

const Faq: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Làm thế nào để đặt hàng trực tuyến trên Bách hóa XANH?",
      a: "Quý khách chỉ cần truy cập trang web Bách hóa XANH, chọn siêu thị/địa chỉ giao hàng, tìm kiếm các sản phẩm cần mua và thêm vào giỏ hàng. Sau đó vào giỏ hàng, điền thông tin người nhận, chọn phương thức thanh toán và nhấn 'Đặt hàng' để hoàn tất."
    },
    {
      q: "Bách hóa XANH giao hàng trong những khung giờ nào?",
      a: "Bách hóa XANH phục vụ giao hàng từ 8:00 đến 22:00 hàng ngày (kể cả Thứ Bảy, Chủ Nhật và ngày lễ). Quý khách có thể lựa chọn Giao hàng siêu tốc trong 2 giờ hoặc đặt lịch hẹn khung giờ giao thuận tiện nhất."
    },
    {
      q: "Tôi có thể kiểm tra hàng trước khi thanh toán không?",
      a: "Hoàn toàn có thể. Bách hóa XANH khuyến khích khách hàng đồng kiểm hàng hóa cùng nhân viên giao nhận khi nhận hàng. Nếu phát hiện sản phẩm bị lỗi, hư hỏng hoặc sai phân loại, quý khách có thể gửi trả lại ngay cho nhân viên giao nhận mà không chịu bất cứ chi phí nào."
    },
    {
      q: "Làm sao để tôi được miễn phí phí vận chuyển?",
      a: "Với các đơn hàng có giá trị thanh toán từ 300.000đ trở lên, quý khách sẽ được MIỄN PHÍ 100% phí giao hàng. Với các đơn hàng dưới 300.000đ, phí giao hàng ưu đãi đồng giá chỉ là 15.000đ."
    },
    {
      q: "Tôi muốn tích điểm thành viên và sử dụng ưu đãi LOTTE Points như thế nào?",
      a: "Khi đăng ký tài khoản mua hàng, quý khách sẽ tự động được liên kết hệ thống tích lũy điểm thành viên. Với mỗi đơn hàng thành công, quý khách sẽ được tích lũy điểm thưởng. Điểm thưởng này có thể quy đổi trực tiếp thành mã giảm giá ở bước thanh toán đơn hàng."
    },
    {
      q: "Làm thế nào nếu sản phẩm giao đến bị hư hỏng hoặc ôi thiu?",
      a: "Đối với thực phẩm tươi sống bị lỗi chất lượng, quý khách vui lòng liên hệ hotline 1800 1067 hoặc gửi phản hồi trong phần Trung Tâm Hỗ Trợ trên ứng dụng/web trong vòng 24 giờ. Bách hóa XANH cam kết thu hồi sản phẩm lỗi và đổi mới sản phẩm mới hoặc hoàn trả tiền cho quý khách nhanh chóng."
    }
  ];

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Giải đáp thắc mắc
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Câu Hỏi Thường Gặp (FAQ)
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Bạn gặp khó khăn trong quá trình mua sắm hoặc có thắc mắc cần giải đáp? Tìm kiếm câu trả lời nhanh tại đây.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Accordion FAQ list */}
      <section className="max-w-4xl mx-auto px-6 mt-16">
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeIndex === index;
            return (
              <FadeInSection key={index} delay={index * 80}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none transition-colors"
                  >
                    <span className="text-sm sm:text-base pr-4">{faq.q}</span>
                    <span className={`material-symbols-outlined text-slate-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}>
                      keyboard_arrow_down
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-[300px] border-t border-slate-50 dark:border-slate-800' : 'max-h-0'
                    }`}
                  >
                    <p className="p-6 text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed bg-slate-50/50 dark:bg-slate-800/20">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            );
          })}
        </div>

        {/* Contact CTA */}
        <FadeInSection delay={400}>
          <div className="mt-16 bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-8 text-center text-white shadow-xl">
            <h3 className="text-xl font-bold mb-2">Vẫn chưa tìm thấy câu trả lời?</h3>
            <p className="text-emerald-100/90 text-sm max-w-lg mx-auto mb-6">
              Đội ngũ Chăm sóc khách hàng của Bách hóa XANH luôn túc trực hỗ trợ bạn từ 8:00 đến 22:00 mỗi ngày.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <a
                href="tel:18001067"
                className="flex items-center gap-2 text-[#FFD400] hover:text-white font-extrabold text-sm transition-colors"
                style={{ textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined text-lg">call</span>
                Hotline miễn phí: 1800 1067
              </a>
              <span className="text-white/20 hidden sm:inline">|</span>
              <a
                href="mailto:cskh@bachhoaxanh.com"
                className="flex items-center gap-2 text-emerald-300 hover:text-white font-semibold text-sm transition-colors"
                style={{ textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined text-lg">mail</span>
                Email: cskh@bachhoaxanh.com
              </a>
            </div>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
};

export default Faq;
