import React from 'react';
import FadeInSection from '../components/FadeInSection';

const Partnership: React.FC = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <FadeInSection>
            <span className="inline-block px-3.5 py-1.5 mb-4 rounded-full bg-emerald-700/40 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Hợp tác phát triển
            </span>
          </FadeInSection>
          <FadeInSection delay={150}>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
              Cùng Bách hóa XANH Vươn Xa
            </h1>
          </FadeInSection>
          <FadeInSection delay={300}>
            <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto font-medium">
              Chúng tôi luôn chào đón các nhà sản xuất, đối tác cung ứng, chủ mặt bằng cùng đồng hành xây dựng chuỗi giá trị thực phẩm tươi ngon, lành mạnh cho xã hội.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Main Categories */}
      <section className="max-w-7xl mx-auto px-6 mt-16 space-y-24">
        {/* Partnership Types */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <FadeInSection>
            <div className="space-y-6">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-xs">
                Cung ứng nông sản & hàng tiêu dùng
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">
                Hợp Tác Nhà Cung Cấp, Đưa Sản Phẩm Việt Lên Kệ
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                Bách hóa XANH mong muốn thiết lập liên kết bền vững với nông dân tại các hợp tác xã và nhà sản xuất uy tín. Chúng tôi cam kết bao tiêu sản lượng nông sản xanh sạch, hỗ trợ kỹ thuật bảo quản sau thu hoạch và tối ưu hóa thời gian từ vườn đến bàn ăn.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-emerald-500 shrink-0">check_circle</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Ưu tiên sản phẩm đạt chuẩn VietGAP, GlobalGAP, OCOP</span>
                </div>
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-emerald-500 shrink-0">check_circle</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Quy trình nghiệm thu chất lượng minh bạch, nhanh gọn</span>
                </div>
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-emerald-500 shrink-0">check_circle</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Chính sách công nợ thanh toán sòng phẳng, đúng hạn</span>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={200}>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 rounded-3xl shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Gửi Thông Tin Hợp Tác Cung Ứng</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                Quý doanh nghiệp vui lòng điền hồ sơ năng lực sơ bộ để phòng Thu mua liên hệ trực tiếp.
              </p>
              <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                <input
                  type="text"
                  placeholder="Tên doanh nghiệp / Hợp tác xã"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Nhóm sản phẩm hợp tác (VD: Rau quả, Trái cây, Gia vị...)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Người liên hệ"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition-all shadow-md active:scale-95">
                  Gửi thông tin đề xuất
                </button>
              </form>
            </div>
          </FadeInSection>
        </div>

        {/* Real Estate Lease */}
        <FadeInSection>
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-8 md:p-12 text-white shadow-xl grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4">
              <span className="px-3.5 py-1 rounded-full bg-emerald-700/40 border border-emerald-500/20 text-xs font-semibold text-emerald-300">
                Cho thuê mặt bằng siêu thị
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">Tìm Kiếm Đối Tác Mặt Bằng Toàn Quốc</h3>
              <p className="text-emerald-100/90 text-sm leading-relaxed max-w-xl">
                Bách hóa XANH cần thuê số lượng lớn mặt bằng ở các tỉnh thành miền Nam, miền Trung và Hà Nội để phát triển siêu thị. Ưu tiên mặt bằng góc 2 mặt tiền, khu đông dân cư, chiều ngang tối thiểu 8m, diện tích sử dụng từ 150m² trở lên.
              </p>
            </div>
            <div className="flex flex-col gap-3 justify-center md:items-end">
              <a
                href="mailto:realestate@bachhoaxanh.com"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FFD400] hover:bg-[#e6be00] text-emerald-950 font-black px-6 py-3 rounded-full text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                style={{ textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined text-lg">mail</span>
                Gửi thư đề xuất mặt bằng
              </a>
              <span className="text-xs text-emerald-200/70 text-center md:text-right">
                Hoặc gọi trực tiếp: <strong>1800 1067</strong>
              </span>
            </div>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
};

export default Partnership;
