import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../store';
import { loadAddresses, addAddressThunk } from '../slices/addressSlice';
import { loadAllBranchCarts, selectCurrentBranchItems, removeCoupon } from '../slices/cartSlice';
import { verifySession } from '../slices/authSlice';
import { toast } from '../components/Toast/toastEvent';
import { dataService } from '../services/dataService';
import { promotionService } from '../services/promotionService';
import { authService } from '../services/authService';
import VoucherPickerDrawer from '../components/VoucherPicker/VoucherPickerDrawer';
import { normalizeVietnamPhone, validatePhone } from '../utils/validatePhone';
const safeParseNumber = (value: any, defaultVal = 0): number => {
  if (value === undefined || value === null || value === '') return defaultVal;
  if (typeof value === 'number') return isNaN(value) ? defaultVal : value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'miễn phí' || lower === 'free') return 0;
    const numericStr = value.replace(/[^\d]/g, '');
    const parsed = parseInt(numericStr, 10);
    return isNaN(parsed) ? defaultVal : parsed;
  }
  return defaultVal;
};

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

const Checkout: React.FC = () => {
  const { t } = useTranslation();
  const [selectedDelivery, setSelectedDelivery] = useState<'fast' | 'standard'>('fast');
  const { data: addresses } = useAppSelector(state => state.address);
  const { appliedCoupon } = useAppSelector(state => state.cart);
  const { user } = useAppSelector(state => state.auth);
  const currentUserId = user?._id || user?.id || null;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isQuickBuy = location.state?.isQuickBuy;
  const quickBuyItem = location.state?.quickBuyItem;
  const [settings, setSettings] = useState<any>({});
  const [promoData, setPromoData] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const activeCouponSnapshot = promoData?.coupon_applied || appliedCoupon;
  const couponLifecycle = getCouponLifecycle(activeCouponSnapshot);
  
  const { currentBranch } = useAppSelector(state => state.branch);
  const currentBranchId = currentBranch ? String(currentBranch.id || (currentBranch as any)?._id || '') : '';
  const cartItems = useAppSelector(state => selectCurrentBranchItems(state as any, String(currentBranchId)));

  // Address Modal States
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number | null>(null);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Voucher Picker States
  const [showVoucherPicker, setShowVoucherPicker] = useState(false);
  const [selectedProductVoucher, setSelectedProductVoucher] = useState<any | null>(null);
  const [selectedShippingVoucher, setSelectedShippingVoucher] = useState<any | null>(null);
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpStatusMessage, setOtpStatusMessage] = useState<string | null>(null);
  const [checkoutPhone, setCheckoutPhone] = useState(() => String(user?.phone || ''));
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSavingCheckoutPhone, setIsSavingCheckoutPhone] = useState(false);

  const [addressForm, setAddressForm] = useState({
    name: user?.full_name || user?.username || '',
    phone: user?.phone || '',
    city: '',
    district: '',
    ward: '',
    street: '',
    is_default: false
  });

  useEffect(() => {
    if (currentUserId) {
      dispatch(loadAddresses());
      dispatch(loadAllBranchCarts());
    }
    dataService.getAdminSettings().then(setSettings).catch(()=>console.error('Failed to load settings'));
  }, [currentUserId, dispatch]);

  // Sync selected address if not set
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  const currentAddress = addresses.find(a => String(a.id) === String(selectedAddressId)) || addresses.find(a => a.is_default) || addresses[0];
  
  const checkoutSource = isQuickBuy && quickBuyItem ? 'buy_now' : 'cart';
  const items = React.useMemo(() => {
    return isQuickBuy && quickBuyItem ? [quickBuyItem] : (cartItems || []);
  }, [isQuickBuy, quickBuyItem, cartItems]);

  // Debug log: checkout source and items
  React.useEffect(() => {
    console.log('[Checkout] source:', checkoutSource, 'isQuickBuy:', isQuickBuy, 'items:', items.length, items);
  }, [checkoutSource, isQuickBuy, items]);
  
  const subtotal = promoData ? promoData.original_total : items.reduce((sum, item) => {
    const price = safeParseNumber(item.unit_price) || safeParseNumber(item.price);
    const qty = safeParseNumber(item.quantity, 1);
    return sum + (price * qty);
  }, 0);
  
  const baseFastDelivery = safeParseNumber(settings?.default_shipping_fee, 25000);
  const freeThreshold = safeParseNumber(settings?.free_shipping_threshold, 0);
  // Shipping fee depends on the selected delivery method
  const selectedShippingFeeBase = selectedDelivery === 'standard' ? 0 : baseFastDelivery;
  const isFreeDelivery = promoData ? promoData.free_shipping_applied : (freeThreshold > 0 && subtotal >= freeThreshold);
  const shippingFee = promoData ? promoData.shipping_fee : (selectedDelivery === 'standard' || isFreeDelivery ? 0 : baseFastDelivery);
  
  let discount = promoData ? promoData.discount_amount : 0;
  if (!promoData && appliedCoupon) {
      const minOrderVal = safeParseNumber(appliedCoupon.min_order_value);
      if (subtotal >= minOrderVal) {
        if (appliedCoupon.discount_type === 'percent') {
          const pct = safeParseNumber(appliedCoupon.discount_value);
          const maxDiscount = appliedCoupon.max_discount_value ? safeParseNumber(appliedCoupon.max_discount_value) : Infinity;
          discount = Math.min((subtotal * pct) / 100, maxDiscount);
        } else {
          discount = safeParseNumber(appliedCoupon.discount_value);
        }
      }
  }

  const safeSubtotal = Number(subtotal) || 0;
  const safeShippingFee = Number(shippingFee) || 0;
  const safeDiscount = Number(discount) || 0;
  
  const vatRate = safeParseNumber(settings?.vat_rate, 0);
  const vatAmount = vatRate > 0 ? ((safeSubtotal - safeDiscount) * vatRate) / 100 : 0;
  const safeVatAmount = Number(vatAmount) || 0;

  const productVoucherDiscount = promoData?.product_voucher_discount || promoData?.breakdown?.product_voucher_discount || 0;
  const shippingVoucherDiscount = promoData?.shipping_voucher_discount || promoData?.breakdown?.shipping_voucher_discount || promoData?.shipping_voucher_applied?.discount_amount || 0;

  // Total: promoData.total already includes correct shipping fee from backend
  const total = promoData ? (promoData.total + safeVatAmount) : (safeSubtotal + safeShippingFee - safeDiscount + safeVatAmount);
  const safeTotal = Math.max(0, Number(total) || 0);

  const selectedVouchersStr = `${selectedProductVoucher?.id || selectedProductVoucher?._id || ''}-${selectedShippingVoucher?.id || selectedShippingVoucher?._id || ''}`;
  const itemsStr = JSON.stringify(items);
  useEffect(() => {
    if (!currentBranchId || items.length === 0) {
      setPromoData(null);
      return;
    }
    const fetchPromo = async () => {
      setPromoLoading(true);
      const mappedItems = items.map(i => ({
        _id: (i as any)._id,
        branch_product_id: i.branch_product_id || (i as any)._id,
        product_id: (i as any).branchProduct?.product?._id || (i as any).branchProduct?.product?.id || (i as any).product_id,
        category_id: (i as any).branchProduct?.product?.category_id || (i as any).category_id,
        quantity: i.quantity,
        price: i.unit_price || i.price || 0,
        name: (i as any).branchProduct?.product?.name || (i as any).product_name
      }));
      console.log('[Checkout] fetchPromo:', { selectedDelivery, selectedShippingFeeBase, productVoucher: selectedProductVoucher?.id || selectedProductVoucher?._id, shippingVoucher: selectedShippingVoucher?.id || selectedShippingVoucher?._id });
      const res = await promotionService.calculateCheckoutTotals(
        mappedItems,
        String(currentBranchId), 
        appliedCoupon?.code,
        selectedShippingFeeBase,
        selectedProductVoucher?.id || selectedProductVoucher?._id,
        selectedShippingVoucher?.id || selectedShippingVoucher?._id
      );
      if (res.success) {
        console.log('[Checkout] promoData result:', { total: res.data?.total, shipping_fee: res.data?.shipping_fee, free_shipping: res.data?.free_shipping_applied, product_voucher_discount: res.data?.product_voucher_discount, shipping_voucher_discount: res.data?.shipping_voucher_discount });
        setPromoData(res.data);
      }
      setPromoLoading(false);
    };
    fetchPromo();
  }, [itemsStr, currentBranchId, appliedCoupon, selectedVouchersStr, selectedDelivery, selectedShippingFeeBase]);

  useEffect(() => {
    if (promoData?.coupon_error && appliedCoupon) {
      toast.warning(`Mã giảm giá đã bị gỡ: ${promoData.coupon_error}`);
      dispatch(removeCoupon());
    }
    if (promoData?.product_voucher_error && selectedProductVoucher) {
      toast.warning(`Voucher giảm giá đã bị gỡ: ${promoData.product_voucher_error}`);
      setSelectedProductVoucher(null);
    }
    if (promoData?.shipping_voucher_error && selectedShippingVoucher) {
      toast.warning(`Voucher vận chuyển đã bị gỡ: ${promoData.shipping_voucher_error}`);
      setSelectedShippingVoucher(null);
    }
  }, [promoData?.coupon_error, promoData?.product_voucher_error, promoData?.shipping_voucher_error, appliedCoupon, selectedProductVoucher, selectedShippingVoucher, dispatch]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (!phoneTouched) {
      const nextPhone = currentAddress?.phone || user?.phone || '';
      setCheckoutPhone(nextPhone);
      setPhoneError(null);
    }
  }, [currentAddress, user?.phone, phoneTouched]);

  const normalizedCheckoutPhone = normalizeVietnamPhone(checkoutPhone || '');
  const isCheckoutPhoneValid = validatePhone(checkoutPhone || '');

  const handleCheckoutPhoneChange = (value: string) => {
    setPhoneTouched(true);
    setCheckoutPhone(value);
    if (!value.trim()) {
      setPhoneError('Vui lòng nhập số điện thoại để đặt hàng');
      return;
    }
    if (!validatePhone(value)) {
      setPhoneError('Số điện thoại Việt Nam không hợp lệ');
      return;
    }
    setPhoneError(null);
  };

  const ensureCheckoutPhonePersisted = async (): Promise<boolean> => {
    if (!isCheckoutPhoneValid) return false;

    const currentPhoneNormalized = normalizeVietnamPhone(String(user?.phone || ''));
    const hasValidStoredPhone = validatePhone(currentPhoneNormalized);
    const hasPhoneChanged = currentPhoneNormalized !== normalizedCheckoutPhone;

    if (hasValidStoredPhone && !hasPhoneChanged) {
      return true;
    }

    try {
      setIsSavingCheckoutPhone(true);
      await authService.updateMyPhone(normalizedCheckoutPhone);
      await dispatch(verifySession() as any);
      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể cập nhật số điện thoại';
      setPhoneError(message);
      toast.error(message);
      return false;
    } finally {
      setIsSavingCheckoutPhone(false);
    }
  };

  const checkStockAndValidation = () => {
    if (!currentBranchId) {
      toast.error('Vui lòng chọn chi nhánh trước khi thanh toán');
      return false;
    }

    if (!Array.isArray(items) || items.length === 0) {
      if (checkoutSource === 'buy_now') {
        toast.error('Không tìm thấy sản phẩm mua ngay. Vui lòng chọn lại.');
      } else {
        toast.error('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
      }
      return false;
    }

    if (!currentAddress) {
      toast.error('Vui lòng thêm địa chỉ nhận hàng trước khi thanh toán');
      return false;
    }

    if (!checkoutPhone.trim()) {
      setPhoneTouched(true);
      setPhoneError('Vui lòng nhập số điện thoại để đặt hàng');
      toast.error('Vui lòng nhập số điện thoại để đặt hàng');
      return false;
    }

    if (!isCheckoutPhoneValid) {
      setPhoneTouched(true);
      setPhoneError('Số điện thoại Việt Nam không hợp lệ');
      toast.error('Số điện thoại Việt Nam không hợp lệ');
      return false;
    }

    const hasInvalidItem = items.some((item: any) => {
      const quantity = safeParseNumber(item?.quantity, 0);
      const branchProductId = item?.branch_product_id || item?.branchProduct?.id || item?.branchProduct?._id;
      const productId = item?.branchProduct?.product?._id || item?.branchProduct?.product?.id || item?.product_id;
      return !branchProductId || !productId || quantity <= 0;
    });

    if (hasInvalidItem) {
      toast.error('Đơn hàng có sản phẩm không hợp lệ. Vui lòng kiểm tra lại.');
      return false;
    }

    const hasUnavailableItem = items.some((item: any) => {
      const bp = item?.branchProduct;
      const qty = safeParseNumber(item?.quantity, 0);
      if (!bp || bp.is_available === false || !bp.product || bp.product.is_active === false) return true;
      
      const bpAvailableQty = bp.available_quantity !== undefined 
        ? bp.available_quantity 
        : Math.max(0, bp.stock - (bp.reserved_quantity || 0));
        
      return bpAvailableQty < qty;
    });

    if (hasUnavailableItem) {
      toast.error('Có sản phẩm đã hết hàng hoặc không đủ số lượng tồn kho tại chi nhánh hiện tại.');
      return false;
    }

    return true;
  };

  const handleProceedToPayment = () => {
    const proceed = async () => {
      if (!checkStockAndValidation()) return;

      const savedPhone = await ensureCheckoutPhonePersisted();
      if (!savedPhone) return;

      if (!user?.email || user?.email_verified !== true) {
        setVerificationEmail(String(user?.email || ''));
        setVerificationOtp('');
        setOtpRequested(false);
        setOtpCooldown(0);
        setOtpStatusMessage(null);
        setShowEmailVerifyModal(true);
        toast.warning('Vui lòng xác thực email trước khi thanh toán');
        return;
      }

      if (!currentAddress) {
        toast.error('Vui lòng thêm địa chỉ nhận hàng trước khi thanh toán');
        setShowAddressForm(true);
        return;
      }
      console.log('[Checkout] Proceeding to payment:', { source: checkoutSource, total: safeTotal, itemsCount: items.length });
      const paymentState = {
        total: safeTotal,
        deliveryFee: safeShippingFee,
        discount: safeDiscount,
        selectedDelivery,
        addressId: currentAddress.id,
        isQuickBuy,
        quickBuyItem,
        promoData,
        couponCode: appliedCoupon?.code,
        source: checkoutSource
      };
      sessionStorage.setItem('lotte_checkout_payment_state', JSON.stringify(paymentState));
      navigate('/payment', { state: paymentState });
    };

    proceed();
  };

  const handleRequestEmailOtp = async () => {
    const email = verificationEmail.trim();
    if (!email) {
      toast.error('Vui lòng nhập email để nhận OTP');
      return;
    }

    setIsSendingOtp(true);
    setOtpStatusMessage(null);
    try {
      const result = otpRequested
        ? await authService.resendEmailOtp(email)
        : await authService.requestEmailOtp(email);
      const cooldown = Math.max(0, Number(result?.retry_after || 60));
      setOtpRequested(true);
      setOtpCooldown(cooldown);
      setOtpStatusMessage(result?.message || 'OTP đã được gửi tới email của bạn');
      toast.success(result?.message || 'OTP đã được gửi tới email của bạn');
    } catch (err: any) {
      const retryAfter = Number(err?.response?.data?.retry_after || 0);
      if (retryAfter > 0) {
        setOtpCooldown(retryAfter);
      }
      const message = err?.response?.data?.message || err?.message || 'Không thể gửi OTP';
      setOtpStatusMessage(message);
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const email = verificationEmail.trim();
    const otp = verificationOtp.trim();
    if (!email || !otp) {
      toast.error('Vui lòng nhập đầy đủ email và OTP');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await authService.verifyEmailOtp({ email, otp });
      await dispatch(verifySession() as any);
      setShowEmailVerifyModal(false);
      setOtpStatusMessage(null);
      toast.success('Xác thực email thành công, bạn có thể tiếp tục thanh toán');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'OTP không hợp lệ hoặc đã hết hạn';
      setOtpStatusMessage(message);
      toast.error(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.phone || !addressForm.city || !addressForm.district || !addressForm.ward || !addressForm.street) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    if (!validatePhone(addressForm.phone)) {
        toast.error('Số điện thoại không đúng định dạng');
        return;
    }
    const isSimilar = addresses.some(a => 
       a.street?.toLowerCase() === addressForm.street.toLowerCase() && 
       a.ward?.toLowerCase() === addressForm.ward.toLowerCase()
    );
    if (isSimilar) {
       // Just a warning, proceed anyway but notify
       toast.warning('Địa chỉ này khá giống với một địa chỉ bạn đã lưu');
    }

    setIsSubmittingAddress(true);
    try {
      const payload = { ...addressForm, phone: normalizeVietnamPhone(addressForm.phone), user_id: currentUserId };
        const resultAction = await dispatch(addAddressThunk(payload));
        if (addAddressThunk.fulfilled.match(resultAction)) {
            toast.success('Thêm địa chỉ thành công!');
            setSelectedAddressId(resultAction.payload.id);
            setShowAddressForm(false);
            if (showAddressPicker) setShowAddressPicker(false);
            setAddressForm({ ...addressForm, street: '', city: '', district: '', ward: '' }); // reset some fields
        } else {
            toast.error('Lỗi khi lưu địa chỉ');
        }
    } catch {
        toast.error('Lỗi kết nối khi lưu địa chỉ');
    } finally {
        setIsSubmittingAddress(false);
    }
  };

  if (settings?.maintenance_mode) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center bg-background-light dark:bg-background-dark font-display flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/20 dark:to-orange-950/20 p-8 rounded-3xl border border-orange-200 dark:border-orange-900 max-w-lg shadow-xl shadow-orange-500/5">
          <span className="material-symbols-outlined text-6xl text-orange-500 mb-4 animate-bounce">construction</span>
          <h2 className="text-2xl font-black mb-4 text-orange-950 dark:text-orange-300 uppercase tracking-wide">
            {t('common.maintenanceTitle') || 'Hệ Thống Đang Bảo Trì'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-sm">
            {t('common.maintenanceMessage') || 'Để đảm bảo trải nghiệm tốt nhất và nâng cấp hệ thống, Lotte Mart Storefront hiện đang tạm dừng nhận đơn hàng. Chúng tôi sẽ trở lại trong thời gian sớm nhất.'}
          </p>
          <button onClick={() => navigate('/home')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
            {t('common.backToHome') || 'Về Trang Chủ'}
          </button>
        </div>
      </main>
    );
  }

  if (items.length === 0 && checkoutSource !== 'buy_now') {
    return (
      <div className="max-w-300 mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
        <p className="text-slate-500 mb-6">Bạn chưa chọn sản phẩm nào để thanh toán.</p>
        <button onClick={() => navigate('/products')} className="bg-primary text-white px-6 py-2 rounded">Tiếp tục mua sắm</button>
      </div>
    );
  }

  if (items.length === 0 && checkoutSource === 'buy_now') {
    return (
      <div className="max-w-300 mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Không tìm thấy sản phẩm</h2>
        <p className="text-slate-500 mb-6">Phiên mua ngay đã hết hạn. Vui lòng chọn lại sản phẩm.</p>
        <button onClick={() => navigate('/products')} className="bg-primary text-white px-6 py-2 rounded">Tiếp tục mua sắm</button>
      </div>
    );
  }

  return (
    <div className="max-w-300 mx-auto pb-32 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased relative">
      <main className="px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Address Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span>
                {t('checkout.shippingAddress', 'Địa chỉ nhận hàng')}
              </h2>
            </div>
            {currentAddress ? (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col md:flex-row gap-4 items-start relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="grow space-y-1 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{currentAddress.name}</span>
                    <span className="text-slate-500 font-medium">({currentAddress.phone})</span>
                    {currentAddress.is_default && <span className="text-primary text-xs font-semibold px-2 py-0.5 bg-primary/10 rounded-full">Mặc định</span>}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mt-2">
                    {currentAddress.street}, {currentAddress.ward}, {currentAddress.district}, {currentAddress.city}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <button onClick={() => setShowAddressPicker(true)} className="text-slate-700 dark:text-slate-300 font-bold text-sm px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition w-full">
                    Sổ địa chỉ
                  </button>
                  <button onClick={() => setShowAddressForm(true)} className="text-primary font-bold text-sm px-4 py-2 border border-primary/30 rounded-lg hover:bg-primary/5 transition w-full">
                    + Thêm địa chỉ mới
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-xl text-center border-2 border-dashed border-primary/30">
                <p className="text-slate-500 mb-4">Bạn chưa có địa chỉ nhận hàng nào</p>
                <button onClick={() => setShowAddressForm(true)} className="btn-primary">
                  + Thêm địa chỉ mới
                </button>
              </div>
            )}
          </section>

          {/* Delivery Section */}
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">local_shipping</span>
              {t('checkout.deliveryMethod', 'Phương thức giao hàng')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex items-center gap-4 p-4 ${selectedDelivery === 'fast' ? 'bg-white dark:bg-slate-800 border-2 border-primary' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'} rounded-xl cursor-pointer`}>
                <input checked={selectedDelivery === 'fast'} onChange={() => setSelectedDelivery('fast')} className="h-5 w-5 text-primary border-primary focus:ring-primary radio-dot" name="delivery" type="radio" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">Giao nhanh 2h</span>
                  <span className="text-sm text-slate-500">Nhận trước 14:00 hôm nay</span>
                  <span className="text-sm font-bold text-primary mt-1">{isFreeDelivery ? 'Miễn phí' : `${baseFastDelivery.toLocaleString('vi-VN')}đ`}</span>
                </div>
                {selectedDelivery === 'fast' && <span className="absolute top-2 right-2 material-symbols-outlined text-primary">check_circle</span>}
              </label>

              <label className={`relative flex items-center gap-4 p-4 ${selectedDelivery === 'standard' ? 'bg-white dark:bg-slate-800 border-2 border-primary' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'} rounded-xl cursor-pointer`}>
                <input checked={selectedDelivery === 'standard'} onChange={() => setSelectedDelivery('standard')} className="h-5 w-5 text-primary border-slate-300 focus:ring-primary radio-dot" name="delivery" type="radio" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">Giao tiêu chuẩn</span>
                  <span className="text-sm text-slate-500">Nhận trong ngày mai</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">Miễn phí</span>
                </div>
                {selectedDelivery === 'standard' && <span className="absolute top-2 right-2 material-symbols-outlined text-primary">check_circle</span>}
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">call</span>
              {t('checkout.phone', 'Số điện thoại đặt hàng')}
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-primary/10 p-4 space-y-2">
              <label htmlFor="checkout-phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Vui lòng nhập số điện thoại để đặt hàng
              </label>
              <input
                id="checkout-phone"
                type="tel"
                value={checkoutPhone}
                onChange={(e) => handleCheckoutPhoneChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 ${phoneError ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-primary/20 focus:border-primary'}`}
                placeholder="0xxxxxxxxx"
              />
              {phoneError ? (
                <p className="text-xs text-red-500">{phoneError}</p>
              ) : (
                <p className="text-xs text-slate-500">
                  Dùng số di động Việt Nam, ví dụ: 09xxxxxxxx hoặc 03xxxxxxxx.
                </p>
              )}
            </div>
          </section>

          {/* Voucher Section */}
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">confirmation_number</span>
              {t('checkout.couponCode', 'Mã giảm giá')}
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-primary/10 p-4 space-y-3">
              {/* Selected vouchers preview */}
              {selectedProductVoucher && (
                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-lotteRed">card_giftcard</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{selectedProductVoucher.title || selectedProductVoucher.code}</p>
                      <p className="text-xs text-green-600 font-bold">-{Math.round(productVoucherDiscount).toLocaleString('vi-VN')}đ</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProductVoucher(null)} className="text-gray-400 hover:text-red-500 transition cursor-pointer">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
              {selectedShippingVoucher && (
                <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-900/10 p-3 rounded-lg border border-teal-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-teal-500">local_shipping</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{selectedShippingVoucher.title || selectedShippingVoucher.code}</p>
                      <p className="text-xs text-green-600 font-bold">-{Math.round(shippingVoucherDiscount).toLocaleString('vi-VN')}đ</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedShippingVoucher(null)} className="text-gray-400 hover:text-red-500 transition cursor-pointer">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Open picker button */}
              <button
                onClick={() => setShowVoucherPicker(true)}
                className="w-full py-3 border-2 border-dashed border-primary/30 text-primary font-bold rounded-xl hover:bg-primary/5 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span className="material-symbols-outlined">sell</span>
                {selectedProductVoucher || selectedShippingVoucher ? 'Thay đổi voucher' : 'Chọn voucher từ ví'}
              </button>
            </div>
          </section>

          {/* Items Section */}
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              {t('checkout.orderReview', 'Kiểm tra đơn hàng')} ({items.length})
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-primary/10 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              {items.map((item) => {
                const bp = item.branchProduct;
                const bpAvailableQty = bp 
                  ? (bp.available_quantity !== undefined 
                      ? bp.available_quantity 
                      : Math.max(0, bp.stock - (bp.reserved_quantity || 0)))
                  : 0;
                const isOutOfStock = bp && bpAvailableQty < Number(item.quantity);
                const isInactive = !bp || bp.is_available === false || !bp.product || bp.product.is_active === false;
                
                const productName = bp?.product?.name || item.product_name || 'Sản phẩm không rõ';
                const productImage = bp?.product?.images?.[0] || item.product_image || 'https://via.placeholder.com/150';
                const promoItem = promoData?.items?.find((i: any) => String(i.branch_product_id) === String(item.branch_product_id));

                return (
                  <div key={item.branch_product_id} className={`p-4 flex gap-4 items-center ${(isOutOfStock || isInactive) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <img
                      className={`w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 ${(isOutOfStock || isInactive) ? 'grayscale opacity-50' : ''}`}
                      src={productImage}
                      alt={productName}
                    />
                    <div className="grow min-w-0 w-full">
                      <h4 className={`font-medium truncate ${isOutOfStock || isInactive ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{productName}</h4>
                      <div className="flex flex-col gap-0.5 mt-1 mb-1">
                        <p className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded w-max">
                          SKU: {bp?.sku || bp?.product?.sku || (item as any).sku || 'N/A'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium truncate" title={bp?.supplier_name || bp?.product?.supplier_name || (item as any).supplier_name || 'N/A'}>
                          <span className="font-bold">Danh mục:</span> {bp?.category_name || bp?.product?.category_name || (item as any).category_name || 'N/A'}
                          <span className="mx-2 text-slate-300">|</span> 
                          <span className="font-bold">NCC:</span> {bp?.supplier_name || bp?.product?.supplier_name || (item as any).supplier_name || 'N/A'}
                        </p>
                        {(bp?.expiry_date || (item as any)?.expiry_date) && (
                          <p className={`text-[11px] font-bold mt-0.5 ${bp?.is_expired ? 'text-red-500' : bp?.is_expiring_soon ? 'text-orange-500' : 'text-slate-500'}`}>
                            HSD: {new Date(bp?.expiry_date || (item as any)?.expiry_date).toLocaleDateString('vi-VN')}
                            {bp?.is_expired ? ' (ĐÃ HẾT HẠN)' : bp?.is_expiring_soon ? ' (CẬN DATE)' : ''}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        SL: {safeParseNumber(item.quantity, 1)}
                        {isOutOfStock && <span className="ml-2 text-red-500 font-bold text-xs bg-red-100 px-2 py-0.5 rounded">Vượt Tồn: {bpAvailableQty}</span>}
                        {isInactive && <span className="ml-2 text-red-500 font-bold text-xs bg-red-100 px-2 py-0.5 rounded">Ngừng kinh doanh</span>}
                      </p>
                      {promoItem && promoItem.applied_promotion && (
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded mt-1">
                          {promoItem.applied_promotion.title}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold ${(isOutOfStock || isInactive) ? 'text-slate-400' : ''}`}>
                        {promoItem ? Number(promoItem.total_price ?? 0).toLocaleString('vi-VN') : ((safeParseNumber(item.unit_price) || safeParseNumber(item.price)) * safeParseNumber(item.quantity, 1)).toLocaleString('vi-VN')}đ
                      </p>
                      {promoItem && promoItem.discount_amount > 0 && (
                        <p className="text-xs text-slate-400 line-through">
                          {((safeParseNumber(item.unit_price) || safeParseNumber(item.price)) * safeParseNumber(item.quantity, 1)).toLocaleString('vi-VN')}đ
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              {promoData?.gift_items?.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border-t border-green-100 dark:border-green-800">
                   <h3 className="font-bold text-green-800 dark:text-green-400 text-sm mb-2 flex items-center gap-1">
                     <span className="material-symbols-outlined text-base">redeem</span> Quà tặng đi kèm
                   </h3>
                   {promoData.gift_items.map((gift: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-green-200/50 last:border-0">
                         <span className="text-green-700">{gift.name} {gift.quantity > 1 ? `x${gift.quantity}` : ''}</span>
                         <span className="font-bold text-green-600">Miễn phí</span>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column / Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-primary/10 shadow-lg">
              <h3 className="font-bold text-lg mb-4 border-b border-slate-100 pb-2">{t('checkout.paymentDetails', 'Chi tiết thanh toán')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tạm tính ({items.length} món)</span>
                  <span>{safeSubtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Phí vận chuyển</span>
                  <span>{selectedShippingFeeBase === 0 ? 'Miễn phí' : `${selectedShippingFeeBase.toLocaleString('vi-VN')}đ`}</span>
                </div>
                {promoData?.promotions_applied?.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-green-600 font-medium">
                    <span>{p.title}</span>
                    <span>-{Number(p.discount_amount ?? 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
                
                {promoData?.coupon_applied && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Giảm giá mã ({promoData.coupon_applied.code})</span>
                    <span>-{Number(promoData.coupon_applied.discount_amount ?? 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                
                {!promoData && appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Giảm giá mã ({appliedCoupon.code})</span>
                    <span>-{safeDiscount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {activeCouponSnapshot && couponLifecycle.total > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Lượt mã còn lại</span>
                    <span>{Number(couponLifecycle.remaining || 0).toLocaleString('vi-VN')} / {Number(couponLifecycle.total).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                {activeCouponSnapshot && couponLifecycle.soldOut && (
                  <div className="text-xs text-amber-600 font-semibold">Mã giảm giá đã hết lượt sử dụng.</div>
                )}
                {activeCouponSnapshot && !couponLifecycle.soldOut && couponLifecycle.expired && (
                  <div className="text-xs text-red-600 font-semibold">Mã giảm giá đã hết hạn.</div>
                )}
                {promoData?.coupon_error && (
                  <div className="text-xs text-red-600 font-semibold">{promoData.coupon_error}</div>
                )}
                {productVoucherDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">card_giftcard</span>Voucher giảm giá</span>
                    <span>-{Math.round(productVoucherDiscount).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {promoData?.product_voucher_error && (
                  <div className="text-xs text-red-600 font-semibold mb-2">{promoData.product_voucher_error}</div>
                )}
                {shippingVoucherDiscount > 0 && (
                  <div className="flex justify-between text-teal-600 font-medium">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">local_shipping</span>Voucher vận chuyển</span>
                    <span>-{Math.round(shippingVoucherDiscount).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {promoData?.shipping_voucher_error && (
                  <div className="text-xs text-red-600 font-semibold mb-2">{promoData.shipping_voucher_error}</div>
                )}
                {safeVatAmount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>VAT ({vatRate}%)</span>
                    <span>+{safeVatAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                  <span className="font-bold text-slate-900 dark:text-white">Tổng cộng</span>
                  <div className="text-right">
                    <p className="text-3xl font-black text-primary leading-none">
                      {promoLoading ? '...' : safeTotal.toLocaleString('vi-VN') + 'đ'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">(Đã bao gồm tất cả phụ phí)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">support_agent</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t('support.checkoutHelpTitle')}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('support.checkoutHelpDesc')}</p>
                  <div className="text-xs text-slate-600 mt-2">
                    <div>📞 {settings?.support_phone || '1800 599 907'}</div>
                    <div>✉️ {settings?.support_email || 'cskh@lottemart.vn'}</div>
                  </div>
                  <Link to="/account/support" className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3">
                    {t('support.checkoutHelpCta')}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Desktop primary button */}
            <button
              onClick={handleProceedToPayment}
              disabled={!isCheckoutPhoneValid || isSavingCheckoutPhone}
              className="hidden md:flex w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">payments</span>
              {isSavingCheckoutPhone ? 'ĐANG LƯU SỐ ĐIỆN THOẠI...' : 'CHỌN PHƯƠNG THỨC THANH TOÁN'}
            </button>
          </div>
        </div>
      </main>

      {/* Sticky Mobile Checkout Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 z-90 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] text-center sm:text-left flex items-center justify-between">
        <div className="hidden sm:block">
          <p className="text-xs text-slate-500 uppercase font-bold">Tổng thanh toán</p>
          <p className="text-xl font-bold text-primary leading-none">{safeTotal.toLocaleString('vi-VN')}đ</p>
        </div>
        <button
          onClick={handleProceedToPayment}
          disabled={!isCheckoutPhoneValid || isSavingCheckoutPhone}
          className="grow sm:flex-initial h-14 bg-primary text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">payments</span>
          {isSavingCheckoutPhone ? 'Đang lưu số điện thoại...' : 'Khách thanh toán'}
        </button>
      </div>

      {/* Modals */}
      
      {/* 1. Address Picker Modal */}
      {showAddressPicker && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95">
              <button onClick={() => setShowAddressPicker(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition">
                 <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-bold mb-6">Chọn địa chỉ giao hàng</h2>
              
              <div className="max-h-[60vh] overflow-y-auto space-y-3 mb-6 pr-2">
                 {addresses.map(addr => (
                    <label key={addr.id} className={`flex gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                       <input 
                         type="radio" 
                         name="address_select" 
                         checked={selectedAddressId === addr.id}
                         onChange={() => setSelectedAddressId(addr.id)}
                         className="mt-1 w-5 h-5 text-primary focus:ring-primary" 
                       />
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <p className="font-bold text-slate-900">{addr.name}</p>
                           <p className="text-slate-500 text-sm">{addr.phone}</p>
                           {addr.is_default && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-bold tracking-wider">Mặc định</span>}
                         </div>
                         <p className="text-sm text-slate-600">{addr.street}, {addr.ward}</p>
                         <p className="text-sm text-slate-600">{addr.district}, {addr.city}</p>
                       </div>
                    </label>
                 ))}
              </div>
              
              <button onClick={() => { setShowAddressForm(true); setShowAddressPicker(false); }} className="w-full py-3 border-2 border-dashed border-primary/40 text-primary font-bold rounded-xl hover:bg-primary/5 flex items-center justify-center gap-2">
                 <span className="material-symbols-outlined">add</span> Thêm địa chỉ mới
              </button>
           </div>
        </div>
      )}

      {/* 2. Address Form Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 z-210 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl p-6 relative shadow-2xl animate-in zoom-in-95">
              <button 
                 onClick={() => { setShowAddressForm(false); if(addresses.length>0) setShowAddressPicker(true); }} 
                 className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                 <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-bold mb-6">Thêm địa chỉ giao hàng mới</h2>
              
              <form onSubmit={handleSaveAddress} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                       <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên *</label>
                       <input autoFocus type="text" value={addressForm.name} onChange={e => setAddressForm({...addressForm, name: e.target.value})} className="form-input w-full rounded-xl border-slate-300 focus:border-primary focus:ring focus:ring-primary/20" placeholder="Nhập họ tên" required />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                       <label className="block text-sm font-bold text-slate-700 mb-1">Số điện thoại *</label>
                       <input type="tel" value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} className="form-input w-full rounded-xl border-slate-300 focus:border-primary focus:ring focus:ring-primary/20" placeholder="Nhập SĐT nhận hàng" required />
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Tỉnh / Thành phố *</label>
                       <input type="text" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="form-input w-full rounded-xl border-slate-300 focus:border-primary focus:ring focus:ring-primary/20" placeholder="VD: TP. Hồ Chí Minh" required />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Quận / Huyện *</label>
                       <input type="text" value={addressForm.district} onChange={e => setAddressForm({...addressForm, district: e.target.value})} className="form-input w-full rounded-xl border-slate-300 focus:border-primary focus:ring focus:ring-primary/20" placeholder="VD: Quận 1" required />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Phường / Xã *</label>
                       <input type="text" value={addressForm.ward} onChange={e => setAddressForm({...addressForm, ward: e.target.value})} className="form-input w-full rounded-xl border-slate-300 focus:border-primary focus:ring focus:ring-primary/20" placeholder="VD: Phường Bến Nghé" required />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Địa chỉ cụ thể (Số nhà, Ngõ/Hẻm, Tên đường) *</label>
                    <textarea value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="form-input w-full rounded-xl border-slate-300 focus:border-primary focus:ring focus:ring-primary/20 min-h-20" placeholder="Nhập địa chỉ nhận hàng" required></textarea>
                 </div>

                 <label className="flex items-center gap-2 cursor-pointer mt-2 w-max">
                   <input type="checkbox" checked={addressForm.is_default} onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})} className="rounded text-primary focus:ring-primary h-5 w-5 bg-slate-100 border-slate-300" />
                   <span className="text-sm font-bold text-slate-700">Đặt làm địa chỉ mặc định</span>
                 </label>

                 <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowAddressForm(false); if(addresses.length>0) setShowAddressPicker(true); }} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">Hủy</button>
                    <button type="submit" disabled={isSubmittingAddress} className="px-8 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex gap-2 items-center">
                      {isSubmittingAddress ? <span className="material-symbols-outlined animate-spin">autorenew</span> : <span className="material-symbols-outlined">save</span>}
                      {isSubmittingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Voucher Picker Drawer */}
      <VoucherPickerDrawer
        isOpen={showVoucherPicker}
        onClose={() => setShowVoucherPicker(false)}
        subtotal={safeSubtotal}
        currentShippingFee={safeShippingFee}
        selectedProductVoucher={selectedProductVoucher}
        selectedShippingVoucher={selectedShippingVoucher}
        onSelectProductVoucher={setSelectedProductVoucher}
        onSelectShippingVoucher={setSelectedShippingVoucher}
      />

      {showEmailVerifyModal && (
        <div className="fixed inset-0 z-220 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setShowEmailVerifyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-xl font-bold mb-2">Xác thực email trước khi thanh toán</h2>
            <p className="text-sm text-slate-500 mb-5">Tài khoản của bạn chưa xác thực email. Vui lòng nhập email và OTP để tiếp tục.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="example@gmail.com"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationOtp}
                  onChange={(e) => setVerificationOtp(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nhập OTP 6 số"
                />
                <button
                  type="button"
                  onClick={handleRequestEmailOtp}
                  disabled={isSendingOtp || otpCooldown > 0}
                  className="px-3 py-2 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 disabled:opacity-60"
                >
                  {isSendingOtp
                    ? 'Đang gửi...'
                    : otpCooldown > 0
                      ? `Gửi lại sau ${otpCooldown}s`
                      : otpRequested
                        ? 'Gửi lại OTP'
                        : 'Gửi OTP'}
                </button>
              </div>

              {otpStatusMessage && (
                <p className="text-xs text-slate-500">{otpStatusMessage}</p>
              )}

              <button
                type="button"
                onClick={handleVerifyEmailOtp}
                disabled={isVerifyingOtp}
                className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60"
              >
                {isVerifyingOtp ? 'Đang xác thực...' : 'Xác thực và tiếp tục'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;