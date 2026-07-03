import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dataService } from '../../services/dataService';

function Footer() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    dataService.getAdminSettings().then(setSettings).catch(() => {});
  }, []);

  const phone = settings?.support_phone || "1800 1067";
  const email = settings?.support_email || "cskh@bachhoaxanh.com";
  const brand = settings?.brand_name || "Bách hóa XANH";
  const brandLogoUrl = settings?.brand_logo_url || '';

  return (
    <footer 
      className="text-slate-300 py-16 mt-20 border-t border-emerald-950/20 shadow-[0_-12px_40px_rgba(0,0,0,0.03)]" 
      style={{ 
        background: "linear-gradient(180deg, #021a0e 0%, #011109 100%)", 
        fontFamily: "'Nunito', sans-serif" 
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-14 pb-12 border-b border-emerald-900/10">
          
          {/* Brand Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/home" className="inline-block" style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-3 group">
                {brandLogoUrl && (
                  <img
                    src={brandLogoUrl}
                    alt="Brand Logo"
                    className="h-10 w-10 object-contain rounded-2xl bg-white p-0.5 shadow-md transition-transform group-hover:scale-105"
                  />
                )}
                <div className="bg-emerald-900/60 dark:bg-slate-950/50 border border-emerald-700/25 rounded-2xl px-4 py-2 flex items-center gap-2">
                  <span className="text-white font-black text-xl tracking-tight leading-none uppercase">bách hóa</span>
                  <span className="text-[#FFD400] font-black text-xl tracking-tight leading-none uppercase">XANH</span>
                </div>
              </div>
            </Link>
            
            <p className="text-sm leading-relaxed text-slate-400 font-medium max-w-sm">
              {t('footer.description', { brand })}
            </p>
            
            {/* Social Icons with Gradients */}
            <div className="flex items-center gap-3">
              {[
                { 
                  bg: "bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white",
                  svg: (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                    </svg>
                  )
                },
                { 
                  bg: "bg-pink-600/10 hover:bg-pink-600 text-pink-500 hover:text-white",
                  svg: (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                  )
                },
                { 
                  bg: "bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white",
                  svg: (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  )
                },
                { 
                  bg: "bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white",
                  svg: (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  )
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 border border-transparent hover:-translate-y-1 shadow-sm ${item.bg}`}
                >
                  {item.svg}
                </div>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm uppercase tracking-wider border-b border-emerald-800/25 pb-2">
              {t('footer.customerSupport')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-400">
              <li>
                <Link to="/account/support" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.supportCenter')}
                </Link>
              </li>
              <li>
                <Link to="/shopping-guide" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.shoppingGuide')}
                </Link>
              </li>
              <li>
                <Link to="/return-policy" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.returnPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.shippingPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm uppercase tracking-wider border-b border-emerald-800/25 pb-2">
              {t('footer.aboutLotte')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-400">
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.introduction')}
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.careers')}
                </Link>
              </li>
              <li>
                <Link to="/news-events" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.newsEvents')}
                </Link>
              </li>
              <li>
                <Link to="/partnership" className="hover:text-emerald-400 transition-colors block py-0.5" style={{ textDecoration: "none" }}>
                  {t('footer.partnership')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacts Column */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm uppercase tracking-wider border-b border-emerald-800/25 pb-2">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm font-bold text-slate-400">
              <li className="flex items-center gap-2 text-emerald-400">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>{phone} <span className="text-[10px] text-slate-400 font-normal">({t('footer.phoneFree')})</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-500">mail</span>
                <span className="text-xs break-all">{email}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-500">location_on</span>
                <span>{t('footer.location')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-500">schedule</span>
                <span>{t('footer.workingHours')}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-500">
          <span>{t('footer.copyright')}</span>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {["VISA", "MC", "ATM", "ZaloPay", "MoMo"].map((method) => (
              <span 
                key={method} 
                className="bg-emerald-950/40 text-emerald-500/70 border border-emerald-900/10 px-2.5 py-1 rounded-lg text-[10px]"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;