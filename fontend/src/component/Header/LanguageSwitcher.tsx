import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPrefixFromLocale } from '../../utils/productUrl';

const LanguageSwitcher: React.FC<{ variant?: 'dark' | 'light' }> = ({ variant = 'dark' }) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isLight = variant === 'light';

  const languages = [
    { code: 'vi', label: t('common.langVietnamese', 'Tiếng Việt'), flag: '🇻🇳', short: 'VI' },
    { code: 'en', label: t('common.langEnglish', 'English'), flag: '🇺🇸', short: 'EN' },
    { code: 'ja', label: t('common.langJapanese', '日本語'), flag: '🇯🇵', short: 'JA' },
    { code: 'kr', label: t('common.langKorean', '한국어'), flag: '🇰🇷', short: 'KO' },
  ];

  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (code: string) => {
    const prevLang = i18n.language;
    i18n.changeLanguage(code);
    localStorage.setItem('lotte_language', code);
    setOpen(false);

    if (prevLang !== code) {
      window.dispatchEvent(new CustomEvent('lotte_language_changed', { detail: { lang: code, prev: prevLang } }));
      
      const match = window.location.pathname.match(/^\/[a-z]+-nsg\/product\/(.+)$/);
      if (match) {
        const productSlug = match[1];
        const newPrefix = getPrefixFromLocale(code);
        window.location.href = `/${newPrefix}/product/${productSlug}`;
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('common.changeLanguage')}
        id="language-switcher-btn"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 backdrop-blur-sm border ${
          isLight 
            ? 'bg-black/5 hover:bg-black/10 border-black/10 text-gray-800' 
            : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">language</span>
        <span>{current.short}</span>
        <span className={`text-[10px] opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>▼</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {languages.map((lang) => {
            const isActive = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                id={`language-option-${lang.code}`}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors border-l-4 ${
                  isActive 
                    ? 'bg-red-50 text-lotteRed font-bold border-lotteRed' 
                    : 'bg-white text-gray-700 font-medium border-transparent hover:bg-gray-50'
                }`}
              >
                <span className="text-xl leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
                {isActive && <span className="ml-auto text-lotteRed font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
