// src/pages/ProductDetail.tsx
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { addCompareItem, compareMaxItems, removeCompareItem, selectCompareIds } from '../slices/compareSlice';
import { setCurrentBranch } from '../slices/branchSlice';
import { useNavigate } from 'react-router-dom';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import StarRating from '../components/StarRating/StarRating';
import ReviewList from '../components/ReviewList/ReviewList';
import { toast } from '../components/Toast/toastEvent';
import { productService } from '../services/productService';
import { dataService } from '../services/dataService';
import { saveViewHistory } from '../services/viewHistoryService';
import { resolveImageUrl, fallbackProductImage } from '../utils/imageUrl';
import { extractProductId, getProductUrl, getLocaleFromPrefix } from '../utils/productUrl';
import { HotDealCountdown } from '../components/HotDealCountdown/HotDealCountdown';
import { formatRating } from '../utils/formatRating';

const ProductDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id: rawSlugOrId, locale: rawLocale } = useParams<{ id: string; locale?: string }>();
  // Extract actual product ID from the SEO-friendly slug
  const productId = extractProductId(rawSlugOrId || '') || '0';
  const id = rawSlugOrId;

  // Sync language with URL locale prefix if present and different
  React.useEffect(() => {
    if (rawLocale) {
      const urlLocale = getLocaleFromPrefix(rawLocale);
      if (urlLocale && urlLocale !== i18n.language) {
        i18n.changeLanguage(urlLocale);
        localStorage.setItem('lotte_language', urlLocale);
      }
    }
  }, [rawLocale, i18n]);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const compareIds = useAppSelector(selectCompareIds);
  const { branches, currentBranch } = useAppSelector(state => state.branch);
  const redirectToLogin = useAuthRedirect();
  const viewTrackedKeyRef = React.useRef<string>('');

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'mo-ta' | 'thong-tin' | 'danh-gia'>('mo-ta');

  // Separate state for product core vs branch-specific data
  const [product, setProduct] = useState<any>(null);
  const [branchProduct, setBranchProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [boughtTogetherProducts, setBoughtTogetherProducts] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [questionDraft, setQuestionDraft] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [isWished, setIsWished] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  // Whether the product exists but has no branch data
  const [branchUnavailable, setBranchUnavailable] = useState(false);
  const [allBranchProducts, setAllBranchProducts] = useState<any[]>([]);

  const productRealBranches = useMemo(() => {
    if (!branches || !branches.length || !allBranchProducts.length) return [];
    return allBranchProducts
      .map(bp => {
        const found = branches.find(b => String(b.id || (b as any)._id) === String(bp.branch_id));
        const bpAvailableQty = bp.available_quantity !== undefined 
          ? bp.available_quantity 
          : Math.max(0, bp.stock - (bp.reserved_quantity || 0));
        return found ? {
          ...found,
          stock: Number(bp.stock || 0),
          available_quantity: bpAvailableQty,
          is_available: bp.is_available,
          price: Number(bp.price || 0),
          original_price: Number(bp.original_price || 0)
        } : null;
      })
      .filter(Boolean);
  }, [allBranchProducts, branches]);

  const availableBranches = useMemo(() => {
    if (!branches || !branches.length || !allBranchProducts.length) return [];
    return allBranchProducts
      .filter(bp => {
        const bpAvailableQty = bp.available_quantity !== undefined 
          ? bp.available_quantity 
          : Math.max(0, bp.stock - (bp.reserved_quantity || 0));
        return bp.is_available !== false && bpAvailableQty > 0;
      })
      .map(bp => {
        const found = branches.find(b => String(b.id || (b as any)._id) === String(bp.branch_id));
        const bpAvailableQty = bp.available_quantity !== undefined 
          ? bp.available_quantity 
          : Math.max(0, bp.stock - (bp.reserved_quantity || 0));
        return found ? {
          ...found,
          price: bp.price,
          stock: bpAvailableQty,
          branchProduct: bp
        } : null;
      })
      .filter(Boolean);
  }, [allBranchProducts, branches]);

  const handleSwitchToAvailableBranch = (branch: any) => {
    if (!branch) return;
    dispatch(setCurrentBranch(branch));
    toast.success(t('branch.switchedTo', { name: branch.name, defaultValue: `Đã chuyển sang chi nhánh: ${branch.name}` }));
  };

  const handleSwitchAndAddToCart = async (branch: any) => {
    if (!branch) return;
    // Switch branch in Redux and LocalStorage
    dispatch(setCurrentBranch(branch));
    toast.success(t('branch.switchedTo', { name: branch.name, defaultValue: `Đã chuyển sang chi nhánh: ${branch.name}` }));

    const newBp = allBranchProducts.find(bp => String(bp.branch_id) === String(branch.id || branch._id));
    if (!newBp) return;

    if (!isAuthenticated) {
      redirectToLogin({
        action: 'add_to_cart',
        branch_product_id: String(newBp.id || newBp._id),
        price: newBp.effective_price !== undefined ? newBp.effective_price : newBp.price,
        qty: quantity,
        product: { ...newBp, product: product as any } as any
      });
      return;
    }

    try {
      await dispatch(addToCartAsync({
        branchId: String(branch.id || branch._id),
        branch_product_id: String(newBp.id || newBp._id),
        price: newBp.effective_price !== undefined ? newBp.effective_price : newBp.price,
        unit_price: newBp.effective_price !== undefined ? newBp.effective_price : newBp.price,
        quantity: quantity,
        product_name: product?.name || 'Sản phẩm',
        product_image: resolveImageUrl(product?.images?.[0] || product?.thumbnail || ''),
        branchProduct: { ...newBp, product: product as any } as any,
      })).unwrap();
      toast.success(t('cart.addedToCart', { name: product?.name || 'Sản phẩm' }));
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : (err?.message || t('common.addToCartError')));
    }
  };

  const getSavedBranchId = () => {
    try {
      const raw = localStorage.getItem('lotte_current_branch');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?.id || parsed?._id || '');
    } catch {
      return '';
    }
  };

  // Derive branchId from Redux store instead of hardcoding
  const activeBranchId = currentBranch
    ? String(currentBranch.id || (currentBranch as any)?._id || '')
    : getSavedBranchId();

  React.useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setBranchUnavailable(false);
      try {
        // STEP 1: Fetch the product core data directly by ID (extracted from slug)
        const productData = await productService.getProductById(productId);

        if (!active) return;

        if (!productData || (!productData._id && !productData.id && !productData.name)) {
          setError('Sản phẩm không tồn tại.');
          setLoading(false);
          return;
        }

        // Normalize product id
        const resolvedProduct = {
          ...productData,
          id: productData.id || productData._id,
        };

        setProduct(resolvedProduct);

        // SEO Redirect: Ensure current route matches the canonical `/{localePrefix}/product/{slug}` format.
        const canonicalUrl = getProductUrl(resolvedProduct);
        if (window.location.pathname !== canonicalUrl) {
          navigate(canonicalUrl, { replace: true });
        }

        // STEP 2: Independently fetch branch-specific data (price/stock)
        // Use currentBranch from Redux store — no hardcode
        const branchId = activeBranchId;
        let allBps: any[] = [];
        try {
          const resBps = await productService.getBranchProducts({
            product_id: resolvedProduct.id || resolvedProduct._id,
          });
          allBps = Array.isArray(resBps) ? resBps : [];
          setAllBranchProducts(allBps);
        } catch (e) {
          console.error("Failed to fetch branch products:", e);
          setAllBranchProducts([]);
        }

        const activeBp = allBps.find(item => item.is_available !== false && String(item.branch_id) === String(branchId));
        if (activeBp) {
          setBranchProduct(activeBp);
          setBranchUnavailable(false);
        } else {
          // It's unavailable in the current selected branch. Let's find any other branch where it is available!
          const availableBp = allBps.find(item => {
            const bpAvailableQty = item.available_quantity !== undefined 
              ? item.available_quantity 
              : Math.max(0, item.stock - (item.reserved_quantity || 0));
            return item.is_available !== false && bpAvailableQty > 0;
          });
          if (availableBp) {
            setBranchProduct(availableBp); // Set branchProduct to the available one so details are visible!
          } else if (allBps.length > 0) {
            setBranchProduct(allBps[0]);
          } else {
            setBranchProduct(null);
          }
          setBranchUnavailable(true);
        }

        // STEP 3: Fetch related products, questions, policies in parallel
        const productIdForSub = resolvedProduct.id || resolvedProduct._id || id;
        const [recommendRes, relRes, qRes, pRes, promoRes, couponRes] = await Promise.all([
          productService.getProductRecommendations(productIdForSub).catch(() => ({ related: [], bought_together: [] })),
          productService.getRelatedProducts(productIdForSub).catch(() => []),
          productService.getProductQuestions(productIdForSub).catch(() => []),
          productService.getProductPolicies().catch(() => []),
          productService.getProductPromotions(productIdForSub, branchId || undefined).catch(() => []),
          productService.getProductCoupons(productIdForSub, branchId || undefined).catch(() => [])
        ]);

        if (active) {
          const safeRecommendRes = recommendRes && typeof recommendRes === 'object' ? recommendRes : { related: [], bought_together: [] };
          const recommendedRelated = Array.isArray(safeRecommendRes.related) ? safeRecommendRes.related : [];
          const recommendedTogether = Array.isArray(safeRecommendRes.bought_together) ? safeRecommendRes.bought_together : [];
          const safeRelRes = Array.isArray(relRes) ? relRes : [];
          const safeQRes = Array.isArray(qRes) ? qRes : [];
          const safePRes = Array.isArray(pRes) ? pRes : [];
          const safePromoRes = Array.isArray(promoRes) ? promoRes : [];
          const safeCouponRes = Array.isArray(couponRes) ? couponRes : [];
          // Filter out self from related products
          const relatedSource = recommendedRelated.length > 0 ? recommendedRelated : safeRelRes;
          const related = relatedSource.filter(
            (p: any) =>
              String(p.id || p._id) !== String(resolvedProduct.id || resolvedProduct._id)
          );
          const together = recommendedTogether.filter(
            (p: any) => String(p.id || p._id) !== String(resolvedProduct.id || resolvedProduct._id),
          );

          // Fetch prices for related and together if they are 0
          if (branchId) {
             try {
                const branchProds = await productService.getBranchProducts({ category_id: resolvedProduct.category_id, branch_id: branchId });
                const bpMap = new Map();
                (Array.isArray(branchProds) ? branchProds : []).forEach((bp: any) => bpMap.set(String(bp.product_id), bp));
                
                related.forEach((p: any) => {
                    const bp = bpMap.get(String(p.id || p._id));
                    if (bp) {
                        p.effective_price = bp.effective_price !== undefined ? bp.effective_price : bp.price;
                        p.price = p.effective_price;
                        p.original_price = bp.original_price;
                        p.discount_percent = bp.discount_percent;
                        p.active_hot_deal = bp.active_hot_deal;
                        p.pricing_source = bp.pricing_source;
                    }
                });
                together.forEach((p: any) => {
                    const bp = bpMap.get(String(p.id || p._id));
                    if (bp) {
                        p.effective_price = bp.effective_price !== undefined ? bp.effective_price : bp.price;
                        p.price = p.effective_price;
                        p.original_price = bp.original_price;
                        p.discount_percent = bp.discount_percent;
                        p.active_hot_deal = bp.active_hot_deal;
                        p.pricing_source = bp.pricing_source;
                    }
                });
             } catch {}
          }

          setRelatedProducts(related);
          setBoughtTogetherProducts(together);
          setQuestions(safeQRes);
          setPolicies(safePRes);
          setPromotions(safePromoRes);
          setCoupons(safeCouponRes);
        }
      } catch (err: any) {
        if (active) {
          const msg = err?.message || err?.toString() || 'Không thể tải dữ liệu sản phẩm.';
          // If it's a 404 from the product endpoint, it truly doesn't exist
          if (err?.response?.status === 404 || msg.includes('not found') || msg.includes('Not found')) {
            setError('Sản phẩm không tồn tại.');
          } else {
            setError(msg);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    if (productId && productId !== '0') {
      fetchDetail();
    } else {
      setError('Thiếu mã sản phẩm.');
      setLoading(false);
    }
    return () => { active = false; };
  }, [productId, activeBranchId, branches]);

  const currentLocale = useMemo(
    () => {
      const normalized = String(i18n.language || 'vi').trim().toLowerCase();
      if (normalized.startsWith('en')) return 'en';
      if (normalized.startsWith('ja')) return 'ja';
      return 'vi';
    },
    [i18n.language],
  );

  const uiText = useMemo(() => {
    if (currentLocale === 'en') {
      return {
        aiSummaryTitle: 'AI Product Summary',
        overview: 'Overview',
        strengths: 'Key Strengths',
        cautions: 'Cautions & Warnings',
        recommendation: 'Recommendation',
        notes: 'Important Notes',
        loadingSummary: 'Analyzing product data with AI...',
        aiNotConfigured: 'AI summary is currently unavailable (missing credentials).',
        generateFailed: 'Failed to generate AI summary.',
        groundedHint: 'Grounded strictly in product specifications.',
      };
    } else if (currentLocale === 'ja') {
      return {
        aiSummaryTitle: 'AI製品要約',
        overview: '概要',
        strengths: '主な特長',
        cautions: '注意事項・警告',
        recommendation: '推奨事項',
        notes: '重要なメモ',
        loadingSummary: 'AIで製品データを分析中...',
        aiNotConfigured: 'AI概要は現在利用できません（設定がありません）。',
        generateFailed: 'AI概要の生成に失敗しました。',
        groundedHint: '製品の仕様情報のみに基づいています。',
      };
    } else {
      return {
        aiSummaryTitle: 'Tóm tắt sản phẩm AI',
        overview: 'Tổng quan',
        strengths: 'Điểm mạnh nổi bật',
        cautions: 'Lưu ý & Cảnh báo',
        recommendation: 'Khuyến nghị mua sắm',
        notes: 'Ghi chú quan trọng',
        loadingSummary: 'Đang phân tích dữ liệu sản phẩm bằng AI...',
        aiNotConfigured: 'Tóm tắt sản phẩm AI hiện không khả dụng (chưa cấu hình API).',
        generateFailed: 'Không thể tạo tóm tắt AI.',
        groundedHint: 'Nội dung dựa trên dữ liệu sản phẩm chính thức.',
      };
    }
  }, [currentLocale]);

  React.useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      if (!productId || productId === '0' || error || !product) {
        return;
      }
      setLoadingSummary(true);
      try {
        const res = await productService.getProductSummary(productId, currentLocale);
        if (active) {
          if (res && res.success) {
            setAiSummary(res.data);
          } else {
            setAiSummary(null);
          }
        }
      } catch (e) {
        console.error("Failed to load AI summary:", e);
        if (active) setAiSummary(null);
      } finally {
        if (active) setLoadingSummary(false);
      }
    };

    fetchSummary();
    return () => {
      active = false;
    };
  }, [productId, product, currentLocale, error]);

  // Reset selected image when product changes
  React.useEffect(() => {
    setSelectedImageIndex(0);
  }, [productId]);

  React.useEffect(() => {
    if (!isAuthenticated || !product) {
      setIsWished(false);
      return;
    }

    let active = true;
    const syncWishlistState = async () => {
      try {
        const list = await dataService.getWishlist();
        if (!active) return;
        const wished = (Array.isArray(list) ? list : []).some((item: any) => {
          const sameBranchProduct = branchProduct && String(item.branch_product_id || '') === String(branchProduct.id || branchProduct._id || '');
          const sameProduct = String(item.product_id || '') === String(product.id || product._id || '');
          return sameBranchProduct || sameProduct;
        });
        setIsWished(wished);
      } catch {
        if (active) setIsWished(false);
      }
    };

    syncWishlistState();
    return () => {
      active = false;
    };
  }, [isAuthenticated, product, branchProduct]);

  React.useEffect(() => {
    if (!product || (!product.id && !product._id)) return;

    const resolvedProductId = String(product.id || product._id || '');
    if (!resolvedProductId) return;

    const resolvedBranchProductId = branchProduct ? String(branchProduct.id || branchProduct._id || '') : '';
    const userScope = isAuthenticated
      ? String((user as any)?.id || (user as any)?._id || (user as any)?.user_id || 'auth')
      : 'guest';
    const trackedKey = `${userScope}:${resolvedProductId}:${resolvedBranchProductId || 'none'}`;
    if (viewTrackedKeyRef.current === trackedKey) return;

    viewTrackedKeyRef.current = trackedKey;
    console.log('VIEW PRODUCT:', resolvedProductId);
    saveViewHistory(
      {
        id: resolvedProductId,
        name: String(product.name || i18n.t('common.product')),
        image: String(product.images?.[0] || product.thumbnail || ''),
        price: Number(branchProduct?.effective_price !== undefined ? branchProduct.effective_price : branchProduct?.price || product.effective_price || product.price || 0),
        branch_product_id: resolvedBranchProductId || undefined,
        original_price: Number(branchProduct?.original_price ?? product.original_price ?? 0),
        category: String(branchProduct?.category_name || product.category_name || product.category?.name || ''),
        viewed_at: new Date().toISOString(),
      },
      { isAuthenticated, user },
    ).catch(() => {});
  }, [product?.id, product?._id, branchProduct?.id, branchProduct?._id, isAuthenticated, user]);

  // LOADING STATE
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-primary mb-4 animate-spin">progress_activity</span>
        <h2 className="text-2xl font-bold mb-4">Đang tải thông tin sản phẩm</h2>
        <p className="text-slate-500">Vui lòng chờ trong giây lát...</p>
      </main>
    );
  }

  // TRUE ERROR STATE (product does not exist at all)
  if (error || !product) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">inventory_2</span>
        <h1 className="text-2xl font-bold text-red-500 mb-2">{error || 'Sản phẩm không tồn tại'}</h1>
        <p className="text-slate-500 mb-6">Sản phẩm này có thể đã bị xóa hoặc không tồn tại trong hệ thống.</p>
        <Link to="/products" className="text-primary font-bold underline">
          Quay về danh sách sản phẩm
        </Link>
      </main>
    );
  }

  // Determine if purchasing is possible
  const displayStock = branchProduct 
    ? (branchProduct.available_quantity !== undefined 
        ? branchProduct.available_quantity 
        : Math.max(0, branchProduct.stock - (branchProduct.reserved_quantity || 0)))
    : null;
  const canPurchase = branchProduct && !branchUnavailable && displayStock !== null && displayStock > 0 && branchProduct.is_available !== false && product?.is_active !== false;
  const displayPrice = branchProduct?.effective_price !== undefined ? branchProduct.effective_price : (branchProduct?.price || product.effective_price || product.price || 0);
  const displayOriginalPrice = branchProduct?.original_price || product.original_price || 0;
  const displayDiscount = branchProduct?.discount_percent || product.discount_percent || 0;

  const currentBranchId = activeBranchId;
  const compareProductId = String(product?.id || product?._id || '');
  const isCompared = compareIds.includes(compareProductId);
  const compareDisabled = !isCompared && compareIds.length >= compareMaxItems;

  const handleAddToCart = async () => {
    if (!currentBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return false;
    }
    
    if (!canPurchase) {
      toast.error('Sản phẩm không khả dụng tại chi nhánh này');
      return false;
    }
    
    if (!isAuthenticated) {
      redirectToLogin({
        action: 'add_to_cart',
        branch_product_id: String(branchProduct.id || branchProduct._id),
        price: displayPrice,
        qty: quantity,
        product: { ...branchProduct, product: product as any } as any
      });
      return false;
    }
    
    const safeQuantity = clampQuantity(quantity, true);
    if (safeQuantity !== quantity) setQuantity(safeQuantity);

    try {
      await dispatch(addToCartAsync({
        branchId: currentBranchId,
        branch_product_id: String(branchProduct.id || branchProduct._id),
        price: displayPrice,
        unit_price: displayPrice,
        quantity: safeQuantity,
        product_name: product.name,
        product_image: resolveImageUrl(product.images?.[0] || product.thumbnail || ''),
        branchProduct: { ...branchProduct, product: product as any } as any,
      })).unwrap();
      toast.success(t('cart.addedToCart', { name: product.name }));
      return true;
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : (err?.message || t('common.addToCartError')));
      return false;
    }
  };

  const handleBuyNow = () => {
    if (!currentBranchId) {
      toast.error(t('common.selectBranchFirst'));
      return;
    }
    
    if (!canPurchase) {
      toast.error('Sản phẩm không khả dụng tại chi nhánh này');
      return;
    }
    
    if (!isAuthenticated) {
      redirectToLogin({
        action: 'add_to_cart',
        branch_product_id: String(branchProduct.id || branchProduct._id),
        price: displayPrice,
        qty: quantity,
        product: { ...branchProduct, product: product as any } as any
      });
      return;
    }

    const safeQuantity = clampQuantity(quantity, true);
    if (safeQuantity !== quantity) setQuantity(safeQuantity);

    const quickBuyItem = {
        branch_product_id: String(branchProduct.id || branchProduct._id),
        product_id: String(product.id || product._id),
        price: displayPrice,
        unit_price: displayPrice,
        original_price: displayOriginalPrice || displayPrice,
        final_price: displayPrice,
        discount_amount: 0,
        quantity: safeQuantity,
        product_name: product.name || 'Sản phẩm',
        product_image: resolveImageUrl(product.images?.[0] || product.thumbnail || ''),
        branchProduct: { ...branchProduct, product: product as any },
        branch_id: currentBranchId,
        branch_name: currentBranch?.name || '',
        source: 'buy_now' as const,
    };
    
    console.log('[ProductDetail] handleBuyNow quickBuyItem:', quickBuyItem);
    navigate('/checkout', { state: { isQuickBuy: true, quickBuyItem } });
  };

  const handleToggleCompare = () => {
    const productId = String(product?.id || product?._id || '');
    if (!productId) {
      toast.error(t('compare.cannotAdd'));
      return;
    }

    if (isCompared) {
      dispatch(removeCompareItem(productId));
      toast.success(t('compare.removed'));
      return;
    }

    if (compareIds.length >= compareMaxItems) {
      toast.error(t('compare.maxItems', { max: compareMaxItems }));
      return;
    }

    dispatch(addCompareItem({
      product_id: productId,
      branch_product_id: String(branchProduct?.id || branchProduct?._id || ''),
      name: product?.name || 'Sản phẩm',
      image: product?.images?.[0] || product?.thumbnail || '',
      price: displayPrice,
      original_price: displayOriginalPrice,
      discount_percent: displayDiscount,
      brand: product?.brand || '',
    }));
    toast.success(t('compare.added'));
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      redirectToLogin({ action: 'wishlist', product_id: product.id || product._id });
      return;
    }

    setIsTogglingWishlist(true);
    try {
      const payload = {
        product_id: String(product.id || product._id || ''),
        branch_product_id: branchProduct ? String(branchProduct.id || branchProduct._id || '') : undefined,
      };
      const result = await dataService.toggleWishlist(payload);
      const wished = typeof result?.wished === 'boolean' ? result.wished : !isWished;
      setIsWished(wished);
      toast.success(wished ? t('product.addedWishlist') : t('product.removedWishlist'));
    } catch {
      toast.error('Không thể cập nhật danh sách yêu thích');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      redirectToLogin({ action: 'ask_question', product_id: product.id || product._id });
      return;
    }

    const content = questionDraft.trim();
    if (content.length < 5) {
      toast.warning('Câu hỏi cần ít nhất 5 ký tự');
      return;
    }

    setSubmittingQuestion(true);
    try {
      const created = await productService.askProductQuestion(String(product.id || product._id), content);
      if (created?.id) {
        setQuestions((prev) => [created, ...prev]);
      } else {
        const latest = await productService.getProductQuestions(String(product.id || product._id));
        setQuestions(Array.isArray(latest) ? latest : []);
      }
      setQuestionDraft('');
      toast.success('Đã gửi câu hỏi cho sản phẩm');
    } catch {
      toast.error('Không thể gửi câu hỏi lúc này');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const getEffectiveMax = () => {
    const maxLimit = Math.max(1, Number(branchProduct?.max_purchase_limit || 20));
    const bpAvailableQty = branchProduct 
      ? (branchProduct.available_quantity !== undefined 
          ? branchProduct.available_quantity 
          : Math.max(0, branchProduct.stock - (branchProduct.reserved_quantity || 0)))
      : Math.max(0, product?.stock ?? 0);
    return bpAvailableQty > 0 ? Math.min(maxLimit, bpAvailableQty) : maxLimit;
  };

  const clampQuantity = (value: number, notify: boolean) => {
    if (!Number.isFinite(value)) {
      if (notify) toast.warning(t('cart.invalidQuantity', 'Số lượng không hợp lệ'));
      return 1;
    }

    let safeValue = Math.max(1, Math.floor(value));
    const maxAllowed = getEffectiveMax();
    const bpAvailableQty = branchProduct 
      ? (branchProduct.available_quantity !== undefined 
          ? branchProduct.available_quantity 
          : Math.max(0, branchProduct.stock - (branchProduct.reserved_quantity || 0)))
      : 0;

    if (safeValue > maxAllowed) {
      safeValue = maxAllowed;
      if (notify) {
        if (bpAvailableQty > 0 && safeValue === bpAvailableQty) {
          toast.warning(t('cart.stockLimitWarning', { stock: bpAvailableQty, defaultValue: `Chỉ còn ${bpAvailableQty} sản phẩm trong kho` }));
        } else {
          toast.warning(t('cart.maxLimitReached', { max: maxAllowed }));
        }
      }
    }
    return safeValue;
  };

  const increaseQty = () => setQuantity((prev) => clampQuantity(prev + 1, true));
  const decreaseQty = () => setQuantity((prev) => clampQuantity(prev - 1, false));

  return (
    <>
      <style>{`
        @tailwind base;
        @tailwind utilities;
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
          <Link to="/" className="hover:text-primary transition-colors">{t('common.breadcrumbHome')}</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <Link to="/products" className="hover:text-primary transition-colors">{t('product.products')}</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-slate-100 font-medium">{product.name}</span>
        </nav>

        {/* Branch unavailable banner */}
        {branchUnavailable && (
          <div className="mb-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-3xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 dark:bg-amber-900/50 rounded-2xl p-3 text-amber-600 dark:text-amber-300">
                <span className="material-symbols-outlined !text-3xl">storefront</span>
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-amber-900 dark:text-amber-200 text-lg mb-1">
                  Sản phẩm chưa kinh doanh tại chi nhánh của bạn
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-4 font-semibold">
                  {currentBranch?.name ? `Chi nhánh hiện tại: ${currentBranch.name}` : 'Bạn chưa chọn chi nhánh.'}
                </p>
                {availableBranches.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-extrabold flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      Sản phẩm có sẵn tại các chi nhánh sau:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableBranches.map((br: any) => (
                        <div
                          key={br.id || br._id}
                          className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:shadow transition-shadow"
                        >
                          <div>
                            <p className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1">
                              <span className="material-symbols-outlined text-primary text-base">location_on</span>
                              {br.name}
                            </p>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-primary font-black text-base">
                                {Number(br.price || 0).toLocaleString('vi-VN')}₫
                              </span>
                              <span className="text-slate-400 text-xs font-bold">
                                (Còn {br.stock} sản phẩm)
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSwitchToAvailableBranch(br)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">swap_horiz</span>
                              Chuyển chi nhánh
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchAndAddToCart(br)}
                              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">shopping_cart</span>
                              Mua ngay
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-4 rounded-2xl flex items-center gap-2.5 text-red-700 dark:text-red-300">
                    <span className="material-symbols-outlined">warning</span>
                    <span className="text-sm font-bold">Sản phẩm hiện đã hết hàng ở toàn bộ hệ thống chi nhánh.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Gallery */}
          <div className="space-y-4">
            {(() => {
              const parseImagesSafely = (prod: any): string[] => {
                if (!prod) return [];
                const urls: string[] = [];
                const addUrl = (url: any) => {
                  if (!url || typeof url !== 'string') return;
                  const trimmed = url.trim();
                  if (!trimmed) return;
                  if (['null', 'undefined', 'nan', '[object object]'].includes(trimmed.toLowerCase())) return;
                  if (!urls.includes(trimmed)) {
                    urls.push(trimmed);
                  }
                };

                const processValue = (val: any) => {
                  if (!val) return;
                  if (Array.isArray(val)) {
                    val.forEach(item => processValue(item));
                  } else if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                      try {
                        const parsed = JSON.parse(trimmed);
                        processValue(parsed);
                      } catch {
                        addUrl(trimmed);
                      }
                    } else {
                      addUrl(trimmed);
                    }
                  }
                };

                if (prod.images) processValue(prod.images);
                if (prod.gallery) processValue(prod.gallery);
                if (prod.image) processValue(prod.image);
                if (prod.thumbnail) processValue(prod.thumbnail);

                return urls;
              };

              const allImages = parseImagesSafely(product)
                .map((img: any) => resolveImageUrl(String(img || '')))
                .filter(Boolean);
              
              const mainImage = allImages[selectedImageIndex] || allImages[0] || fallbackProductImage;
              
              const nextImage = () => {
                if (allImages.length <= 1) return;
                setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
              };
              
              const prevImage = () => {
                if (allImages.length <= 1) return;
                setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
              };

              return (
                <>
                  <div className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden group relative shadow-md">
                    <img
                      alt={product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackProductImage;
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={mainImage}
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            prevImage();
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined !text-2xl">chevron_left</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            nextImage();
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined !text-2xl">chevron_right</span>
                        </button>
                      </>
                    )}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {branchProduct?.is_new && (
                        <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          {t('product.badgeNew')}
                        </span>
                      )}
                      {branchProduct?.is_best_seller && (
                        <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          {t('product.badgeBestSeller')}
                        </span>
                      )}
                      {product.is_featured && (
                        <span className="bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          Nổi bật
                        </span>
                      )}
                    </div>
                  </div>
                  {allImages.length > 1 && (
                    <div className="grid grid-cols-5 gap-3">
                      {allImages.map((img: any, idx: number) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`aspect-square rounded-xl border-2 ${
                            idx === selectedImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                          } overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800 transition-all duration-200`}
                        >
                          <img
                            className="w-full h-full object-cover"
                            src={img}
                            alt={`${product.name} - ${idx + 1}`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = fallbackProductImage;
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold px-2.5 py-1 rounded">
                {product.brand || 'LOTTE SELECTION'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">store</span>
                Chi nhánh sở hữu: <span className="text-slate-800 dark:text-slate-200">{productRealBranches.map((b: any) => b.name).join(', ') || 'Tất cả chi nhánh'}</span>
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-4 leading-tight">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex mb-1">
                <StarRating rating={product.average_rating || product.rating || 0} />
              </div>
              <span className="font-bold ml-1">{formatRating(product.average_rating || product.rating || 0)}</span>
              <span className="text-slate-400">|</span>
              <span className="text-primary font-medium">{product.review_count || 0} đánh giá</span>
              <span className="text-slate-400">|</span>
              <span>
                Đã bán: <span className="font-bold">{branchProduct?.sold_count || product.sold_count || 0}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">SKU:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{branchProduct?.sku || product.sku || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Master ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{String(branchProduct?.master_id || product?.master_id || product?._id || 'N/A').slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Danh mục:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{branchProduct?.category_name || product.category_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngành hàng / NCC:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{branchProduct?.supplier_name || product.supplier_name || 'N/A'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-500 font-semibold">Chi nhánh kinh doanh sản phẩm này:</span>
                <div className="flex flex-wrap gap-1.5">
                  {productRealBranches.map((br: any) => (
                    <span
                      key={br.id || br._id}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        String(br.id || br._id) === String(activeBranchId)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {br.name} {br.available_quantity > 0 ? `(${t('common.inStock', 'Còn hàng')}: ${br.available_quantity})` : `(${t('common.outOfStock', 'Hết hàng')})`}
                    </span>
                  ))}
                  {productRealBranches.length === 0 && <span className="text-slate-400 font-medium">N/A</span>}
                </div>
              </div>
              <div className="col-span-2 flex justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-700 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">event_busy</span> Hạn sử dụng (Chi nhánh):
                </span>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {branchProduct?.expiry_date ? new Date(branchProduct.expiry_date).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                  {(branchProduct?.is_expired || branchProduct?.is_expiring_soon) && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${branchProduct.is_expired ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {branchProduct.is_expired ? 'Đã hết hạn' : 'Sắp hết hạn'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Hot Deal Banner */}
            {(branchProduct?.pricing_source === 'HOT_DEAL' || branchProduct?.active_hot_deal) && (
              <div className="mb-4 bg-amber-500 text-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wider">
                      {branchProduct?.active_hot_deal?.badge_text || 'Hot Deal Độc Quyền'}
                    </h4>
                    <p className="text-xs opacity-95">Ưu đãi cực sốc có giới hạn thời gian!</p>
                  </div>
                </div>
                {branchProduct?.active_hot_deal?.end_date && (
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                    <HotDealCountdown endDate={branchProduct.active_hot_deal.end_date} />
                  </div>
                )}
              </div>
            )}

            {/* Price block */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/5 p-6 rounded-xl mb-8">
              {displayPrice > 0 ? (
                <>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-4xl font-black text-primary">
                      {displayPrice.toLocaleString('vi-VN')}₫
                    </span>
                    {displayOriginalPrice > displayPrice && (
                      <>
                        <span className="text-lg text-slate-400 line-through">
                          {displayOriginalPrice.toLocaleString('vi-VN')}₫
                        </span>
                        {displayDiscount > 0 && (
                          <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded">
                            -{displayDiscount}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {displayStock !== null ? (
                    displayStock > 0 ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        {t('common.inStock')}: {displayStock} {t('common.product')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        {t('common.outOfStock')}
                      </div>
                    )
                  ) : null}
                </>
              ) : branchUnavailable ? (
                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Giá chưa khả dụng tại chi nhánh này
                </div>
              ) : (
                <span className="text-slate-400 text-sm">Liên hệ để biết giá</span>
              )}

              {promotions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">redeem</span> Ưu đãi áp dụng
                  </p>
                  <div className="flex flex-col gap-2">
                    {promotions.map((promo: any, i: number) => (
                      <div key={i} className="flex gap-2 items-start bg-primary/5 p-2 rounded-lg">
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm shrink-0 mt-0.5">
                          {promo.badge_text || 'PROMO'}
                        </span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {promo.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {coupons.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">local_activity</span> Coupon có thể dùng
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coupons.slice(0, 4).map((coupon: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">
                        {coupon.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity & Buttons */}
            <div className="space-y-8">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                  Số lượng
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-1">
                    <button
                      onClick={decreaseQty}
                      disabled={!canPurchase}
                      className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      −
                    </button>
                    <input
                      className="w-12 text-center bg-transparent border-none focus:ring-0 font-bold text-lg"
                      value={quantity}
                      readOnly
                    />
                    <button
                      onClick={increaseQty}
                      disabled={!canPurchase}
                      className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mua tối đa {branchProduct?.max_purchase_limit || 20} sản phẩm
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!canPurchase}
                  className={`flex-1 py-4 border-2 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    canPurchase
                      ? 'border-primary text-primary hover:bg-primary/5'
                      : 'border-slate-300 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                  {canPurchase ? t('common.addToCart') : t('common.outOfStock')}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!canPurchase}
                  className={`flex-1 py-4 font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all ${
                    canPurchase
                      ? 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
                      : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined">bolt</span>
                  {canPurchase ? 'Mua ngay' : 'Chưa thể mua'}
                </button>
                <button
                  onClick={handleToggleWishlist}
                  disabled={isTogglingWishlist}
                  className={`flex-1 py-4 border-2 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    isWished
                      ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                      : 'border-pink-300 text-pink-700 hover:bg-pink-50'
                  } ${isTogglingWishlist ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <span className="material-symbols-outlined">{isWished ? 'favorite' : 'favorite_border'}</span>
                  {isWished ? 'Đã yêu thích' : 'Yêu thích'}
                </button>
                <button
                  onClick={handleToggleCompare}
                  disabled={compareDisabled}
                  className={`flex-1 py-4 border-2 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    isCompared
                      ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                      : compareDisabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={compareDisabled ? `Chỉ so sánh tối đa ${compareMaxItems} sản phẩm` : 'Thêm vào danh sách so sánh'}
                >
                  <span className="material-symbols-outlined">balance</span>
                  {isCompared ? 'Đã chọn so sánh' : 'So sánh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex gap-8 mb-8">
          <button
            onClick={() => setActiveTab('mo-ta')}
            className={`pb-4 border-b-2 font-bold text-sm ${
              activeTab === 'mo-ta' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
            }`}
          >
            Mô tả sản phẩm
          </button>
          <button
            onClick={() => setActiveTab('thong-tin')}
            className={`pb-4 border-b-2 font-bold text-sm ${
              activeTab === 'thong-tin' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
            }`}
          >
            Thông tin chi tiết
          </button>
          <button
            onClick={() => setActiveTab('danh-gia')}
            className={`pb-4 border-b-2 font-bold text-sm ${
              activeTab === 'danh-gia' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
            }`}
          >
            Đánh giá khách hàng
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          <div className="lg:col-span-2">
            {/* Tab Mô tả */}
            {activeTab === 'mo-ta' && (
              <>
                {/* AI Product Summary */}
                <div className="mb-10 overflow-hidden rounded-2xl border border-indigo-100 dark:border-slate-800 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 dark:from-slate-900/40 dark:to-slate-800/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-indigo-100/50 dark:border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 dark:shadow-none animate-pulse">
                        <span className="material-symbols-outlined">auto_awesome</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
                          {uiText.aiSummaryTitle}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {uiText.groundedHint}
                        </p>
                      </div>
                    </div>
                  </div>

                  {loadingSummary ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-6">
                      {/* Overview */}
                      <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {aiSummary.overview}
                      </div>

                      {/* Strengths & Cautions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Strengths */}
                        <div className="rounded-xl border border-emerald-100/60 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-emerald-950/10 p-4">
                          <h4 className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-emerald-500">task_alt</span>
                            {uiText.strengths}
                          </h4>
                          {aiSummary.strengths && aiSummary.strengths.length > 0 ? (
                            <ul className="space-y-2">
                              {aiSummary.strengths.map((str: string, i: number) => (
                                <li key={i} className="flex gap-2 items-start text-sm text-slate-600 dark:text-slate-300">
                                  <span className="material-symbols-outlined text-[16px] text-emerald-500 shrink-0 mt-0.5">check</span>
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-400">---</span>
                          )}
                        </div>

                        {/* Cautions */}
                        <div className="rounded-xl border border-amber-100/60 dark:border-amber-950/40 bg-amber-50/20 dark:bg-amber-950/10 p-4">
                          <h4 className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-400 mb-3 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-amber-500">warning</span>
                            {uiText.cautions}
                          </h4>
                          {aiSummary.cautions && aiSummary.cautions.length > 0 ? (
                            <ul className="space-y-2">
                              {aiSummary.cautions.map((cau: string, i: number) => (
                                <li key={i} className="flex gap-2 items-start text-sm text-slate-600 dark:text-slate-300">
                                  <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0 mt-0.5">info</span>
                                  <span>{cau}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-400">---</span>
                          )}
                        </div>
                      </div>

                      {/* Recommendation */}
                      {aiSummary.recommendation && (
                        <div className="rounded-xl border border-indigo-100/80 dark:border-indigo-950/40 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 flex gap-3">
                          <span className="material-symbols-outlined text-indigo-500 shrink-0 mt-0.5">lightbulb</span>
                          <div>
                            <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-400 mb-1">
                              {uiText.recommendation}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                              {aiSummary.recommendation}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {aiSummary.notes && aiSummary.notes.length > 0 && (
                        <div className="pt-2 border-t border-indigo-100/30 dark:border-slate-800">
                          <h4 className="font-bold text-xs text-slate-500 uppercase tracking-widest mb-2">
                            {uiText.notes}
                          </h4>
                          <ul className="space-y-1">
                            {aiSummary.notes.map((n: string, i: number) => (
                              <li key={i} className="text-xs text-slate-500 flex gap-2 items-start">
                                <span className="text-indigo-400 font-bold">•</span>
                                <span>{n}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm italic py-2">
                      {uiText.aiNotConfigured}
                    </div>
                  )}
                </div>

                <article className="prose prose-slate dark:prose-invert max-w-none">
                  <h3 className="text-xl font-bold mb-4">Đặc điểm nổi bật</h3>
                  <p className="mb-6">{product.description || product.short_description || 'Chưa có mô tả cho sản phẩm này.'}</p>
                  {product.highlights && (
                    <ul className="space-y-4 mb-8">
                      {product.highlights.map((line: any, i: number) => (
                        <li key={i} className="flex gap-3">
                          <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </>
            )}

            {/* Tab Thông tin chi tiết */}
            {activeTab === 'thong-tin' && (
              <div className="space-y-10">
                {product.specifications && (
                  <div>
                    <h3 className="font-bold text-lg mb-4">Thông số kỹ thuật</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {(Array.isArray(product.specifications) ? product.specifications : Object.entries(product.specifications || {}).map(([label, value]) => ({label, value}))).map((spec: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3"
                        >
                          <span className="font-medium text-slate-700 dark:text-slate-300">{spec.label}</span>
                          <span className="text-slate-900 dark:text-slate-100">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic product info table */}
                <div>
                  <h3 className="font-bold text-lg mb-4">Thông tin cơ bản</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {product.brand && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Thương hiệu</span>
                        <span className="text-slate-900 dark:text-slate-100">{product.brand}</span>
                      </div>
                    )}
                    {product.origin && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Xuất xứ</span>
                        <span className="text-slate-900 dark:text-slate-100">{product.origin}</span>
                      </div>
                    )}
                    {product.unit && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Đơn vị</span>
                        <span className="text-slate-900 dark:text-slate-100">{product.unit}</span>
                      </div>
                    )}
                    {product.weight && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Khối lượng</span>
                        <span className="text-slate-900 dark:text-slate-100">{product.weight}</span>
                      </div>
                    )}
                    {product.barcode && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Mã vạch</span>
                        <span className="text-slate-900 dark:text-slate-100">{product.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {product.usage_guide && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">Hướng dẫn sử dụng</h3>
                    <p className="text-slate-600 dark:text-slate-400">{product.usage_guide}</p>
                  </div>
                )}

                {(product.storage_guide || product.storage_instructions) && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">Hướng dẫn bảo quản</h3>
                    <p className="text-slate-600 dark:text-slate-400">{product.storage_guide || product.storage_instructions}</p>
                  </div>
                )}

                {product.notes && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">Lưu ý quan trọng</h3>
                    <p className="text-slate-600 dark:text-slate-400">{product.notes}</p>
                  </div>
                )}

                {product.recipe_suggestions && (
                  <div>
                    <h3 className="font-bold text-lg mb-4">Gợi ý công thức nấu ăn</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                      {product.recipe_suggestions.map((r: any, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tab Đánh giá */}
            {activeTab === 'danh-gia' && (
              <ReviewList productId={productId} />
            )}
          </div>

          {/* Review Summary Sidebar */}
          <div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-6">
              <h3 className="font-bold text-lg mb-4">Tổng quát đánh giá</h3>
              <div className="text-center mb-6">
                <div className="text-6xl font-black text-slate-900 dark:text-slate-100">
                  {formatRating(product.average_rating || product.rating || 0)}
                </div>
                <div className="flex justify-center my-2">
                  <StarRating rating={product.average_rating || product.rating || 0} />
                </div>
                <p className="text-xs text-slate-400">
                  Dựa trên {product.review_count || 0} lượt đánh giá
                </p>
              </div>

              {product.rating_breakdown && (
                <div className="space-y-3">
                  {Object.entries<any>(product.rating_breakdown)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([stars, count]) => (
                      <div key={stars} className="flex items-center gap-3 text-sm">
                        <span className="w-4 text-right font-medium">{stars}</span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(Number(count) / (product.review_count || product.total_reviews || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-slate-400">{count as React.ReactNode}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Policies Section */}
        {policies.length > 0 && (
          <div className="mb-12 bg-surface-container-low rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">Chính sách mua hàng</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {policies.map((pol: any, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <span className="material-symbols-outlined text-primary">{pol.icon || 'verified'}</span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{pol.title}</h4>
                    <p className="text-xs text-slate-500">{pol.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-extrabold mb-6">Hỏi đáp về sản phẩm ({questions.length})</h3>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Bạn có câu hỏi về sản phẩm này?</p>
            <textarea
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              placeholder="Nhập câu hỏi của bạn (ví dụ: Sản phẩm này phù hợp cho trẻ em từ mấy tuổi?)"
              className="w-full h-24 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary resize-none"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAskQuestion}
                disabled={submittingQuestion}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {submittingQuestion ? 'Đang gửi...' : 'Gửi câu hỏi'}
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl text-center text-slate-500">
              Chưa có câu hỏi nào cho sản phẩm này.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q: any, index: number) => {
                const answerList = Array.isArray(q.answers)
                  ? q.answers
                  : q.answer?.content
                    ? [{ content: q.answer.content, created_at: q.answer.answered_at }]
                    : [];

                return (
                  <div key={q.id || `${q.created_at || 'q'}-${index}`} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex gap-3 mb-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{q.user?.name || q.user_name || 'Khách hàng'}</span>
                      <span className="text-slate-400 text-sm">{q.created_at ? new Date(q.created_at).toLocaleDateString('vi-VN') : ''}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-3">Q: {q.content || q.question}</p>
                    {answerList.map((a: any, i: number) => (
                      <div key={i} className="pl-4 mt-2 border-l-2 border-primary/20">
                        <p className="text-sm font-bold text-primary mb-1">
                          A: Lotte Mart
                          <span className="text-slate-400 font-normal ml-2">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span>
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{a.content}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Suggested Products */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-extrabold">Sản phẩm tương tự</h3>
            <Link to="/products" className="text-primary font-bold flex items-center gap-1 hover:underline">
              Xem tất cả
            </Link>
          </div>
          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {relatedProducts.map((p: any) => (
                <Link key={p.id || p._id} to={getProductUrl(p)} className="group">
                  <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative">
                    <img
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      src={resolveImageUrl(p.images?.[0] || p.thumbnail) || fallbackProductImage}
                      alt={p.name}
                    />
                  </div>
                  <h4 className="text-sm font-bold line-clamp-2 mb-2">{p.name}</h4>
                  <span className="text-primary font-black">
                    {(p.price || p.original_price || p.min_price || 0) > 0 ? `${(p.price || p.original_price || p.min_price || 0).toLocaleString('vi-VN')}₫` : 'Liên hệ'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">Chưa có sản phẩm tương tự.</p>
          )}
        </div>

        {/* Bought together */}
        {boughtTogetherProducts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-extrabold">Khách hàng thường mua cùng</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {boughtTogetherProducts.map((p: any) => (
                <Link key={p.id || p._id} to={getProductUrl(p)} className="group">
                  <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative">
                    <img
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      src={resolveImageUrl(p.images?.[0] || p.thumbnail) || fallbackProductImage}
                      alt={p.name}
                    />
                  </div>
                  <h4 className="text-sm font-bold line-clamp-2 mb-2">{p.name}</h4>
                  <span className="text-primary font-black">
                    {(p.price || p.original_price || p.min_price || 0) > 0 ? `${(p.price || p.original_price || p.min_price || 0).toLocaleString('vi-VN')}₫` : 'Liên hệ'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default ProductDetail;