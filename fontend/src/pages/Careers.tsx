import React from 'react';
import FadeInSection from '../components/FadeInSection';

const Careers: React.FC = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Tuyển dụng & Cơ hội nghề nghiệp
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Đồng Hành Phát Triển Cùng Bách hóa XANH
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Chúng tôi mang tới môi trường làm việc năng động, lộ trình phát triển rõ ràng và phúc lợi vượt trội. Hãy gia nhập đội ngũ năng động của chúng tôi ngay hôm nay!
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-6 mt-16">
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-emerald-950 dark:text-emerald-400">
              Tại Sao Chọn Bách hóa XANH?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Chúng tôi xây dựng một môi trường làm việc lý tưởng để mỗi cá nhân tự tin bứt phá giới hạn bản thân.
            </p>
          </div>
        </FadeInSection>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "paid",
              title: "Thu nhập & Thưởng hấp dẫn",
              desc: "Mức lương cạnh tranh trên thị trường kèm theo các khoản thưởng quý, thưởng cuối năm dựa trên hiệu quả kinh doanh của siêu thị."
            },
            {
              icon: "moving",
              title: "Lộ trình thăng tiến rõ ràng",
              desc: "Đào tạo liên tục để nâng cao nghiệp vụ. Cơ hội thăng tiến lên các vị trí Quản lý cửa hàng, Giám sát vùng chỉ sau 6 tháng đến 1 năm."
            },
            {
              icon: "favorite",
              title: "Chế độ đãi ngộ toàn diện",
              desc: "Bảo hiểm đầy đủ (BHXH, BHYT, BHTN), chế độ khám sức khỏe định kỳ hàng năm và ưu đãi mua sắm đặc quyền tại hệ thống siêu thị."
            }
          ].map((item, idx) => (
            <FadeInSection key={idx} delay={idx * 150}>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
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

      {/* Open Positions */}
      <section className="max-w-5xl mx-auto px-6 mt-24">
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              Vị Trí Tuyển Dụng Nổi Bật
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Tìm kiếm cơ hội phù hợp với năng lực và đam mê của bạn
            </p>
          </div>
        </FadeInSection>

        <div className="space-y-6">
          {[
            {
              role: "Quản lý cửa hàng (Store Manager)",
              type: "Toàn thời gian",
              loc: "Hà Nội, TP. Hồ Chí Minh",
              desc: "Chịu trách nhiệm vận hành, quản lý doanh thu, quản lý nhân sự tại cửa hàng được giao. Đảm bảo chất lượng phục vụ và hàng hóa luôn đạt chuẩn."
            },
            {
              role: "Nhân viên bán hàng & Thu ngân",
              type: "Toàn thời gian / Bán thời gian",
              loc: "Toàn quốc (Hệ thống các siêu thị)",
              desc: "Đón tiếp khách hàng, tư vấn sản phẩm, thanh toán đơn hàng và hỗ trợ trưng bày hàng hóa lên quầy kệ sạch đẹp, bắt mắt."
            },
            {
              role: "Nhân viên giao nhận hàng hóa (Shipper)",
              type: "Toàn thời gian",
              loc: "Các thành phố lớn",
              desc: "Giao thực phẩm tươi sống, hàng tiêu dùng từ siêu thị đến tận nhà khách hàng nhanh chóng, an toàn và thân thiện."
            }
          ].map((job, i) => (
            <FadeInSection key={i} delay={i * 100}>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{job.role}</h3>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold">{job.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                    {job.loc}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-2xl pt-1">
                    {job.desc}
                  </p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-full text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0 self-end sm:self-center">
                  Ứng tuyển ngay
                </button>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Careers;
