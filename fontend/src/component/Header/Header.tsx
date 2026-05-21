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
      style={{
        background: "#C1121F",
        fontFamily: "'Nunito', sans-serif",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
    >
      {/* ═══ Top bar ═══ */}
      <div
        style={{
          background: "#9B0E17",
          padding: "4px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        {/* Left — Branch selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BranchSelector />
        </div>

        {/* Right — Member + Language selector (same transparent-text style) */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ cursor: "pointer" }}>🎁 {t("nav.memberLotte")}</span>
          <span style={{ opacity: 0.3 }}>|</span>
          <Link
            to="/account/support"
            style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontWeight: 700 }}
          >
            {t('support.helpLink')}
          </Link>
          <span style={{ opacity: 0.3 }}>|</span>
          <LanguageSwitcher />
        </div>
      </div>

      {/* ═══ Main header ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 24px",
          gap: 20,
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
          position: "relative",
        }}
      >
        <Link to="/home" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            {brandLogoUrl && (
              <img
                src={brandLogoUrl}
                alt="Brand Logo"
                style={{
                  height: 38,
                  width: 38,
                  objectFit: "contain",
                  borderRadius: "50%",
                  background: "white",
                  padding: "2px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              />
            )}
            <div
              style={{
                background: "white",
                borderRadius: 8,
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ color: "#C1121F", fontWeight: 900, fontSize: 22, letterSpacing: -1 }}>
                {brandFirst || "LOTTE"}
              </span>
              <span style={{ color: "#C1121F", fontWeight: 700, fontSize: 14, borderLeft: "2px solid #C1121F", paddingLeft: 6 }}>
                {brandSecond || "Mart"}
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginLeft: 2 }}>{t("common.vietnam")}</span>
          </div>
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "#9B0E17",
            border: "none",
            color: "white",
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          ☰ {t("nav.categories")}
        </button>

        <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
          <form onSubmit={handleSearch} style={{ width: "100%", position: "relative" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
              placeholder={t("nav.searchPlaceholder")}
              style={{
                width: "100%",
                padding: "11px 50px 11px 18px",
                borderRadius: 8,
                border: "none",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "#C1121F",
                border: "none",
                color: "white",
                borderRadius: 6,
                padding: "7px 14px",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              🔍
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && search.trim() && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 8,
              background: "white",
              borderRadius: 8,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              overflow: "hidden",
              zIndex: 1000,
            }}>
              {isSearching ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#666", fontSize: 14 }}>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }}>progress_activity</span>
                  {t('common.searching')}
                </div>
              ) : suggestions.length > 0 ? (
                <div>
                  {suggestions.map((item, idx) => (
                    <Link
                      key={item.id || item._id || idx}
                      to={`/products/${item.id || item._id}`}
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearch("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px 16px",
                        textDecoration: "none",
                        color: "#333",
                        borderBottom: idx < suggestions.length - 1 ? "1px solid #f0f0f0" : "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <img 
                        src={item.image || "https://via.placeholder.com/40"} 
                        alt={item.name} 
                        style={{ width: 40, height: 40, objectFit: "contain", marginRight: 12, borderRadius: 4, background: "#f5f5f5" }} 
                      />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ 
                          fontSize: 14, 
                          fontWeight: 600, 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis" 
                        }}>
                          {/* Basic highlight matching keywords logic */}
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
                        <div style={{ fontSize: 13, color: "#C1121F", fontWeight: 700, marginTop: 4 }}>
                          {item.promotion_price ? (
                            <>
                              {item.promotion_price.toLocaleString("vi-VN")}đ
                              <span style={{ textDecoration: "line-through", color: "#999", fontSize: 11, marginLeft: 6, fontWeight: 400 }}>
                                {item.price.toLocaleString("vi-VN")}đ
                              </span>
                            </>
                          ) : (
                            `${item.price?.toLocaleString("vi-VN")}đ`
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <div 
                    onClick={handleSearch}
                    style={{ 
                      padding: "10px 16px", 
                      textAlign: "center", 
                      background: "#f8f9fa", 
                      color: "#C1121F", 
                      fontSize: 13, 
                      fontWeight: 700,
                      cursor: "pointer",
                      borderTop: "1px solid #f0f0f0"
                    }}
                  >
                    {t('common.viewAllResults', { query: search })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "16px", textAlign: "center", color: "#666", fontSize: 14 }}>
                  {t('common.noSearchResults')}
                </div>
              )}
            </div>
          )}
        </div>

        <HeaderProfile />
      </div>

      {/* ═══ Nav ═══ */}
      <nav style={{ background: "#A50F18", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div
          style={{
            display: "flex",
            gap: 0,
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            overflowX: "auto",
          }}
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
                style={{
                  color: isActive ? "#FFD60A" : "rgba(255,255,255,0.9)",
                  textDecoration: "none",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  whiteSpace: "nowrap",
                  borderBottom: isActive ? "3px solid #FFD60A" : "3px solid transparent",
                  background: isActive ? "rgba(255,214,10,0.15)" : "transparent",
                  transition: "all 0.2s",
                  display: "block",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <div
          style={{
            background: "#A50F18",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === "/home" && currentPath === "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                style={{
                  color: isActive ? "#FFD60A" : "white",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: isActive ? 800 : 600,
                  padding: "8px 0",
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