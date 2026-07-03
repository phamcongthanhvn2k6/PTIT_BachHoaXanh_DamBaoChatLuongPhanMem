import React from 'react';
import FadeInSection from '../components/FadeInSection';

const ReturnPolicy: React.FC = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Quyền lợi khách hàng
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Chính Sách Đổi Trả Hàng Hóa
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Bách hóa XANH cam kết mang lại sự hài lòng tối đa. Chúng tôi sẵn sàng lắng nghe và hỗ trợ đổi trả nhanh chóng khi sản phẩm gặp bất kỳ lỗi gì.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-6 mt-16 space-y-16">
        {/* Policy Overview */}
        <FadeInSection>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-400">
              Cam Kết 100% Tươi Ngon & Chất Lượng
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Với tiêu chí đặt lợi ích và sức khỏe của người tiêu dùng lên hàng đầu, Bách hóa XANH áp dụng chính sách đổi trả linh hoạt đối với tất cả mặt hàng thực phẩm tươi sống, hàng đóng hộp và đồ dùng gia đình bị lỗi từ nhà cung cấp hoặc quá trình vận chuyển.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 pt-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Thực phẩm tươi sống / mát</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Đổi trả trong vòng <strong>24 giờ</strong> kể từ thời điểm giao hàng thành công nếu hàng bị hỏng, ôi thiu, dập nát hoặc không đạt chất lượng cam kết.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Hàng tiêu dùng / đồ hộp / hóa mỹ phẩm</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Đổi trả trong vòng <strong>7 ngày</strong> kể từ thời điểm giao hàng thành công. Yêu cầu sản phẩm còn nguyên bao bì, tem nhãn và chưa qua sử dụng.</p>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Return Conditions */}
        <FadeInSection>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center">
              Điều Kiện Áp Dụng Đổi Trả
            </h2>
            <div className="grid md:grid-cols-3 gap-8 pt-4">
              {[
                {
                  icon: "broken_image",
                  title: "Lỗi từ nhà sản xuất",
                  desc: "Hàng bị móp méo, bao bì rách trước khi mở, sản phẩm không đúng mô tả, hết hạn sử dụng hoặc bị biến chất trước thời hạn."
                },
                {
                  icon: "local_shipping",
                  title: "Lỗi do quá trình vận chuyển",
                  desc: "Thực phẩm tươi sống bị dập nát, héo úa hoặc hư hại do nhân viên giao nhận đóng gói và bảo quản không đúng quy cách."
                },
                {
                  icon: "receipt_long",
                  title: "Có hóa đơn mua hàng",
                  desc: "Khách hàng vui lòng giữ lại hóa đơn giấy hoặc hóa đơn điện tử mua hàng tại Bách hóa XANH để quá trình đối chiếu diễn ra nhanh chóng."
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow h-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Return Process */}
        <FadeInSection>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-400 text-center">
              Các Bước Đổi Trả Đơn Giản
            </h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              {[
                { step: "Bước 1: Liên hệ hỗ trợ", desc: "Chụp hình ảnh/video sản phẩm bị lỗi. Gọi điện đến hotline 1800 1067 hoặc gửi yêu cầu trực tiếp qua Trang Trung Tâm Hỗ Trợ trên tài khoản Bách hóa XANH." },
                { step: "Bước 2: Xác nhận yêu cầu", desc: "Bộ phận Chăm sóc khách hàng sẽ tiếp nhận thông tin và kiểm tra trong vòng 1-2 giờ làm việc để phản hồi kết quả duyệt đổi trả." },
                { step: "Bước 3: Thu hồi & Đổi trả", desc: "Nhân viên Bách hóa XANH sẽ đến tận nhà thu hồi sản phẩm lỗi và giao sản phẩm mới thay thế (hoặc hoàn tiền) hoàn toàn miễn phí." }
              ].map((proc, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">{proc.step}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">{proc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
};

export default ReturnPolicy;
