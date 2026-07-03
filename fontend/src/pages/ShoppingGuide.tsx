import React from 'react';
import { Link } from 'react-router-dom';
import FadeInSection from '../components/FadeInSection';

const ShoppingGuide: React.FC = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Cẩm nang mua sắm
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Hướng Dẫn Mua Hàng & Thanh Toán
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Mua sắm nhanh chóng, tiện lợi tại Bách hóa XANH chỉ với vài bước đơn giản. Hãy để chúng tôi đồng hành cùng gia đình bạn!
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Guide Steps */}
      <section className="max-w-7xl mx-auto px-6 mt-16">
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-emerald-950 dark:text-emerald-400">
              Quy Trình Mua Hàng Online
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Chỉ mất 2 phút để đặt mua thực phẩm tươi ngon giao ngay trong ngày
            </p>
          </div>
        </FadeInSection>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            {
              step: "01",
              icon: "storefront",
              title: "Chọn siêu thị / địa chỉ",
              desc: "Nhấn chọn siêu thị gần nhất trên thanh tìm kiếm hoặc nhập địa chỉ giao hàng để kiểm tra tồn kho chính xác nhất."
            },
            {
              step: "02",
              icon: "search",
              title: "Tìm kiếm & Chọn hàng",
              desc: "Duyệt danh mục hoặc gõ tên sản phẩm cần mua. Thêm các sản phẩm tươi sống, hàng tiêu dùng vào giỏ hàng."
            },
            {
              step: "03",
              icon: "shopping_cart_checkout",
              title: "Kiểm tra giỏ hàng",
              desc: "Vào giỏ hàng kiểm tra số lượng, áp dụng các mã giảm giá mua sắm hoặc ưu đãi thẻ thành viên LOTTE Points."
            },
            {
              step: "04",
              icon: "local_shipping",
              title: "Thanh toán & Giao nhận",
              desc: "Chọn hình thức nhận hàng (giao tận nơi hoặc nhận tại quầy), chọn phương thức thanh toán và hoàn tất đơn hàng."
            }
          ].map((item, idx) => (
            <FadeInSection key={idx} delay={idx * 150}>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 relative group h-full flex flex-col">
                <span className="absolute top-4 right-6 text-5xl font-black text-slate-100 dark:text-slate-800 group-hover:text-emerald-50 dark:group-hover:text-slate-800 transition-colors">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed flex-1">
                  {item.desc}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Payment Methods */}
      <section className="max-w-7xl mx-auto px-6 mt-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <FadeInSection>
            <div className="space-y-6">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-xs">
                Phương thức thanh toán linh hoạt
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">
                Hỗ Trợ Đa Dạng Hình Thức Thanh Toán An Toàn
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base">
                Tại Bách hóa XANH, quý khách hàng có thể thoải mái chọn lựa phương thức thanh toán phù hợp và tiện lợi nhất cho gia đình mình. Mọi giao dịch trực tuyến đều được mã hóa bảo mật cao nhất.
              </p>
              <div className="space-y-4">
                {[
                  { title: "Thanh toán khi nhận hàng (COD)", desc: "Quý khách thanh toán tiền mặt trực tiếp cho nhân viên giao hàng sau khi kiểm tra hàng hóa." },
                  { title: "Ví điện tử MoMo / ZaloPay / ShopeePay", desc: "Quét mã QR thanh toán nhanh chóng, hưởng thêm nhiều ưu đãi hoàn tiền hấp dẫn." },
                  { title: "Thẻ ATM Nội địa / Internet Banking", desc: "Thanh toán trực tiếp qua cổng thanh toán OnePay của các ngân hàng nội địa." },
                  { title: "Thẻ Quốc tế VISA / MasterCard / JCB", desc: "Chấp nhận các loại thẻ quốc tế phát hành bởi mọi ngân hàng toàn quốc." }
                ].map((pay, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="material-symbols-outlined text-emerald-500 shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{pay.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{pay.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={200}>
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-700/20" />
              <h3 className="text-2xl font-bold mb-4">Giao Hàng Siêu Tốc Trong Ngày</h3>
              <p className="text-emerald-100/90 text-sm leading-relaxed mb-6">
                Với mạng lưới siêu thị phủ khắp cả nước, Bách hóa XANH cam kết thời gian giao hàng tươi sống chỉ trong vòng 2 giờ kể từ khi đặt đơn, giúp bữa cơm gia đình bạn luôn tràn đầy sự tươi ngon, dinh dưỡng.
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FFD400]">timer</span>
                  Giao nhanh trong 2 giờ hoặc chọn khung giờ linh hoạt
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FFD400]">eco</span>
                  Hàng hóa được vận chuyển và bảo quản ở nhiệt độ thích hợp
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FFD400]">package_2</span>
                  Miễn phí giao hàng cho đơn hàng đầu tiên
                </li>
              </ul>
              <Link 
                to="/products"
                className="inline-flex items-center justify-center gap-2 bg-[#FFD400] hover:bg-[#e6be00] text-emerald-950 font-extrabold px-6 py-3 rounded-full text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                style={{ textDecoration: 'none' }}
              >
                Trải nghiệm mua sắm ngay
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>
    </div>
  );
};

export default ShoppingGuide;
