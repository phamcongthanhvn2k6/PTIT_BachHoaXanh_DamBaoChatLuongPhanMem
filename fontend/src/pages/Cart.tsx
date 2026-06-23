import React, { useState, useEffect, useMemo } from 'react';
import { resolveImageUrl } from '../utils/imageUrl';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loadAllBranchCarts,
  updateCartItemAsync,
  removeCartItemAsync,
  applyCoupon,
  removeCoupon,
  selectCurrentBranchItems
} from '../slices/cartSlice';
import { promotionService } from '../services/promotionService';
import { couponService } from '../services/couponService';
import { toast } from '../components/Toast/toastEvent';
import { dataService } from '../services/dataService';

const getCouponLifecycle = (coupon: any) => {
  if (!coupon) return { total: 0, used: 0, remaining: null as number | null, soldOut: false, expired: false };
  const total = Number(coupon.total_quantity || coupon.usage_limit || 0);
  const used = Number(coupon.used_count || coupon.claimed_count || 0);
  const remaining = coupon.remaining_quantity !== undefined && coupon.remaining_quantity !== null
    ? Number(coupon.remaining_quantity)
    : (total > 0 ? Math.max(0, total - used) : null);
  const soldOut = Boolean(coupon.is_sold_out || (remaining !== null && remaining <= 0));
  const expired = Boolean(coupon.end_date && new Date(coupon.end_date) < new Date());
  return { total, used, remaining, soldOut, expired };
};

const toSafeNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toSafeQuantity = (value: any): number => {
  return Math.max(1, toSafeNumber(value, 1));
};

const Cart: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { appliedCoupon, status } = useAppSelector(state => state.cart);
  const { isAuthenticated } = useAppSelector(state => state.auth);
  const { currentBranch } = useAppSelector(state => state.branch);
  const { branchProducts, products } = useAppSelector(state => state.product);
  const currentBranchId = currentBranch ? String(currentBranch.id || (currentBranch as any)?._id || '') : '';
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [promoData, setPromoData] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    dataService.getAdminSettings()
      .then(s => {
        if (s && s.maintenance_mode) {
          setMaintenanceMode(true);
        }
      })
      .catch(() => {});
  }, []);

  const activeCouponSnapshot = promoData?.coupon_applied || appliedCoupon;
  const couponLifecycle = getCouponLifecycle(activeCouponSnapshot);

  // Load carts from backend on mount
  useEffect(() => {
    if (isAuthenticated && status === 'idle') {
      dispatch(loadAllBranchCarts());
    }
  }, [isAuthenticated, status, dispatch]);

  // Get items for current branch
  const items = useAppSelector(state => selectCurrentBranchItems(state as any, currentBranchId)) || [];

  const branchProductMap = useMemo(() => {
    const map = new Map<string, any>();
    (branchProducts || []).forEach((bp: any) => {
      const key = String(bp?.id || bp?._id || '');
      if (key) map.set(key, bp);
    });
    return map;
  }, [branchProducts]);

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    (products || []).forEach((p: any) => {
      const key = String(p?.id || p?._id || '');
      if (key) map.set(key, p);
    });
    return map;
  }, [products]);

  console.log('[Cart] currentBranchId:', currentBranchId, 'items:', items);

  const subtotal = promoData
    ? toSafeNumber(promoData.original_total, 0)
    : items.reduce((sum, item) => {
        const unitPrice = toSafeNumber(item.unit_price ?? item.price, 0);
        const quantity = toSafeQuantity(item.quantity);
        return sum + (unitPrice * quantity);
      }, 0);
  const shippingFee = promoData ? toSafeNumber(promoData.shipping_fee, 0) : (subtotal > 300000 ? 0 : 15000);
  const promoDiscount = promoData ? toSafeNumber(promoData.discount_amount, 0) : 0;
  
  let discount = promoDiscount;
  if (!promoData && appliedCoupon) {
    const minOrderValue = Number((appliedCoupon as any).min_order_value ?? (appliedCoupon as any).min_order_amount ?? 0);
    const discountType = (appliedCoupon as any).discount_type || (appliedCoupon as any).type;
    const maxDiscount = Number((appliedCoupon as any).max_discount_value ?? (appliedCoupon as any).max_discount_amount ?? 0);

    if (subtotal >= minOrderValue) {
      if (discountType === 'percent') {
        discount = Math.min((subtotal * appliedCoupon.discount_value) / 100, maxDiscount || Infinity);
      } else {
        discount = appliedCoupon.discount_value;
      }
    }
  }

  const total = promoData ? toSafeNumber(promoData.total, subtotal + shippingFee - discount) : (subtotal + shippingFee - discount);

  useEffect(() => {
    if (!currentBranchId || items.length === 0) {
      setPromoData(null);
      return;
    }
    const fetchPromo = async () => {
      setPromoLoading(true);
      const mappedItems = items.map(i => ({
        _id: (i as any)._id,
        branch_product_id: i.branch_product_id,
        product_id: (i as any).branchProduct?.product?._id || (i as any).branchProduct?.product?.id,
        category_id: (i as any).branchProduct?.product?.category_id,
        quantity: toSafeQuantity(i.quantity),
        price: toSafeNumber(i.unit_price ?? i.price, 0),
        name: (i as any).branchProduct?.product?.name || (i as any).product_name
      }));
      const res = await promotionService.calculateCheckoutTotals(
        mappedItems,
        currentBranchId, 
        appliedCoupon?.code || couponCode
      );
      if (res.success) {
        setPromoData(res.data);
      }
      setPromoLoading(false);
    };
    fetchPromo();
  }, [items, currentBranchId, appliedCoupon]);

  useEffect(() => {
    if (promoData?.coupon_error && appliedCoupon) {
      toast.warning(`Mã giảm giá đã bị gỡ: ${promoData.coupon_error}`);
      dispatch(removeCoupon());
    }
  }, [promoData?.coupon_error, appliedCoupon, dispatch]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    const result = await couponService.applyCoupon(couponCode.trim(), currentBranchId, items);

    if (!result.success) {
      setCouponError(result.message || 'Mã giảm giá không hợp lệ');
      return;
    }

    const coupon = result.data?.coupon;
    dispatch(applyCoupon({
      id: coupon?._id || coupon?.id || 0,
      code: coupon?.code || couponCode.trim().toUpperCase(),
      description: coupon?.description || '',
      discount_type: coupon?.type || 'fixed_amount',
      discount_value: Number(coupon?.discount_value || 0),
      min_order_value: Number(coupon?.min_order_amount || 0),
      max_discount_value: Number(coupon?.max_discount_amount || 0),
      start_date: coupon?.start_date || '',
      end_date: coupon?.end_date || '',
      usage_limit: Number(coupon?.usage_limit || 0),
      used_count: Number(coupon?.used_count || 0),
      eligible_branch_ids: Array.isArray(coupon?.target_branch_ids) ? coupon.target_branch_ids : [],
    } as any));
    setCouponCode('');
    setCouponError('');
  };

  const handleUpdateQuantity = (branchProductId: string, newQuantity: number, maxStock?: number, maxLimit?: number) => {
    if (!Number.isFinite(newQuantity)) {
      toast.warning(t('cart.invalidQuantity', 'Số lượng không hợp lệ'));
      return;
    }
    if (newQuantity < 1) {
      toast.warning(t('cart.minQuantityWarning', 'Số lượng tối thiểu là 1'));
      return;
    }
    const effectiveMax = Math.min(maxStock ?? 9999, maxLimit ?? 99);
    let safeQuantity = toSafeQuantity(newQuantity);
    
    if (safeQuantity > effectiveMax) {
      safeQuantity = effectiveMax;
      if (maxStock !== undefined && newQuantity > maxStock) {
        toast.warning(t('cart.stockLimitWarning', { stock: maxStock, defaultValue: `Chỉ còn ${maxStock} sản phẩm trong kho` }));
      } else {
        toast.warning(t('cart.maxLimitReached', { max: effectiveMax }));
      }
    }
    
    dispatch(updateCartItemAsync({
      branch_product_id: branchProductId,
      quantity: safeQuantity,
      branch_id: currentBranchId,
    }));
  };

  const handleRemoveItem = (branchProductId: string) => {
    dispatch(removeCartItemAsync({
      branch_product_id: branchProductId,
      branch_id: currentBranchId,
    }));
  };

  const handleCheckout = () => {
    if (maintenanceMode) {
      toast.error(t('common.maintenanceWarning') || 'Hệ thống đang bảo trì. Tính năng đặt hàng tạm thời đóng.');
      return;
    }
    if (items.length > 0) {
      navigate('/checkout');
    }
  };

  const handleRemoveCoupon = async () => {
    await couponService.removeCoupon();
    dispatch(removeCoupon());
  };

  if (!isAuthenticated) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center bg-background-light dark:bg-background-dark font-display">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">shopping_cart</span>
        <h2 className="text-2xl font-bold mb-4">{t('auth.login')}</h2>
        <p className="text-slate-500 mb-8">{t('cart.emptyText')}</p>
        <button onClick={() => navigate('/login')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90">
          {t('auth.login')}
        </button>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center bg-background-light dark:bg-background-dark font-display">
        <span className="material-symbols-outlined text-6xl text-primary mb-4 animate-spin">progress_activity</span>
        <h2 className="text-2xl font-bold mb-4">{t('cart.loading')}</h2>
        <p className="text-slate-500">Vui lòng chờ trong giây lát...</p>
      </main>
    );
  }

  if (!currentBranchId) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center bg-background-light dark:bg-background-dark font-display">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">store</span>
        <h2 className="text-2xl font-bold mb-4">Chưa chọn chi nhánh</h2>
        <p className="text-slate-500 mb-8">{t('common.selectBranchFirst')}</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center bg-background-light dark:bg-background-dark font-display">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">shopping_cart</span>
        <h2 className="text-2xl font-bold mb-4">{t('cart.emptyTitle')}</h2>
        <p className="text-slate-500 mb-8">{t('cart.emptyText')}</p>
        <button onClick={() => navigate('/products')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90">
          {t('cart.continueShopping')}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items List */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {t('cart.title')} <span className="text-lg font-normal text-slate-500">{t('cart.itemsCount', { count: items.length })}</span>
            </h2>
            {currentBranch && (
              <span className="text-sm text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">
                📍 {(currentBranch as any).name || currentBranchId}
              </span>
            )}
          </div>

          {items.map((item) => {
             const fallbackBp = branchProductMap.get(String(item.branch_product_id));
             const bp = (item.branchProduct || fallbackBp || {}) as any;
             const productCore = bp?.product || productMap.get(String(bp?.product_id || fallbackBp?.product_id || ''));
             const maxLimit = bp?.max_purchase_limit || 99;
             const safeQuantity = toSafeQuantity(item.quantity);
             const safeUnitPrice = toSafeNumber(item.unit_price ?? item.price, 0);
             const lineTotal = safeUnitPrice * safeQuantity;
             const productName = productCore?.name || bp?.name || (item as any).product_name || 'Sản phẩm';
             const productImage = productCore?.images?.[0] || bp?.images?.[0] || (item as any).product_image || '';
             const productBrand = productCore?.brand || bp?.brand || 'Bách hóa XANH';
             const promoItem = promoData?.items?.find((i: any) => String(i.branch_product_id) === String(item.branch_product_id));
             
               return (
              <div key={item.branch_product_id} className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 relative">
                  {productImage ? (
                    <img className="w-full h-full object-cover" src={resolveImageUrl(productImage)} alt={productName} onError={(e) => { (e.target as HTMLImageElement).src = resolveImageUrl(''); }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl">image</span>
                    </div>
                  )}
                  {(bp?.is_expired || bp?.is_expiring_soon) && (
                    <div className={`absolute top-0 right-0 left-0 text-center text-[9px] font-bold text-white py-0.5 ${bp.is_expired ? 'bg-red-600' : 'bg-orange-500'}`}>
                      {bp.is_expired ? t('cart.expired') : t('cart.expiringSoon')}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate" title={productName}>
                      {productName}
                    </h3>
                    <button onClick={() => handleRemoveItem(item.branch_product_id)} className="text-slate-400 hover:text-primary transition-colors absolute top-4 right-4 sm:static">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  {promoItem && promoItem.applied_promotion && (
                    <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded mt-1 mb-2">
                      {promoItem.applied_promotion.title}
                    </span>
                  )}
                  <div className="flex flex-col gap-0.5 mb-3">
                    <p className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-max">
                      {t('cart.sku')} {bp?.sku || bp?.product?.sku || (item as any).sku || 'N/A'}
                    </p>
                        <p className="text-xs text-slate-500 font-medium truncate" title={bp?.supplier_name || productCore?.supplier_name || (item as any).supplier_name || 'N/A'}>
                      <span className="font-bold">{t('cart.categoryLabel')}</span> {bp?.category_name || productCore?.category_name || (item as any).category_name || 'N/A'}
                      <span className="mx-2 text-slate-300">|</span> 
                      <span className="font-bold">{t('cart.supplierLabel')}</span> {bp?.supplier_name || productCore?.supplier_name || (item as any).supplier_name || 'N/A'}
                    </p>
                    {(bp?.expiry_date || (item as any)?.expiry_date) && (
                      <p className={`text-xs font-bold mt-1 ${bp?.is_expired ? 'text-red-500' : bp?.is_expiring_soon ? 'text-orange-500' : 'text-slate-600'}`}>
                        {t('cart.expiryDate', { date: new Date(bp?.expiry_date || (item as any)?.expiry_date).toLocaleDateString('vi-VN') })}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-primary mb-3">{productBrand}</p>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col">
                      {promoItem && promoItem.discount_amount > 0 ? (
                        <>
                          <div className="text-slate-400 line-through text-sm">{lineTotal.toLocaleString('vi-VN')}đ</div>
                          <div className="text-xl font-extrabold text-slate-900 dark:text-white">{toSafeNumber(promoItem.total_price, lineTotal).toLocaleString('vi-VN')}đ</div>
                        </>
                      ) : (
                        <div className="text-xl font-extrabold text-slate-900 dark:text-white">{lineTotal.toLocaleString('vi-VN')}đ</div>
                      )}
                    </div>
                    <div className="flex items-center bg-primary/5 rounded-lg p-1">
                      <button
                        onClick={() => safeQuantity > 1 && handleUpdateQuantity(item.branch_product_id, safeQuantity - 1, Number(bp?.stock ?? 9999), maxLimit)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-10 text-center font-bold">{safeQuantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.branch_product_id, safeQuantity + 1, Number(bp?.stock ?? 9999), maxLimit)}
                        disabled={safeQuantity >= Math.min(Number(bp?.stock ?? 9999), maxLimit)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={safeQuantity >= Math.min(Number(bp?.stock ?? 9999), maxLimit) ? t('cart.maxLimitReached', { max: Math.min(Number(bp?.stock ?? 9999), maxLimit) }) : ""}
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {promoData?.gift_items?.length > 0 && (
            <div className="mt-4 border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">redeem</span>
                {t('cart.giftIncluded')}
              </h3>
              {promoData.gift_items.map((gift: any, idx: number) => (
                <div key={idx} className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 flex justify-between items-center mb-2">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-200 dark:bg-green-800 rounded flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-green-700 dark:text-green-300">featured_seasonal_and_gifts</span>
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-200 text-sm">{gift.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{t('cart.quantityLabel', { count: gift.quantity })}</p>
                      </div>
                   </div>
                   <div className="text-green-700 font-bold">{t('cart.freeGift')}</div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Summary Panel */}
        <div className="lg:w-96">
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-lg border border-primary/10 sticky top-28">
            <h3 className="text-xl font-bold mb-6">{t('checkout.orderSummary')}</h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('cart.subtotal', { count: items.length })}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 items-center">
                  <div className="flex items-center gap-2">
                    <span>{t('cart.discount')}</span>
                    <button onClick={handleRemoveCoupon} className="text-xs text-slate-400 hover:text-primary material-symbols-outlined" style={{fontSize: '14px'}}>close</button>
                  </div>
                  <span className="font-semibold text-green-600">-{discount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {appliedCoupon && couponLifecycle.total > 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{t('cart.couponsRemaining')}</span>
                  <span>{Number(couponLifecycle.remaining || 0).toLocaleString('vi-VN')} / {Number(couponLifecycle.total).toLocaleString('vi-VN')}</span>
                </div>
              )}
              {appliedCoupon && couponLifecycle.soldOut && (
                <div className="text-xs text-amber-600 font-semibold">{t('cart.couponUsedUp')}</div>
              )}
              {appliedCoupon && !couponLifecycle.soldOut && couponLifecycle.expired && (
                <div className="text-xs text-red-600 font-semibold">{t('cart.couponExpired')}</div>
              )}
              
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('cart.shippingFee')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{shippingFee === 0 ? t('cart.freeShipping') : `${shippingFee.toLocaleString('vi-VN')}đ`}</span>
              </div>
              {promoData && promoData.coupon_error && (
                <div className="text-xs text-red-500 font-medium mb-2">{promoData.coupon_error}</div>
              )}
              {promoData && promoData.promotions_applied?.map((p: any, i: number) => (
                <div key={i} className="flex justify-between text-green-600 font-medium">
                  <span>{p.title}</span>
                  <span>-{p.discount_amount.toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                <span className="text-lg font-bold">{t('cart.total')}</span>
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-primary">
                    {promoLoading ? '...' : total.toLocaleString('vi-VN') + 'đ'}
                  </p>
                  <p className="text-xs text-slate-400">{t('cart.taxIncluded')}</p>
                  {promoData?.points_earned > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-1">+ Tích {promoData.points_earned} L.Point</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full pl-4 pr-24 py-3 bg-primary/5 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder={t('cart.couponPlaceholder')}
                  type="text"
                />
                <button onClick={handleApplyCoupon} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
                  {t('cart.applyCoupon')}
                </button>
              </div>
              {couponError && <p className="text-xs text-primary">{couponError}</p>}
              {appliedCoupon && !couponError && (
                 <p className="text-xs text-green-600 font-bold">{t('cart.couponAppliedText', { code: appliedCoupon.code })}</p>
              )}

              {maintenanceMode && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 shrink-0">warning</span>
                  <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    {t('common.maintenanceWarning') || 'Hệ thống hiện đang bảo trì định kỳ. Quý khách tạm thời chưa thể tiến hành thanh toán hoặc đặt hàng mới. Xin lỗi vì sự bất tiện này.'}
                  </div>
                </div>
              )}

              {maintenanceMode ? (
                <button disabled className="w-full mt-4 py-4 bg-slate-400 dark:bg-slate-700 text-white font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">construction</span>
                  <span>{t('common.underMaintenance') || 'Hệ thống đang bảo trì'}</span>
                </button>
              ) : (
                <button onClick={handleCheckout} className="w-full mt-4 py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                  <span>{t('cart.checkoutBtn')}</span>
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <span className="material-symbols-outlined text-primary">local_shipping</span>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('cart.freeShippingFor')} <span className="text-primary font-bold">300.000đ</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Cart;