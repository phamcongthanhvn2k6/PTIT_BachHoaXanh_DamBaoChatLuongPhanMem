import React from 'react';
import FadeInSection from '../components/FadeInSection';

const ShippingPolicy: React.FC = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Vận chuyển & giao nhận
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Chính Sách Vận Chuyển & Giao Nhận
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Bách hóa XANH luôn nỗ lực tối đa để mang những sản phẩm tươi ngon nhất đến căn bếp gia đình bạn một cách nhanh chóng và an toàn tuyệt đối.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-6 mt-16 space-y-16">
        {/* Delivery Options */}
        <FadeInSection>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center">
              Dịch Vụ Giao Hàng Tiện Lợi
            </h2>
            <div className="grid md:grid-cols-2 gap-8 pt-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-2xl">speed</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                  Giao Hàng Siêu Tốc
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                  Nhận hàng ngay chỉ từ <strong>1 đến 2 giờ</strong> kể từ thời điểm đặt hàng thành công. Thích hợp cho nhu cầu mua thực phẩm chế biến gấp cho bữa ăn hàng ngày.
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 mt-auto">
                  <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Áp dụng cho các sản phẩm tươi sống, rau củ quả</li>
                  <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Phục vụ khung giờ đặt từ 8:00 đến 20:00</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-2xl">schedule</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                  Giao Hàng Theo Khung Giờ Chọn Sẵn
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                  Quý khách có thể tự chọn khung giờ giao hàng mong muốn trong ngày hoặc các ngày kế tiếp (mỗi khung giờ kéo dài 2 tiếng). Phù hợp với nhân viên văn phòng bận rộn.
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 mt-auto">
                  <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Đặt hàng 24/7 và chọn lịch giao tiện lợi</li>
                  <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Các khung giờ giao từ 8:00 đến 22:00 hàng ngày</li>
                </ul>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Shipping Fee */}
        <FadeInSection>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-400">
              Biểu Phí Giao Hàng Hợp Lý
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
              Bách hóa XANH luôn áp dụng mức phí vận chuyển tối ưu nhất dựa trên giá trị đơn hàng và quãng đường vận chuyển từ cửa hàng gần nhất đến vị trí của khách hàng.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200">Đơn hàng dưới 300.000đ</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Phí giao: 15.000đ</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200">Đơn hàng từ 300.000đ trở lên</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">MIỄN PHÍ GIAO HÀNG</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-bold text-slate-800 dark:text-slate-200">Ưu đãi thành viên LOTTE Points</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm text-right">Miễn phí giao hàng theo chính sách hạng thành viên Vàng/Bạch Kim</span>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Preservation Standards */}
        <FadeInSection>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center">
              Quy Chuẩn Bảo Quản Trong Vận Chuyển
            </h2>
            <div className="grid md:grid-cols-3 gap-8 pt-4">
              {[
                {
                  icon: "ac_unit",
                  title: "Thùng cách nhiệt chuyên dụng",
                  desc: "Các sản phẩm tươi sống như thịt, cá, hải sản đông lạnh được vận chuyển trong thùng cách nhiệt kèm đá gel giữ lạnh, đảm bảo tươi ngon tuyệt đối khi đến tay khách hàng."
                },
                {
                  icon: "local_mall",
                  title: "Phân loại hàng đóng gói",
                  desc: "Sản phẩm tẩy rửa, hóa mỹ phẩm được đóng gói riêng biệt với các mặt hàng thực phẩm ăn uống, tránh tình trạng nhiễm mùi hoặc rò rỉ hóa chất."
                },
                {
                  icon: "sentiment_very_satisfied",
                  title: "Kiểm tra trước khi nhận",
                  desc: "Khách hàng được quyền kiểm tra tình trạng hàng hóa trước khi thanh toán và ký nhận. Bách hóa XANH sẵn sàng nhận lại sản phẩm ngay nếu không đạt yêu cầu."
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
      </section>
    </div>
  );
};

export default ShippingPolicy;
