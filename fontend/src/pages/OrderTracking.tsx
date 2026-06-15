import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { supportService } from '../services/supportService';
import { toast } from '../components/Toast/toastEvent';
import { useAppSelector, useAppDispatch } from '../store';
import { validateLoyaltyBalance } from '../slices/authSlice';
import type { Order } from '../types';

const OrderTracking: React.FC = () => {
  const { t } = useTranslation();
    const { orderId: pathOrderId } = useParams<{ orderId?: string }>();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const orderIdParam = queryParams.get('id') || pathOrderId || '';
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector(state => state.auth);
    const [order, setOrder] = React.useState<Order | null>(null);
    const [trackingData, setTrackingData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = React.useState(false);
    const [showSupportModal, setShowSupportModal] = React.useState(false);
    const [cancelReason, setCancelReason] = React.useState('');
    const [supportIssue, setSupportIssue] = React.useState('');
    const [isProcessing, setIsProcessing] = React.useState(false);

    React.useEffect(() => {
      const fetchTracking = async () => {
        if (!orderIdParam) {
          setError('Thiếu mã đơn hàng để theo dõi');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);
        try {
          const [trackRes, orderRes] = await Promise.all([
            orderService.trackOrder(orderIdParam),
            orderService.getDetail(orderIdParam)
          ]);
          setTrackingData(trackRes);
          setOrder(orderRes || null);
        } catch (e: any) {
          setError(e?.message || 'Không thể tải dữ liệu theo dõi đơn hàng');
        } finally {
          setIsLoading(false);
        }
      };

      fetchTracking();
    }, [orderIdParam]);

    if (isLoading) {
      return <div className="p-10 text-center"><p>{t('orderTracking.loading')}</p></div>;
    }

    if (error) {
      return <div className="p-10 text-center"><p>{error}</p></div>;
    }

    if (!trackingData && !order) {
        return <div className="p-10 text-center"><p>{t('orderTracking.notFound')}</p></div>;
    }

    const tracking = trackingData || order?.tracking;
    const currentStatus = trackingData?.status || order?.status || 'PENDING';
    const orderDisplayId = trackingData?.order_id || order?.id || orderIdParam;
    const orderItems = order?.items || [];
    const orderTotal = order?.total_amount || 0;
    const orderPaymentMethod = (order as any)?.payment?.method || order?.payment_method || 'N/A';
    const orderCreatedAt = order?.created_at || tracking?.history?.[0]?.timestamp || new Date().toISOString();
    const isCancellable = ['PENDING', 'CONFIRMED'].includes(currentStatus);

    const handleCancelOrder = async () => {
      if (!cancelReason.trim()) return toast.error('Vui lòng nhập lý do hủy đơn');
      setIsProcessing(true);
      try {
        await orderService.cancel(orderIdParam, cancelReason);
        dispatch(validateLoyaltyBalance() as any);
        setShowCancelModal(false);
        setCancelReason('');
        toast.success('Hủy đơn hàng thành công!');
        // Reload data
        const [trackRes, orderRes] = await Promise.all([
          orderService.trackOrder(orderIdParam),
          orderService.getDetail(orderIdParam)
        ]);
        setTrackingData(trackRes);
        setOrder(orderRes || null);
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi hủy đơn hàng');
      } finally {
        setIsProcessing(false);
      }
    };

    const handleContactSupport = async () => {
      if (!supportIssue.trim()) return toast.error('Vui lòng mô tả vấn đề');
      setIsProcessing(true);
      try {
        const res = await supportService.createTicket({
          subject: `Hỗ trợ đơn hàng #${orderDisplayId}`,
          category: 'order_issue',
          priority: 'medium',
          message: supportIssue,
          order_id: orderDisplayId,
          order_status: currentStatus,
          user_name: user?.full_name || user?.username || '',
          user_email: user?.email || '',
        });
        setShowSupportModal(false);
        setSupportIssue('');
        toast.success('Đã gửi yêu cầu hỗ trợ!');
        if (res?.data?._id) navigate(`/support/${res.data._id}`);
      } catch (err: any) {
        toast.error(err.message || 'Không thể gửi yêu cầu');
      } finally {
        setIsProcessing(false);
      }
    };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link to="/" className="hover:text-primary">{t('common.home')}</Link> <span className="material-symbols-outlined text-xs">chevron_right</span> <span>{t('orderTracking.title')}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t('orderTracking.status')}</h2>
              <p className="text-primary font-medium">Mã đơn hàng: #{orderDisplayId}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setShowSupportModal(true)} className="px-6 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">support_agent</span>{t('orderDetail.contactSupport')}</button>
              {isCancellable && (
                 <button onClick={() => setShowCancelModal(true)} className="px-6 py-2.5 bg-white border-2 border-red-400 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all flex items-center gap-2">
                   <span className="material-symbols-outlined text-lg">cancel</span>{t('orderDetail.cancelOrder')}</button>
              )}
              {!isCancellable && currentStatus !== 'CANCELLED' && currentStatus !== 'DELIVERED' && currentStatus !== 'RETURNED' && (
                 <button onClick={() => setShowSupportModal(true)} className="px-6 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold rounded-xl cursor-help flex items-center gap-2" title="Đơn hàng không thể hủy trực tiếp. Vui lòng liên hệ hỗ trợ.">
                   <span className="material-symbols-outlined text-lg">block</span>{t('orderDetail.cannotCancel')}</button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              {currentStatus === 'CANCELLED' ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center"><span className="material-symbols-outlined text-3xl">cancel</span></div>
                  <p className="text-lg font-bold text-red-500">{t('orderTracking.cancelled')}</p>
                </div>
              ) : (
              <div className="relative flex justify-between items-start">
                <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-0" />
                <div className={`absolute top-5 left-0 h-1 bg-primary -z-0 transition-all duration-500 ${currentStatus === 'DELIVERED' ? 'w-full' : currentStatus === 'SHIPPING' ? 'w-[80%]' : currentStatus === 'PROCESSING' ? 'w-[55%]' : currentStatus === 'CONFIRMED' ? 'w-[30%]' : 'w-[5%]'}`} />

                <div className="relative z-10 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">check</span></div>
                  <p className="text-xs font-bold">{t('orderTracking.placed')}</p>
                </div>
                <div className="relative z-10 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['CONFIRMED','PROCESSING','SHIPPING','DELIVERED'].includes(currentStatus) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}><span className="material-symbols-outlined">task_alt</span></div>
                  <p className={`text-xs font-bold ${currentStatus === 'CONFIRMED' ? 'text-primary' : 'text-slate-400'}`}>{t('orderTracking.confirmed')}</p>
                </div>
                <div className="relative z-10 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['PROCESSING','SHIPPING','DELIVERED'].includes(currentStatus) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}><span className="material-symbols-outlined">inventory_2</span></div>
                  <p className={`text-xs font-bold ${currentStatus === 'PROCESSING' ? 'text-primary' : 'text-slate-400'}`}>{t('orderTracking.preparing')}</p>
                </div>
                <div className="relative z-10 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['SHIPPING','DELIVERED'].includes(currentStatus) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}><span className="material-symbols-outlined">local_shipping</span></div>
                  <p className={`text-xs font-bold ${currentStatus === 'SHIPPING' ? 'text-primary' : 'text-slate-400'}`}>{t('orderTracking.shipping')}</p>
                </div>
                <div className="relative z-10 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStatus === 'DELIVERED' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}><span className="material-symbols-outlined">package_2</span></div>
                  <p className={`text-xs font-bold ${currentStatus === 'DELIVERED' ? 'text-primary' : 'text-slate-400'}`}>{t('orderTracking.completed')}</p>
                </div>
              </div>
              )}
              
              {/* Optional timeline logging based on tracking property */}
              {tracking?.history && tracking.history.length > 0 && (
                <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold mb-4">Lịch sử chi tiết {tracking.courier && `(Hãng vận chuyển: ${tracking.courier})`}</h4>
                    <div className="space-y-4">
                        {(() => {
                          const STATUS_LABEL: Record<string, string> = {
                            PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị',
                            SHIPPING: 'Đang giao hàng', DELIVERED: 'Hoàn thành', CANCELLED: 'Đã hủy', RETURNED: 'Đã hoàn trả',
                          };
                          const seenStatus = new Set<string>();
                          const uniqueHistory = tracking.history.filter((step: any) => {
                            if (seenStatus.has(step.status)) return false;
                            seenStatus.add(step.status);
                            return true;
                          });
                          return uniqueHistory.map((step: any, idx: number) => (
                            <div key={idx} className="flex gap-4">
                                <div className="text-xs text-slate-500 w-24 shrink-0 text-right">{new Date(step.timestamp).toLocaleString('vi-VN')}</div>
                                <div className="relative pb-4">
                                    {idx < uniqueHistory.length - 1 && <div className="absolute left-[7px] top-4 bottom-[-16px] w-[2px] bg-slate-200"></div>}
                                    <div className={`w-4 h-4 rounded-full border-2 relative z-10 mt-1 ${idx === 0 ? 'border-primary bg-white ring-4 ring-primary/20' : step.status === 'CANCELLED' ? 'border-red-500 bg-red-500' : 'border-slate-300 bg-slate-100'}`}></div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{STATUS_LABEL[step.status] || step.status}</p>
                                    {step.note && step.note !== 'Cập nhật hệ thống' && (
                                      <p className="text-xs text-slate-500 mt-1">{step.note}</p>
                                    )}
                                </div>
                            </div>
                          ));
                        })()}
                    </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">{t('orderTracking.summary')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm"><span className="text-slate-500">{t('orderTracking.orderDate')}</span><span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(orderCreatedAt).toLocaleDateString('vi-VN')}</span></div>
                
                {tracking?.tracking_number && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-xs">local_shipping</span> Vận chuyển</span>
                    <span className="font-semibold text-blue-600">{tracking?.carrier || 'Hệ thống'} - {tracking.tracking_number}</span>
                  </div>
                )}
                
                {tracking?.dispatch_branch_name && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-xs">storefront</span> Kho T/X</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{tracking.dispatch_branch_name}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm"><span className="text-slate-500">Thanh toán</span><span className="font-semibold text-slate-700 dark:text-slate-300">{orderPaymentMethod.toUpperCase()}</span></div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center"><span className="font-bold">{t('orderTracking.totalPayment')}</span><span className="text-xl font-extrabold text-primary">{orderTotal.toLocaleString('vi-VN')}₫</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold mb-4">Sản phẩm đã chọn ({orderItems.length})</h3>
              <div className="space-y-4">
                {orderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg bg-slate-50 dark:bg-slate-800 flex-shrink-0 p-1">
                        <img className="w-full h-full object-contain" src={item.product_image || "https://via.placeholder.com/150"} alt={item.product_name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.product_name}</p>
                        <p className="text-xs text-slate-500">SL: {item.quantity}</p>
                        <p className="text-sm font-bold text-primary">{item.price.toLocaleString('vi-VN')}₫</p>
                      </div>
                    </div>
                ))}
              </div>
              {orderItems.length === 0 && (
                <p className="text-sm text-slate-500">{t('orderTracking.noDetails')}</p>
              )}
              <Link to={`/account/orders/${orderDisplayId}`} className="block text-center w-full mt-6 py-2 text-sm font-semibold text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">{t('orderTracking.viewInvoice')}</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto"><span className="material-symbols-outlined text-2xl">warning</span></div>
            <h3 className="text-xl font-bold text-center mb-2">{t('orderTracking.confirmCancel')}</h3>
            <p className="text-center text-slate-500 mb-4 text-sm">Đơn hàng #{orderDisplayId} sẽ bị hủy và không thể hoàn tác.</p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Lý do hủy đơn <span className="text-red-500">*</span></label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Vui lòng cho biết lý do hủy đơn..." className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 outline-none resize-none" rows={3} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelModal(false); setCancelReason(''); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">Đóng</button>
              <button onClick={handleCancelOrder} disabled={isProcessing || !cancelReason.trim()} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50">{isProcessing ? 'Đang xử lý...' : 'Xác nhận hủy'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 mx-auto"><span className="material-symbols-outlined text-2xl">support_agent</span></div>
            <h3 className="text-xl font-bold text-center mb-2">{t('orderDetail.contactSupport')}</h3>
            <p className="text-center text-slate-500 mb-4 text-sm">Đơn hàng #{orderDisplayId} • Trạng thái: {currentStatus}</p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả vấn đề <span className="text-red-500">*</span></label>
              <textarea value={supportIssue} onChange={e => setSupportIssue(e.target.value)} placeholder="Mô tả chi tiết vấn đề bạn đang gặp..." className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none" rows={4} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowSupportModal(false); setSupportIssue(''); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">Đóng</button>
              <button onClick={handleContactSupport} disabled={isProcessing || !supportIssue.trim()} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50">{isProcessing ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;