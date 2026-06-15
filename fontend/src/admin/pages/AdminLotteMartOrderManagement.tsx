import React, { useState, useEffect, useMemo } from "react";
import { dataService } from "../../services/dataService";
import type { Order } from "../../types";
import { toast } from "../../components/Toast/toastEvent";
import { useAppSelector } from '../../store';
import { useTranslation } from "react-i18next";
import UserAvatar from "../../components/UserAvatar/UserAvatar";

const AdminLotteMartOrderManagement: React.FC = () => {
  const { t } = useTranslation();

  // Helper to resolve customer name with robust fallbacks
  const getCustomerName = (order: Order): string => {
    const user = (order as any).user;
    if (user) {
      const name = user.full_name || user.username || user.name;
      if (name) return name;
    }
    const addr = order.order_address;
    if (addr && typeof addr === 'object' && addr.receiver_name) {
      return addr.receiver_name;
    }
    const anyOrder = order as any;
    if (anyOrder.customer_name) return anyOrder.customer_name;
    if (anyOrder.customerName) return anyOrder.customerName;
    if (anyOrder.receiverName) return anyOrder.receiverName;
    if (anyOrder.receiver_name) return anyOrder.receiver_name;
    if (typeof addr === 'string') {
      return 'Khách vãng lai';
    }
    if (anyOrder.user_id) {
      return `Khách hàng (ID: ${String(anyOrder.user_id).substring(0, 8)})`;
    }
    return 'Khách vãng lai';
  };

  // Helper to resolve customer avatar with robust fallbacks
  const getCustomerAvatar = (order: Order): string | null => {
    const user = (order as any).user;
    if (user) {
      const avatar = user.avatar || user.avatarUrl || user.profileImage || user.image;
      if (avatar) return avatar;
    }
    const anyOrder = order as any;
    if (anyOrder.customer_avatar) return anyOrder.customer_avatar;
    if (anyOrder.customerAvatar) return anyOrder.customerAvatar;
    if (anyOrder.user_avatar) return anyOrder.user_avatar;
    return null;
  };

  const getCustomerPhone = (order: Order): string => {
    const addr = order.order_address;
    if (addr && typeof addr === 'object' && addr.phone) {
      return addr.phone;
    }
    const user = (order as any).user;
    if (user && user.phone) {
      return user.phone;
    }
    return '';
  };

  const getFullAddress = (order: Order): string => {
    const addr = order.order_address;
    if (addr) {
      if (typeof addr === 'object') {
        return addr.full_address || [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ') || 'N/A';
      }
      if (typeof addr === 'string') {
        return addr;
      }
    }
    return 'N/A';
  };

  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters & sort
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  // Branch filter from Redux
  const { adminBranchId: branchFilter } = useAppSelector(state => state.adminAuth);
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState("NEWEST");

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Order for detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Modals state
  const [isStatusModalOpen, setStatusModalOpen] = useState(false);
  const [isCancelModalOpen, setCancelModalOpen] = useState(false);
  const [isRefundModalOpen, setRefundModalOpen] = useState(false);
  
  // Update inputs
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  
  // Shipping input specifically for changing to 'SHIPPING'
  const [dispatchBranch, setDispatchBranch] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingProvider, setShippingProvider] = useState("");

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await dataService.getOrders(branchFilter);
      setOrders(data);
    } catch (err: any) {
      if (!silent) setError(err.message || "Không thể tải danh sách đơn hàng.");
      if (!silent) toast.error("Lỗi khi tải dữ liệu đơn hàng!");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);
    
    // Auto polling every 10 seconds to detect new orders from Payment checkout
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [branchFilter]);

  // Filter & Sort Logic
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(o => 
        (o.id || '').toLowerCase().includes(lower) || 
        getCustomerName(o).toLowerCase().includes(lower) ||
        getCustomerPhone(o).includes(lower) ||
        (o.tracking_number || '').toLowerCase().includes(lower)
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter(o => o.status === statusFilter);
    }

    // Branch filter — already applied server-side via dataService.getOrders(branchFilter)
    // No additional client-side filtering needed for branch

    // Payment Filter
    if (paymentFilter !== "ALL") {
      result = result.filter(o => 
        o.payment?.method?.toUpperCase() === paymentFilter || 
        o.payment_method?.toUpperCase() === paymentFilter
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "NEWEST":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "OLDEST":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "PRICE_HIGH":
          return b.total_amount - a.total_amount;
        case "PRICE_LOW":
          return a.total_amount - b.total_amount;
        case "ITEMS_HIGH":
          return (b.items?.length || 0) - (a.items?.length || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [orders, searchTerm, statusFilter, branchFilter, paymentFilter, sortOption]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  
  // Ensure safePage resets if out of bounds
  useEffect(() => {
    if (safePage !== currentPage) setCurrentPage(safePage);
  }, [safePage, currentPage]);

  const displayedOrders = filteredAndSortedOrders.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  // Stats
  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let todayRevenue = 0;
    let pendingCount = 0;
    let shippingCount = 0;

    orders.forEach(o => {
      if (o.status === "PENDING" || o.status === "CONFIRMED") pendingCount++;
      if (o.status === "SHIPPING" || o.status === "PROCESSING") shippingCount++;
      if ((o.created_at || '').startsWith(today) && o.status !== "CANCELLED") {
        todayRevenue += o.total_amount;
      }
    });

    return { total: orders.length, todayRevenue, pendingCount, shippingCount };
  }, [orders]);

  // Handlers
  const openDetail = (order: Order) => {
    setSelectedOrder(order);
  };

  const closeDetail = () => {
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    if (newStatus === 'SHIPPING') {
      if (!trackingNumber.trim()) return toast.error("Vui lòng nhập mã vận đơn khi chuyển trạng thái Đang giao hàng!");
      if (!dispatchBranch.trim()) return toast.error("Vui lòng nhập kho xuất hàng!");
    }
    try {
      const updated = await dataService.updateOrderStatus(selectedOrder.id, newStatus, statusNote, newStatus === 'SHIPPING' ? {
        tracking_number: trackingNumber,
        carrier: shippingProvider,
        dispatch_branch_name: dispatchBranch,
        dispatch_branch: dispatchBranch, // Optional ID representation, using name for simplicity here
      } : undefined);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      toast.success("Cập nhật trạng thái thành công!");
      setStatusModalOpen(false);
      setNewStatus("");
      setStatusNote("");
      setDispatchBranch("");
      setTrackingNumber("");
      setShippingProvider("");
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn.");
      return;
    }
    try {
      const updated = await dataService.cancelOrder(selectedOrder.id, cancelReason);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      toast.success("Đã hủy đơn hàng!");
      setCancelModalOpen(false);
      setCancelReason("");
    } catch (error: any) {
      toast.error(error.message || "Không thể hủy đơn hàng.");
    }
  };

  const handleRefundOrder = async () => {
    if (!selectedOrder) return;
    if (!refundReason.trim()) {
      toast.error("Vui lòng nhập lý do hoàn tiền.");
      return;
    }
    try {
      const updated = await dataService.refundOrder(selectedOrder.id, refundReason);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      toast.success("Hoàn tiền thành công!");
      setRefundModalOpen(false);
      setRefundReason("");
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi hoàn tiền.");
    }
  };

  // Legacy Tracking Function has been merged into updateStatus.
  const handlePrintInvoice = () => {
    if (!selectedOrder) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Trình duyệt đã chặn popup. Vui lòng bật lại.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn #${selectedOrder.id}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            .details { margin-bottom: 20px; font-size: 14px; }
            .details p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .totals { text-align: right; font-size: 14px; }
            .totals p { margin: 5px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>HÓA ĐƠN BÁN LẺ</h2>
            <p>Mã đơn: <strong>#${selectedOrder.id}</strong></p>
            <p>Ngày tạo: ${new Date(selectedOrder.created_at).toLocaleString("vi-VN")}</p>
          </div>
          <div class="details">
            <p><strong>Khách hàng:</strong> ${getCustomerName(selectedOrder)}</p>
            <p><strong>SĐT:</strong> ${getCustomerPhone(selectedOrder)}</p>
            <p><strong>Địa chỉ:</strong> ${getFullAddress(selectedOrder)}</p>
            <p><strong>Thanh toán:</strong> ${selectedOrder.payment?.method || selectedOrder.payment_method} - ${selectedOrder.payment?.status}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${(selectedOrder.items || []).map((item: any) => `
                <tr>
                  <td>${item.product_name || item.name || 'Sản phẩm'}</td>
                  <td>${item.quantity}</td>
                  <td>${Number(item.price).toLocaleString('vi-VN')} ₫</td>
                  <td>${(item.quantity * Number(item.price)).toLocaleString('vi-VN')} ₫</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Tạm tính: ${(selectedOrder.subtotal || 0).toLocaleString('vi-VN')} ₫</p>
            <p>Phí ship: ${(selectedOrder.shipping_fee || 0).toLocaleString('vi-VN')} ₫</p>
            <p>Giảm giá: - ${(selectedOrder.discount_amount || 0).toLocaleString('vi-VN')} ₫</p>
            <h3>Tổng cộng: ${(selectedOrder.total_amount || 0).toLocaleString('vi-VN')} ₫</h3>
          </div>
          <div class="footer">
            <p>Cảm ơn quý khách đã mua sắm tại Lotte Mart!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };


  const getStatusBadge = (status: string) => {
    const statusText = t('orderStatuses.' + status, status) as string;
    switch(status) {
      case "PENDING":
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full ring-1 ring-amber-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      case "CONFIRMED":
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full ring-1 ring-blue-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      case "PROCESSING":
        return <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-full ring-1 ring-indigo-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      case "SHIPPING":
        return <span className="px-3 py-1 bg-cyan-50 text-cyan-700 text-[10px] font-black uppercase rounded-full ring-1 ring-cyan-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      case "DELIVERED":
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full ring-1 ring-emerald-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      case "CANCELLED":
        return <span className="px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-full ring-1 ring-red-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      case "RETURNED":
        return <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase rounded-full ring-1 ring-purple-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
      default:
        return <span className="px-3 py-1 bg-slate-50 text-slate-700 text-[10px] font-black uppercase rounded-full ring-1 ring-slate-200 whitespace-nowrap inline-flex items-center justify-center min-w-max">{statusText}</span>;
    }
  };

  const getPaymentBadge = (order: Order) => {
    const method = (order.payment?.method || order.payment_method || 'COD').toUpperCase();
    const status = (order.payment?.status || order.payment_status || 'PENDING').toUpperCase();
    
    const isCOD = method === 'COD';
    
    let statusLabel = status;
    let statusClass = "bg-slate-50 text-slate-700 ring-slate-200";
    
    if (status === 'PAID' || status === 'COMPLETED') {
      statusLabel = t('paymentStatus.PAID', 'Đã thanh toán') as string;
      statusClass = "bg-emerald-50 text-emerald-700 ring-emerald-200";
    } else if (status === 'PENDING') {
      statusLabel = (isCOD 
        ? t('paymentStatus.COD_PENDING', 'COD')
        : t('paymentStatus.UNPAID', 'Chờ thanh toán')) as string;
      statusClass = isCOD 
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";
    } else if (status === 'EXPIRED') {
      statusLabel = t('paymentStatus.EXPIRED', 'Hết hạn') as string;
      statusClass = "bg-red-50 text-red-700 ring-red-200";
    } else if (status === 'REFUNDED') {
      statusLabel = t('paymentStatus.REFUNDED', 'Đã hoàn tiền') as string;
      statusClass = "bg-purple-50 text-purple-700 ring-purple-200";
    }

    const methodLabel = (isCOD 
      ? t('paymentMethod.COD', 'Tiền mặt (COD)') 
      : (method === 'VNPAY' ? 'VNPAY' : t('paymentMethod.PREPAID_QR', 'Chuyển khoản QR'))) as string;

    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-[11px] font-bold text-on-surface">{methodLabel}</span>
        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ring-1 ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 w-full mx-auto relative">
      {/* Page Header */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Dashboard</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span className="text-primary">Quản lý đơn hàng</span>
              </nav>
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Quản lý đơn hàng</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:bg-primary-container transition-all cursor-pointer active:scale-[0.98] text-sm" onClick={() => fetchOrders(false)}>
                <span className="material-symbols-outlined text-lg">refresh</span>
                Làm mới
              </button>
            </div>
          </section>

          {/* KPI Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl border-none ring-1 ring-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng đơn</p>
                <h3 className="text-2xl font-black text-on-surface">{kpiData.total}</h3>
              </div>
              <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-8xl text-slate-50 opacity-[0.03] group-hover:scale-110 transition-transform">shopping_bag</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-none ring-1 ring-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Doanh thu hôm nay</p>
                <h3 className="text-2xl font-black text-on-surface">{(kpiData.todayRevenue).toLocaleString('vi-VN')} ₫</h3>
              </div>
              <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-8xl text-primary opacity-[0.03] group-hover:scale-110 transition-transform">monetization_on</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-none ring-1 ring-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group border-l-4 border-amber-400">
              <div className="z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chờ xử lý</p>
                <h3 className="text-2xl font-black text-on-surface">{kpiData.pendingCount}</h3>
              </div>
              <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-8xl text-amber-400 opacity-[0.03] group-hover:scale-110 transition-transform">pending_actions</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-none ring-1 ring-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group border-l-4 border-blue-500">
              <div className="z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Đang giao hàng</p>
                <h3 className="text-2xl font-black text-on-surface">{kpiData.shippingCount}</h3>
              </div>
              <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-8xl text-blue-500 opacity-[0.03] group-hover:scale-110 transition-transform">package_2</span>
            </div>
          </section>

          {/* Filter Bar */}
          <section className="bg-surface-container-lowest p-4 rounded-xl ring-1 ring-slate-100 space-y-4">
            {/* Branch Filter Row removed because it's in the Header */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[280px] relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Tìm mã đơn, tên khách, số điện thoại..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-[2]">
                <select 
                  className="bg-surface-container-low border-none rounded-xl text-xs font-semibold py-2.5 px-3 focus:ring-2 focus:ring-primary/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">{t('orders.allStatus', 'Tất cả Trạng thái')}</option>
                  <option value="PENDING">{t('orderStatuses.PENDING', 'Chờ xác nhận')}</option>
                  <option value="CONFIRMED">{t('orderStatuses.CONFIRMED', 'Đã xác nhận')}</option>
                  <option value="PROCESSING">{t('orderStatuses.PROCESSING', 'Đang chuẩn bị')}</option>
                  <option value="SHIPPING">{t('orderStatuses.SHIPPING', 'Đang giao hàng')}</option>
                  <option value="DELIVERED">{t('orderStatuses.DELIVERED', 'Hoàn thành')}</option>
                  <option value="CANCELLED">{t('orderStatuses.CANCELLED', 'Đã hủy')}</option>
                  <option value="RETURNED">{t('orderStatuses.RETURNED', 'Đã hoàn trả/hoàn tiền')}</option>
                </select>
                <select 
                  className="bg-surface-container-low border-none rounded-xl text-xs font-semibold py-2.5 px-3 focus:ring-2 focus:ring-primary/20"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="ALL">{t('orders.allPayments', 'Tất cả Thanh toán')}</option>
                  <option value="COD">{t('paymentMethod.COD', 'Tiền mặt (COD)')}</option>
                  <option value="CARD">{t('paymentMethod.CARD', 'Thẻ Tín Dụng')}</option>
                  <option value="VNPAY">{t('paymentMethod.PREPAID_QR', 'Chuyển khoản QR')}</option>
                </select>
                <select 
                  className="bg-surface-container-low border-none rounded-xl text-xs font-semibold py-2.5 px-3 focus:ring-2 focus:ring-primary/20"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="NEWEST">{t('orders.sortNewest', 'Mới nhất')}</option>
                  <option value="OLDEST">{t('orders.sortOldest', 'Cũ nhất')}</option>
                  <option value="PRICE_HIGH">{t('orders.sortPriceHigh', 'Tổng tiền Cao -> Thấp')}</option>
                  <option value="PRICE_LOW">{t('orders.sortPriceLow', 'Tổng tiền Thấp -> Cao')}</option>
                </select>
                <button className="flex items-center justify-center gap-2 bg-surface-container-low border-none rounded-xl text-xs font-semibold py-2.5 hover:bg-surface-container-high transition-colors text-slate-400" onClick={() => {
                  setSearchTerm(''); setStatusFilter("ALL"); setPaymentFilter("ALL"); setSortOption("NEWEST");
                }}>
                  <span className="material-symbols-outlined text-sm">filter_list_off</span>
                  Xóa lọc
                </button>
              </div>
            </div>
          </section>

          {/* Data Table */}
          <section className="bg-surface-container-lowest rounded-xl ring-1 ring-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
            ) : error ? (
              <div className="p-12 text-center text-error font-bold">{error}</div>
            ) : displayedOrders.length === 0 ? (
               <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                 <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">sentiment_dissatisfied</span>
                 <p>Không có đơn hàng nào khớp với điều kiện lọc</p>
               </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-none">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Mã đơn</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Khách hàng</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Ngày đặt</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Số lượng</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Tổng tiền</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-surface-container/50 transition-colors group cursor-pointer" onClick={() => openDetail(order)}>
                      <td className="px-6 py-4 text-sm font-bold text-primary">#{order.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={getCustomerAvatar(order)}
                            name={getCustomerName(order)}
                            size={32}
                            userId={order.user_id || (order as any).user?.id || (order as any).user?._id}
                          />
                          <div>
                            <p className="text-xs font-bold text-on-surface">{getCustomerName(order) || "N/A"}</p>
                            <p className="text-[10px] text-slate-400">{getCustomerPhone(order) || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                      <td className="px-6 py-4 text-xs font-medium text-center">{order.items?.length || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-sm font-black text-on-surface">{(order.total_amount || 0).toLocaleString('vi-VN')} ₫</p>
                          {(() => {
                            const method = (order.payment?.method || order.payment_method || 'COD').toUpperCase();
                            const status = (order.payment?.status || order.payment_status || 'PENDING').toUpperCase();
                            const isCOD = method === 'COD';
                            const isPaid = status === 'PAID' || status === 'COMPLETED';
                            return (
                              <span className={`text-[9px] font-bold uppercase mt-0.5 ${
                                isPaid ? 'text-emerald-600' : isCOD ? 'text-blue-600' : 'text-amber-600'
                              }`}>
                                {isCOD ? 'COD' : method} - {
                                  isPaid ? t('paymentStatus.PAID', 'Đã thanh toán') : (
                                    status === 'PENDING' ? (isCOD ? t('paymentStatus.COD_PENDING', 'Chờ xác nhận đơn') : t('paymentStatus.UNPAID', 'Chờ thanh toán')) : status
                                  )
                                }
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(order.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-[0.95]" onClick={() => openDetail(order)}><span className="material-symbols-outlined text-lg">visibility</span></button>
                          <button className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-[0.95]" title="In / Tải hóa đơn" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setTimeout(() => handlePrintInvoice(), 100); }}><span className="material-symbols-outlined text-lg">print</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Pagination */}
            {!loading && displayedOrders.length > 0 && (
              <div className="p-4 bg-surface-container-low flex items-center justify-between border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Hiển thị {(safePage - 1) * itemsPerPage + 1} - {Math.min(safePage * itemsPerPage, filteredAndSortedOrders.length)} trong {filteredAndSortedOrders.length} đơn hàng
                </p>
                <div className="flex items-center gap-1">
                  <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white transition-all text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-[0.95]" disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold px-2">{safePage} / {totalPages}</span>
                  <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white transition-all text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-[0.95]" disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </section>

      <aside className={`fixed top-0 bottom-0 right-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.05)] z-[60] transform transition-transform duration-500 ease-in-out border-l border-slate-100 flex flex-col ${selectedOrder ? "translate-x-0" : "translate-x-full"}`}>
        {selectedOrder && (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-surface-container-low/50">
              <div>
                <h4 className="text-lg font-black tracking-tight">Chi tiết đơn hàng</h4>
                <p className="text-xs font-bold text-primary">#{selectedOrder.id}</p>
              </div>
              <button onClick={closeDetail} className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer active:scale-[0.95]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide min-h-0">
              {/* STATUS INDICATOR */}
              <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500">Trạng thái: </span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Status Timeline — single source: tracking.history */}
              {(() => {
                const STATUS_LABEL: Record<string, string> = {
                  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị',
                  SHIPPING: 'Đang giao hàng', DELIVERED: 'Hoàn thành', CANCELLED: 'Đã hủy', RETURNED: 'Đã hoàn trả',
                };
                const history: any[] = (selectedOrder as any).tracking?.history || [];
                // Deduplicate: keep the first occurrence of each status
                const seen = new Set<string>();
                const unique = history.filter((p: any) => {
                  if (seen.has(p.status)) return false;
                  seen.add(p.status);
                  return true;
                });
                if (unique.length === 0) return null;
                return (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lịch sử trạng thái</p>
                  <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                    {unique.map((point: any, idx: number) => (
                      <div className="relative flex items-start gap-3" key={idx}>
                        <span className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full ring-2 ring-white ${point.status === 'CANCELLED' ? 'bg-red-500' : point.status === 'DELIVERED' ? 'bg-emerald-500' : idx === unique.length - 1 ? 'bg-primary' : 'bg-slate-300'}`}></span>
                        <div className="flex-1 flex justify-between items-baseline min-w-0">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800">{t('orderStatuses.' + point.status, STATUS_LABEL[point.status] || point.status) as string}</p>
                            {point.note && point.note !== 'Cập nhật hệ thống' && (
                              <p className="text-[10px] text-slate-400 truncate">{point.note}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{new Date(point.timestamp).toLocaleString("vi-VN")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })()}

              {/* Customer Info */}
              <div className="p-4 bg-surface-container rounded-xl space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thông tin khách hàng</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">Tên:</span>
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        src={getCustomerAvatar(selectedOrder)}
                        name={getCustomerName(selectedOrder)}
                        size={24}
                        userId={selectedOrder.user_id || (selectedOrder as any).user?.id || (selectedOrder as any).user?._id}
                      />
                      <span className="text-xs font-bold">{getCustomerName(selectedOrder)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">SĐT:</span>
                    <span className="text-xs font-bold">{getCustomerPhone(selectedOrder)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">Địa chỉ:</span>
                    <span className="text-xs font-bold text-right max-w-[200px] leading-tight">{getFullAddress(selectedOrder)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">Thanh toán:</span>
                    {getPaymentBadge(selectedOrder)}
                  </div>
                  {selectedOrder.tracking?.tracking_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">Vận chuyển:</span>
                      <span className="text-xs font-bold text-blue-600">{selectedOrder.tracking.carrier || selectedOrder.shipping_provider || 'Hệ thống'} - {selectedOrder.tracking.tracking_number}</span>
                    </div>
                  )}
                  {selectedOrder.tracking?.dispatch_branch_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">Kho Xuất Hàng:</span>
                      <span className="text-xs font-bold">{selectedOrder.tracking.dispatch_branch_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Danh sách sản phẩm ({selectedOrder.items?.length})</p>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedOrder.items?.map((item: any, idx: number) => {
                     const isGift = item.is_gift || false;
                     const finalPrice = item.purchased_price ?? item.final_price ?? item.price ?? 0;
                     const originalPrice = item.original_price_at_purchase ?? item.original_price ?? finalPrice;
                     const discountAmt = item.discount_amount ?? item.discount ?? 0;
                     return (
                    <div className="flex items-center gap-4" key={idx}>
                      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-50 relative">
                        {isGift && <div className="absolute top-0 right-0 bg-primary/90 w-full text-white text-[8px] text-center font-bold">QUÀ TẶNG</div>}
                        <img
                          alt="product"
                          className="w-full h-full object-cover"
                          src={item.product_image || "https://via.placeholder.com/150"}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold line-clamp-2 leading-tight">
                          {isGift && <span className="text-primary mr-1">[Quà tặng]</span>}
                          {item.product_name || item.name || 'Sản phẩm'}
                        </p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                          <span>SL: {item.quantity}</span>
                          {!isGift && (
                             <>
                               {discountAmt > 0 && <span className="line-through ml-1">{Number(originalPrice).toLocaleString('vi-VN')}đ</span>}
                               <span className={discountAmt > 0 ? "text-primary font-bold" : ""}> x {Number(finalPrice).toLocaleString('vi-VN')}đ</span>
                             </>
                          )}
                          {isGift && <span className="text-primary font-bold"> (Miễn phí)</span>}
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black">{(item.quantity * finalPrice).toLocaleString('vi-VN')} ₫</p>
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t border-slate-100 pt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Tạm tính</span>
                  <span className="text-xs font-bold">{(selectedOrder.subtotal || 0).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Phí giao hàng</span>
                  <span className="text-xs font-bold text-emerald-600">{selectedOrder.shipping_fee > 0 ? `${selectedOrder.shipping_fee.toLocaleString('vi-VN')} ₫` : 'Miễn phí'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Giảm giá</span>
                  <span className="text-xs font-bold text-red-500">- {(selectedOrder.discount_amount || 0).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span className="text-sm font-black">Tổng thanh toán</span>
                  <span className="text-lg font-black text-primary tracking-tight">{(selectedOrder.total_amount || 0).toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>

              {selectedOrder.customer_note && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-sm">chat</span>
                    <span className="text-[10px] font-black uppercase text-blue-700">Khách ghi chú</span>
                  </div>
                  <p className="text-[10px] text-blue-800 leading-relaxed italic">"{selectedOrder.customer_note}"</p>
                </div>
              )}

              {selectedOrder.cancel_reason && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-600 text-sm">error</span>
                    <span className="text-[10px] font-black uppercase text-red-700">Lý do hủy đơn</span>
                  </div>
                  <p className="text-[10px] text-red-800 leading-relaxed font-bold">"{selectedOrder.cancel_reason}"</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-surface-container-low/30 flex flex-wrap gap-3 shrink-0">
              <button 
                onClick={handlePrintInvoice}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] flex-1 min-w-[120px]"
              >
                In Hóa đơn
              </button>


              {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'PROCESSING') && (
                <button 
                  onClick={() => setCancelModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] flex-1 min-w-[120px]"
                >
                  Hủy đơn
                </button>
              )}

              {selectedOrder.status === 'CANCELLED' && selectedOrder.refund_status !== 'COMPLETED' && (
                <button 
                  onClick={() => setRefundModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white border border-slate-200 text-purple-600 hover:bg-purple-50 hover:border-purple-200 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] flex-1 min-w-[120px]"
                >
                  Hoàn tiền
                </button>
              )}
              
              <button 
                onClick={() => setStatusModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:bg-primary-container transition-all cursor-pointer active:scale-[0.98] flex-1 min-w-[120px]"
              >
                Trạng thái
              </button>
            </div>
          </>
        )}
      </aside>

      {/* OVERLAYS & MODALS */}
      {/* Update Status Modal */}
      {isStatusModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => {
            setStatusModalOpen(false); setNewStatus(""); setStatusNote(""); setDispatchBranch(""); setTrackingNumber(""); setShippingProvider("");
          }}></div>
          <div className="bg-white w-full max-w-[440px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl z-10 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">update</span>
                </div>
                <div>
                  <h3 className="text-base font-black">Cập nhật trạng thái</h3>
                  <p className="text-[10px] text-slate-400">#{selectedOrder.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">Hiện tại:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin min-h-0">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trạng thái mới</label>
                <select 
                  className="w-full bg-surface-container-low border-none rounded-xl text-sm py-3 px-4 focus:ring-2 focus:ring-primary/20"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="" disabled>-- Chọn trạng thái --</option>
                  {selectedOrder.status === 'PENDING' && <option value="CONFIRMED">Xác nhận đơn</option>}
                  {selectedOrder.status === 'CONFIRMED' && <option value="PROCESSING">Đang chuẩn bị hàng</option>}
                  {selectedOrder.status === 'PROCESSING' && <option value="SHIPPING">Đang giao hàng</option>}
                  {selectedOrder.status === 'SHIPPING' && <option value="DELIVERED">Hoàn thành giao hàng</option>}
                  {selectedOrder.status === 'DELIVERED' && <option value="RETURNED">Trả hàng / Hoàn tiền</option>}
                </select>
                {['CANCELLED', 'RETURNED'].includes(selectedOrder.status) && (
                  <p className="text-xs text-red-500 font-bold mt-1">Đơn hàng ở trạng thái cuối, không thể chuyển tiếp.</p>
                )}
              </div>
              
              {newStatus === 'SHIPPING' && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-sm">local_shipping</span>
                    <span className="text-xs font-black uppercase text-blue-700 tracking-wide">Thông tin giao hàng</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kho xuất hàng (Bắt buộc)*</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20"
                      placeholder="VD: Lotte Mart Q7..."
                      value={dispatchBranch}
                      onChange={(e) => setDispatchBranch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">ĐV Vận chuyển</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20"
                        placeholder="VD: GHTK"
                        value={shippingProvider}
                        onChange={(e) => setShippingProvider(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mã vận đơn *</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20"
                        placeholder="Nhập mã tracking..."
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ghi chú nội bộ (Tùy chọn)</label>
                <textarea
                  className="w-full bg-surface-container-low border-none rounded-xl text-sm py-3 px-4 h-24 focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Ghi chú nội bộ..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
              <button 
                onClick={() => { setStatusModalOpen(false); setNewStatus(""); setStatusNote(""); setDispatchBranch(""); setTrackingNumber(""); setShippingProvider(""); }} 
                className="flex-1 inline-flex items-center justify-center h-10 px-5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98]">
                  Đóng
              </button>
              <button 
                onClick={handleUpdateStatus} 
                disabled={!newStatus}
                className="flex-1 inline-flex items-center justify-center h-10 px-5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:bg-primary-container transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {isCancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCancelModalOpen(false)}></div>
          <div className="bg-white w-full max-w-[440px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl z-10 relative overflow-hidden">
            
            <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-600 text-xl">cancel</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-red-600">Hủy đơn hàng</h3>
                  <p className="text-[10px] text-slate-400">Không thể hoàn tác</p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin min-h-0">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lý do hủy (Bắt buộc)*</label>
                <textarea
                  className="w-full bg-surface-container-low border-none rounded-xl text-sm py-3 px-4 h-24 focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Nhập lý do chi tiết..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
              <button onClick={() => setCancelModalOpen(false)} className="flex-1 inline-flex items-center justify-center h-10 px-5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98]">Đóng</button>
              <button 
                onClick={handleCancelOrder} 
                disabled={!cancelReason.trim()}
                className="flex-1 inline-flex items-center justify-center h-10 px-5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-bold shadow-lg shadow-red-600/15 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRefundModalOpen(false)}></div>
          <div className="bg-white w-full max-w-[440px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl z-10 relative overflow-hidden">
            
            <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-purple-600 text-xl">currency_exchange</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-purple-600">Hoàn tiền</h3>
                  <p className="text-[10px] text-slate-400">Số tiền: <strong>{(selectedOrder.total_amount || 0).toLocaleString('vi-VN')} ₫</strong></p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin min-h-0">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lý do hoàn tiền / Ghi chú</label>
                <textarea
                  className="w-full bg-surface-container-low border-none rounded-xl text-sm py-3 px-4 h-24 focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Hoàn tiền do hủy đơn..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
              <button onClick={() => setRefundModalOpen(false)} className="flex-1 inline-flex items-center justify-center h-10 px-5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98]">Trở lại</button>
              <button 
                onClick={handleRefundOrder} 
                className="flex-1 inline-flex items-center justify-center h-10 px-5 bg-purple-600 text-white hover:bg-purple-700 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/15 transition-all cursor-pointer active:scale-[0.98]"
              >
                Hoàn ngay
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default AdminLotteMartOrderManagement;