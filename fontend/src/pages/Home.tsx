import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { setCurrentBranch } from '../slices/branchSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { toast } from '../components/Toast/toastEvent';
import { bannerService } from '../services/bannerService';
import flashDealService from '../services/flashDealService';
import { useBranchData } from '../hooks/useBranchData';
import { filterVisibleFlashDeals, evaluateFlashDealVisibility } from '../utils/flashDeal';
import { HotDealCountdown } from '../components/HotDealCountdown/HotDealCountdown';
import { resolveImageUrl, fallbackProductImage } from '../utils/imageUrl';


const Home: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const redirectToLogin = useAuthRedirect();
  const { branches } = useAppSelector((state) => state.branch);
  const { products, branchProducts } = useAppSelector((state) => state.product);


  const [banners, setBanners] = useState<any[]>([]);
  const [flashDeals, setFlashDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [flashDealRefreshTick, setFlashDealRefreshTick] = useState(0);
  const [showAllBranchDeals, setShowAllBranchDeals] = useState(false);

  const { currentBranchId, availableProducts, filterBanners } = useBranchData();

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

  useEffect(() => {
    const fetchHomeData = async () => {
      if (!currentBranchId) return;
      setLoading(true);
      try {
        const [bannersRes, flashDealRes] = await Promise.all([
          bannerService.getBanners({ includeInactive: false, isActive: true }),
          flashDealService.getFlashDeals(
            {
              include_inactive: false,
              is_active: true,
            },
            { forceRefresh: true, debug: true },
          ),
        ]);

        const bannerData = (bannersRes as any)?.data || bannersRes || [];
        setBanners(filterBanners(bannerData));

        const dealData = (flashDealRes as any)?.data || flashDealRes || [];
        const normalizedDeals = Array.isArray(dealData) ? dealData : [];
        const validDeals = filterVisibleFlashDeals(normalizedDeals, {});

        console.info('[Home][flash-deals][fetch]', {
          branch_id: currentBranchId,
          fetched: normalizedDeals.length,
          visible: validDeals.length,
          sample: normalizedDeals.slice(0, 5).map((deal: any) => ({
            id: deal?.id || deal?._id,
            is_active: deal?.is_active,
            status: deal?.status,
            start_date: deal?.start_date,
            end_date: deal?.end_date,
            remaining_quantity: deal?.remaining_quantity,
            visibility: evaluateFlashDealVisibility(deal, {}),
          })),
        });

        setFlashDeals(validDeals);
      } catch (error) {
        console.error('Failed to load home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [currentBranchId, filterBanners, flashDealRefreshTick]);

  const newProducts = useMemo(() => {
    const products = availableProducts || [];
    let filtered = products.filter((item: any) => item && item.is_new);
    
    if (filtered.length === 0 && products.length > 0) {
      filtered = products.filter((item: any) => item && item.is_featured);
      if (filtered.length === 0) {
        filtered = [...products].reverse(); 
      }
    }
    
    return filtered.slice(0, 8);
  }, [availableProducts]);

  const suggestedProducts = useMemo(() => {
    return [...(availableProducts || [])]
      .sort((a: any, b: any) => Number(b?.sold_count || 0) - Number(a?.sold_count || 0))
      .slice(0, 8);
  }, [availableProducts]);

  const categorySections = useMemo(() => {
    const grouped = new Map<string, any[]>();
    (availableProducts || []).forEach((item: any) => {
      if (!item) return;
      const categoryName = String(item.categoryShop || item.category_name || item.category?.name || t('common.other')).trim() || t('common.other');
      const list = grouped.get(categoryName) || [];
      list.push(item);
      grouped.set(categoryName, list);
    });

    return Array.from(grouped.entries())
      .map(([name, items]) => ({
        name,
        items: items.slice(0, 4),
      }))
      .filter((section) => section.items.length > 0)
      .slice(0, 3);
  }, [availableProducts]);

  const flashDealItems = useMemo(() => {
    return (flashDeals || [])
      .map((deal: any) => {
        // Find product details
        const matchedProduct = (products || []).find((item: any) => {
          const productId = String(item?.id || item?._id || '');
          const dealProductId = String(deal?.product_id || '');
          const candidateProductIds = [
            dealProductId,
            ...((Array.isArray(deal?.product_ids) ? deal.product_ids : []).map((id: any) => String(id))),
          ].filter(Boolean);
          return productId && candidateProductIds.includes(productId);
        });

        const productAny = matchedProduct as any;
        const dealProductId = String(deal?.product_id || productAny?.id || productAny?._id || '');
        if (!dealProductId) return null;

        // Find branch product matching this deal or product
        const dealBranchId = String(deal?.branch_ids?.[0] || deal?.target_branch_ids?.[0] || '');
        
        let matchedBp = (branchProducts || []).find((bp: any) => 
          String(bp.product_id) === dealProductId && 
          String(bp.branch_id) === String(currentBranchId)
        );

        if (!matchedBp && dealBranchId) {
          matchedBp = (branchProducts || []).find((bp: any) => 
            String(bp.product_id) === dealProductId && 
            String(bp.branch_id) === dealBranchId
          );
        }

        if (!matchedBp) {
          matchedBp = (branchProducts || []).find((bp: any) => 
            String(bp.product_id) === dealProductId
          );
        }

        const actualBranchId = matchedBp ? String(matchedBp.branch_id) : dealBranchId;
        const matchedBranch = (branches || []).find((b: any) => String(b.id || b._id) === actualBranchId);

        const dealPrice = Number(deal?.deal_price || matchedBp?.price || productAny?.price || 0);
        const originalPrice = Number(deal?.original_price || matchedBp?.original_price || productAny?.original_price || dealPrice || 0);

        return {
          ...deal,
          title: deal?.title || productAny?.name || t('product.flashDeal'),
          image_url: deal?.image_url || productAny?.images?.[0] || productAny?.thumbnail || '',
          product_id: dealProductId,
          deal_price: dealPrice,
          original_price: originalPrice,
          total_quantity: Number(deal?.total_quantity || deal?.stock_limit || 0),
          remaining_quantity: deal?.remaining_quantity,
          branch_id: actualBranchId,
          branch_name: matchedBranch ? matchedBranch.name : '',
          matchedBranch,
          stock: matchedBp ? Number(matchedBp.stock) : 0,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [flashDeals, products, branchProducts, branches, currentBranchId, t]);

  const filteredFlashDealItems = useMemo(() => {
    if (showAllBranchDeals) return flashDealItems;
    return flashDealItems.filter((deal: any) => {
      const dealBranchId = String(deal.branch_id || '').trim();
      return !dealBranchId || dealBranchId === String(currentBranchId).trim();
    });
  }, [flashDealItems, showAllBranchDeals, currentBranchId]);

  useEffect(() => {
    if (!filteredFlashDealItems.length) {
      setCountdown(null);
      return;
    }

    const endTs = filteredFlashDealItems[0]?.end_date ? new Date(filteredFlashDealItems[0].end_date).getTime() : null;
    if (!endTs) {
      setCountdown(null);
      return;
    }

    const tick = () => {
      const diff = Math.max(0, endTs - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ hours, minutes, seconds });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [flashDealItems]);

  const mainBanner = banners[0];
  const sideBanner1 = banners[1];
  const sideBanner2 = banners[2];

  const handleAddToCart = async (item: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return;
    }

    if (Number(item?.stock || 0) <= 0) {
      toast.error(t('product.outOfStock'));
      return;
    }

    if (!isAuthenticated) {
      redirectToLogin({
        action: 'add_to_cart',
        branch_product_id: String(item?.branch_product_id || item?._id || item?.id),
        price: Number(item?.price || 0),
        qty: 1,
        product: item,
      });
      return;
    }

    try {
      await dispatch(
        addToCartAsync({
          branchId: currentBranchId,
          branch_product_id: String(item?.branch_product_id || item?._id || item?.id),
          price: Number(item?.price || 0),
          unit_price: Number(item?.price || 0),
          quantity: 1,
          product_name: item?.name,
          product_image: item?.images?.[0] || item?.thumbnail || '',
          branchProduct: item,
        }),
      ).unwrap();
      toast.success(t('product.addedToCart', { name: item?.name || t('cart.product') }));
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : (error?.message || t('common.addToCartError')));
    }
  };

  const handleSwitchToAvailableBranch = (branch: any) => {
    if (!branch) return;
    dispatch(setCurrentBranch(branch));
    toast.success(t('branch.switchedTo', { name: branch.name, defaultValue: `Đã chuyển sang chi nhánh: ${branch.name}` }));
  };

  const renderProductGrid = (products: any[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-3xl h-[360px]" />
          ))}
        </div>
      );
    }

    if (!products.length) {
      return <div className="py-12 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl">{emptyMessage}</div>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {products.map((item, index) => (
          <Link
            key={`${String(item?.id || item?._id || index)}-${index}`}
            to={`/products/${item?.product_id || item?.id || item?._id}`}
            className="product-card bg-white dark:bg-slate-800 rounded-3xl shadow-premium overflow-hidden group relative cursor-pointer hover:shadow-premium-hover transition-shadow duration-300"
          >
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {item?.is_best_seller && (
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic shadow-lg shadow-primary/30">
                  {t('common.hotDeal')}
                </span>
              )}
              {item?.is_new && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic shadow-lg shadow-amber-500/30">
                  {t('common.new')}
                </span>
              )}
            </div>

            <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-900">
              <img
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                src={resolveImageUrl(item?.images?.[0] || item?.thumbnail) || fallbackProductImage}
                alt={item?.name || t('cart.product')}
              />
              <button
                onClick={(event) => handleAddToCart(item, event)}
                className="absolute bottom-4 right-4 bg-primary text-white w-12 h-12 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center transform translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
              >
                <span className="material-symbols-outlined !text-2xl">shopping_cart</span>
              </button>
            </div>

            <div className="p-6 flex flex-col h-auto min-h-[140px]">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-primary font-bold text-[10px] uppercase tracking-wider">{item?.brand || 'Lotte Selection'}</p>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="flex text-amber-400">
                  <span className="material-symbols-outlined !text-[12px] !fill-1">star</span>
                  <span className="text-slate-400 text-[10px] font-bold ml-1">{item?.rating || 4.8}</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mb-4 min-h-[3rem]">{item?.name}</h3>

              <div className="flex flex-col mt-auto">
                <span className="text-2xl font-black text-primary">{Number(item?.price || 0).toLocaleString('vi-VN')}₫</span>
                {item?.original_price && item.original_price > item.price && (
                  <span className="text-slate-400 text-xs line-through">{Number(item.original_price).toLocaleString('vi-VN')}₫</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @tailwind base;
        @tailwind utilities;
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
        .shadow-premium { box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1), 0 10px 20px -5px rgba(0,0,0,0.05); }
        .lift-hover { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .lift-hover:hover { transform: translateY(-8px); }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-20 mb-20">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mainBanner ? (
            <div className="lg:col-span-2 relative group overflow-hidden rounded-3xl shadow-premium h-[500px]">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-105"
                style={{ backgroundImage: `url('${mainBanner.image_url || mainBanner.image}')` }}
              >
                <div className="absolute inset-0 flex flex-col justify-center px-16" style={{ background: mainBanner.overlay_color || 'rgba(0,0,0,0.3)' }}>
                  <div style={{ color: mainBanner.text_color || '#ffffff', textShadow: mainBanner.text_shadow !== false ? '0 2px 6px rgba(0,0,0,0.6)' : 'none' }}>
                    <div className="inline-block bg-primary/20 backdrop-blur-md px-4 py-1.5 rounded-full font-extrabold uppercase tracking-widest text-[10px] mb-4 border border-white/10 w-fit" style={{ color: mainBanner.text_color || '#ffffff' }}>
                      {t('common.topPromo')}
                    </div>
                    <h2 className="text-6xl font-extrabold mb-6 leading-[1.1]" dangerouslySetInnerHTML={{ __html: mainBanner.title }} />
                    <p className="text-lg mb-8 max-w-md opacity-90">{mainBanner.description}</p>
                    <Link to={mainBanner.link || '/promotions'} className="bg-primary hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-primary/30 inline-block">
                      {t('common.viewNow')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 relative group overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 h-[500px] flex items-center justify-center">
              {loading ? <div className="animate-pulse w-full h-full bg-slate-200 dark:bg-slate-700" /> : <span className="text-slate-400 font-bold">{t('product.noProducts')}</span>}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {[sideBanner1, sideBanner2].map((banner: any, index) => (
              banner ? (
                <Link key={String(banner.id || index)} to={banner.link || '/promotions'} className="relative h-[238px] rounded-3xl overflow-hidden shadow-premium group cursor-pointer block">
                  <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: `url('${banner.image_url || banner.image}')` }}>
                    <div className="absolute inset-0 p-8 flex flex-col justify-end" style={{ background: banner.overlay_color || 'rgba(0,0,0,0.3)' }}>
                      <div style={{ color: banner.text_color || '#ffffff', textShadow: banner.text_shadow !== false ? '0 2px 6px rgba(0,0,0,0.6)' : 'none' }}>
                        <span className="font-bold text-xs uppercase mb-2 opacity-90 block">{t('common.collection')}</span>
                        <h3 className="text-2xl font-bold mb-1" dangerouslySetInnerHTML={{ __html: banner.title }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={`empty-banner-${index}`} className="h-[238px] rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold shadow-premium">
                  {loading ? <div className="animate-pulse w-full h-full bg-slate-200 dark:bg-slate-700" /> : t('product.noProducts')}
                </div>
              )
            ))}
          </div>
        </section>

        {/* Smart Shopping Promotional Banner */}
        <section className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 rounded-3xl p-8 md:p-12 text-white shadow-premium relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined !text-4xl md:!text-5xl text-[#FFD60A]">auto_awesome</span>
              {t('smartShopping.title')}
            </h2>
            <p className="text-lg text-white/90 font-medium mb-6">
              {t('smartShopping.description')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/smart-shopping" className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg shadow-black/10 flex items-center gap-2">
                <span className="material-symbols-outlined !text-xl">psychology</span>
                {t('smartShopping.explore')}
              </Link>
              <Link to="/smart-shopping?tab=recipe" className="bg-black/20 backdrop-blur-md text-white border border-white/20 px-8 py-3 rounded-xl font-bold hover:bg-black/30 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined !text-xl">restaurant_menu</span>
                {t('smartShopping.buyByRecipe')}
              </Link>
            </div>
          </div>
          <div className="relative z-10 shrink-0 hidden lg:block">
            <div className="w-48 h-48 bg-white/10 rounded-full border border-white/20 flex items-center justify-center p-8 backdrop-blur-sm animate-[spin_20s_linear_infinite]">
              <span className="material-symbols-outlined !text-8xl text-white">magic_button</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined !text-5xl text-[#FFD60A]">robot_2</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">{t('product.categoryShop')}</h2>
            <Link className="flex items-center gap-1 text-primary font-bold hover:gap-2 transition-all" to="/products">
              {t('common.viewNow')} <span className="material-symbols-outlined !text-base">arrow_forward</span>
            </Link>
          </div>

          {categorySections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500 font-semibold">
              {t('product.noProducts')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categorySections.map((section) => (
                <div key={section.name} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-premium border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{section.name}</h3>
                    <Link to={`/products?category=${encodeURIComponent(section.name)}`} className="text-primary text-xs font-bold">{t('common.viewNow')}</Link>
                  </div>
                  <div className="space-y-3">
                    {section.items.map((item: any) => (
                      <Link key={String(item.branch_product_id || item.id || item._id)} to={`/products/${item.product_id || item.id || item._id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <img src={resolveImageUrl(item.images?.[0] || item.thumbnail) || fallbackProductImage} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{item.name}</p>
                          <p className="text-xs text-primary font-extrabold">{Number(item.price || 0).toLocaleString('vi-VN')}₫</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {flashDeals.length > 0 && (
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black text-rose-600 uppercase italic tracking-tighter flex items-center gap-2">
                <span className="material-symbols-outlined !text-4xl">local_fire_department</span>
                {t('product.flashDeal')}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setShowAllBranchDeals(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      !showAllBranchDeals
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                    }`}
                  >
                    Tại chi nhánh của bạn
                  </button>
                  <button
                    onClick={() => setShowAllBranchDeals(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      showAllBranchDeals
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                    }`}
                  >
                    Toàn hệ thống ({flashDealItems.length})
                  </button>
                </div>
                {countdown && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-rose-700 font-bold text-sm">
                    {t('product.endsIn')}: {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                  </div>
                )}
              </div>
            </div>
            {filteredFlashDealItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                {filteredFlashDealItems.map((deal: any, index: number) => {
                  const sold = Math.max(0, (deal.total_quantity || 0) - (deal.remaining_quantity || 0));
                  const pct = deal.total_quantity > 0 ? Math.min(100, (sold / deal.total_quantity) * 100) : 0;
                  const isDifferentBranch = deal.branch_id && currentBranchId && String(deal.branch_id) !== String(currentBranchId);
                  return (
                    <Link key={`${String(deal.id || index)}-${index}`} to={`/products/${deal.product_id}`} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-rose-100 dark:border-rose-900/40 overflow-hidden relative group flex flex-col hover:-translate-y-1 transition-all duration-300">
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        <span className="bg-rose-600 text-white font-black text-[10px] px-2.5 py-1 rounded-lg shadow-lg shadow-rose-600/30 w-fit">
                          -{deal.discount_percent || deal.discount_value || 0}%
                        </span>
                        {deal.branch_name ? (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit ${
                            isDifferentBranch ? 'bg-amber-500 text-white shadow-sm border border-amber-400' : 'bg-slate-800/80 backdrop-blur-sm text-white'
                          }`}>
                            <span className="material-symbols-outlined !text-[10px]">store</span>
                            {deal.branch_name}
                          </span>
                        ) : (
                          <span className="bg-slate-800/80 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined !text-[10px]">store</span>
                            Toàn hệ thống
                          </span>
                        )}
                      </div>
                      <div className="aspect-square bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
                        <img src={resolveImageUrl(deal.image_url) || fallbackProductImage} alt={deal.title || t('product.flashDeal')} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 min-h-[2.5rem] mb-2">{deal.title || t('product.flashDeal')}</h3>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-rose-600 font-black text-base sm:text-lg">{Number(deal.deal_price || 0).toLocaleString('vi-VN')}₫</span>
                          <span className="text-slate-400 text-[11px] line-through">{Number(deal.original_price || 0).toLocaleString('vi-VN')}₫</span>
                        </div>
                        <div className="mb-2">
                          <HotDealCountdown endDate={deal.end_date} />
                        </div>
                        {deal.total_quantity > 0 && (
                          <div className="mt-auto pt-3">
                            <div className="relative w-full bg-rose-100 dark:bg-slate-700/50 h-5 rounded-full overflow-hidden flex items-center justify-center">
                              <div
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-rose-600 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative z-10 text-[9px] font-black text-rose-950 dark:text-white flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[11px] animate-pulse">local_fire_department</span>
                                {t('product.soldCount', 'Đã bán')} {sold} / {deal.total_quantity}
                              </span>
                            </div>
                          </div>
                        )}
                        {isDifferentBranch && deal.matchedBranch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSwitchToAvailableBranch(deal.matchedBranch);
                            }}
                            className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined !text-sm">swap_horiz</span>
                            Chuyển chi nhánh
                          </button>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/70 p-10 text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-rose-500 !text-5xl mb-3">store_away</span>
                <p className="text-base font-bold text-rose-900 mb-2">Không có chương trình giảm giá nhanh tại chi nhánh này hôm nay</p>
                <p className="text-xs text-rose-700 max-w-md mb-6">Hãy thử chuyển đổi sang chi nhánh khác hoặc xem toàn hệ thống để không bỏ lỡ các ưu đãi cực khủng từ Lotte Mart.</p>
                <button
                  type="button"
                  onClick={() => setShowAllBranchDeals(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-md shadow-rose-600/30 text-xs"
                >
                  Xem toàn hệ thống ({flashDealItems.length})
                </button>
              </div>
            )}
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{t('product.suggestedForYou')}</h2>
          </div>
          {renderProductGrid(suggestedProducts, t('product.noProducts'))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{t('product.newProducts')}</h2>
          </div>
          {renderProductGrid(newProducts, t('product.noProducts'))}
        </section>
      </main>

      <div className="fixed bottom-6 right-6 z-40 group">
        <Link
          to="/account/support"
          aria-label={t('support.helpLink')}
          className="flex items-center gap-2 rounded-full bg-primary text-white px-4 py-3 shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">support_agent</span>
          <span className="text-sm font-bold hidden sm:inline">{t('support.helpLink')}</span>
        </Link>
        <div className="absolute bottom-14 right-0 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all">
          <p className="text-sm font-black text-slate-900 dark:text-white">{t('support.homeCardTitle')}</p>
          <p className="text-xs text-slate-500 mt-1">{t('support.homeCardDesc')}</p>
          <Link to="/account/support" className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3">
            {t('support.homeCardCta')}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Home;
