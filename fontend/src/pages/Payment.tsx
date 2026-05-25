import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { createOrder } from '../slices/orderSlice';
import { clearCart, selectCurrentBranchItems } from '../slices/cartSlice';
import { verifySession } from '../slices/authSlice';
import { loadLoyaltyTransactions } from '../slices/loyaltySlice';
import { paymentService } from '../services/paymentService';
import { orderService } from '../services/orderService';
import { toast } from '../components/Toast/toastEvent';
import type { Order } from '../types';

const formatMoney = (value?: number | null) => Number(value ?? 0).toLocaleString('vi-VN');

const Payment: React.FC = () => {
  const { t } = useTranslation();
  const [selectedMethodId, setSelectedMethodId] = useState<string>('cod');
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'processing' | 'paid' | 'failed'>('idle');
  const [countdown, setCountdown] = useState<number>(0);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  const { data: addresses } = useAppSelector(state => state.address);
  const { currentBranch } = useAppSelector(state => state.branch);

  // Get checkout details from navigation state
  const { total, deliveryFee, discount, selectedDelivery, addressId, promoData, isQuickBuy, quickBuyItem, source: checkoutSource } = location.state || {
    total: 0, deliveryFee: 0, discount: 0, selectedDelivery: 'standard', addressId: 0, promoData: null, isQuickBuy: false, quickBuyItem: null, source: 'cart'
  };

  console.log('[Payment] Init — source:', checkoutSource, 'isQuickBuy:', isQuickBuy, 'quickBuyItem:', quickBuyItem);

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

  const currentBranchId = currentBranch
    ? String(currentBranch.id || (currentBranch as any)?._id || '')
    : getSavedBranchId();
  const rawCartItems = useAppSelector(state => selectCurrentBranchItems(state as any, currentBranchId));
  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : [];
  const checkoutItems = (isQuickBuy && quickBuyItem) ? [quickBuyItem] : cartItems;
  const address = addresses.find(a => String(a.id) === String(addressId));

  useEffect(() => {
    if (currentUser?.id) {
      paymentService.listMethods(Number(currentUser.id)).then(methods => {
        const safeMethods = methods || [];
        setSavedMethods(safeMethods);
        const defaultMethod = safeMethods.find(m => m.is_default);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        } else if (safeMethods.length > 0) {
          setSelectedMethodId(safeMethods[0].id);
        }
      });
    }
  }, [currentUser?.id]);

  // Countdown timer for QR expiry (15 minutes)
  useEffect(() => {
    if (!pendingPayment) {
      setCountdown(0);
      return;
    }

    const expiredAt = pendingPayment.transaction?.expired_at;
    if (!expiredAt) {
      setCountdown(15 * 60); // default 15 min
    }

    const updateCountdown = () => {
      const remaining = expiredAt
        ? Math.max(0, Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000))
        : 0;
      setCountdown(remaining);

      if (remaining <= 0) {
        setPaymentStatus('failed');
        toast.error('Phiên thanh toán đã hết hạn. Vui lòng thử lại.');
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [pendingPayment]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t('payment.copied')}`);
  };

  const handleConfirmPayment = async () => {
    if (!location.state) {
      toast.error('Thiếu thông tin đơn hàng. Vui lòng quay lại bước thanh toán.');
      return;
    }

    if (!currentUser) {
      toast.error("Bạn chưa đăng nhập. Vui lòng đăng nhập để thanh toán.");
      return;
    }

    if (!currentUser?.email || currentUser?.email_verified !== true) {
      toast.error('Vui lòng xác thực email trước khi thanh toán.');
      navigate('/checkout');
      return;
    }

    if (!checkoutItems || checkoutItems.length === 0) {
      if (checkoutSource === 'buy_now') {
        toast.error("Không tìm thấy sản phẩm mua ngay. Vui lòng quay lại chọn sản phẩm.");
      } else {
        toast.error("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.");
      }
      return;
    }

    if (!address) {
      toast.error("Vui lòng chọn địa chỉ giao hàng trước khi thanh toán.");
      return;
    }

    if (!selectedDelivery || !addressId || !Number.isFinite(Number(total)) || Number(total) <= 0) {
      toast.error('Thông tin đơn hàng không hợp lệ. Vui lòng kiểm tra lại giỏ hàng.');
      return;
    }

    if (!currentBranchId) {
      toast.error("Vui lòng chọn chi nhánh trước khi thanh toán.");
      return;
    }

    const validCartItems = checkoutItems.filter((item: any) => {
      const branchProductId = item?.branch_product_id || item?.branchProduct?.id || item?.branchProduct?._id;
      const productId = item?.branchProduct?.product?._id || item?.branchProduct?.product?.id || item?.product_id;
      return !!branchProductId && !!productId && Number(item?.quantity || 0) > 0;
    });

    if (validCartItems.length === 0) {
      toast.error('Giỏ hàng không hợp lệ. Vui lòng kiểm tra lại sản phẩm trước khi thanh toán.');
      return;
    }

    // Verify saved method rule for bank transfers
    if (selectedMethodId === 'qr_transfer' && savedMethods.length === 0) {
      toast.error(t('payment.noSavedMethodsMessage'));
      navigate('/account/payments');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    let createdOrder: Order | null = null;
    const selectedBranchId = currentBranchId;

    try {
      const subtotal = promoData?.original_total ?? (total - deliveryFee + discount);
      const shippingFee = promoData?.shipping_fee ?? deliveryFee;
      const discountAmount = promoData?.discount_amount ?? discount;
      const finalTotal = promoData?.final_total ?? promoData?.total ?? total;

      const fullAddressParts = [address?.street, address?.ward, address?.district, address?.city].filter(Boolean);
      const fullAddress = fullAddressParts.join(', ');
      const branchName = currentBranch?.name || '';

      const orderPayload = {
        user_id: Number(currentUser?.id) || Number(currentUser?._id) || 1,
        branch_id: selectedBranchId || 'ALL',
        branch_name: branchName,
        subtotal: Number(subtotal) || 0,
        shipping_fee: Number(shippingFee) || 0,
        discount_amount: Number(discountAmount) || 0,
        total_amount: Number(finalTotal) || 0,
        points_earned: Number(promoData?.points_earned) || 0,
        item_discounts: Number(promoData?.item_discounts) || 0,
        promotion_discount: Number(promoData?.promotion_discount) || 0,
        coupon_discount: Number(promoData?.coupon_discount) || 0,
        free_shipping_applied: !!promoData?.free_shipping_applied,
        pricing_breakdown: promoData?.breakdown || {
          subtotal,
          item_discounts: promoData?.item_discounts || 0,
          promotion_discount: promoData?.promotion_discount || 0,
          coupon_discount: promoData?.coupon_discount || 0,
          shipping_fee: shippingFee,
          free_shipping_applied: !!promoData?.free_shipping_applied,
          points_earned: promoData?.points_earned || 0,
          final_total: finalTotal,
        },
        applied_promotions: promoData?.applied_promotions || promoData?.promotions_applied || [],
        applied_coupon: promoData?.coupon_applied || null,
        gift_items: promoData?.gift_items || [],
        status: 'PENDING',
        payment_method: selectedMethodId || 'cod',
        payment_status: 'PENDING',
        shipping_method: selectedDelivery || 'standard',
        note: '',
        order_address: {
          receiver_name: address.name || currentUser?.full_name || "Khách hàng",
          phone: address.phone || currentUser?.phone || "",
          full_address: fullAddress || address.street || "",
          city: address.city || '',
          district: address.district || '',
          ward: address.ward || '',
          street: address.street || '',
          note: ''
        },
        items: [
          ...validCartItems.map((item: any) => {
            const pItem = promoData?.items?.find((i:any) => i.branch_product_id === item.branch_product_id);
            const originalPrice = pItem ? pItem.original_price : (item.unit_price ?? item.price ?? 0);
            const finalPrice = pItem ? pItem.final_price : (item.unit_price ?? item.price ?? 0);
            const discountAmt = pItem ? pItem.discount_amount : 0;
            const productId = item.branchProduct?.product?._id || item.branchProduct?.product?.id || item.product_id;
            const branchProductId = item.branch_product_id || item.branchProduct?.id || item.branchProduct?._id;
            return {
              product_id: String(productId),
              branch_product_id: String(branchProductId),
              quantity: Number(item.quantity) || 1,
              price: Number(originalPrice) || 0,
              unit_price: Number(originalPrice) || 0,
              original_price: Number(originalPrice) || 0,
              final_price: Number(finalPrice) || 0,
              discount: Number(discountAmt) || 0,
              discount_amount: Number(discountAmt) || 0,
              product_name: String(item.branchProduct?.product?.name || item.product_name || 'Sản phẩm'),
              product_image: String(item.branchProduct?.product?.images?.[0] || item.product_image || 'https://via.placeholder.com/150'),
              is_gift: false
            };
          }).filter((line: any) => !!line.product_id && !!line.branch_product_id),
          ...(Array.isArray(promoData?.gift_items) ? promoData.gift_items : []).map((gift: any) => ({
             product_id: String(gift.product_id),
             branch_product_id: String(gift.branch_product_id || gift.product_id),
             quantity: Number(gift.quantity) || 1,
             price: 0,
             unit_price: 0,
             original_price: Number(gift.price || 0),
             final_price: 0,
             discount: Number(gift.price || 0),
             discount_amount: Number(gift.price || 0),
             product_name: String(gift.name || 'Quà tặng'),
             product_image: String(gift.product_image || 'https://cdn-icons-png.flaticon.com/512/324/324065.png'),
             is_gift: true
           })).filter((gift: any) => !!gift.product_id && !!gift.branch_product_id)
        ].map((it: any) => ({ ...it, branch_product_id: it.branch_product_id || it.product_id }))
      };

      if (!orderPayload.order_address || !orderPayload.order_address.full_address) {
        orderPayload.order_address = {
          receiver_name: currentUser?.full_name || 'Test User',
          phone: currentUser?.phone || '0000000000',
          full_address: 'Default Address',
          city: '', district: '', ward: '', street: '', note: ''
        };
      }

      console.log('[Payment] Order payload:', { source: checkoutSource, itemsCount: orderPayload.items.length, total: orderPayload.total_amount });

      console.log("[Payment] Creating order...");
      createdOrder = await orderService.createOrder(orderPayload);
      
      const extractedId = createdOrder?.id || (createdOrder as any)?._id;
      const orderId = extractedId && String(extractedId) !== 'undefined' ? String(extractedId) : '';
      console.log("[Payment] Order created — orderId:", orderId);
      
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        toast.error('Lỗi tạo đơn hàng: không nhận được mã đơn hàng hợp lệ. Vui lòng thử lại.');
        setIsProcessing(false);
        setPaymentStatus('failed');
        return;
      }

      const selectedMethod = savedMethods.find(m => m.id === selectedMethodId);
      const provider = selectedMethodId === 'cod' ? 'COD' : (selectedMethod?.brand || selectedMethod?.provider || 'BANK_TRANSFER');

      // Create payment transaction
      let txnData: any = null;
      try {
        txnData = await paymentService.processPayment({
          orderId,
          provider,
          amount: finalTotal,
          methodId: selectedMethodId,
          userId: Number(currentUser?.id) || 1,
          currency: 'VND'
        });
      } catch(err: any) {
        console.error("[Payment] Payment API failed:", err);
        toast.error('Lỗi xử lý thanh toán. Đơn hàng đã tạo nhưng chưa thanh toán.');
        setIsProcessing(false);
        setPaymentStatus('failed');
        return;
      }

      if (selectedMethodId === 'cod') {
        const paidOrder: Order = {
          ...createdOrder,
          order_address: createdOrder?.order_address || orderPayload.order_address,
          branch_id: createdOrder?.branch_id || selectedBranchId,
          branch_name: (createdOrder as any)?.branch_name || branchName,
          payment_method: selectedMethodId,
          payment_status: 'PENDING',
          status: 'CONFIRMED',
          payment: {
            method: provider,
            transaction_id: txnData?.transaction_id || txnData?._id || txnData?.id || '',
            status: 'PENDING'
          },
          updated_at: new Date().toISOString()
        } as unknown as Order;

        await handleSuccessRedirect(paidOrder, txnData, selectedBranchId);
        return;
      }

      if (selectedMethodId === 'qr_transfer') {
        const orderWithId = { ...createdOrder, id: orderId };
        setPendingPayment({ transaction: txnData, order: orderWithId });
        setPaymentStatus('pending');
        setIsProcessing(false);
        return;
      }

      // Direct saved card/wallet flow simulation
      const txId = txnData?._id || txnData?.id || txnData?.transaction_id;
      setTimeout(async () => {
        try {
          const confirmResult = await paymentService.confirmPayment(txId);
          const paidOrder: Order = {
            ...createdOrder,
            payment_method: selectedMethodId,
            payment_status: 'PAID',
            status: 'CONFIRMED',
            points_earned: confirmResult?.points_earned || 0,
            payment: {
              method: provider,
              transaction_id: txnData?.transaction_id || txId,
              status: 'PAID'
            },
            updated_at: new Date().toISOString()
          } as unknown as Order;

          await handleSuccessRedirect(paidOrder, txnData, selectedBranchId);
        } catch (confirmErr: any) {
          console.error("Direct confirm failed:", confirmErr);
          toast.error("Giao dịch thẻ bị từ chối hoặc không đủ số dư. Vui lòng thử lại.");
          setPaymentStatus('failed');
          setIsProcessing(false);
        }
      }, 2000);

    } catch (err: any) {
      console.error("[ORDER ERROR FULL]", err.response?.data || err);
      const backendMsg = err.response?.data?.message;
      toast.error(backendMsg || err.message || 'Lỗi xử lý thanh toán. Vui lòng thử lại sau.');
      setPaymentStatus('failed');
      setIsProcessing(false);
    }
  };

  const handleSuccessRedirect = useCallback(async (paidOrder: any, txnData: any, branchId: string) => {
    try {
       const httpClientModule = await import('../api/httpClient');
       const endpointModule = await import('../api/endpoints');
       await httpClientModule.default.post(endpointModule.endpoints.cart.clear, { branch_id: branchId });
    } catch {
      return;
    }

    dispatch(createOrder(paidOrder));
    dispatch(clearCart());
    dispatch(verifySession() as any);
    dispatch(loadLoyaltyTransactions() as any);

    setPaymentStatus('paid');
    toast.success("Thanh toán thành công!");

    const orderId = paidOrder?.id || (paidOrder as any)?._id || '';
    navigate(`/payment/success?order_id=${orderId}`, {
      state: {
        order: paidOrder,
        address,
        transactionId: txnData?.transaction_id || txnData?._id || txnData?.id || ''
      }
    });
  }, [dispatch, navigate, address]);

  const handleUserConfirmPayment = async () => {
    if (!pendingPayment) return;
    setIsConfirming(true);
    setPaymentStatus('processing');

    try {
      const rawTxId = pendingPayment.transaction?._id || pendingPayment.transaction?.id || pendingPayment.transaction?.transaction_id;
      const txId = rawTxId && String(rawTxId) !== 'undefined' ? String(rawTxId) : '';
      
      const rawOrderId = pendingPayment.order?.id || pendingPayment.order?._id || pendingPayment.transaction?.order_id;
      const orderId = rawOrderId && String(rawOrderId) !== 'undefined' ? String(rawOrderId) : '';

      console.log('[Payment] handleUserConfirmPayment — txId:', txId, 'orderId:', orderId);

      if (!txId || txId === 'undefined' || txId === 'null') {
        toast.error('Không tìm thấy mã giao dịch hợp lệ. Vui lòng thử lại.');
        setIsConfirming(false);
        setPaymentStatus('pending');
        return;
      }

      // Simulate a realistic verification delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const confirmResult = await paymentService.confirmPayment(txId);
      const provider = pendingPayment.transaction?.provider || 'BANK_TRANSFER';
      const paidOrder: Order = {
        ...pendingPayment.order,
        payment_method: selectedMethodId,
        payment_status: 'PAID',
        status: 'CONFIRMED',
        points_earned: confirmResult?.points_earned || 0,
        payment: {
          method: provider,
          transaction_id: pendingPayment.transaction?.transaction_id || txId,
          status: 'PAID'
        },
        updated_at: new Date().toISOString()
      } as unknown as Order;

      await handleSuccessRedirect(paidOrder, pendingPayment.transaction, pendingPayment.order?.branch_id || currentBranchId);
    } catch(err: any) {
      console.error("Confirm failed:", err);
      toast.error(err?.response?.data?.message || 'Không thể xác nhận thanh toán. Vui lòng thử lại.');
      setPaymentStatus('pending');
    } finally {
      setIsConfirming(false);
    }
  };

  // ============================================================
  // RENDER: No order state
  // ============================================================
  if (!location.state) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">remove_shopping_cart</span>
        <h2 className="text-xl font-bold mb-2">Không tìm thấy thông tin đơn hàng</h2>
        <p className="text-slate-500 mb-6">{t('payment.noItems')}</p>
        <button onClick={() => navigate('/cart')} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition shadow">{t('payment.backToCart')}</button>
      </div>
    );
  }

  // ============================================================
  // RENDER: QR Payment Screen (pendingPayment state)
  // ============================================================
  if (pendingPayment) {
    const qrData = pendingPayment.transaction?.qrData;
    const amount = qrData?.amount || pendingPayment.transaction?.amount || total;
    const txnId = pendingPayment.transaction?.transaction_id || '';
    const isExpired = countdown <= 0 && paymentStatus === 'failed';

    return (
      <div className="max-w-[560px] mx-auto bg-slate-50 dark:bg-slate-900 md:rounded-2xl shadow-none md:shadow-2xl md:border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 md:mt-10 mb-10 overflow-hidden relative min-h-screen md:min-h-0">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setPendingPayment(null); setPaymentStatus('idle'); }} className="flex items-center justify-center rounded-full h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition -ml-1">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold tracking-tight">{t('payment.title')}</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isExpired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
             <span className="material-symbols-outlined text-sm">{isExpired ? 'timer_off' : 'schedule'}</span>
             {isExpired ? 'Hết hạn' : `Còn ${formatCountdown(countdown)}`}
          </div>
        </header>

        <div className="p-6 md:p-8 flex flex-col items-center text-center">

          {/* Stepper tracking payment sequence */}
          <div className="w-full flex items-center justify-between mb-8 px-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-1">{t('payment.stepCreate')}</span>
            </div>
            <div className="flex-1 h-0.5 bg-emerald-500 mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm animate-pulse">
                2
              </div>
              <span className="text-[10px] font-bold text-primary mt-1">{t('payment.stepTransfer')}</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1">{t('payment.stepVerify')}</span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-4xl text-primary">qr_code_2</span>
            </div>
            <h3 className="text-xl font-black mb-1">{t('payment.scanQR')}</h3>
            <p className="text-slate-500 text-sm">{t('payment.scanDesc')}</p>
          </div>

          {/* QR Code */}
          <div className={`bg-white p-5 rounded-2xl border-2 ${isExpired ? 'border-red-200 opacity-50' : 'border-primary/20'} shadow-lg shadow-primary/5 mb-6 inline-block relative`}>
            <img
              src={qrData?.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`LOTTE_MART|${txnId}|${amount}`)}`}
              alt="QR Code thanh toán"
              className="w-[220px] h-[220px] md:w-[260px] md:h-[260px] mx-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`LOTTE_MART|${txnId}|${amount}`)}`;
              }}
            />
            {isExpired && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl text-red-500 mb-2">timer_off</span>
                  <p className="text-red-600 font-bold text-sm">{t('payment.expired')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Info Card */}
          <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 text-left mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">account_balance</span>
                <span className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider">{t('payment.transferInfo')}</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black text-[10px] uppercase rounded tracking-wider">
                {t('payment.transferStatusPending')}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 text-sm">{t('payment.bank')}</span>
                <span className="font-bold text-sm">{qrData?.bank || qrData?.accountName || 'MB Bank'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 text-sm">{t('payment.accountHolder')}</span>
                <span className="font-bold text-sm">{qrData?.accountName || 'CONG TY TNHH LOTTE MART VN'}</span>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 text-sm">{t('payment.accountNumber')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-primary tracking-wider">{qrData?.accountNumber || '0851000386868'}</span>
                  <button 
                    onClick={() => handleCopyText(qrData?.accountNumber || '0851000386868', t('payment.accountNumber'))}
                    className="p-1 text-slate-400 hover:text-primary transition flex items-center"
                    title={t('payment.copy')}
                  >
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-start py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 text-sm shrink-0">{t('payment.transferContent')}</span>
                <div className="flex items-center gap-2 ml-4">
                  <span className="font-bold font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg tracking-widest text-right break-all">
                    {qrData?.description || txnId}
                  </span>
                  <button 
                    onClick={() => handleCopyText(qrData?.description || txnId, t('payment.transferContent'))}
                    className="p-1 text-slate-400 hover:text-primary transition flex items-center shrink-0"
                    title={t('payment.copy')}
                  >
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500 text-sm font-semibold">{t('payment.amount')}</span>
                <span className="font-black text-xl text-primary">{formatMoney(amount)}đ</span>
              </div>
            </div>
          </div>

          {/* Status indicator */}
          {isConfirming && (
            <div className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-blue-500 animate-spin">autorenew</span>
              <div className="text-left">
                <p className="text-blue-800 dark:text-blue-300 font-bold text-sm">{t('payment.confirming')}</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs">Hệ thống đang đối soát dữ liệu ngân hàng</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={handleUserConfirmPayment}
              disabled={isConfirming || isExpired}
              className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-red-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isConfirming ? (
                <>
                  <span className="material-symbols-outlined animate-spin">autorenew</span>{t('common.processing')}</>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>{t('payment.iPaid')}</>
              )}
            </button>

            <button
              onClick={() => { setPendingPayment(null); setPaymentStatus('idle'); }}
              disabled={isConfirming}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >{t('payment.reselectMethod')}</button>
          </div>

          {/* Security Note */}
          <div className="mt-6 flex items-start gap-2 text-left w-full">
            <span className="material-symbols-outlined text-emerald-500 text-lg mt-0.5">verified_user</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('payment.secureDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Payment Method Selection (default)
  // ============================================================
  return (
    <div className="max-w-[560px] mx-auto bg-slate-50 dark:bg-slate-900 md:rounded-2xl pb-24 md:pb-6 md:shadow-2xl overflow-hidden md:border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-0 md:mt-10 mb-10 min-h-screen md:min-h-0 relative">

      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors -ml-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-bold tracking-tight">{t('payment.title')}</h2>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
           <span className="material-symbols-outlined text-sm">lock</span> {t('payment.security')}
        </div>
      </header>

      {/* Direct Card Processing Modal Overlay */}
      {isProcessing && selectedMethodId !== 'cod' && selectedMethodId !== 'qr_transfer' && !pendingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl flex flex-col items-center border border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-5xl text-primary animate-spin mb-4">progress_activity</span>
            <h3 className="text-lg font-bold mb-2">Đang liên kết thanh toán...</h3>
            <p className="text-sm text-slate-500">Hệ thống đang tiến hành thanh toán trực tiếp qua phương thức đã lưu của bạn. Vui lòng không đóng cửa sổ này.</p>
          </div>
        </div>
      )}

      <div className="p-6">

        {/* Order Summary Banner */}
        <div className="mb-6 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng thanh toán</p>
                 <p className="text-primary text-3xl font-black">{formatMoney(total)}đ</p>
              </div>
              <div className="text-right flex flex-col items-end">
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{t('payment.deliverTo')}</p>
                 <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md max-w-[160px]">
                    <span className="material-symbols-outlined text-[14px] text-slate-500">location_on</span>
                    <p className="text-slate-900 dark:text-slate-100 font-semibold text-xs truncate">{address?.name}</p>
                 </div>
              </div>
           </div>

           <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between text-sm">
              <span className="text-slate-500">Tạm tính ({checkoutItems.length} sản phẩm)</span>
              <span className="font-semibold">{formatMoney(Number(total || 0) - Number(deliveryFee || 0) + Number(discount || 0))}đ</span>
           </div>

           <div className="flex justify-between text-sm">
              <span className="text-slate-500">Phí vận chuyển</span>
              <span className="font-semibold">{formatMoney(deliveryFee)}đ</span>
           </div>

           {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                 <span className="font-medium flex items-center gap-1"><span className="material-symbols-outlined text-sm">loyalty</span> Giảm giá</span>
                 <span className="font-bold">-{formatMoney(discount)}đ</span>
              </div>
           )}
        </div>

        <div className="flex items-center justify-between mb-4">
           <h3 className="text-slate-900 dark:text-slate-100 text-base font-black uppercase tracking-tight">{t('payment.chooseSource')}</h3>
           <button onClick={() => navigate('/account/payments')} className="text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition flex items-center gap-1">
              {t('payment.addSource')} <span className="material-symbols-outlined text-[14px]">add_circle</span>
           </button>
        </div>

        <div className="space-y-3 mb-8">
          {(savedMethods || []).map((method: any) => (
             <label key={method.id} className={`relative flex items-center p-4 rounded-xl border-2 ${selectedMethodId === method.id ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:border-slate-300'} cursor-pointer transition-all`}>
               <div className="flex-1 flex items-center gap-4">
                 <div className={`w-12 h-8 rounded shrink-0 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm ${method?.type === 'wallet' ? 'bg-[#A50064] text-white' : 'bg-slate-50 text-blue-800'}`}>
                   {method?.type === 'wallet' ? <span className="font-black text-xs italic tracking-tighter">{method?.brand || 'VÍ'}</span> : <span className="font-black text-xs italic tracking-tighter">{method?.brand || 'THẺ'}</span>}
                 </div>
                 <div className="flex flex-col">
                   <p className="text-slate-900 dark:text-slate-100 text-sm font-bold tracking-widest">{method?.type === 'wallet' ? (method?.phone || '0000000000').replace(/(\d{4})\d{3}(\d{3})/, "$1***$2") : `•••• •••• •••• ${method?.last4 || '0000'}`}</p>
                   {method?.type === 'card' && <p className="text-slate-500 text-[10px] uppercase font-bold mt-0.5">{method?.holder_name || 'LOTTE MEMBER'}</p>}
                 </div>
               </div>

               <div className="flex items-center gap-3">
                 {method?.is_default && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">{t('address.default')}</span>}
                 <input checked={selectedMethodId === method?.id} onChange={() => setSelectedMethodId(method?.id)} className="w-5 h-5 text-primary border-2 border-slate-300 focus:ring-primary rounded-full" name="payment_method" type="radio" />
               </div>
             </label>
          ))}

          {/* QR Transfer Option - only available if at least 1 saved payment method exists */}
          {savedMethods.length > 0 ? (
            <label className={`relative flex items-center justify-between p-4 rounded-xl border-2 ${selectedMethodId === 'qr_transfer' ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'} cursor-pointer transition-all group`}>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-8 bg-blue-50 dark:bg-blue-900/30 rounded flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition">
                   <span className="material-symbols-outlined text-xl">qr_code_2</span>
                 </div>
                 <div>
                   <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">{t('payment.bankTransfer')}</p>
                   <p className="text-slate-500 text-xs mt-0.5">{t('payment.qrApp')}</p>
                 </div>
               </div>
               <input checked={selectedMethodId === 'qr_transfer'} onChange={() => setSelectedMethodId('qr_transfer')} className="w-5 h-5 text-primary border-2 border-slate-300 focus:ring-primary rounded-full" name="payment_method" type="radio" />
            </label>
          ) : (
            <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 flex flex-col gap-2">
              <div className="flex items-center gap-3 text-slate-500">
                <span className="material-symbols-outlined text-xl text-slate-400">qr_code_2</span>
                <div>
                  <p className="text-sm font-bold text-slate-400">{t('payment.bankTransfer')}</p>
                  <p className="text-xs text-red-500 font-bold">{t('payment.savedMethodRequired')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500">{t('payment.noSavedMethodsMessage')}</span>
                <button onClick={() => navigate('/account/payments')} className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5">
                  {t('payment.addNow')} <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* COD Option */}
          <label className={`relative flex items-center justify-between p-4 rounded-xl border-2 ${selectedMethodId === 'cod' ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'} cursor-pointer transition-all group`}>
             <div className="flex items-center gap-4">
               <div className="w-12 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition">
                 <span className="material-symbols-outlined">payments</span>
               </div>
               <div>
                 <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">{t('payment.cod')}</p>
                 <p className="text-slate-500 text-xs mt-0.5">{t('payment.cashOrCard')}</p>
               </div>
             </div>
             <input checked={selectedMethodId === 'cod'} onChange={() => setSelectedMethodId('cod')} className="w-5 h-5 text-primary border-2 border-slate-300 focus:ring-primary rounded-full" name="payment_method" type="radio" />
          </label>
        </div>

        {/* Security Info */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 flex gap-3 mt-8">
           <span className="material-symbols-outlined text-emerald-500">gpp_good</span>
           <div className="text-xs text-emerald-800 dark:text-emerald-400">
              <strong className="block mb-0.5">{t('payment.absoluteSecurity')}</strong>
              {t('payment.cardDesc')}
           </div>
        </div>

      </div>

      <footer className="fixed bottom-0 left-0 right-0 md:static p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:shadow-none z-20">
        <button
           disabled={isProcessing || !selectedMethodId}
           onClick={handleConfirmPayment}
           className="w-full bg-primary hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 text-lg active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
             <span className="material-symbols-outlined animate-spin text-2xl">autorenew</span>
          ) : (
             <>
               <span className="material-symbols-outlined">lock_open</span>
               Thanh toán {formatMoney(total)}đ
             </>
          )}
        </button>
      </footer>
    </div>
  );
};

export default Payment;