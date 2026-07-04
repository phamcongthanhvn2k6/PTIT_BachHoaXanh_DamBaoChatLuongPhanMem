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
import { filterVisibleFlashDeals } from '../utils/flashDeal';
import { HotDealCountdown } from '../components/HotDealCountdown/HotDealCountdown';
import { resolveImageUrl, fallbackProductImage } from '../utils/imageUrl';
import { resolveFlashDealProductContext } from '../utils/flashDealProductResolver';
import { getProductUrl } from '../utils/productUrl';
import { CategoryIcon } from '../components/CategoryIcon';

const LOCAL_DICT: Record<string, Record<string, string>> = {
  vi: {
    activeBranch: "Chi nhánh đang phục vụ",
    address: "Địa chỉ",
    hours: "Giờ hoạt động",
    hotline: "Hotline hỗ trợ",
    changeBranch: "Đổi chi nhánh",
    promoCoupons: "Khuyến mãi & Mã giảm giá",
    copy: "Sao chép",
    copied: "Đã sao chép mã!",
    ourServices: "Dịch vụ của chúng tôi",
    freeShipTitle: "Miễn phí vận chuyển",
    freeShipDesc: "Cho đơn hàng từ 300.000₫",
    expressTitle: "Giao nhanh 45 phút",
    expressDesc: "Đảm bảo thực phẩm luôn tươi ngon",
    freshTitle: "Cam kết tươi sống",
    freshDesc: "Nguồn gốc rõ ràng, đạt chuẩn VietGAP",
    supportTitle: "Hỗ trợ 24/7",
    supportDesc: "Tư vấn nhiệt tình, tận tâm",
    featuredCategories: "Danh mục nổi bật",
    viewAll: "Xem tất cả",
    flashSaleTitle: "Khuyến mãi giờ vàng",
    systemWide: "Toàn hệ thống",
    atYourBranch: "Tại chi nhánh của bạn",
    noFlashDeals: "Không có khuyến mãi giờ vàng tại chi nhánh này hôm nay",
    switchBranchTip: "Hãy thử chuyển đổi sang chi nhánh khác hoặc xem khuyến mãi toàn hệ thống để không bỏ lỡ các ưu đãi cực khủng từ Bách hóa XANH.",
    copyError: "Lỗi sao chép mã. Vui lòng thử lại.",
    minOrderLabel: "Đơn tối thiểu:",
    codeLabel: "Mã:"
  },
  en: {
    activeBranch: "Serving Branch",
    address: "Address",
    hours: "Operating Hours",
    hotline: "Support Hotline",
    changeBranch: "Change Branch",
    promoCoupons: "Promotions & Coupons",
    copy: "Copy",
    copied: "Code copied!",
    ourServices: "Our Services",
    freeShipTitle: "Free Delivery",
    freeShipDesc: "For orders above 300,000₫",
    expressTitle: "45 Mins Express",
    expressDesc: "Guaranteed fresh on arrival",
    freshTitle: "Freshness Assured",
    freshDesc: "Clean source, VietGAP standards",
    supportTitle: "24/7 Support",
    supportDesc: "Dedicated customer service",
    featuredCategories: "Featured Categories",
    viewAll: "View All",
    flashSaleTitle: "Golden Hour Deals",
    systemWide: "System-wide",
    atYourBranch: "At your branch",
    noFlashDeals: "No flash deals at this branch today",
    switchBranchTip: "Try switching branches or view system-wide promotions.",
    copyError: "Failed to copy code. Please try again.",
    minOrderLabel: "Min Order:",
    codeLabel: "Code:"
  },
  ja: {
    activeBranch: "担当店舗",
    address: "住所",
    hours: "営業時間",
    hotline: "サポート窓口",
    changeBranch: "店舗変更",
    promoCoupons: "プロモーション＆クーポン",
    copy: "コピー",
    copied: "コードをコピーしました！",
    ourServices: "当社のサービス",
    freeShipTitle: "無料配送",
    freeShipDesc: "300,000₫以上のお買い上げ対象",
    expressTitle: "45分特急配送",
    expressDesc: "新鮮さを保ったままお届け",
    freshTitle: "新鮮さ保証",
    freshDesc: "産地明確、安全な食材",
    supportTitle: "24/7サポート",
    supportDesc: "丁寧なカスタマーサポート",
    featuredCategories: "注目カテゴリ",
    viewAll: "すべて見る",
    flashSaleTitle: "ゴールデンタイムセール",
    systemWide: "システム全体",
    atYourBranch: "あなたの店舗",
    noFlashDeals: "本日はこの店舗でのセールはありません",
    switchBranchTip: "他の店舗に変更するか、システム全体のセールをご覧ください。",
    copyError: "コピーに失敗しました。再試行してください。",
    minOrderLabel: "最低注文額:",
    codeLabel: "コード:"
  }
};

const PREDEFINED_CATEGORIES = [
  { id: 'fresh', name: 'Thực phẩm tươi sống', nameEn: 'Fresh Foods', nameJa: '生鮮食品', icon: 'egg_alt', bg: 'bg-emerald-50/80 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40', query: 'Thực phẩm tươi sống' },
  { id: 'beverages', name: 'Đồ uống', nameEn: 'Beverages', nameJa: '飲料', icon: 'local_cafe', bg: 'bg-blue-50/80 text-blue-600 border-blue-100 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40', query: 'Đồ uống' },
  { id: 'snacks', name: 'Bánh kẹo & Ăn vặt', nameEn: 'Snacks & Sweets', nameJa: 'お菓子・スナック', icon: 'cookie', bg: 'bg-amber-50/80 text-amber-600 border-amber-100 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40', query: 'Bánh kẹo & Ăn vặt' },
  { id: 'dairy', name: 'Bơ sữa & Trứng', nameEn: 'Dairy & Eggs', nameJa: '乳製品・卵', icon: 'opacity', bg: 'bg-sky-50/80 text-sky-600 border-sky-100 hover:bg-sky-100/50 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40', query: 'Bơ sữa' },
  { id: 'noodles', name: 'Gạo & Mì', nameEn: 'Rice & Noodles', nameJa: '米・麺類', icon: 'ramen_dining', bg: 'bg-yellow-50/80 text-yellow-600 border-yellow-100 hover:bg-yellow-100/50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/40', query: 'Mì ăn liền' },
  { id: 'meat', name: 'Thịt & Hải sản', nameEn: 'Meat & Seafood', nameJa: '肉・海鮮', icon: 'set_meal', bg: 'bg-rose-50/80 text-rose-600 border-rose-100 hover:bg-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40', query: 'Thực phẩm tươi sống' },
];

const COUPONS_DATA = [
  { code: 'LOTTEMART50', value: '50.000₫', valueEn: '50.000₫', valueJa: '50.000₫', minOrder: '500.000₫', desc: 'Giảm 50k cho đơn từ 500k', descEn: '50k off for orders from 500k', descJa: '500k以上の注文で50k割引' },
  { code: 'FREESHIP', value: 'Miễn Phí', valueEn: 'Free Ship', valueJa: '送料無料', minOrder: '300.000₫', desc: 'Miễn phí vận chuyển toàn quốc', descEn: 'Free shipping nationwide', descJa: '全国送料無料' },
  { code: 'NEWUSER', value: 'Giảm 10%', valueEn: '10% OFF', valueJa: '10%割引', minOrder: '0₫', desc: 'Giảm 10% cho thành viên mới', descEn: '10% off for new members', descJa: '新規メンバー10%割引' }
];

const CATEGORY_STYLES = [
  'bg-emerald-50/80 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40',
  'bg-blue-50/80 text-blue-600 border-blue-100 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40',
  'bg-amber-50/80 text-amber-600 border-amber-100 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
  'bg-sky-50/80 text-sky-600 border-sky-100 hover:bg-sky-100/50 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40',
  'bg-yellow-50/80 text-yellow-600 border-yellow-100 hover:bg-yellow-100/50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/40',
  'bg-rose-50/80 text-rose-600 border-rose-100 hover:bg-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40',
];

const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const redirectToLogin = useAuthRedirect();
  const { branches, currentBranch } = useAppSelector((state) => state.branch);
  const { products, branchProducts, categories } = useAppSelector((state) => state.product);

  const [banners, setBanners] = useState<any[]>([]);
  const [flashDeals, setFlashDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [flashDealRefreshTick, setFlashDealRefreshTick] = useState(0);
  const [showAllBranchDeals, setShowAllBranchDeals] = useState(false);

  // Banner Carousel states
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex === banners.length - 1 ? 0 : prevIndex + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [banners]);

  const { currentBranchId, availableProducts, filterBanners } = useBranchData();

  const activeLang = i18n.language || 'vi';
  const lang = activeLang.startsWith('en') ? 'en' : activeLang.startsWith('ja') ? 'ja' : 'vi';

  const getTxt = (key: string) => {
    return LOCAL_DICT[lang]?.[key] || LOCAL_DICT['vi']?.[key] || '';
  };

  const homeCategories = useMemo(() => {
    const activeCats = (categories || []).filter((c: any) => c.is_active !== false);
    if (activeCats.length > 0) {
      const roots = activeCats.filter((c: any) => !c.parent_id);
      const list = roots.length > 0 ? roots : activeCats;
      return list.slice(0, 6).map((cat, index) => ({
        id: cat.id || (cat as any)._id,
        name: cat.name,
        nameEn: cat.name,
        nameJa: cat.name,
        categoryData: cat,
        bg: CATEGORY_STYLES[index % CATEGORY_STYLES.length],
        query: String(cat.id || (cat as any)._id),
      }));
    }
    return PREDEFINED_CATEGORIES.map((cat, index) => ({
      ...cat,
      bg: CATEGORY_STYLES[index % CATEGORY_STYLES.length],
    }));
  }, [categories]);

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
    const productsList = availableProducts || [];
    let filtered = productsList.filter((item: any) => item && item.is_new);
    
    if (filtered.length === 0 && productsList.length > 0) {
      filtered = productsList.filter((item: any) => item && item.is_featured);
      if (filtered.length === 0) {
        filtered = [...productsList].reverse(); 
      }
    }
    
    return filtered.slice(0, 8);
  }, [availableProducts]);

  const suggestedProducts = useMemo(() => {
    return (availableProducts || [])
      .filter(Boolean)
      .sort((a: any, b: any) => Number(b?.sold_count || 0) - Number(a?.sold_count || 0))
      .slice(0, 8);
  }, [availableProducts]);

  const flashDealItems = useMemo(() => {
    return (flashDeals || [])
      .map((deal: any) => {
        const {
          resolvedProductId,
          product,
          matchedBranchProduct: resolvedBranchProduct,
        } = resolveFlashDealProductContext(deal, products || [], branchProducts || [], String(currentBranchId || ''));
        if (!resolvedProductId) return null;
        const productAny = product as any;

        const dealBranchId = String(deal?.branch_ids?.[0] || deal?.target_branch_ids?.[0] || '');
        let matchedBp = resolvedBranchProduct;
        if (!matchedBp && dealBranchId) {
          matchedBp = (branchProducts || []).find((bp: any) =>
            String(bp.product_id) === resolvedProductId && String(bp.branch_id) === dealBranchId
          ) || null;
        }

        const actualBranchId = matchedBp ? String(matchedBp.branch_id) : dealBranchId;
        const matchedBranch = (branches || []).find((b: any) => String(b.id || b._id) === actualBranchId);

        const dealPrice = Number(deal?.deal_price ?? matchedBp?.effective_price ?? matchedBp?.price ?? productAny?.effective_price ?? productAny?.price ?? 0);
        const originalPrice = Number(deal?.original_price ?? matchedBp?.original_price ?? productAny?.original_price ?? dealPrice);

        return {
          ...deal,
          title: deal?.title || productAny?.name || t('product.flashDeal'),
          image_url: (() => {
            const productImages = productAny?.images || [];
            const hasRealImage = productImages.some((img: string) => {
              const lower = img.toLowerCase();
              return !lower.includes('unsplash.com') && !lower.includes('/assets/products/') && !lower.includes('assets/products/');
            });
            if (hasRealImage) {
              const realImg = productImages.find((img: string) => {
                const lower = img.toLowerCase();
                return !lower.includes('unsplash.com') && !lower.includes('/assets/products/') && !lower.includes('assets/products/');
              });
              if (realImg) return realImg;
            }
            return deal?.image_url || productAny?.image || productAny?.thumbnail || '';
          })(),
          product_id: resolvedProductId,
          deal_price: dealPrice,
          effective_price: dealPrice,
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
  }, [filteredFlashDealItems]);



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
        price: Number(item?.effective_price !== undefined ? item.effective_price : item?.price || 0),
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
          price: Number(item?.effective_price !== undefined ? item.effective_price : item?.price || 0),
          unit_price: Number(item?.effective_price !== undefined ? item.effective_price : item?.price || 0),
          quantity: 1,
          product_name: item?.name,
          product_image: item?.image || item?.images?.[0] || item?.thumbnail || '',
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

  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
        .then(() => {
          toast.success(getTxt('copied'));
        })
        .catch(() => {
          toast.error(getTxt('copyError'));
        });
    } else {
      toast.error(getTxt('copyError'));
    }
  };

  const renderProductGrid = (productsList: any[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="animate-pulse bg-white dark:bg-slate-800 rounded-3xl h-[320px] sm:h-[380px] p-3 sm:p-4 flex flex-col justify-between border border-slate-100 dark:border-slate-800">
              <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-2xl w-full" />
              <div className="space-y-3 mt-4 flex-1">
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded w-1/2 mt-auto" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!productsList.length) {
      return <div className="py-12 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl">{emptyMessage}</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {productsList.map((item, index) => {
          const safeRating = Number(item?.rating || 4.8).toFixed(1);
          const safePrice = Number(item?.effective_price !== undefined ? item.effective_price : item?.price || 0);
          const safeOriginal = Number(item?.original_price || 0);
          const isOutOfStock = Number(item?.stock || 0) <= 0;
          const rawImg = item?.image || (Array.isArray(item?.images) && item.images.length > 0 ? item.images[0] : null) || item?.thumbnail || '';
          const imageSrc = resolveImageUrl(rawImg) || fallbackProductImage;

          return (
            <Link
              key={`${String(item?.id || item?._id || index)}-${index}`}
              to={getProductUrl(item)}
              className="product-card bg-white dark:bg-slate-800/90 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden group relative cursor-pointer hover:shadow-xl hover:border-emerald-500/20 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full"
            >
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {item?.is_best_seller && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider italic shadow-md shadow-rose-500/20">
                    {t('common.hotDeal')}
                  </span>
                )}
                {item?.is_new && (
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider italic shadow-md shadow-emerald-500/20">
                    {t('common.new')}
                  </span>
                )}
                {isOutOfStock && (
                  <span className="bg-slate-700 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {t('common.outOfStock')}
                  </span>
                )}
              </div>

              <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-900/60">
                <img
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${isOutOfStock ? 'opacity-50' : ''}`}
                  src={imageSrc}
                  alt={item?.name || t('cart.product')}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackProductImage;
                  }}
                  loading="lazy"
                />
                {!isOutOfStock && (
                  <button
                    type="button"
                    onClick={(event) => handleAddToCart(item, event)}
                    className="absolute bottom-3 right-3 bg-emerald-500 text-white w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                    aria-label="Add to cart"
                  >
                    <span className="material-symbols-outlined !text-xl">shopping_cart</span>
                  </button>
                )}
              </div>

              <div className="p-4 flex flex-col flex-grow">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider truncate">{item?.brand || 'Bách hóa XANH'}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                  <div className="flex items-center text-amber-400 shrink-0">
                    <span className="material-symbols-outlined !text-[12px] !fill-1">star</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold ml-0.5">{safeRating}</span>
                  </div>
                </div>

                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 min-h-[2rem] leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item?.name}</h3>

                <div className="flex flex-col mt-auto pt-2">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {safePrice.toLocaleString('vi-VN')}₫
                    </span>
                    {safeOriginal > safePrice && (
                      <span className="text-slate-400 text-[10px] sm:text-xs line-through">{safeOriginal.toLocaleString('vi-VN')}₫</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
        .shadow-premium { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.05), 0 10px 20px -8px rgba(0,0,0,0.02); }
        .shadow-glow-emerald { box-shadow: 0 0 20px rgba(16, 185, 129, 0.15); }
        .shadow-glow-rose { box-shadow: 0 0 25px rgba(225, 29, 72, 0.2); }
        .coupon-card { background-image: radial-gradient(circle at 0px 8px, transparent 8px, white 8px), radial-gradient(circle at 100% 8px, transparent 8px, white 8px); background-position: left, right; background-size: 51% 100%; background-repeat: no-repeat; }
        .dark .coupon-card { background-image: radial-gradient(circle at 0px 8px, transparent 8px, rgb(30, 41, 59) 8px), radial-gradient(circle at 100% 8px, transparent 8px, rgb(30, 41, 59) 8px); }
        .hero-glass { backdrop-filter: blur(12px); background-color: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.1); }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16 mb-20">
        
        {/* Section 1: Hero / Top Banners Carousel - Full Width */}
        <section className="w-full relative group">
          {banners && banners.length > 0 ? (
            <div className="relative overflow-hidden rounded-[32px] shadow-premium h-[380px] md:h-[460px] w-full bg-slate-100 dark:bg-slate-800">
              {banners.map((banner, index) => {
                const isActive = index === currentBannerIndex;
                const bannerUrl = resolveImageUrl(banner?.image_url || banner?.image) || fallbackProductImage;
                return (
                  <div
                    key={banner.id || index}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      isActive ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={bannerUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover transition-transform duration-[10000ms] hover:scale-110"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackProductImage; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-8 sm:px-12 md:px-16">
                      <div className="hero-glass p-6 sm:p-8 rounded-3xl max-w-xl" style={{ color: banner.text_color || '#ffffff' }}>
                        <span className="inline-block bg-emerald-500 text-white px-3 py-1.5 rounded-full font-black uppercase tracking-widest text-[9px] mb-4 shadow-lg shadow-emerald-500/30">
                          {t('common.topPromo', 'Khuyến mại đặc biệt')}
                        </span>
                        <h2 className="text-2xl md:text-4xl font-black mb-3 leading-tight" dangerouslySetInnerHTML={{ __html: banner.title || "" }} />
                        <p className="text-xs md:text-sm mb-6 opacity-90 leading-relaxed line-clamp-2">{banner.description}</p>
                        <Link to={banner.link || '/promotions'} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black transition-all shadow-lg shadow-emerald-500/30 inline-flex items-center gap-2 text-xs w-fit">
                          {t('common.viewNow', 'Xem ngay')} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Navigation Controls */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
                    className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-2xl bg-black/45 hover:bg-emerald-500 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0"
                    aria-label="Previous slide"
                  >
                    <span className="material-symbols-outlined !text-2xl">chevron_left</span>
                  </button>
                  <button
                    onClick={() => setCurrentBannerIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1))}
                    className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-2xl bg-black/45 hover:bg-emerald-500 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
                    aria-label="Next slide"
                  >
                    <span className="material-symbols-outlined !text-2xl">chevron_right</span>
                  </button>
                </>
              )}

              {/* Indicator dots */}
              {banners.length > 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2.5 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBannerIndex(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentBannerIndex ? 'bg-emerald-400 w-6' : 'bg-white/50 hover:bg-white w-2'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative group overflow-hidden rounded-[32px] bg-slate-100 dark:bg-slate-800 h-[360px] md:h-[440px] w-full flex items-center justify-center">
              {loading ? <div className="animate-pulse w-full h-full bg-slate-200 dark:bg-slate-700" /> : <span className="text-slate-400 font-bold">{t('product.noProducts')}</span>}
            </div>
          )}
        </section>

        {/* Section 2: Trust / Service Highlights Redesigned */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {/* Card 1: Free Shipping */}
          <div className="group relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30 dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-100/60 dark:border-emerald-900/30 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md shadow-emerald-500/5 dark:shadow-none flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined !text-[32px]">local_shipping</span>
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight">{getTxt('freeShipTitle')}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold leading-snug">{getTxt('freeShipDesc')}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Express Delivery */}
          <div className="group relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-blue-50/60 to-blue-100/30 dark:from-blue-950/20 dark:to-slate-900 border border-blue-100/60 dark:border-blue-900/30 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md shadow-blue-500/5 dark:shadow-none flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined !text-[32px]">bolt</span>
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight">{getTxt('expressTitle')}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold leading-snug">{getTxt('expressDesc')}</p>
              </div>
            </div>
          </div>

          {/* Card 3: Fresh Assured */}
          <div className="group relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-rose-50/60 to-rose-100/30 dark:from-rose-950/20 dark:to-slate-900 border border-rose-100/60 dark:border-rose-900/30 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md shadow-rose-500/5 dark:shadow-none flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined !text-[32px]">eco</span>
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight">{getTxt('freshTitle')}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold leading-snug">{getTxt('freshDesc')}</p>
              </div>
            </div>
          </div>

          {/* Card 4: 24/7 Support */}
          <div className="group relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-amber-50/60 to-amber-100/30 dark:from-amber-950/20 dark:to-slate-900 border border-amber-100/60 dark:border-amber-900/30 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md shadow-amber-500/5 dark:shadow-none flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined !text-[32px]">support_agent</span>
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight">{getTxt('supportTitle')}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold leading-snug">{getTxt('supportDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Featured Categories */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block" />
              <span>{getTxt('featuredCategories')}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {homeCategories.map(cat => {
              const displayName = lang === 'en' ? cat.nameEn : lang === 'ja' ? cat.nameJa : cat.name;
              return (
                <Link 
                  key={cat.id} 
                  to={`/products?category=${encodeURIComponent(cat.query)}`} 
                  className={`flex flex-col items-center justify-center p-6 rounded-[28px] border transition-all duration-300 hover:-translate-y-2 hover:shadow-lg group ${cat.bg}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-sm flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 text-current">
                    <CategoryIcon category={(cat as any).categoryData || cat} className="w-8 h-8 flex items-center justify-center text-current" iconClass="material-symbols-outlined !text-3xl" size={32} />
                  </div>
                  <span className="font-black text-[12px] sm:text-[13px] text-center line-clamp-2 h-10 flex items-center justify-center text-slate-800 dark:text-slate-200 leading-snug">{displayName}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section 4: Hot Deals / Flash Sale */}
        {flashDeals.length > 0 && (
          <section className="space-y-8 bg-slate-950 dark:bg-slate-900 border border-slate-800 p-6 sm:p-10 rounded-[36px] shadow-glow-rose relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-rose-500/15 p-3 rounded-2xl border border-rose-500/20">
                  <span className="material-symbols-outlined !text-3xl text-rose-500 animate-pulse">local_fire_department</span>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight">
                    {getTxt('flashSaleTitle')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Ưu đãi cực sốc trong khung giờ giới hạn</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-slate-900 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => setShowAllBranchDeals(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      !showAllBranchDeals
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {getTxt('atYourBranch')}
                  </button>
                  <button
                    onClick={() => setShowAllBranchDeals(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      showAllBranchDeals
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {getTxt('systemWide')} ({flashDealItems.length})
                  </button>
                </div>
                {countdown && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl text-rose-400 font-extrabold text-xs">
                    <span className="material-symbols-outlined text-[16px] animate-spin-slow">schedule</span>
                    <span>{t('product.endsIn')}:</span>
                    <span className="font-mono text-sm bg-rose-600 text-white px-2.5 py-0.5 rounded-lg ml-1 shadow-md">
                      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {filteredFlashDealItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 relative z-10">
                {filteredFlashDealItems.map((deal: any, index: number) => {
                  const sold = Math.max(0, (deal.total_quantity || 0) - (deal.remaining_quantity || 0));
                  const pct = deal.total_quantity > 0 ? Math.min(100, (sold / deal.total_quantity) * 100) : 0;
                  const isDifferentBranch = deal.branch_id && currentBranchId && String(deal.branch_id) !== String(currentBranchId);
                  const dealImage = resolveImageUrl(deal.image_url) || fallbackProductImage;

                  return (
                    <Link key={`${String(deal.id || index)}-${index}`} to={getProductUrl(deal)} className="bg-slate-900 border border-slate-800 rounded-[28px] overflow-hidden relative group flex flex-col hover:border-rose-500/30 hover:shadow-glow-rose transition-all duration-300">
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                        <span className="bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-[10px] px-3 py-1 rounded-full shadow-md shadow-rose-600/30 w-fit">
                          -{deal.discount_percent || deal.discount_value || 0}%
                        </span>
                        {deal.branch_name ? (
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
                            isDifferentBranch ? 'bg-amber-500 text-white shadow-sm' : 'bg-black/60 backdrop-blur-md text-white'
                          }`}>
                            <span className="material-symbols-outlined !text-[11px]">store</span>
                            {deal.branch_name}
                          </span>
                        ) : (
                          <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined !text-[11px]">store</span>
                            {getTxt('systemWide')}
                          </span>
                        )}
                      </div>
                      <div className="aspect-square bg-slate-950 overflow-hidden relative">
                        <img src={dealImage} alt={deal.title || t('product.flashDeal')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackProductImage; }} />
                      </div>
                      <div className="p-4 sm:p-5 flex flex-col flex-grow">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] mb-2 leading-snug group-hover:text-rose-400 transition-colors">{deal.title || t('product.flashDeal')}</h3>
                        <div className="flex items-baseline gap-1.5 mb-3 flex-wrap">
                          <span className="text-rose-500 font-black text-base sm:text-xl">{Number(deal.deal_price || 0).toLocaleString('vi-VN')}₫</span>
                          <span className="text-slate-500 text-[10px] sm:text-xs line-through">{Number(deal.original_price || 0).toLocaleString('vi-VN')}₫</span>
                        </div>
                        <div className="mb-4">
                          <HotDealCountdown endDate={deal.end_date} />
                        </div>
                        {deal.total_quantity > 0 && (
                          <div className="mt-auto pt-2">
                            <div className="relative w-full bg-slate-800 h-5 rounded-full overflow-hidden flex items-center justify-center">
                              <div
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-rose-600 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative z-10 text-[9px] font-black text-white flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[12px] animate-pulse">local_fire_department</span>
                                {t('product.soldCount') || 'Đã bán'} {sold} / {deal.total_quantity}
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
                            className="mt-3.5 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined !text-sm">swap_horiz</span>
                            {getTxt('changeBranch')}
                          </button>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-rose-900/30 bg-slate-900/40 p-12 text-center flex flex-col items-center justify-center relative z-10">
                <span className="material-symbols-outlined text-rose-500 !text-5xl mb-4">store_away</span>
                <p className="text-base font-black text-white mb-2">{getTxt('noFlashDeals')}</p>
                <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">{getTxt('switchBranchTip')}</p>
                <button
                  type="button"
                  onClick={() => setShowAllBranchDeals(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black px-8 py-3 rounded-2xl transition-all shadow-lg shadow-rose-600/30 text-xs"
                >
                  {getTxt('viewAll')} ({flashDealItems.length})
                </button>
              </div>
            )}
          </section>
        )}

        {/* Section 5: Best Sellers / Trending Products */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block" />
              <span>{t('product.suggestedForYou')}</span>
            </h2>
            <Link className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black hover:gap-2 transition-all text-sm group" to="/products">
              {getTxt('viewAll')}{" "}
              <span className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
            </Link>
          </div>
          {renderProductGrid(suggestedProducts, t('product.noProducts'))}
        </section>

        {/* Section 6: Active Coupons & Promotions */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block" />
              <span>{getTxt('promoCoupons')}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COUPONS_DATA.map((coupon) => {
              const desc = lang === 'en' ? coupon.descEn : lang === 'ja' ? coupon.descJa : coupon.desc;
              return (
                <div key={coupon.code} className="coupon-card bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-[24px] p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all relative group">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Bách hóa XANH</span>
                    <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{lang === 'en' ? coupon.valueEn : lang === 'ja' ? coupon.valueJa : coupon.value}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 line-clamp-1">{desc}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                      {getTxt('minOrderLabel')} <b className="text-slate-600 dark:text-slate-300 font-bold">{coupon.minOrder}</b>
                    </p>
                  </div>
                  <div className="border-l border-dashed border-slate-300 dark:border-slate-700 h-16 mx-1 shrink-0" />
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getTxt('codeLabel')}</span>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs px-2.5 py-1 rounded-lg select-all border border-slate-300 dark:border-slate-600 shadow-sm">{coupon.code}</span>
                    <button 
                      onClick={() => handleCopyCoupon(coupon.code)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all shadow-sm shadow-emerald-500/20 uppercase"
                    >
                      {getTxt('copy')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 7: AI Smart Shopping Recommendations */}
        <section 
          className="rounded-[36px] p-8 md:p-12 text-white shadow-premium relative overflow-hidden group bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border border-emerald-900/30"
        >
          {/* Decorative Background Blobs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 md:gap-16">
            {/* Text content */}
            <div className="max-w-2xl text-center lg:text-left flex-1">
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/20 px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] mb-4 text-emerald-400">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>Tính năng thông minh</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight tracking-tight">
                {t('smartShopping.title')}
              </h2>
              <p className="text-sm md:text-base text-slate-300 font-medium mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t('smartShopping.description')}
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
                <Link to="/smart-shopping" className="bg-emerald-500 hover:bg-emerald-600 text-white px-7 py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2.5 text-sm transition-all duration-300 transform hover:-translate-y-0.5">
                  <span className="material-symbols-outlined !text-xl" style={{ lineHeight: 1 }}>psychology</span>
                  {t('smartShopping.explore')}
                </Link>
                <Link to="/smart-shopping?tab=recipe" className="bg-white/10 hover:bg-white/15 text-white border border-white/10 px-7 py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 text-sm transition-all duration-300 transform hover:-translate-y-0.5 backdrop-blur-md">
                  <span className="material-symbols-outlined !text-xl" style={{ lineHeight: 1 }}>restaurant_menu</span>
                  {t('smartShopping.buyByRecipe')}
                </Link>
              </div>
            </div>

            {/* AI robot icon - decorative */}
            <div className="relative shrink-0 hidden lg:flex items-center justify-center w-48 h-48">
              {/* Animated rings */}
              <div className="absolute w-48 h-48 rounded-full border border-dashed border-emerald-500/20 animate-[spin_40s_linear_infinite]" />
              <div className="absolute w-40 h-40 rounded-full border border-emerald-500/10 animate-[spin_20s_linear_infinite_reverse]" />
              
              {/* Robot container */}
              <div className="w-24 h-24 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-emerald-500/20 shadow-glow-emerald flex items-center justify-center z-10 transition-transform duration-500 group-hover:scale-105">
                <span className="material-symbols-outlined !text-5xl text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  smart_toy
                </span>
              </div>
              
              {/* Floating micro widget decoration */}
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-emerald-500 to-teal-500 p-2.5 rounded-2xl shadow-lg animate-bounce z-20">
                <span className="material-symbols-outlined !text-lg text-white">
                  magic_button
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Branch Info Highlights */}
        {currentBranch && (
          <section className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-[32px] p-6 md:p-10 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-3xl">
                <span className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100/60 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200/20">
                  <span className="material-symbols-outlined text-sm">store</span>
                  {getTxt('activeBranch')}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentBranch.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 pt-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-start gap-2.5 font-semibold">
                    <span className="material-symbols-outlined text-slate-400 text-lg shrink-0 mt-0.5">pin_drop</span>
                    <span><b>{getTxt('address')}:</b> {currentBranch.address || `${currentBranch.city}`}</span>
                  </p>
                  <p className="flex items-start gap-2.5 font-semibold">
                    <span className="material-symbols-outlined text-slate-400 text-lg shrink-0 mt-0.5">schedule</span>
                    <span><b>{getTxt('hours')}:</b> {currentBranch.operating_hours || currentBranch.opening_hours || '08:00 - 22:00'}</span>
                  </p>
                  <p className="flex items-start gap-2.5 font-semibold">
                    <span className="material-symbols-outlined text-slate-400 text-lg shrink-0 mt-0.5">call</span>
                    <span><b>{getTxt('hotline')}:</b> {currentBranch.phone || '1900 1590'}</span>
                  </p>
                  {currentBranch.code && (
                    <p className="flex items-start gap-2.5 font-semibold">
                      <span className="material-symbols-outlined text-slate-400 text-lg shrink-0 mt-0.5">qr_code_2</span>
                      <span><b>ERP Warehouse Code:</b> <code className="bg-slate-200 dark:bg-slate-800 text-[11px] px-2 py-0.5 rounded font-mono font-bold">{currentBranch.code}</code></span>
                    </p>
                  )}
                </div>
              </div>
              <div className="w-full lg:w-auto shrink-0 pt-4 lg:pt-0">
                <Link to="/products" className="w-full lg:w-auto text-center bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-white px-8 py-4 rounded-2xl font-black transition-all inline-block shadow-md text-sm">
                  {t('common.viewNow')}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Section 9: New Products */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block" />
              <span>{t('product.newProducts')}</span>
            </h2>
            <Link className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black hover:gap-2 transition-all text-sm group" to="/products">
              {getTxt('viewAll')}{" "}
              <span className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
            </Link>
          </div>
          {renderProductGrid(newProducts, t('product.noProducts'))}
        </section>

      </main>

      {/* Floating help widget */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <Link
          to="/account/support"
          aria-label={t('support.helpLink')}
          className="flex items-center gap-2 rounded-full bg-emerald-500 text-white px-5 py-4 shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-[22px]">support_agent</span>
          <span className="text-sm font-black hidden sm:inline">{t('support.helpLink')}</span>
        </Link>
        <div className="absolute bottom-16 right-0 w-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-5 opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
          <p className="text-sm font-black text-slate-900 dark:text-white">{t('support.homeCardTitle')}</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{t('support.homeCardDesc')}</p>
          <Link to="/account/support" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 mt-4 hover:gap-1.5 transition-all">
            {t('support.homeCardCta')}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Home;
