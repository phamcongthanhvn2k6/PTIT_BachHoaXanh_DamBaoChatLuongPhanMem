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

  const headerText = settings?.header_logo_text || settings?.brand_name || "LOTTE Mart";
  const [brandFirst, brandSecond] = headerText.split(" ");
  const brandLogoUrl = settings?.brand_logo_url || '';

  const navItems = [
    { label: t("nav.home"), path: "/home" },
    { label: t("nav.smartShopping"), path: "/smart-shopping" },
    { label: t("nav.about"), path: "/about" },
    { label: t("nav.products"), path: "/products" },
    { label: t("nav.shopAtHome"), path: "/shop-at-home" },
    { label: t("nav.promotions"), path: "/promotions" },
    { label: t("nav.featuredEvents"), path: "/featured-events" },
    { label: t("nav.entertainment"), path: "/carrot-scene" },
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
  // Moved to BranchSelector component

  return (
    <header
      className="sticky top-0 z-50 text-white shadow-md transition-shadow"
      style={{
        background: "#C1121F",
        fontFamily: "'Nunito', sans-serif",
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
        className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 px-4 sm:px-6 py-1.5 sm:py-1 text-xs text-white/85"
        style={{ background: "#9B0E17" }}
      >
        {/* Left — Branch selector */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BranchSelector />
        </div>

        {/* Right — Member + Language selector */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
          <span className="cursor-pointer flex items-center gap-1">🎁 {t("nav.memberLotte")}</span>
          <span className="opacity-30">|</span>
          <Link
            to="/account/support"
            className="hover:text-white font-bold transition-colors"
            style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}
          >
            {t('support.helpLink')}
          </Link>
          <span className="opacity-30">|</span>
          <LanguageSwitcher />
        </div>
      </div>

      {/* ═══ Main header ═══ */}
      <div
        className="flex flex-col md:flex-row items-center py-3 md:py-4 px-4 sm:px-6 gap-3 md:gap-5 max-w-[1400px] mx-auto w-full relative"
      >
        {/* Logo and Mobile Menu toggle wrapper */}
        <div className="flex items-center justify-between w-full md:w-auto shrink-0 gap-4">
          <Link to="/home" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer">
              {brandLogoUrl && (
                <img
                  src={brandLogoUrl}
                  alt="Brand Logo"
                  className="h-8 w-8 sm:h-9.5 sm:w-9.5 object-contain rounded-full bg-white p-0.5 shadow-sm"
                />
              )}
              <div
                className="bg-white rounded-lg px-2 sm:px-2.5 py-1 flex items-center gap-1 shadow-sm"
              >
                <span className="text-red-700 font-black text-lg sm:text-2xl tracking-tighter leading-none">
                  {brandFirst || "LOTTE"}
                </span>
                <span className="text-red-700 font-bold text-xs sm:text-sm border-l-2 border-red-700 pl-1.5 sm:pl-2 leading-none">
                  {brandSecond || "Mart"}
                </span>
              </div>
              <span className="text-white/70 text-[10px] sm:text-xs ml-1 hidden sm:inline">{t("common.vietnam")}</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <HeaderProfile />
            </div>
            
            {/* Hamburger Categories Menu Button for Mobile */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex md:hidden items-center justify-center bg-[#9B0E17] hover:bg-[#850C13] border-none text-white p-2 rounded-xl cursor-pointer font-bold text-sm select-none gap-2 whitespace-nowrap active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[20px] leading-none">menu</span>
            </button>
          </div>
        </div>

        {/* Categories Button for Desktop */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hidden md:flex items-center bg-[#9B0E17] hover:bg-[#850C13] border-none text-white px-4 py-2.5 rounded-xl cursor-pointer font-bold text-sm select-none gap-2 whitespace-nowrap"
        >
          ☰ {t("nav.categories")}
        </button>

        {/* Search Input */}
        <div ref={searchRef} className="w-full md:flex-1 relative order-3 md:order-none mt-1 md:mt-0">
          <form onSubmit={handleSearch} className="w-full relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
              placeholder={t("nav.searchPlaceholder")}
              className="w-full py-2.5 pl-4 pr-12 rounded-xl border-none text-sm font-semibold outline-none bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#9B0E17]/20 transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 bg-[#C1121F] hover:bg-[#A50F18] border-none text-white rounded-lg px-3 cursor-pointer text-sm transition-colors flex items-center justify-center"
            >
              🔍
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && search.trim() && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[1000]"
            >
              {isSearching ? (
                <div className="p-4 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-slate-400" style={{ fontSize: 18 }}>progress_activity</span>
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
                      className="flex items-center p-3 hover:bg-slate-50 border-b border-slate-100 last:border-none transition-colors"
                      style={{ textDecoration: "none", color: "#333" }}
                    >
                      <img 
                        src={item.image || fallbackProductImage || "https://via.placeholder.com/40"} 
                        alt={item.name} 
                        className="w-10 h-10 object-contain mr-3 rounded-lg bg-slate-50 border border-slate-100"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackProductImage; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">
                          {item.name.toLowerCase().includes(search.toLowerCase()) ? (
                            <>
                              {item.name.substring(0, item.name.toLowerCase().indexOf(search.toLowerCase()))}
                              <strong style={{ color: "#C1121F" }}>
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
                    className="p-3 text-center bg-slate-50 hover:bg-slate-100 text-rose-600 text-xs font-bold cursor-pointer border-t border-slate-100 transition-colors"
                  >
                    {t('common.viewAllResults', { query: search })}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  {t('common.noSearchResults')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile on Desktop */}
        <div className="hidden md:block shrink-0">
          <HeaderProfile />
        </div>
      </div>

      {/* ═══ Nav (Desktop Only) ═══ */}
      <nav className="hidden md:block" style={{ background: "#A50F18", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div
          className="flex gap-0 max-w-[1400px] mx-auto px-6 overflow-x-auto"
        >
          {navItems.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path === "/home" && currentPath === "/") ||
              (item.path === "/products" && currentPath.startsWith("/products"));
            return (
              <Link
                key={item.path}
                to={item.path}
                className="transition-colors block py-2.5 px-4 text-sm whitespace-nowrap"
                style={{
                  color: isActive ? "#FFD60A" : "rgba(255,255,255,0.9)",
                  textDecoration: "none",
                  fontWeight: isActive ? 800 : 600,
                  borderBottom: isActive ? "3px solid #FFD60A" : "3px solid transparent",
                  background: isActive ? "rgba(255,214,10,0.15)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer (Nav + Category menu list combined) */}
      {menuOpen && (
        <div
          className="md:hidden p-4 flex flex-col gap-1 border-t border-white/10"
          style={{ background: "#A50F18" }}
        >
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === "/home" && currentPath === "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 px-4 rounded-xl hover:bg-white/10 transition-colors text-sm font-bold block"
                style={{
                  color: isActive ? "#FFD60A" : "white",
                  textDecoration: "none",
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