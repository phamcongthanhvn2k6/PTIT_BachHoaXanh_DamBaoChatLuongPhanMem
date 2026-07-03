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
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { admin } = useAppSelector((state) => state.adminAuth);
  
  const isStaff = isAuthenticated && user && ([1, 2, 4, 5].includes(Number((user as any).role_id)));
  const showAdminBtn = isStaff || !!admin;

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
    { label: t("nav.recipes"), path: "/recipes" },
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
      className="sticky top-0 z-50 text-white bg-[#008848] dark:bg-slate-900 border-b border-emerald-700 dark:border-slate-800 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
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

      {/* ═══ Main Header Area (Single Row on Desktop) ═══ */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-[1440px] mx-auto w-full flex items-center justify-between gap-4">
        {/* Left Section: Logo & Location Selector */}
        <div className="flex items-center gap-4 shrink-0">
          <Link to="/home" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-2 cursor-pointer group">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt="Brand Logo"
                  className="h-9 w-9 object-contain rounded-xl bg-white p-0.5 shadow-sm transition-transform group-hover:scale-105"
                />
              ) : null}
              <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <span className="text-white font-extrabold text-lg tracking-tight uppercase">
                  bách hóa
                </span>
                <span className="text-[#FFD400] font-black text-lg tracking-tight uppercase drop-shadow-sm">
                  XANH
                </span>
              </div>
            </div>
          </Link>

          {/* Location Selector (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-2 bg-transparent hover:bg-white/5 border border-emerald-600/50 hover:border-emerald-400/50 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm">
            <BranchSelector />
          </div>
        </div>

        {/* Center Section: Search Bar & Categories Button */}
        <div className="hidden md:flex flex-1 min-w-[320px] lg:min-w-[400px] xl:min-w-[500px] min-w-0 max-w-[650px] items-center gap-2 relative">
          {/* Categories Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center bg-emerald-900/40 hover:bg-emerald-900/75 border border-emerald-700/50 hover:border-emerald-500/50 text-white px-4 py-2.5 rounded-xl cursor-pointer font-bold text-xs select-none gap-1.5 transition-all shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[18px] text-[#FFD400]">grid_view</span>
            <span>{t("nav.categories")}</span>
          </button>

          {/* Search Input Container */}
          <div ref={searchRef} className="flex-1 min-w-0 w-full relative">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
                placeholder={t("nav.searchPlaceholder") || "Tìm thịt, cá, rau, trái cây..."}
                className="w-full py-2.5 pl-4 pr-12 rounded-xl border border-emerald-700/50 dark:border-slate-700/65 text-xs font-semibold outline-none bg-white/10 hover:bg-white/20 focus:bg-white text-white focus:text-slate-900 placeholder-white/70 focus:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-[#FFD400] to-[#FCD34D] hover:from-[#E5BE00] hover:to-[#F59E0B] border-none text-emerald-950 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined !text-base">search</span>
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {showSuggestions && search.trim() && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[1000] animate-fadeIn max-h-[400px] overflow-y-auto"
              >
                {isSearching ? (
                  <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-emerald-600" style={{ fontSize: 16 }}>progress_activity</span>
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
                        className="flex items-center p-3 hover:bg-emerald-50/40 border-b border-slate-100 last:border-none transition-colors"
                        style={{ textDecoration: "none", color: "#333" }}
                      >
                        <img 
                          src={item.image || fallbackProductImage || "https://via.placeholder.com/40"} 
                          alt={item.name} 
                          className="w-10 h-10 object-contain mr-3 rounded-lg bg-slate-50 border border-slate-100 shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackProductImage; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-slate-800 truncate">
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
                          <div className="text-[11px] text-rose-600 font-extrabold mt-0.5">
                            {item.promotion_price ? (
                              <>
                                {item.promotion_price.toLocaleString("vi-VN")}₫
                                <span className="text-slate-400 line-through text-[9px] ml-1 font-normal">
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
                      className="p-3 text-center bg-slate-50 hover:bg-emerald-50 text-emerald-700 text-[11px] font-black cursor-pointer border-t border-slate-100 transition-colors"
                    >
                      {t('common.viewAllResults', { query: search })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    {t('common.noSearchResults')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Language Switcher, Profile/Cart */}
        <div className="flex items-center gap-4 lg:gap-5 shrink-0">
          {showAdminBtn && (
            <Link
              to="/admin"
              className="bg-[#FFD400] hover:bg-[#FCD34D] text-[#004D27] px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-black/10 select-none cursor-pointer"
              style={{ textDecoration: "none" }}
            >
              <span className="material-symbols-outlined text-sm leading-none block">admin_panel_settings</span>
              <span>Trang Admin</span>
            </Link>
          )}

          {/* Language Switcher */}
          <div className="hidden md:block py-1 px-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/50 transition-all">
            <LanguageSwitcher />
          </div>

          {/* Header Profile (Avatar / Login + Notifications + Cart) */}
          <div className="flex items-center gap-2">
            <HeaderProfile />
          </div>

          {/* Mobile Burger Menu Trigger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex md:hidden items-center justify-center bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-700/20 text-white p-2.5 rounded-xl cursor-pointer active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">menu</span>
          </button>
        </div>
      </div>

      {/* ═══ Navigation & Utilities Bar (Row 2 - Desktop Only) ═══ */}
      <nav className="hidden md:block bg-emerald-950/20 dark:bg-slate-950/10 border-t border-white/5 py-1">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Main Menu links */}
          <div className="flex gap-2 lg:gap-3.5 xl:gap-4.5 overflow-x-auto scrollbar-none items-center py-1.5 min-w-0 flex-1">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === "/home" && currentPath === "/") ||
                (item.path === "/products" && currentPath.startsWith("/products"));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="transition-all duration-200 block py-2 px-3.5 lg:px-4 xl:px-5 text-xs font-extrabold rounded-xl whitespace-nowrap hover:bg-white/10 hover:text-white"
                  style={{
                    color: isActive ? "#FFD400" : "rgba(255,255,255,0.8)",
                    textDecoration: "none",
                    background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.05)" : "none"
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Member & Help utilities */}
          <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-white/95 pl-4 border-l border-white/10">
            {/* Member Link */}
            <Link
              to="/loyalty"
              className="flex items-center gap-1.5 hover:text-[#FFD400] transition-colors py-2 px-3 rounded-lg hover:bg-white/5 whitespace-nowrap select-none min-w-0"
              style={{ textDecoration: "none" }}
            >
              <span className="material-symbols-outlined text-[18px] text-[#FFD400] shrink-0">card_membership</span>
              <span className="truncate max-w-[150px] lg:max-w-none whitespace-nowrap overflow-hidden text-ellipsis">{t("nav.memberLotte") || "Thành viên Bách hóa XANH"}</span>
            </Link>

            {/* Support/Help Link */}
            <Link
              to="/account/support"
              className="flex items-center gap-1.5 hover:text-[#FFD400] transition-colors py-2 px-3 rounded-lg hover:bg-white/5 whitespace-nowrap select-none min-w-0"
              style={{ textDecoration: "none" }}
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-300 shrink-0">help</span>
              <span className="truncate max-w-[100px] lg:max-w-none whitespace-nowrap overflow-hidden text-ellipsis">{t("support.helpLink") || "Hỗ trợ"}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile Search & Location (Row 2 - Mobile Only) ═══ */}
      <div className="md:hidden px-4 pb-3 border-t border-emerald-700/20 pt-2 bg-[#007b41]">
        <div className="flex items-center gap-2">
          {/* Branch selector on mobile - compact trigger */}
          <div className="bg-emerald-900/50 px-2.5 py-1.5 rounded-lg border border-emerald-700/30 text-xs shrink-0 max-w-[150px] overflow-hidden">
            <BranchSelector />
          </div>
          
          {/* Mobile Search input */}
          <div ref={searchRef} className="flex-1 relative">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
                placeholder={t("nav.searchPlaceholder") || "Tìm kiếm..."}
                className="w-full py-2 pl-3 pr-9 rounded-lg border border-emerald-700/40 text-xs font-semibold outline-none bg-emerald-950/40 focus:bg-white text-white focus:text-slate-900 placeholder-white/50 focus:placeholder-slate-400 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-[#FFD400] to-[#FCD34D] border-none text-emerald-950 rounded-md w-6.5 h-6.5 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined !text-sm">search</span>
              </button>
            </form>

            {/* Mobile Autocomplete Suggestions */}
            {showSuggestions && search.trim() && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[1000] animate-fadeIn max-h-[300px] overflow-y-auto"
              >
                {isSearching ? (
                  <div className="p-3 text-center text-slate-500 text-xs">{t('common.searching')}</div>
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
                        className="flex items-center p-2.5 hover:bg-emerald-50/40 border-b border-slate-100 last:border-none"
                        style={{ textDecoration: "none", color: "#333" }}
                      >
                        <img 
                          src={item.image || fallbackProductImage || "https://via.placeholder.com/30"} 
                          alt={item.name} 
                          className="w-8 h-8 object-contain mr-2.5 rounded bg-slate-50"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-rose-600 font-extrabold mt-0.5">
                            {item.promotion_price ? `${item.promotion_price.toLocaleString("vi-VN")}₫` : `${item.price?.toLocaleString("vi-VN")}₫`}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-500 text-xs">{t('common.noSearchResults')}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Nav Links & Utilities) */}
      {menuOpen && (
        <div
          className="md:hidden p-4 flex flex-col gap-2 border-t border-white/10 animate-slideDown shadow-xl"
          style={{ background: "rgba(2, 48, 25, 0.98)" }}
        >
          <div className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-4 mt-2 mb-1">
            {t("nav.categories") || "Danh mục mua sắm"}
          </div>
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === "/home" && currentPath === "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 px-4 rounded-xl transition-all text-sm font-bold block"
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

          <div className="border-t border-white/10 my-3 pt-3 flex flex-col gap-3">
            {/* Branch Selector inside mobile drawer */}
            <div className="flex items-center gap-2 bg-emerald-950 px-3.5 py-2.5 rounded-xl border border-emerald-800/40">
              <span className="material-symbols-outlined text-[#FFD400] text-base">store</span>
              <div className="flex-1">
                <BranchSelector />
              </div>
            </div>

            {/* Language Switcher inside mobile drawer */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-950 border border-emerald-800/40">
              <span className="text-xs font-bold text-white/80">{t('common.language') || 'Ngôn ngữ'}</span>
              <LanguageSwitcher />
            </div>

            {/* Extra Utility Links */}
            <div className="flex flex-col gap-2 px-2 text-xs font-bold text-white/90 mt-2">
              <Link
                to="/promotions"
                onClick={() => setMenuOpen(false)}
                className="hover:text-[#FFD400] flex items-center gap-2.5 py-2"
                style={{ color: "white", textDecoration: "none" }}
              >
                <span className="material-symbols-outlined text-[18px] text-[#FFD400]">percent</span>
                {t("nav.promotions") || "Khuyến mãi"}
              </Link>
              <Link
                to="/recipes"
                onClick={() => setMenuOpen(false)}
                className="hover:text-[#FFD400] flex items-center gap-2.5 py-2"
                style={{ color: "white", textDecoration: "none" }}
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-300">restaurant_menu</span>
                {t("nav.recipes") || "Vào bếp"}
              </Link>
              <Link
                to="/account/support"
                onClick={() => setMenuOpen(false)}
                className="hover:text-[#FFD400] flex items-center gap-2.5 py-2"
                style={{ color: "white", textDecoration: "none" }}
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-400">help</span>
                {t('support.helpLink')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;