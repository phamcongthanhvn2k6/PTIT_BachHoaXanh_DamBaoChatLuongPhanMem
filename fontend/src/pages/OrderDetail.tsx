import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store';
import { loadOrders, cancelOrderThunk } from '../slices/orderSlice';
import { reorderFromOrder } from '../slices/cartSlice';
import { toast } from '../components/Toast/toastEvent';
import { dataService } from '../services/dataService';
import { supportService } from '../services/supportService';
import { resolveImageUrl, getBackendHost } from '../utils/imageUrl';
import { reviewService } from '../services/reviewService';
import httpClient from '../api/httpClient';
import { getProductUrl } from '../utils/productUrl';

const OrderDetail: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: orders, status } = useAppSelector(state => state.order);
  const { user } = useAppSelector(state => state.auth);
  const { branches } = useAppSelector(state => state.branch);
  const currentUserId = user?.id ? Number(user.id) : null;

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => String(b.id) === String(branchId) || String((b as any)?._id) === String(branchId) || b.code === branchId);
    return branch ? branch.name : `Chi nhánh (${branchId})`;
  };
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [_showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [supportIssue, setSupportIssue] = useState('');
  const [supportCategory, setSupportCategory] = useState('general');
  const [submittedReviews, setSubmittedReviews] = useState<Set<string>>(new Set());
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const order = orders.find(o => String(o.id) === orderId);

  useEffect(() => {
    if (status === 'idle' && currentUserId) {
      dispatch(loadOrders(undefined));
    }
  }, [status, currentUserId, dispatch]);

  useEffect(() => {
    if (orderId) {
      reviewService.listAll({ order_id: orderId })
        .then((res: any) => {
          if (res && Array.isArray(res.data)) {
            const submitted = new Set<string>();
            res.data.forEach((r: any) => {
              if (r.product_id) {
                submitted.add(String(r.product_id));
              }
            });
            setSubmittedReviews(submitted);
          }
        })
        .catch((err) => {
          console.error("Error loading reviews:", err);
        });
    }
  }, [orderId]);

  if (status === 'loading') return <div className="text-center p-10 font-bold">{t('orderDetail.loading')}</div>;
  if (!order) return <div className="text-center p-10"><p className="text-slate-500">{t('orderDetail.notFound')}</p></div>;

  const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];
  const isCancellable = CANCELLABLE_STATUSES.includes(order.status);
  const isCompletedOrCancelled = ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(order.status);
  const isDelivered = ['COMPLETED', 'DELIVERED'].includes(order.status);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (reviewImages.length + files.length > 5) {
      toast.error("Tối đa 5 hình ảnh");
      return;
    }
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    
    setIsUploading(true);
    try {
      const res = await httpClient.post('/uploads/review-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.success && Array.isArray(res.data?.data?.urls)) {
        setReviewImages(prev => [...prev, ...res.data.data.urls]);
        toast.success("Tải ảnh thành công!");
      } else if (res.data?.success && Array.isArray(res.data?.data?.files)) {
        const urls = res.data.data.files.map((f: any) => f.relative_url || f.url);
        setReviewImages(prev => [...prev, ...urls]);
        toast.success("Tải ảnh thành công!");
      } else {
        toast.error("Tải ảnh thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tải ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewItem || !reviewComment.trim()) {
      toast.error(t('orderDetail.reviewValidation'));
      return;
    }
    setIsProcessing(true);
    try {
      await reviewService.create(reviewItem.product_id || reviewItem.branch_product_id, {
        rating: reviewRating,
        comment: reviewComment,
        order_id: order.id,
        product_name: reviewItem.product_name || (reviewItem.product_id === 'delivery' ? t('orderDetail.shippingReviewTitle') : 'Sản phẩm'),
        images: reviewImages,
      });
      toast.success(t('orderDetail.reviewSuccess'));
      setSubmittedReviews(prev => new Set([...prev, String(reviewItem.product_id || reviewItem.branch_product_id)]));
      setShowReviewModal(false);
      setReviewItem(null);
      setReviewComment('');
      setReviewRating(5);
      setReviewImages([]);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || t('orderDetail.reviewError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return toast.error('Vui lòng nhập lý do hủy đơn');
    setIsProcessing(true);
    try {
      await dispatch(cancelOrderThunk({id: String(order.id), reason: cancelReason})).unwrap();
      setShowCancelModal(false);
      setCancelReason('');
      toast.success('Hủy đơn hàng thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi hủy đơn hàng');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContactSupport = async () => {
    if (!supportIssue.trim()) return toast.error(t('orderDetail.supportValidation'));
    setIsProcessing(true);
    try {
      const res = await supportService.createTicket({
        subject: t('orderDetail.supportSubject', { orderId: order.id }),
        category: supportCategory,
        priority: 'medium',
        message: supportIssue,
        order_id: order.id,
        order_status: order.status,
        user_name: user?.full_name || user?.username || '',
        user_email: user?.email || '',
      });
      setShowSupportModal(false);
      setSupportIssue('');
      toast.success(t('orderDetail.supportCreateSuccess'));
      if (res?.data?._id) navigate(`/account/support?ticket=${res.data._id}`);
    } catch (err: any) {
      toast.error(err.message || t('orderDetail.supportCreateError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReorder = async () => {
    if (!currentUserId) return;
    setIsProcessing(true);
    try {
      const res = await dispatch(reorderFromOrder({ orderId: String(order.id), userId: currentUserId })).unwrap();
      const addedCount = Number(res?.added_count || 0);
      const unavailableCount = Array.isArray(res?.unavailable_items) ? res.unavailable_items.length : 0;
      const repricedCount = Array.isArray(res?.repriced_items) ? res.repriced_items.length : 0;
      const adjustedCount = Array.isArray(res?.adjusted_items) ? res.adjusted_items.length : 0;

      if (addedCount > 0) {
        toast.success(res.message || `Đã thêm ${addedCount} sản phẩm vào giỏ hàng`);
        navigate('/cart');
      } else {
        toast.warning(res.message || 'Không có sản phẩm khả dụng để mua lại');
      }

      if (unavailableCount > 0 || repricedCount > 0 || adjustedCount > 0) {
        toast.info(
          `Cập nhật khi mua lại: ${unavailableCount} hết hàng, ${repricedCount} đổi giá, ${adjustedCount} điều chỉnh số lượng`,
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi mua lại');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setIsProcessing(true);
    try {
       const res = await dataService.getInvoice(String(order.id));
       if (res.success && res.url) {
           window.open(`${getBackendHost()}${res.url}`, '_blank');
       } else {
           throw new Error(res.message || "Tạo hóa đơn thất bại");
       }
     } catch {
       toast.warning("Đang mở bản in...");
       setTimeout(() => { window.print(); }, 500);
    } finally {
       setIsProcessing(false);
    }
  };

  const rawHistory = order.tracking?.history || [
    { timestamp: order.created_at, status: "PENDING", note: "Đơn hàng đã được tạo" }
  ];
  
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị',
    SHIPPING: 'Đang giao hàng', DELIVERED: 'Hoàn thành', CANCELLED: 'Đã hủy', RETURNED: 'Đã hoàn trả',
  };

  const seenStatus = new Set<string>();
  const trackingHistory = rawHistory.filter((track: any) => {
    if (seenStatus.has(track.status)) return false;
    seenStatus.add(track.status);
    return true;
  });

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-2">
        <Link to="/account/orders" className="text-primary hover:underline text-sm font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          {t('orderDetail.backToList')}
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                  {String(t('orderStatuses.' + order.status, STATUS_LABEL[order.status] || order.status))}
                </h1>
                <p className="text-xs md:text-sm font-mono text-slate-500 mt-2 break-all">
                  {t('orders.orderCode', { code: order.id })}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button onClick={handleDownloadInvoice} disabled={isProcessing} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">download</span> PDF
                </button>
                <button onClick={() => setShowSupportModal(true)} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition">
                  <span className="material-symbols-outlined text-sm">support_agent</span> {t('orderDetail.contactSupport')}
                </button>
                {isCancellable && (
                    <button onClick={() => setShowCancelModal(true)} disabled={isProcessing} className="px-4 py-2 bg-white border-2 border-red-400 text-red-500 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-50 transition disabled:opacity-50">
                        <span className="material-symbols-outlined text-sm">cancel</span> Hủy đơn
                    </button>
                )}
                {!isCancellable && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.status !== 'RETURNED' && (
                  <button onClick={() => setShowSupportModal(true)} className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-sm font-bold flex items-center gap-2 cursor-help" title={t('orderDetail.supportCancelHint')}>
                    <span className="material-symbols-outlined text-sm">block</span> {t('orderDetail.cannotCancel')}
                  </button>
                )}
                {isDelivered && (
                  <button onClick={() => navigate('/account/reviews')} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-amber-600 transition">
                    <span className="material-symbols-outlined text-sm">star</span> {t('orderDetail.reviewProducts')}
                  </button>
                )}
                <button onClick={handleReorder} disabled={isProcessing} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">shopping_cart</span> Mua lại
                </button>
            </div>
        </div>
        <p className="text-slate-500 text-sm">
            Ngày đặt: {new Date(order.created_at).toLocaleString('vi-VN')}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-lg w-fit">
            <span className="material-symbols-outlined text-primary text-lg">storefront</span>
            <span className="text-sm font-bold text-primary">{(order as any).branch_name || getBranchName(order.branch_id)}</span>
          </div>
          {order.tracking?.tracking_number && (
             <div className="flex items-center gap-2 bg-blue-50/50 px-4 py-2 rounded-lg w-fit border border-blue-100">
               <span className="material-symbols-outlined text-blue-600 text-lg">local_shipping</span>
               <span className="text-sm font-bold text-blue-700">{order.tracking.carrier || 'Hệ thống'} • {order.tracking.tracking_number}</span>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (Items & Timeline) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
             {/* Timeline */}
             <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                    Tiến trình giao hàng
                 </h3>
                 <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                    {trackingHistory.map((track: any, i: number) => (
                        <div key={i} className="pl-6 relative">
                            <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ${(i === trackingHistory.length - 1 && track.status !== 'CANCELLED') ? 'bg-primary ring-4 ring-primary/20' : track.status === 'CANCELLED' ? 'bg-red-500' : 'bg-slate-300'}`}></span>
                            <p className="font-bold text-slate-800 break-words">{String(t('orderStatuses.' + track.status, STATUS_LABEL[track.status] || track.status))}</p>
                            {track.note && track.note !== 'Cập nhật hệ thống' && (
                              <p className="text-sm text-slate-600 mt-1 break-words whitespace-normal">{track.note}</p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1">{new Date(track.timestamp || track.time).toLocaleString('vi-VN')}</p>
                        </div>
                    ))}
                 </div>
                 <div className="mt-6 border-t border-slate-100 pt-4">
                    <Link to={`/order/track?id=${order.id}`} className="text-primary font-bold text-sm hover:underline">{t('orderDetail.viewJourney')}</Link>
                 </div>
             </div>

             {/* Delivery Review Card */}
             {isDelivered && (
               <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                   <span className="material-symbols-outlined text-amber-500">local_shipping</span>
                   {t('orderDetail.shippingReviewTitle')}
                 </h3>
                 {submittedReviews.has('delivery') ? (
                   <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl font-bold text-sm">
                     <span className="material-symbols-outlined">check_circle</span>
                     Bạn đã đánh giá dịch vụ giao hàng cho đơn này. Cảm ơn bạn!
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold text-slate-700">
                         Đánh giá tài xế, thời gian giao hàng và chất lượng đóng gói của đơn hàng này.
                       </p>
                       <p className="text-xs text-slate-500 mt-1">
                         Nhận xét của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn.
                       </p>
                     </div>
                     <button
                       onClick={() => {
                         setReviewItem({ product_id: 'delivery', product_name: t('orderDetail.shippingReviewTitle') });
                         setReviewRating(5);
                         setReviewComment('');
                         setReviewImages([]);
                         setShowReviewModal(true);
                       }}
                       className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition shrink-0 flex items-center gap-2"
                     >
                       <span className="material-symbols-outlined text-sm">rate_review</span>
                       {t('orderDetail.shippingReviewBtn')}
                     </button>
                   </div>
                 )}
               </div>
             )}

             {/* Items */}
             <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
                    Sản phẩm ({order.items.length})
                 </h3>
                 <div className="space-y-4">
                     {order.items.map((item, idx) => (
                         <div key={idx} className="flex gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                             <div className="w-20 h-20 rounded-lg border border-slate-100 overflow-hidden bg-slate-50 shrink-0">
                               {item.product_image ? (
                                 <img src={resolveImageUrl(item.product_image)} alt={item.product_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                               ) : null}
                               <div className={`w-full h-full flex items-center justify-center text-slate-300 ${item.product_image ? 'hidden' : ''}`}>
                                 <span className="material-symbols-outlined text-2xl">image</span>
                               </div>
                             </div>
                             <div className="flex-1 min-w-0">
                           <Link to={getProductUrl({ id: item.product_id || item.branch_product_id, name: item.product_name || (item as any).name })} className="font-bold text-slate-900 hover:text-primary truncate block">{item.product_name || (item as any).name || 'Sản phẩm'}</Link>
                           <div className="flex flex-col gap-0.5 mt-1.5 mb-2">
                             <p className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-max">
                               SKU: {(item as any).sku || 'N/A'}
                             </p>
                             <p className="text-[11px] text-slate-500 font-medium truncate" title={(item as any).supplier_name || 'N/A'}>
                               <span className="font-bold">Danh mục:</span> {(item as any).category_name || 'N/A'}
                               <span className="mx-2 text-slate-300">|</span> 
                               <span className="font-bold">NCC:</span> {(item as any).supplier_name || 'N/A'}
                             </p>
                             {(item as any)?.expiry_date && (
                               <p className={`text-[11px] font-bold mt-0.5 ${(item as any)?.is_expired ? 'text-red-500' : (item as any)?.is_expiring_soon ? 'text-orange-500' : 'text-slate-500'}`}>
                                 HSD: {new Date((item as any).expiry_date).toLocaleDateString('vi-VN')}
                               </p>
                             )}
                           </div>
                           <p className="text-sm text-slate-500 mt-1">Đơn giá: {(item.purchased_price ?? item.final_price ?? item.price ?? 0).toLocaleString('vi-VN')}đ | SL: {item.quantity}</p>
                           {(item as any).is_gift && (
                             <span className="inline-flex text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded mt-1">Quà tặng</span>
                           )}
                           {isDelivered && !submittedReviews.has(String(item.product_id || item.branch_product_id)) && (
                             <button
                               onClick={() => {
                                 setReviewItem(item);
                                 setReviewRating(5);
                                 setReviewComment('');
                                 setReviewImages([]);
                                 setShowReviewModal(true);
                               }}
                               className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
                             >
                               <span className="material-symbols-outlined text-[14px]">rate_review</span>
                               {t('orderDetail.writeReview')}
                             </button>
                           )}
                           {submittedReviews.has(String(item.product_id || item.branch_product_id)) && (
                             <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-green-600">
                               <span className="material-symbols-outlined text-[14px]">check_circle</span>
                               {t('orderDetail.reviewSubmitted')}
                             </span>
                           )}
                             </div>
                             <div className="text-right">
                           <p className="font-bold text-primary">{((item.purchased_price ?? item.final_price ?? item.price ?? 0) * item.quantity).toLocaleString('vi-VN')}đ</p>
                           {(item.discount_amount || 0) > 0 && (
                             <p className="text-xs text-green-600 font-semibold">- {(item.discount_amount || 0).toLocaleString('vi-VN')}đ</p>
                           )}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          </div>

          {/* Sidebar Data (Address, Pricing, Payment) */}
          <div className="flex flex-col gap-6">
             {/* Address */}
             <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">location_on</span>
                        Địa chỉ nhận hàng
                     </h3>
                     {!isCompletedOrCancelled && (
                         <button onClick={() => setShowEditAddressModal(true)} className="text-sm font-bold text-blue-600 hover:underline">{t('common.edit')}</button>
                     )}
                 </div>
                 {order.order_address ? (
                     <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg space-y-1">
                         <p className="font-bold">{order.order_address.receiver_name}</p>
                         <p>{order.order_address.phone}</p>
                         <p>{order.order_address.full_address || [order.order_address.street, order.order_address.ward, order.order_address.district, order.order_address.city].filter(Boolean).join(', ')}</p>
                         {order.order_address.city && (
                           <p className="text-xs text-slate-500">
                             {[order.order_address.ward, order.order_address.district, order.order_address.city].filter(Boolean).join(', ')}
                           </p>
                         )}
                     </div>
                 ) : (
                     <p className="text-sm text-slate-500">{t('orderDetail.noAddressInfo')}</p>
                 )}
             </div>

             {/* Payment */}
             <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">payment</span>
                    Thanh toán
                 </h3>
                 {
                  (() => {
                    const method = (order.payment?.method || order.payment_method || 'COD').toUpperCase();
                    const status = (order.payment?.status || order.payment_status || 'PENDING').toUpperCase();
                    const isCOD = method === 'COD';
                    
                    let statusLabel = status;
                    let statusColor = 'text-slate-600';
                    
                    if (status === 'PAID' || status === 'COMPLETED') {
                      statusLabel = t('paymentStatus.PAID', 'Đã thanh toán');
                      statusColor = 'text-green-600';
                    } else if (status === 'PENDING') {
                      statusLabel = isCOD 
                        ? t('paymentStatus.COD_PENDING', 'Thanh toán khi nhận hàng')
                        : t('paymentStatus.UNPAID', 'Chờ thanh toán');
                      statusColor = isCOD ? 'text-blue-600' : 'text-orange-500';
                    } else if (status === 'EXPIRED') {
                      statusLabel = t('paymentStatus.EXPIRED', 'Hết hạn');
                      statusColor = 'text-red-500';
                    } else if (status === 'REFUNDED') {
                      statusLabel = t('paymentStatus.REFUNDED', 'Đã hoàn tiền');
                      statusColor = 'text-purple-600';
                    }
                    const methodLabel = isCOD 
                      ? t('paymentMethod.COD', 'Tiền mặt (COD)') 
                      : (method === 'VNPAY' ? 'VNPAY' : t('paymentMethod.PREPAID_QR', 'Chuyển khoản QR'));
                    return (
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('orderDetail.method')}</span>
                          <span className="font-bold">{methodLabel}</span>
                        </div>
                        {!isCOD && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('orderDetail.transactionId')}</span>
                            <span className="font-bold">{order.payment?.transaction_id || 'N/A'}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('orderDetail.status')}</span>
                          <span className={"font-bold uppercase " + statusColor}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })()
                }
             </div>

             {/* Price Breakdown */}
             <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-lg mb-4">{t('orderDetail.orderSummary')}</h3>
                 {Array.isArray((order as any).applied_promotions) && (order as any).applied_promotions.length > 0 && (
                   <div className="mb-4 space-y-2">
                     <p className="text-xs font-bold uppercase text-slate-400 tracking-wide">Khuyến mãi áp dụng</p>
                     {(order as any).applied_promotions.map((promo: any, idx: number) => (
                       <div key={idx} className="flex justify-between text-sm text-green-700">
                         <span>{promo.title}</span>
                         <span>-{Number(promo.discount_amount || 0).toLocaleString('vi-VN')}đ</span>
                       </div>
                     ))}
                   </div>
                 )}
                 {(order as any).applied_coupon?.code && (
                   <div className="mb-4 flex justify-between text-sm text-green-700 font-semibold">
                     <span>Coupon {(order as any).applied_coupon.code}</span>
                     <span>-{Number((order as any).applied_coupon.discount_amount || 0).toLocaleString('vi-VN')}đ</span>
                   </div>
                 )}
                 <div className="space-y-3 text-sm border-b border-slate-100 pb-4 mb-4">
                     <div className="flex justify-between text-slate-600">
                         <span>{t('orderDetail.subTotal')}</span>
                         <span className="font-bold text-slate-900">{Number((order as any).pricing_breakdown?.subtotal ?? order.subtotal ?? 0).toLocaleString('vi-VN')}đ</span>
                     </div>
                     <div className="flex justify-between text-slate-600">
                         <span>{t('orderDetail.shippingFee')}</span>
                         <span className="font-bold text-slate-900">{Number((order as any).pricing_breakdown?.shipping_fee ?? order.shipping_fee ?? 0).toLocaleString('vi-VN')}đ</span>
                     </div>
                     <div className="flex justify-between text-slate-600">
                         <span>{t('orderDetail.discount')}</span>
                       <span className="font-bold text-green-600">-{Number(((order as any).pricing_breakdown?.promotion_discount ?? 0) + ((order as any).pricing_breakdown?.coupon_discount ?? 0) || order.discount_amount || 0).toLocaleString('vi-VN')}đ</span>
                     </div>
                     {(order as any).pricing_breakdown?.free_shipping_applied && (
                       <div className="flex justify-between text-slate-600">
                         <span>Freeship:</span>
                         <span className="font-bold text-green-700">Đã áp dụng</span>
                       </div>
                     )}
                     <div className="flex justify-between text-slate-600">
                       <span>{t('orderDetail.earnedPoints')}</span>
                       <span className="font-bold text-primary">+{Number((order as any).pricing_breakdown?.points_earned ?? order.points_earned ?? 0)} L.Point</span>
                     </div>
                 </div>
                 <div className="flex justify-between items-center">
                     <span className="font-bold text-lg">{t('orderDetail.total')}</span>
                     <span className="font-bold text-2xl text-primary">{Number(order.total_amount || 0).toLocaleString('vi-VN')}đ</span>
                 </div>
             </div>
          </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
               <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
                   <span className="material-symbols-outlined text-2xl">warning</span>
               </div>
               <h3 className="text-xl font-bold text-center mb-2">{t('orderDetail.confirmCancelTitle')}</h3>
               <p className="text-center text-slate-500 mb-4 text-sm">Đơn hàng #{order.id} sẽ bị hủy và không thể hoàn tác.</p>
               <div className="mb-4">
                 <label className="block text-sm font-bold text-slate-700 mb-1">Lý do hủy đơn <span className="text-red-500">*</span></label>
                 <textarea 
                   value={cancelReason} 
                   onChange={e => setCancelReason(e.target.value)} 
                   placeholder="Vui lòng cho biết lý do hủy đơn..." 
                   className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none resize-none" 
                   rows={3} 
                 />
               </div>
               <div className="flex gap-3">
                   <button onClick={() => { setShowCancelModal(false); setCancelReason(''); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">Đóng</button>
                   <button onClick={handleCancelOrder} disabled={isProcessing || !cancelReason.trim()} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                       {isProcessing ? 'Đang xử lý...' : 'Xác nhận hủy'}
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
               <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 mx-auto">
                   <span className="material-symbols-outlined text-2xl">support_agent</span>
               </div>
               <h3 className="text-xl font-bold text-center mb-2">{t('orderDetail.supportModalTitle')}</h3>
               <p className="text-center text-slate-500 mb-4 text-sm">{t('orderDetail.supportModalDesc', { orderId: order.id, status: order.status })}</p>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">{t('orderDetail.supportCategory')}</label>
                   <select value={supportCategory} onChange={e => setSupportCategory(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none">
                     <option value="general">{t('support.cat_general')}</option>
                     <option value="missing_item">{t('support.cat_missing_item')}</option>
                     <option value="damaged_product">{t('support.cat_damaged_product')}</option>
                     <option value="payment_issue">{t('support.cat_payment_issue')}</option>
                     <option value="delivery_delay">{t('support.cat_delivery_delay')}</option>
                     <option value="refund_request">{t('support.cat_refund_request')}</option>
                   </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('orderDetail.supportIssueLabel')} <span className="text-red-500">*</span></label>
                    <textarea 
                      value={supportIssue} 
                      onChange={e => setSupportIssue(e.target.value)} 
                      placeholder={t('orderDetail.supportIssuePlaceholder')} 
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none" 
                      rows={4} 
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowSupportModal(false); setSupportIssue(''); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">{t('common.close')}</button>
                    <button onClick={handleContactSupport} disabled={isProcessing || !supportIssue.trim()} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50">
                        {isProcessing ? t('orderDetail.supportSending') : t('orderDetail.supportSend')}
                    </button>
                </div>
                <div className="mt-4 text-center">
                  <Link to="/account/support" className="text-xs font-semibold text-primary hover:underline">
                    {t('orderDetail.supportGoToCenter')}
                  </Link>
                </div>
            </div>
         </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
               <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4 mx-auto">
                   <span className="material-symbols-outlined text-2xl">rate_review</span>
               </div>
               <h3 className="text-xl font-bold text-center mb-2">{t('orderDetail.reviewModalTitle')}</h3>
               <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl mb-4">
                 {reviewItem.product_id === 'delivery' ? (
                   <div className="w-12 h-12 bg-amber-100 text-amber-600 flex items-center justify-center rounded-lg">
                     <span className="material-symbols-outlined text-2xl">local_shipping</span>
                   </div>
                 ) : (
                   <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                     {reviewItem.product_image ? (
                       <img src={resolveImageUrl(reviewItem.product_image)} alt={reviewItem.product_name} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300">
                         <span className="material-symbols-outlined">image</span>
                       </div>
                     )}
                   </div>
                 )}
                 <p className="text-slate-700 text-sm font-semibold line-clamp-2">{reviewItem.product_name || (reviewItem.product_id === 'delivery' ? t('orderDetail.shippingReviewTitle') : 'Sản phẩm')}</p>
               </div>
               
               {/* Star Rating */}
               <div className="flex justify-center gap-1 mb-2">
                 {[1, 2, 3, 4, 5].map(star => (
                   <button
                     key={star}
                     type="button"
                     onClick={() => setReviewRating(star)}
                     className="transition-transform hover:scale-110"
                   >
                     <span className={`material-symbols-outlined text-3xl ${star <= reviewRating ? 'text-amber-400 fill-1' : 'text-slate-300'}`}>star</span>
                   </button>
                 ))}
               </div>
               <p className="text-center text-xs text-slate-400 mb-4">{reviewRating}/5 {t('orderDetail.stars')}</p>
               
               <div className="mb-4">
                 <label className="block text-sm font-bold text-slate-700 mb-1">{t('orderDetail.reviewCommentLabel')} <span className="text-red-500">*</span></label>
                 <textarea 
                   value={reviewComment} 
                   onChange={e => setReviewComment(e.target.value)} 
                   placeholder={t('orderDetail.reviewPlaceholder')} 
                   className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none" 
                   rows={4} 
                 />
               </div>

               {/* Photo Upload section */}
               <div className="mb-6">
                 <label className="block text-sm font-bold text-slate-700 mb-1">
                   {t('orderDetail.uploadPhoto')}
                 </label>
                 <div className="flex flex-wrap gap-2 mt-2">
                   {reviewImages.map((imgUrl, i) => (
                     <div key={i} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 group">
                       <img src={resolveImageUrl(imgUrl)} alt="Upload preview" className="w-full h-full object-cover" />
                       <button
                         type="button"
                         onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                         className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <span className="material-symbols-outlined text-sm">delete</span>
                       </button>
                     </div>
                   ))}
                   {reviewImages.length < 5 && (
                     <label className={`w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-slate-50 transition ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                       <span className="material-symbols-outlined text-slate-400">add_a_photo</span>
                       <span className="text-[10px] text-slate-400 mt-1">
                         {isUploading ? t('orderDetail.uploading') : ''}
                       </span>
                       <input
                         type="file"
                         multiple
                         accept="image/*"
                         onChange={handleImageChange}
                         className="hidden"
                         disabled={isUploading}
                       />
                     </label>
                   )}
                 </div>
               </div>

               <div className="flex gap-3">
                   <button onClick={() => { setShowReviewModal(false); setReviewItem(null); setReviewComment(''); setReviewRating(5); setReviewImages([]); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">{t('common.close')}</button>
                   <button onClick={handleSubmitReview} disabled={isProcessing || !reviewComment.trim()} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                       {isProcessing ? t('orderDetail.reviewSending') : t('orderDetail.reviewSubmit')}
                   </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
