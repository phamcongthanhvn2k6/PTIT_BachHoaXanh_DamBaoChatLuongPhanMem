// src/pages/ProductDetail.tsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../store';
import { addToCartAsync } from '../slices/cartSlice';
import { addCompareItem, compareMaxItems, removeCompareItem, selectCompareIds } from '../slices/compareSlice';
import { useNavigate } from 'react-router-dom';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import StarRating from '../components/StarRating/StarRating';
import ReviewList from '../components/ReviewList/ReviewList';
import { toast } from '../components/Toast/toastEvent';
import { productService } from '../services/productService';
import { dataService } from '../services/dataService';
import { saveViewHistory } from '../services/viewHistoryService';
import i18n from '../i18n';
import { resolveImageUrl, fallbackProductImage } from '../utils/imageUrl';

const ProductDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const productId = id || '0';

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const compareIds = useAppSelector(selectCompareIds);
  const { currentBranch } = useAppSelector(state => state.branch);
  const redirectToLogin = useAuthRedirect();
  const viewTrackedKeyRef = React.useRef<string>('');

  const [quantity, setQuantity] = useState(1);
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
  // Whether the product exists but has no branch data
  const [branchUnavailable, setBranchUnavailable] = useState(false);

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
        // STEP 1: Fetch the product core data directly by ID
        const productData = await productService.getProductById(id!);

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

        // STEP 2: Independently fetch branch-specific data (price/stock)
        // Use currentBranch from Redux store — no hardcode
        const branchId = activeBranchId;
        let bp: any = null;
        if (branchId) {
          try {
            const bps = await productService.getBranchProducts({
              product_id: resolvedProduct.id || resolvedProduct._id,
              branch_id: branchId,
            });
            const safeBranchProducts = Array.isArray(bps) ? bps : [];
            if (safeBranchProducts.length > 0) {
              bp = safeBranchProducts[0];
              setBranchProduct(bp);
            } else {
              setBranchUnavailable(true);
            }
          } catch {
            // Branch data fetch failed - product still viewable
            setBranchUnavailable(true);
          }
        } else {
          // No branch selected — mark as unavailable for purchasing
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
                    if (bp) { p.price = bp.price; p.original_price = bp.original_price; }
                });
                together.forEach((p: any) => {
                    const bp = bpMap.get(String(p.id || p._id));
                    if (bp) { p.price = bp.price; p.original_price = bp.original_price; }
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
    if (id) {
      fetchDetail();
    } else {
      setError('Thiếu mã sản phẩm.');
      setLoading(false);
    }
    return () => { active = false; };
  }, [id, activeBranchId]);

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
        price: Number(branchProduct?.price ?? product.price ?? 0),
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
  const canPurchase = branchProduct && !branchUnavailable && branchProduct.stock > 0 && branchProduct.is_available !== false && product?.is_active !== false;
  const displayPrice = branchProduct?.price || product.price || 0;
  const displayOriginalPrice = branchProduct?.original_price || product.original_price || 0;
  const displayDiscount = branchProduct?.discount_percent || product.discount_percent || 0;
  const displayStock = branchProduct?.stock ?? null;

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
        price: branchProduct.price,
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
        price: branchProduct.price,
        unit_price: branchProduct.price,
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
        price: branchProduct.price,
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
        price: branchProduct.price,
        unit_price: branchProduct.price,
        original_price: branchProduct.original_price || branchProduct.price,
        final_price: branchProduct.price,
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
      price: Number(branchProduct?.price || product?.price || 0),
      original_price: Number(branchProduct?.original_price || product?.original_price || 0),
      discount_percent: Number(branchProduct?.discount_percent || product?.discount_percent || 0),
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
    const maxStock = Math.max(0, Number(branchProduct?.stock ?? product?.stock ?? 0));
    return maxStock > 0 ? Math.min(maxLimit, maxStock) : maxLimit;
  };

  const clampQuantity = (value: number, notify: boolean) => {
    if (!Number.isFinite(value)) {
      if (notify) toast.warning(t('cart.invalidQuantity', 'Số lượng không hợp lệ'));
      return 1;
    }

    let safeValue = Math.max(1, Math.floor(value));
    const maxAllowed = getEffectiveMax();
    if (safeValue > maxAllowed) {
      safeValue = maxAllowed;
      if (notify) {
        if (Number(branchProduct?.stock ?? 0) > 0 && safeValue === Number(branchProduct?.stock ?? 0)) {
          toast.warning(t('cart.stockLimitWarning', { stock: Number(branchProduct?.stock ?? 0), defaultValue: `Chỉ còn ${Number(branchProduct?.stock ?? 0)} sản phẩm trong kho` }));
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
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500 text-2xl">info</span>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-200">Sản phẩm này hiện chưa kinh doanh tại chi nhánh của bạn</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Bạn vẫn có thể xem thông tin chi tiết. Giá và tình trạng tồn kho có thể chưa khả dụng.</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden group relative cursor-zoom-in">
              <img
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                src={resolveImageUrl(product.images?.[0] || product.thumbnail || '') || fallbackProductImage}
              />
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
            <div className="grid grid-cols-4 gap-4">
              {product.images?.slice(0, 4).map((img: any, idx: number) => (
                <div
                  key={idx}
                  className={`aspect-square rounded-lg border-2 ${
                    idx === 0 ? 'border-primary' : 'border-slate-200 dark:border-slate-700'
                  } overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800`}
                >
                  <img className="w-full h-full object-cover" src={resolveImageUrl(img) || fallbackProductImage} alt={product.name} />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <p className="text-slate-400 font-bold tracking-widest text-xs mb-2 uppercase">
              {product.brand || 'LOTTE SELECTION'}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-4 leading-tight">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex mb-1">
                <StarRating rating={product.average_rating || product.rating || 0} />
              </div>
              <span className="font-bold ml-1">{product.average_rating || product.rating || 0}</span>
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
                  {product.average_rating || product.rating || 0}
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
                <Link key={p.id || p._id} to={`/products/${p.id || p._id}`} className="group">
                  <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative">
                    <img
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      src={p.images?.[0] || p.thumbnail || 'https://via.placeholder.com/300'}
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
                <Link key={p.id || p._id} to={`/products/${p.id || p._id}`} className="group">
                  <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative">
                    <img
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      src={p.images?.[0] || p.thumbnail || 'https://via.placeholder.com/300'}
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