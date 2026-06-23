import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HeaderProfile from "./HeaderProfile";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAppDispatch, useAppSelector } from "../../store";
import { loadBranches } from "../../slices/branchSlice";
import BranchSelector from "./BranchSelector";
// import { clearCart } from "../../slices/cartSlice";
import { dataService } from "../../services/dataService";
import { setDefaultLanguageFromSettings } from "../../i18n";
import { getProductUrl } from "../../utils/productUrl";
import { fallbackProductImage } from "../../utils/imageUrl";

const Header: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [settings, setSettings] = useState<any>(null);

  // Search Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Branch state
  const { currentBranch, status: branchStatus } = useAppSelector((s) => s.branch);
  // const { data: cartData } = useAppSelector((s) => s.cart);

  useEffect(() => {
    if (branchStatus === "idle") dispatch(loadBranches());
  }, [dispatch, branchStatus]);

  useEffect(() => {
    dataService
      .getAdminSettings()
      .then((s) => {
        setSettings(s);
        if (s?.default_language) setDefaultLanguageFromSettings(s.default_language);
      })
      .catch(() => {});
  }, []);

  const brandLogoUrl = settings?.brand_logo_url || '';

  const navItems = [
    { label: t("nav.home"), path: "/home" },
    { label: t("nav.smartShopping"), path: "/smart-shopping" },
    { label: t("nav.about"), path: "/about" },
    { label: t("nav.products"), path: "/products" },
    { label: t("nav.shopAtHome"), path: "/shop-at-home" },
    { label: t("nav.promotions"), path: "/promotions" },
    { label: t("nav.featuredEvents"), path: "/featured-events" },
    { label: t("nav.entertainment"), path: "/lotte-fun-zone" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentBranchId = currentBranch
    ? String(currentBranch.id || (currentBranch as any)?._id || "")
    : "";

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowSuggestions(true);
      try {
        const results = await dataService.searchProducts(search.trim(), currentBranchId);
        setSuggestions(results.slice(0, 5));
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, currentBranchId]);

  // ─── Branch selector handler ─────────────────
  return (
    <header
      className="sticky top-0 z-50 text-white backdrop-blur-md bg-emerald-950/90 dark:bg-slate-900/95 border-b border-emerald-800/40 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ═══ Maintenance Mode Banner ═══ */}
      {settings?.maintenance_mode && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-inner relative z-50 border-b border-orange-400">
          <span className="material-symbols-outlined text-[16px] animate-spin">construction</span>
          <span>
            {t('common.maintenanceModeActive') || 'Hệ thống đang bảo trì định kỳ. Một số tính năng đặt hàng/thanh toán tạm thời đóng.'}
          </span>
        </div>
      )}

      {/* ═══ Top bar ═══ */}
      <div
        className="flex justify-between items-center px-4 sm:px-8 py-2.5 text-xs border-b border-emerald-900/30 dark:border-slate-800/10 bg-emerald-950/40 backdrop-blur-sm"
      >
        {/* Left — Branch selector */}
        <div className="flex items-center gap-2 bg-emerald-900/60 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-full border border-emerald-800/50 dark:border-slate-700/50 hover:bg-emerald-900 dark:hover:bg-slate-700 transition-all shadow-sm">
          <BranchSelector />
        </div>

        {/* Right — Member + Support + Language selector */}
        <div className="flex items-center gap-4 font-bold text-white/90">
          <span className="cursor-pointer flex items-center gap-1 hover:text-[#FFD400] transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined !text-[15px] text-[#FFD400]">featured_seasonal</span>
            {t("nav.memberLotte")}
          </span>
          <span className="text-white/20">|</span>
          <Link
            to="/account/support"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.9)", textDecoration: "none" }}
          >
            <span className="material-symbols-outlined !text-[15px] text-emerald-400">help</span>
            {t('support.helpLink')}
          </Link>
          <span className="text-white/20">|</span>
          <div className="py-1 px-2 rounded-lg bg-emerald-900/35 hover:bg-emerald-900/65 transition-all">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* ═══ Main Header Area ═══ */}
      <div className="px-4 sm:px-8 py-4 max-w-[1440px] mx-auto w-full flex flex-col md:flex-row items-center gap-4 md:gap-8">
        {/* Logo and Menu Trigger */}
        <div className="flex items-center justify-between w-full md:w-auto shrink-0">
          <Link to="/home" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-3 cursor-pointer group">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt="Brand Logo"
                  className="h-10 w-10 object-contain rounded-2xl bg-white p-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-transform group-hover:scale-108 group-hover:rotate-3"
                />
              ) : null}
              <div className="bg-gradient-to-r from-emerald-800 to-teal-900 dark:from-slate-900 dark:to-slate-800 border border-emerald-700/50 dark:border-slate-700/50 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-md transition-all group-hover:border-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <span className="text-white font-extrabold text-xl sm:text-2xl tracking-tight leading-none uppercase">
                  bách hóa
                </span>
                <span className="text-[#FFD400] font-black text-xl sm:text-2xl tracking-tight leading-none uppercase drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.3)]">
                  XANH
                </span>
              </div>
              <span className="text-white/50 text-[10px] sm:text-xs ml-1 hidden lg:inline font-bold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">{t("common.vietnam")}</span>
            </div>
          </Link>

          {/* Mobile Buttons */}
          <div className="flex items-center gap-3 md:hidden">
            <HeaderProfile />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center bg-emerald-800/60 hover:bg-emerald-700/60 border border-emerald-700/20 text-white p-2.5 rounded-xl cursor-pointer active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[22px] leading-none">menu</span>
            </button>
          </div>
        </div>

        {/* Categories trigger + Search bar */}
        <div className="w-full flex-1 flex items-center gap-3 order-3 md:order-none mt-1 md:mt-0">
          {/* Categories Button for Desktop */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hidden md:flex items-center bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/40 hover:border-emerald-500/50 text-white px-5 py-3 rounded-full cursor-pointer font-bold text-sm select-none gap-2 transition-all shadow-sm active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px] text-[#FFD400] group-hover:rotate-90 transition-transform">grid_view</span>
            <span>{t("nav.categories")}</span>
          </button>

          {/* Search Input */}
          <div ref={searchRef} className="flex-1 relative">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full py-3.5 pl-6 pr-14 rounded-full border border-emerald-800/40 dark:border-slate-700/65 text-sm font-semibold outline-none bg-emerald-950/40 focus:bg-white text-white focus:text-slate-900 placeholder-white/50 focus:placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-gradient-to-r from-[#FFD400] to-[#FCD34D] hover:from-[#E5BE00] hover:to-[#F59E0B] border-none text-emerald-950 rounded-full w-11 h-11 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <span className="material-symbols-outlined !text-xl">search</span>
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {showSuggestions && search.trim() && (
              <div 
                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[1000] animate-fadeIn max-h-[400px] overflow-y-auto"
              >
                {isSearching ? (
                  <div className="p-5 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-emerald-600" style={{ fontSize: 20 }}>progress_activity</span>
                    {t('common.searching')}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div>
                    {suggestions.map((item, idx) => (
                      <Link
                        key={item.id || item._id || idx}
                        to={getProductUrl(item)}
                        onClick={() => {
                          setShowSuggestions(false);
                          setSearch("");
                        }}
                        className="flex items-center p-4 hover:bg-emerald-50/40 border-b border-slate-100 last:border-none transition-colors"
                        style={{ textDecoration: "none", color: "#333" }}
                      >
                        <img 
                          src={item.image || fallbackProductImage || "https://via.placeholder.com/40"} 
                          alt={item.name} 
                          className="w-12 h-12 object-contain mr-4 rounded-xl bg-slate-50 border border-slate-100 shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackProductImage; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-slate-800 truncate">
                            {item.name.toLowerCase().includes(search.toLowerCase()) ? (
                              <>
                                {item.name.substring(0, item.name.toLowerCase().indexOf(search.toLowerCase()))}
                                <strong style={{ color: "#059669" }}>
                                  {item.name.substring(item.name.toLowerCase().indexOf(search.toLowerCase()), item.name.toLowerCase().indexOf(search.toLowerCase()) + search.length)}
                                </strong>
                                {item.name.substring(item.name.toLowerCase().indexOf(search.toLowerCase()) + search.length)}
                              </>
                            ) : item.name}
                          </div>
                          <div className="text-xs text-rose-600 font-extrabold mt-1">
                            {item.promotion_price ? (
                              <>
                                {item.promotion_price.toLocaleString("vi-VN")}₫
                                <span className="text-slate-400 line-through text-[10px] ml-1.5 font-normal">
                                  {item.price.toLocaleString("vi-VN")}₫
                                </span>
                              </>
                            ) : (
                              `${item.price?.toLocaleString("vi-VN")}₫`
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <div 
                      onClick={handleSearch}
                      className="p-3.5 text-center bg-slate-50 hover:bg-emerald-50 text-emerald-700 text-xs font-black cursor-pointer border-t border-slate-100 transition-colors"
                    >
                      {t('common.viewAllResults', { query: search })}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 text-center text-slate-500 text-sm">
                    {t('common.noSearchResults')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile and Shopping Cart on Desktop */}
        <div className="hidden md:block shrink-0">
          <HeaderProfile />
        </div>
      </div>

      {/* ═══ Navigation Menu Bar (Desktop Only) ═══ */}
      <nav className="hidden md:block bg-emerald-950/20 dark:bg-slate-950/10 border-t border-white/5 py-3">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="flex gap-2 bg-emerald-900/30 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-emerald-800/30 dark:border-slate-800/30 overflow-x-auto scrollbar-none w-fit">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === "/home" && currentPath === "/") ||
                (item.path === "/products" && currentPath.startsWith("/products"));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="transition-all duration-300 block py-2.5 px-5 text-xs font-extrabold rounded-xl whitespace-nowrap hover:text-white"
                  style={{
                    color: isActive ? "#FFD400" : "rgba(255,255,255,0.75)",
                    textDecoration: "none",
                    background: isActive ? "rgba(16, 185, 129, 0.25)" : "transparent",
                    border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                    boxShadow: isActive ? "0 4px 12px rgba(16, 185, 129, 0.1)" : "none"
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer (Nav + Category menu list combined) */}
      {menuOpen && (
        <div
          className="md:hidden p-4 flex flex-col gap-2 border-t border-white/10 animate-slideDown shadow-xl"
          style={{ background: "rgba(2, 48, 25, 0.98)" }}
        >
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === "/home" && currentPath === "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="py-3 px-4 rounded-xl transition-all text-sm font-bold block"
                style={{
                  color: isActive ? "#FFD400" : "white",
                  textDecoration: "none",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent"
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Header;