import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';
import { bannerService } from '../services/bannerService';
import flashDealService from '../services/flashDealService';
import ProductCard from '../components/ProductCard';
import { deriveCategoryLookup, normalizeProduct as normalizeShopProduct } from '../utils/productNormalization';
import { dataService } from '../services/dataService';
import { resolveFlashDealProductContext } from '../utils/flashDealProductResolver';
import { getProductUrl } from '../utils/productUrl';

const BYPASS_FLASH_DEAL_FILTER = false;

const normalizeFlashDealForRender = (deal: any) => {
  const id = String(
    deal?._id ||
    deal?.id ||
    deal?.flash_deal_id ||
    deal?.product_id ||
    deal?.branch_product_id ||
    '',
  );

  return {
    ...deal,
    _id: id,
    id,
    product: deal?.product || deal?.product_id || null,
    product_id: String(deal?.product_id || deal?.product?.id || deal?.product?._id || ''),
    branch_product_id: String(deal?.branch_product_id || deal?.product?.branch_product_id || ''),
    name: String(deal?.name || deal?.title || deal?.product?.name || 'Flash Deal'),
    image: String(
      deal?.image ||
      deal?.image_url ||
      deal?.thumbnail ||
      deal?.product?.image ||
      deal?.product?.images?.[0] ||
      'https://via.placeholder.com/400',
    ),
    image_url: String(
      deal?.image_url ||
      deal?.image ||
      deal?.thumbnail ||
      deal?.product?.image ||
      deal?.product?.images?.[0] ||
      'https://via.placeholder.com/400',
    ),
    is_active: deal?.is_active === true,
  };
};

export const ShopAtHome: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const redirectToLogin = useAuthRedirect();
  
  // Data from store
  const { branchProducts, products, categories, status: dbStatus } = useAppSelector((state) => state.product);
  
  // Branch awareness
  const { currentBranch } = useAppSelector((state) => state.branch);
  const currentBranchId = currentBranch ? String(currentBranch.id || (currentBranch as any)?._id || '') : '';

  // Component States
  const [banners, setBanners] = useState<any[]>([]);
  const [hotDeals, setHotDeals] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [flashDealRefreshTick, setFlashDealRefreshTick] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [skeletonCards] = useState(Array.from({ length: 10 }).map((_, i) => ({ id: `skeleton-${i + 1}` })));
  
  // Filter & Sort States
  const [selectedCategory, setSelectedCategory] = useState<string>('Tat ca');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'discount'>('newest');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'flash_deals_updated_at') {
        setFlashDealRefreshTick((tick) => tick + 1);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setFlashDealRefreshTick((tick) => tick + 1);
      }
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [bannersData, hotDealsData, promoBannersData] = await Promise.all([
          bannerService.getHomeBanners(),
          flashDealService.getFlashDeals(
            {
              include_inactive: false,
              ...(currentBranchId ? { branch_id: currentBranchId } : {}),
            },
            { forceRefresh: true, debug: true },
          ),
          bannerService.getPromoBanners()
        ]);
        setBanners((bannersData as any)?.data || bannersData || []);
        
        const dealData = (hotDealsData as any)?.data || hotDealsData || [];
        const normalizedDeals = (Array.isArray(dealData) ? dealData : []).map(normalizeFlashDealForRender);

        console.log('FLASH DEAL RAW', normalizedDeals);

        const now = new Date();
        const filteredDeals = normalizedDeals.filter((deal: any) => {
          if (deal?.is_active !== true) return false;

          const startDate = deal?.start_date ? new Date(deal.start_date) : null;
          const endDate = deal?.end_date ? new Date(deal.end_date) : null;

          const hasValidStart = !startDate || !Number.isNaN(startDate.getTime());
          const hasValidEnd = !endDate || !Number.isNaN(endDate.getTime());
          if (!hasValidStart || !hasValidEnd) return false;

          const isStarted = !startDate || startDate.getTime() <= now.getTime();
          const isNotEnded = !endDate || now.getTime() <= endDate.getTime();
          return isStarted && isNotEnded;
        });

        console.log('FLASH DEAL FILTERED', filteredDeals);

        const finalDeals = BYPASS_FLASH_DEAL_FILTER ? normalizedDeals : filteredDeals;
        setHotDeals(finalDeals);
        
        setPromoBanners((promoBannersData as any)?.data || promoBannersData || []);
      } catch (error) {
         console.error("Failed to load shop home data:", error);
         toast.error(t("product.errorLoadProducts"));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [t, currentBranchId, flashDealRefreshTick]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setWishlist([]);
      return () => {
        active = false;
      };
    }

    dataService.getWishlist()
      .then((rows) => {
        if (!active) return;
        const ids = (Array.isArray(rows) ? rows : [])
          .map((item: any) => String(item.branch_product_id || item.product_id || ''))
          .filter(Boolean);
        setWishlist(ids);
      })
      .catch(() => {
        if (active) setWishlist([]);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Slider auto-play
  useEffect(() => {
    if (banners.length === 0 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    (products || []).forEach((p: any) => {
      const key = String(p?.id || p?._id || '');
      if (key) map.set(key, p);
    });
    return map;
  }, [products]);

  // View item detail
  const handleViewProduct = (item: any) => {
    const productId = String(item?.product_id || item?.product?.id || item?.product?._id || item?.id || '');
    if (!productId) return;
    navigate(getProductUrl(item));
  };

  // Cart actions
  const handleAddToCart = async (item: any) => {
    const bp = item?.branchProduct || item?.source?.branchProduct || item?.source || {};
    const product = item?.product || item?.source?.product || {};
    const branchProductId = String(item?.branch_product_id || bp?.id || bp?._id || item?.id || '');
    const unitPrice = Number(item?.price ?? bp?.price ?? 0) || 0;
    const stock = Number(item?.stock ?? bp?.stock ?? 0) || 0;

    if (!currentBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return false;
    }

    if (!isAuthenticated) {
      redirectToLogin({ action: 'add_to_cart', branch_product_id: branchProductId, price: unitPrice, qty: 1, product: bp });
      return false;
    }

    if (stock <= 0) {
      toast.error(t('product.outOfStock'));
      return false;
    }

    try {
      await dispatch(addToCartAsync({
        branchId: String(currentBranchId),
        branch_product_id: branchProductId,
        price: unitPrice,
        unit_price: unitPrice,
        quantity: 1,
        product_name: product?.name || item?.name || t('common.product'),
        product_image: item?.image || product?.images?.[0] || '',
        branchProduct: bp,
      })).unwrap();

      toast.success(t('product.addedToCart', { name: product?.name || item?.name || t('common.product') }));
      return true;
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : (error?.message || t('common.addToCartError')));
      return false;
    }
  };

  const toggleWishlist = async (item: any) => {
    const branchProductId = String(item?.branch_product_id || item?.id || '');
    const productId = String(item?.product_id || item?.product?.id || item?.product?._id || item?.source?.product?.id || item?.source?.product?._id || '');
    const wishKey = branchProductId || productId;
    if (!wishKey) return;

    if (!isAuthenticated) {
       redirectToLogin({ action: 'wishlist' });
       return;
    }

    try {
      const result = await dataService.toggleWishlist({
        product_id: productId || undefined,
        branch_product_id: branchProductId || undefined,
      });

      const wished = typeof result?.wished === 'boolean' ? result.wished : !wishlist.includes(wishKey);
      setWishlist((prev) => {
        if (wished) {
          const merged = new Set([...prev, wishKey]);
          return Array.from(merged);
        }
        return prev.filter((wid) => wid !== wishKey);
      });

      if (wished) {
        toast.success(t('product.addedWishlist'));
      } else {
        toast.info(t('product.removedWishlist'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const validBranchProducts = useMemo(() => {
    let bps = (branchProducts || []).filter((bp: any) => bp.is_active !== false && bp.product_id);
    
    // *** KEY BRANCH FILTER ***
    // If a branch is selected, only show products with matching branch_id
    if (currentBranchId) {
      bps = bps.filter((bp: any) => String(bp.branch_id) === currentBranchId);
    }
    
    return bps;
  }, [branchProducts, currentBranchId]);

  const categoryLookup = useMemo(() => deriveCategoryLookup(categories || []), [categories]);

  const normalizedShopProducts = useMemo(() => {
    return validBranchProducts.map((bp: any) => {
      const sourceProduct = productMap.get(String(bp.product_id));
      const sourceImages = Array.isArray(sourceProduct?.images) ? sourceProduct.images : [];
      const mainImg = sourceImages[0] || sourceProduct?.thumbnail || bp?.image || bp?.thumbnail || '';
      return normalizeShopProduct({
        ...bp,
        branchProduct: bp,
        product: sourceProduct,
        name: sourceProduct?.name || bp?.name,
        category_name: bp?.category_name || sourceProduct?.category_name,
        category: sourceProduct?.category,
        images: sourceImages,
        image: mainImg,
        thumbnail: sourceProduct?.thumbnail || mainImg || '',
      }, categoryLookup);
    });
  }, [validBranchProducts, productMap, categoryLookup]);

  const categoryTabs = useMemo(() => {
    const unique = Array.from(new Set(normalizedShopProducts.map((p: any) => p.categoryShop).filter(Boolean)));
    return ['Tat ca', ...unique];
  }, [normalizedShopProducts]);

  const flashDealProducts = useMemo(() => {
    const normalized = hotDeals
      .map((deal: any) => {
        const {
          resolvedProductId,
          product,
          matchedBranchProduct: resolvedBranchProduct,
        } = resolveFlashDealProductContext(deal, products || [], branchProducts || [], String(currentBranchId || ''));
        if (!resolvedProductId) return null;
        const productAny = product as any;
        if (productAny?.is_active === false) return null;

        const dealBranchId = String(deal?.branch_ids?.[0] || deal?.target_branch_ids?.[0] || '');
        let matchedBp = resolvedBranchProduct;
        if (!matchedBp && dealBranchId) {
          matchedBp = (branchProducts || []).find((bp: any) =>
            String(bp.product_id) === resolvedProductId && String(bp.branch_id) === dealBranchId
          ) || null;
        }

        const dealPrice = Number(deal?.deal_price ?? matchedBp?.effective_price ?? matchedBp?.price ?? productAny?.effective_price ?? productAny?.price ?? 0);
        const originalPrice = Number(deal?.original_price ?? matchedBp?.original_price ?? productAny?.original_price ?? dealPrice);
        
        const dealImages = Array.isArray(productAny?.images) ? productAny.images : [];
        const dealImage = deal?.image || deal?.image_url || productAny?.thumbnail || dealImages[0] || '';

        return {
          ...deal,
          _id: deal?._id || deal?.id,
          id: deal?.id || deal?._id,
          product_id: resolvedProductId,
          branch_product_id: matchedBp ? String(matchedBp.id || matchedBp._id) : '',
          name: productAny?.name || deal?.title || 'Flash Deal',
          image: dealImage,
          thumbnail: productAny?.thumbnail || dealImage,
          price: dealPrice,
          effective_price: dealPrice,
          original_price: originalPrice,
          pricing_source: 'HOT_DEAL',
          active_hot_deal: deal,
          stock: matchedBp ? Number(matchedBp.stock) : Number(deal?.remaining_quantity ?? deal?.stock ?? 10),
          categoryShop: productAny?.category_name || productAny?.category?.name || 'Gia dụng',
          rating: productAny?.rating || productAny?.average_rating || 4.8,
        };
      })
      .filter(Boolean)
      .filter((deal: any) => Number(deal?.stock || 0) > 0)
      .map((deal: any) => {
        const finalPrice = deal.price;
        const originalPrice = deal.original_price;

        let discountPercent = Number(deal.discount_percent || 0);
        if (discountPercent <= 0 && Number(deal.discount_value || 0) > 0 && originalPrice > 0) {
          discountPercent = Math.max(0, Math.round((Number(deal.discount_value || 0) / originalPrice) * 100));
        }
        if (discountPercent <= 0 && originalPrice > finalPrice && originalPrice > 0) {
          discountPercent = Math.max(0, Math.round(((originalPrice - finalPrice) / originalPrice) * 100));
        }

        return {
          ...deal,
          discount_percent: discountPercent,
          isOutOfStock: Number(deal.stock || 0) <= 0,
          badges: ['hot'],
        };
      });

    const dedup = new Map<string, any>();
    normalized.forEach((item: any) => {
      const key = String(item.product_id || '');
      if (key && !dedup.has(key)) dedup.set(key, item);
    });

    return Array.from(dedup.values()).slice(0, 5);
  }, [hotDeals, products, branchProducts, currentBranchId]);

  const newReleaseProducts = useMemo(() => {
    let filtered = normalizedShopProducts.filter((item: any) => item.is_new === true || item.badges?.includes('new') || item?.source?.is_new === true);
    
    if (filtered.length === 0 && normalizedShopProducts.length > 0) {
       filtered = normalizedShopProducts.filter((item: any) => item.is_featured === true || item?.source?.is_featured === true);
       if (filtered.length === 0) {
          filtered = [...normalizedShopProducts].reverse();
       }
    }
    
    return filtered.slice(0, 10);
  }, [normalizedShopProducts]);

  // Main filtered grid logic
  const filteredGrid = useMemo(() => {
    let result = [...normalizedShopProducts];

    if (selectedCategory !== 'Tat ca') {
      result = result.filter((item: any) => item.categoryShop === selectedCategory);
    }

    // Search Filter
    if (searchQuery.trim()) {
       const q = searchQuery.toLowerCase().trim();
       result = result.filter((item: any) => {
         const name = String(item.name || '').toLowerCase();
         const category = String(item.categoryShop || '').toLowerCase();
         return name.includes(q) || category.includes(q);
       });
    }

    // Sorting
    result.sort((a, b) => {
       if (sortBy === 'price_asc') return a.price - b.price;
       if (sortBy === 'price_desc') return b.price - a.price;
       if (sortBy === 'discount') {
          const aDisc = a.original_price ? ((a.original_price - a.price) / a.original_price) : 0;
          const bDisc = b.original_price ? ((b.original_price - b.price) / b.original_price) : 0;
          return bDisc - aDisc;
       }
       // 'newest'
        return new Date((b as any).source?.created_at || 0).getTime() - new Date((a as any).source?.created_at || 0).getTime();
    });

    return result;
      }, [normalizedShopProducts, selectedCategory, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredGrid.length / ITEMS_PER_PAGE);
  
  // Auto-reset page if out of bounds (due to filter change)
  useEffect(() => {
     if (page > totalPages && totalPages > 0) {
        setPage(1);
     }
  }, [totalPages, page]);

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [currentBranchId]);

  const displayedGrid = filteredGrid.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const isProductLoading = dbStatus === 'loading' || isLoading;

  // Logic for countdown (from hot deals or default 5h bounds)
  const targetDate = useMemo(() => {
    const firstHotDeal = hotDeals?.[0];
    if (firstHotDeal && (firstHotDeal.end_date || firstHotDeal.valid_until)) {
      const parsed = new Date(firstHotDeal.end_date || firstHotDeal.valid_until).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    return Date.now() + 5 * 60 * 60 * 1000;
  }, [hotDeals]);
  
  const calculateTimeLeft = useCallback(() => {
    const difference = targetDate - Date.now();
    if (difference <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return { hours, minutes, seconds, expired: false };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    setTimeLeft(calculateTimeLeft()); // recalculate immediately when targetDate changes
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      
      {/* 1. Hero Banner Slider */}
      {banners.length > 0 && (
        <section 
          className="mb-12 relative rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[21/9] lg:aspect-[25/8] group shadow-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {banners.map((banner, idx) => (
            <div
              key={banner._id || banner.id || banner.image || banner.title}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[30s] group-hover:scale-105"
                style={{ backgroundImage: `url('${banner.bgImage || banner.image || "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"}')` }}
              />
              <div
                className="absolute inset-0"
                style={{ background: banner.overlay_color || 'rgba(0,0,0,0.3)' }}
              />

              <div
                className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 w-full md:w-2/3"
                style={{
                  color: banner.text_color || '#ffffff',
                  textShadow: (banner.text_shadow !== false) ? '0 2px 6px rgba(0,0,0,0.6)' : 'none'
                }}
              >
                {banner.title.includes("Flash") || banner.title.includes("Deal") ? (
                  <span
                    className="self-start inline-block bg-primary/80 backdrop-blur-md text-[10px] sm:text-xs font-black uppercase px-4 py-1.5 rounded-full mb-4 sm:mb-6 shadow-lg border border-white/20 text-white text-shadow-none"
                    style={{ textShadow: 'none' }}
                  >
                    {t('common.topPromo')}
                  </span>
                ) : (
                  <span
                    className="self-start inline-block bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-black uppercase px-4 py-1.5 rounded-full mb-4 sm:mb-6 shadow-lg border border-white/20 text-white text-shadow-none"
                    style={{ textShadow: 'none' }}
                  >
                    {t('common.hotEvent')}
                  </span>
                )}
                
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4 sm:mb-6 drop-shadow-2xl">
                  {banner.title}
                </h2>
                
                <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl mb-6 sm:mb-8 font-medium drop-shadow-lg opacity-90 max-w-xl line-clamp-2 md:line-clamp-none">
                  {banner.subtitle || banner.description?.replace(/<[^>]*>?/gm, '')}
                </p>

                <button onClick={() => navigate('/events')} className="w-fit bg-white text-primary px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-black text-sm sm:text-base shadow-2xl hover:bg-primary hover:text-white transition-all duration-300 flex items-center gap-2 group/btn transform hover:-translate-y-1 active:scale-95">
                  {banner.cta || t('product.explore')}
                  <span className="material-symbols-outlined text-lg sm:text-xl group-hover/btn:translate-x-2 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}

          <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 sm:gap-4 z-20">
            {banners.map((banner, idx) => (
              <button
                key={banner._id || banner.id || `${banner.image || ''}-${banner.title || ''}`}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full transition-all duration-300 shadow-md ${
                  idx === currentSlide ? 'bg-white scale-150 ring-4 ring-white/30' : 'bg-white/50 hover:bg-white/90'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button onClick={() => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:scale-110">
            <span className="material-symbols-outlined text-xl sm:text-3xl">chevron_left</span>
          </button>
          <button onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:scale-110">
            <span className="material-symbols-outlined text-xl sm:text-3xl">chevron_right</span>
          </button>
        </section>
      )}

      {/* 2. Categories Carousel / Grid */}
      <section className="mb-14">
        <h3 className="text-xl lg:text-2xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
          <span className="material-symbols-outlined text-primary text-2xl">category</span>
          {t('product.categoryShop')}
        </h3>
        {(categoryTabs.length <= 1) ? (
           <p className="text-slate-500 text-center py-6">{t('product.noProducts')}</p>
        ) : (
           <div className="overflow-x-auto pb-2">
             <div className="flex min-w-max gap-2 sm:gap-3">
               {categoryTabs.map((categoryName: string) => {
                 const isActive = selectedCategory === categoryName;
                 const label = categoryName === 'Tat ca' ? t('product.all') : categoryName;
                 return (
                   <button
                     key={categoryName}
                     onClick={() => {
                       setSelectedCategory(categoryName);
                       setPage(1);
                       document.getElementById('main-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     }}
                     className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-all ${isActive ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30' : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary'}`}
                   >
                     {label}
                   </button>
                 );
               })}
             </div>
           </div>
        )}
      </section>

      {/* 3. Flash Deals Selection */}
      {hotDeals.length > 0 && (
        <section className="mb-14 p-6 sm:p-8 bg-gradient-to-br from-[#ffe5e5] to-[#fff1f1] dark:from-red-900/20 dark:to-slate-800 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-inner">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-red-500 rounded-xl p-2.5 shadow-lg shadow-red-500/30 flex items-center justify-center animate-pulse">
                 <span className="material-symbols-outlined text-white text-3xl">bolt</span>
               </div>
               <div>
                  <h3 className="text-2xl lg:text-3xl font-black text-red-600 dark:text-red-400 uppercase tracking-tight">{t('product.flashDeal')}</h3>
                  <p className="text-red-800/60 dark:text-red-300/60 text-sm font-semibold mt-1">{t('product.flashDealDesc')}</p>
               </div>
            </div>
            {!timeLeft.expired ? (
              <div className="flex gap-2.5 items-center bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl shadow-xl shadow-red-500/10 border border-red-50 dark:border-red-900/20">
                <span className="text-slate-600 dark:text-slate-300 font-bold text-sm uppercase tracking-wider mr-1">{t('product.endsIn')}</span>
                <div className="flex gap-1.5 text-lg font-black">
                  <span className="bg-red-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-inner">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-red-600 flex items-center font-black animate-pulse">:</span>
                  <span className="bg-red-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-inner">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-red-600 flex items-center font-black animate-pulse">:</span>
                  <span className="bg-red-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-inner">{String(timeLeft.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-800 backdrop-blur px-6 py-3 rounded-2xl border border-red-200">
                 <span className="text-red-500 font-black text-lg uppercase">{t('product.ended')}</span>
              </div>
            )}
          </div>

          {flashDealProducts.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 lg:gap-6 pb-4 snap-x snap-mandatory scrollbar-hide relative z-10">
              {flashDealProducts.map((productItem: any) => (
                <div key={productItem._id || productItem.id} className="min-w-[180px] md:min-w-[220px] max-w-[260px] flex-shrink-0 snap-start">
                  <ProductCard
                  product={productItem}
                  isWished={wishlist.includes(String(productItem.branch_product_id || productItem.id))}
                  onClick={handleViewProduct}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={toggleWishlist}
                />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-red-200 bg-white/70 px-6 py-8 text-center text-sm font-semibold text-red-600">
               {t('common.flashDealNoMatch')}
            </div>
          )}
        </section>
      )}

      {/* 4. Secondary Promos */}
      {promoBanners && promoBanners.length > 0 && (
        <section className="mb-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoBanners.map((banner: any, idx: number) => (
            <div
              key={banner._id || banner.id || banner.image || banner.title}
              className={`bg-${banner.bg_color || 'slate-100'} dark:bg-slate-800/80 rounded-3xl p-8 sm:p-10 flex items-center justify-between overflow-hidden relative group hover:-translate-y-1 transition-all duration-300 shadow-sm border border-slate-100 dark:border-slate-700`}
            >
              <div className="z-10 relative flex flex-col justify-center h-full w-2/3">
                <span className="bg-white/40 dark:bg-black/30 w-fit text-slate-800 dark:text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 backdrop-blur-md">{t('common.collection')}</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{banner.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm sm:text-base font-medium line-clamp-2" dangerouslySetInnerHTML={{ __html: banner.description || t('promotions.limitedOffer', 'Limited offer') }} />
                <button onClick={() => navigate('/events')} className="w-fit bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 sm:px-8 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm">
                  {banner.button_text || t('common.viewNow')}
                </button>
              </div>
              <img
                className="absolute right-0 bottom-0 h-[120%] w-[55%] object-cover object-left-bottom opacity-90 group-hover:scale-110 transition-transform duration-700 rounded-bl-full"
                src={banner.image || `https://source.unsplash.com/random/400x400?product&sig=${idx}`}
                alt={banner.title}
              />
            </div>
          ))}
        </section>
      )}

      {/* 5. Sản phẩm mới (New Releases) */}
      <section className="mb-14">
        <h3 className="text-xl lg:text-2xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
          <span className="material-symbols-outlined text-primary text-2xl">new_releases</span>
          {t('product.newProducts')}
        </h3>
        {newReleaseProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm font-semibold text-slate-500">
            {t('product.noProducts')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 pb-4">
            {newReleaseProducts.map((item: any) => (
              <div key={item._id || item.id} className="w-full h-full">
                <ProductCard
                  product={item}
                isWished={wishlist.includes(String(item.branch_product_id || item.id))}
                onClick={handleViewProduct}
                onAddToCart={handleAddToCart}
                onToggleWishlist={toggleWishlist}
              />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Main Product Discovery View */}
      <section id="main-products" className="scroll-mt-24 pt-4 mb-20">
         <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
            <div>
               <h3 className="text-2xl lg:text-3xl font-black flex items-center gap-3 uppercase tracking-tight text-slate-800 dark:text-white">
                 <span className="material-symbols-outlined text-primary text-3xl">shopping_bag</span>
                 {selectedCategory !== 'Tat ca' ? selectedCategory : t('product.suggestedForYou')}
               </h3>
               <p className="text-slate-500 mt-2 font-medium">{t('product.found')} {filteredGrid.length} {t('product.productsMatch')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
               <div className="relative w-full sm:w-64 group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10">search</span>
                  <input 
                     type="text" 
                     placeholder={t('product.searchProducts')} 
                     value={searchQuery}
                     onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                     className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all text-sm font-medium"
                  />
                  {searchQuery && (
                     <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200 dark:bg-slate-700 rounded-full w-5 h-5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                     </button>
                  )}
               </div>
               
               <div className="w-full sm:w-auto relative">
                 <select 
                   value={sortBy} 
                   onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                   className="w-full appearance-none pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-sm"
                 >
                    <option value="newest">{t('product.newest')}</option>
                    <option value="price_asc">{t('product.priceLowToHigh')}</option>
                    <option value="price_desc">{t('product.priceHighToLow')}</option>
                    <option value="discount">{t('product.biggestDiscount')}</option>
                 </select>
                 <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">swap_vert</span>
               </div>
            </div>
         </div>

         {/* Product Grid */}
         {isProductLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
              {skeletonCards.map((item: any) => (
                <ProductCard key={item._id || item.id} loading product={{
                  id: item.id,
                  name: '',
                  price: 0,
                  original_price: 0,
                  image: '',
                  categoryShop: '',
                  rating: 0,
                  stock: 0,
                  discount_percent: 0,
                  isOutOfStock: false,
                  badges: [],
                }} />
              ))}
            </div>
         ) : displayedGrid.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
               <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 text-slate-400">
                  <span className="material-symbols-outlined text-4xl">search_off</span>
               </div>
               <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('product.noProducts')}</h3>
               <p className="text-slate-500 max-w-md">{t('product.noProductsDesc')}</p>
              {(selectedCategory !== 'Tat ca' || searchQuery) && (
                <button onClick={() => { setSelectedCategory('Tat ca'); setSearchQuery(''); }} className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                    {t('product.clearFilters')}
                 </button>
               )}
            </div>
         ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
                {displayedGrid.map((item: any) => (
                  <ProductCard
                    key={item._id || item.id}
                    product={item}
                    isWished={wishlist.includes(String(item.branch_product_id || item.id))}
                    onClick={handleViewProduct}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={toggleWishlist}
                  />
                  ))}
               </div>
               
               {/* Pagination Component */}
               {totalPages > 1 && (
                  <div className="mt-14 flex items-center justify-center gap-4">
                     <button 
                       disabled={page === 1}
                       onClick={() => { setPage(p => p - 1); document.getElementById('main-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} 
                       className="px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-xl font-bold hover:border-primary hover:text-primary transition-all flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-700"
                     >
                       <span className="material-symbols-outlined text-[20px]">chevron_left</span> {t('product.prevPage')}
                     </button>
                     
                     <span className="text-slate-600 dark:text-slate-400 font-semibold px-4 cursor-default">
                        {t('product.pageOf')} <span className="text-primary font-black text-lg mx-1">{page}</span> / {totalPages}
                     </span>
                     
                     <button 
                       disabled={page >= totalPages}
                       onClick={() => { setPage(p => p + 1); document.getElementById('main-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} 
                       className="px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-xl font-bold hover:border-primary hover:text-primary transition-all flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-700"
                     >
                       {t('product.nextPage')} <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                     </button>
                  </div>
               )}
            </>
         )}
      </section>

      {BYPASS_FLASH_DEAL_FILTER && (
        <div className="hidden">FLASH DEAL FILTER BYPASS ENABLED</div>
      )}
    </main>
  );
};

export default ShopAtHome;
