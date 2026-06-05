import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './component/Header/Header.tsx';
import Footer from './component/footer/Footer.tsx';
import { AuthGuard } from './component/AuthGuard.tsx';
import { useAppDispatch, useAppSelector } from './store.ts';
import { authVerify } from './slices/authSlice.ts';
import { loadProductsData } from './slices/productSlice.ts';
import { loadBranches } from './slices/branchSlice.ts';
import { addNotification } from './slices/notificationSlice.ts';
import { updateCartFromServer } from './slices/cartSlice.ts';
import ToastContainer from './components/Toast/ToastContainer.tsx';
import { socket } from './services/socket.ts';

// Pages
import Home from './pages/Home.tsx';
import Products from './pages/Products.tsx';
import ProductDetail from './pages/ProductDetail.tsx';
import ShopAtHome from './pages/ShopAtHome.tsx';
import SearchResults from './pages/SearchResults.tsx';
import FeaturedEvents from './pages/FeaturedEvents.tsx';
import EventDetail from './pages/EventDetail.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import LoginSuccess from './pages/LoginSuccess.tsx';
import Cart from './pages/Cart.tsx';
import Checkout from './pages/Checkout.tsx';
import { PaymentPage } from './pages/Payment.tsx';
import PaymentSuccess from './pages/PaymentSuccess.tsx';
import PaymentFailed from './pages/PaymentFailed.tsx';
import Orders from './pages/Orders.tsx';
import OrderTracking from './pages/OrderTracking.tsx';
import Profile from './pages/Profile.tsx';
import OrderDetail from './pages/OrderDetail.tsx';
import Addresses from './pages/Addresses.tsx';
import MyCoupons from './pages/MyCoupons.tsx';
import ReviewManager from './pages/ReviewManager.tsx';
import SupportCenter from './pages/SupportCenter.tsx';
import PaymentMethods from './pages/PaymentMethods.tsx';
import LoyaltyRewards from './pages/LoyaltyRewards.tsx';
import Notifications from './pages/Notifications.tsx';
import Settings from './pages/Settings.tsx';
import Wishlist from './pages/Wishlist.tsx';
import ViewedHistory from './pages/ViewedHistory.tsx';
import ReturnRequests from './pages/ReturnRequests.tsx';
import ErrorPage from './pages/ErrorPage.tsx';
import Promotions from './pages/Promotions.tsx';
import PromotionDetail from './pages/PromotionDetail.tsx';
import ComparePage from './pages/Compare.tsx';
import AccountLayout from './layouts/AccountLayout.tsx';
import CompareBar from './components/compare/CompareBar.tsx';
import viewHistoryService from './services/viewHistoryService.ts';
import StorefrontPopupModal from './components/StorefrontPopupModal/StorefrontPopupModal.tsx';

// Admin Pages
import AdminLayout from './layouts/AdminLayout.tsx';
import AdminGuard from './admin/guards/AdminGuard.tsx';
import AdminLogin from './admin/pages/AdminLogin.tsx';
import AdminDashboard from './admin/pages/AdminDashboard.tsx';
import AdminProductManagement from './admin/pages/AdminProductManagement.tsx';
import AdminCategoryManagement from './admin/pages/AdminCategoryManagement';
import AdminCustomers from './admin/pages/AdminCustomers.tsx';
import AdminCouponsManagement from './admin/pages/AdminCouponsManagement.tsx';
import AdminLotteMartEventsManagementPortal from './admin/pages/AdminLotteMartEventsManagementPortal.tsx';
import AdminSystemSettings from './admin/pages/AdminSystemSettings.tsx';
import AdminLotteMartOrderManagement from './admin/pages/AdminLotteMartOrderManagement.tsx';
import AdminReviewsManagement from './admin/pages/AdminReviewsManagement.tsx';
import AdminQuestions from './admin/pages/AdminQuestions.tsx';
import AdminSupportTickets from './admin/pages/AdminSupportTickets.tsx';
import AdminSuppliers from './admin/pages/AdminSuppliers.tsx';
import AdminImportOrders from './admin/pages/AdminImportOrders.tsx';
import AdminImportReceipts from './admin/pages/AdminImportReceipts.tsx';
import AdminInventoryBatches from './admin/pages/AdminInventoryBatches.tsx';
import AdminStockMovements from './admin/pages/AdminStockMovements.tsx';
import AdminRolesPermissions from './admin/pages/AdminRolesPermissions.tsx';
import AdminAuditLogs from './admin/pages/AdminAuditLogs.tsx';
import AdminBranchLocations from './admin/pages/AdminBranchLocations.tsx';
import AdminReturnRequests from './admin/pages/AdminReturnRequests.tsx';
import AdminPermissionGuard from './admin/guards/AdminPermissionGuard.tsx';
import CarrotScene from './pages/CarrotScene.tsx';
import About from './pages/About.tsx';
import SmartShopping from './pages/SmartShopping.tsx';
import SharedFamilyCart from './pages/SharedFamilyCart.tsx';
import RecipeDetail from './pages/RecipeDetail.tsx';
import LotteFunZone from './pages/LotteFunZone.tsx';
import AdminGamification from './admin/pages/AdminGamification.tsx';


function App() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const productState = useAppSelector((state) => state.product);
  const authState = useAppSelector((state) => state.auth);
  const { i18n } = useTranslation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const mergedHistoryUserRef = useRef('');

  useEffect(() => {
    const apiHost = (import.meta.env.VITE_API_HOST || '').trim();
    const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

    if (!apiHost) {
      console.error('Missing VITE_API_HOST in environment');
    }
    if (!googleClientId) {
      console.error('Missing VITE_GOOGLE_CLIENT_ID in environment');
    }

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setBootstrapError(null);

      const tasks: Promise<any>[] = [
        dispatch(loadProductsData()).unwrap(),
        dispatch(loadBranches()).unwrap(),
        // Always verify user session — it gracefully handles missing tokens.
        // Admin session verification is handled independently by AdminGuard.
        dispatch(authVerify()).unwrap(),
      ];

      const results = await Promise.allSettled(tasks);
      const isFailed = results.every(r => r.status === 'rejected');

      if (isFailed) {
        setBootstrapError('Không thể kết nối API. Đang dùng dữ liệu dự phòng.');
      }

      setIsBootstrapping(false);
    };

    bootstrap();
    
    // Feature Parity: Consume Admin Settings (branding + maintenance)
    import('./services/dataService').then(({ dataService }) => {
      dataService.getAdminSettings().then(settings => {
        if (settings) {
          // Browser tab title — prefer dedicated system_name, fallback to brand_name
          const tabTitle = settings.system_name || settings.brand_name || "LOTTE Mart";
          if (tabTitle) document.title = tabTitle;

          // Dynamic favicon — prefer dedicated favicon_url, fallback to brand_logo_url
          const faviconUrl = settings.favicon_url || settings.brand_logo_url;
          if (faviconUrl) {
            const clean = faviconUrl.split('?')[0];
            // Remove ALL existing favicon links so the browser cannot cache the Vite default
            document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach(el => el.remove());
            const link = document.createElement('link');
            link.id = 'dynamic-favicon';
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = `${clean}?v=${Date.now()}`;
            document.head.appendChild(link);
          }
        }
      }).catch(() => {});

      dataService.getMaintenanceStatus().then(status => {
        if (status && (status.maintenance === true || status.maintenance === 'true')) {
          setMaintenanceMode(true);
        }
      }).catch(() => {});
    });
  }, [dispatch, i18n.language]);

  // Handle Socket.IO connection for realtime maintenance status updates
  useEffect(() => {
    if (isAdminRoute) return;

    const handleMaintenanceOn = () => {
      console.log('[Socket] Received maintenance:on');
      setMaintenanceMode(true);
    };

    const handleMaintenanceOff = () => {
      console.log('[Socket] Received maintenance:off');
      setMaintenanceMode(false);
    };

    socket.on('maintenance:on', handleMaintenanceOn);
    socket.on('maintenance:off', handleMaintenanceOff);

    return () => {
      socket.off('maintenance:on', handleMaintenanceOn);
      socket.off('maintenance:off', handleMaintenanceOff);
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute) {
      // Do not trigger user history merge when browsing admin routes.
      return;
    }

    const userId = String((authState.user as any)?.id || (authState.user as any)?._id || (authState.user as any)?.user_id || '');
    if (!authState.isAuthenticated || !userId) {
      mergedHistoryUserRef.current = '';
      return;
    }

    if (mergedHistoryUserRef.current === userId) return;
    mergedHistoryUserRef.current = userId;

    viewHistoryService.mergeLocalOnLogin({
      isAuthenticated: true,
      user: authState.user,
    }).catch(() => {
      mergedHistoryUserRef.current = '';
    });
  }, [authState.isAuthenticated, authState.user, isAdminRoute]);

  // Handle Socket.IO connection for realtime notifications
  useEffect(() => {
    const userId = String((authState.user as any)?.id || (authState.user as any)?._id || (authState.user as any)?.user_id || '');
    if (authState.isAuthenticated && userId && !isAdminRoute) {
      socket.emit('join_user', userId);

      const handleNewNotification = (notification: any) => {
        dispatch(addNotification(notification));
      };

      const handleCartUpdated = (data: { branch_id: string; cart?: any; cleared?: boolean }) => {
        dispatch(updateCartFromServer(data));
      };

      socket.on('new_notification', handleNewNotification);
      socket.on('cart_updated', handleCartUpdated);

      return () => {
        socket.off('new_notification', handleNewNotification);
        socket.off('cart_updated', handleCartUpdated);
      };
    }
  }, [authState.isAuthenticated, authState.user, isAdminRoute, dispatch]);

  // Admin routes have their own loading gate via AdminGuard — don't block them here
  if (isBootstrapping && !isAdminRoute) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-center p-8">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 animate-spin">progress_activity</span>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Đang tải dữ liệu</h1>
        <p className="text-slate-500 max-w-md">Vui lòng chờ trong giây lát...</p>
      </div>
    );
  }

  if (maintenanceMode && !isAdminRoute) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-center p-8">
        <span className="material-symbols-outlined text-6xl text-orange-500 mb-4 animate-bounce">construction</span>
        <h1 className="text-3xl font-black text-slate-800 mb-2">Hệ thống đang bảo trì</h1>
        <p className="text-slate-500 max-w-md">Lotte Mart đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau ít phút, xin lỗi vì sự bất tiện này!</p>
      </div>
    );
  }

  return (
    <>
      {!isAdminRoute && <Header />}
      {!isAdminRoute && (bootstrapError || productState.status === 'failed') && (
        <div className="mx-auto mt-4 w-[min(100%,1200px)] px-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            {bootstrapError || productState.error || 'API tạm thời không phản hồi. Đã chuyển sang dữ liệu dự phòng.'}
          </div>
        </div>
      )}
      <Routes key={i18n.language}>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/:locale/product/:id" element={<ProductDetail />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/shop-at-home" element={<ShopAtHome />} />
        <Route path="/hot-deals/product/:id" element={<ProductDetail />} />
        <Route path='/about' element={<About />} />
        <Route path="/home/product/:id" element={<ProductDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/featured-events" element={<FeaturedEvents />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/order/track/:orderId" element={<OrderTracking />} />
        <Route path="/order/track" element={<OrderTracking />} />
        <Route path="/carrot-scene" element={<CarrotScene />} />
        <Route path="/smart-shopping" element={<SmartShopping />} />
        <Route path="/lotte-fun-zone" element={<AuthGuard><LotteFunZone /></AuthGuard>} />
        <Route path="/recipes" element={<RecipeDetail />} />
        <Route path="/recipes/:name" element={<RecipeDetail />} />
        <Route path="/family-cart" element={<AuthGuard><SharedFamilyCart /></AuthGuard>} />
        {/* Protected Routes */}
        <Route path="/cart" element={<AuthGuard><Cart /></AuthGuard>} />
        
        {/* Checkout Flow */}
        <Route path="/checkout/*" element={<AuthGuard><Checkout /></AuthGuard>} />
        <Route path="/payment" element={<AuthGuard><PaymentPage /></AuthGuard>} />
        <Route path="/payment/success" element={<AuthGuard><PaymentSuccess /></AuthGuard>} />
        <Route path="/payment/fail" element={<AuthGuard><PaymentFailed /></AuthGuard>} />

        {/* Account / Dashboard Flow */}
        <Route element={<AuthGuard><AccountLayout /></AuthGuard>}>
          <Route path="/account" element={<Profile />} />
          <Route path="/account/orders" element={<Orders />} />
          <Route path="/account/orders/:orderId" element={<OrderDetail />} />
          <Route path="/account/addresses" element={<Addresses />} />
          <Route path="/account/coupons" element={<MyCoupons />} />
          <Route path="/account/payments" element={<PaymentMethods />} />
          <Route path="/account/loyalty" element={<LoyaltyRewards />} />
          <Route path="/account/reviews" element={<ReviewManager />} />
          <Route path="/account/support" element={<SupportCenter />} />
          <Route path="/account/settings" element={<Settings />} />
          <Route path="/account/notifications" element={<Notifications />} />
          <Route path="/account/wishlist" element={<Wishlist />} />
          <Route path="/account/viewed-history" element={<ViewedHistory />} />
          <Route path="/account/returns" element={<ReturnRequests />} />
        </Route>

        <Route path="/promotions" element={<Promotions />} />
        <Route path="/promotions/:id" element={<PromotionDetail />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProductManagement />} />
            <Route path="categories" element={<AdminPermissionGuard permission="products.read"><AdminCategoryManagement /></AdminPermissionGuard>} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="coupons" element={<AdminCouponsManagement />} />
            <Route path="gamification" element={<AdminGamification />} />
            <Route path="events" element={<AdminLotteMartEventsManagementPortal />} />
            <Route path="settings" element={<AdminSystemSettings />} />
            <Route path="orders" element={<AdminLotteMartOrderManagement />} />
            <Route path="reviews" element={<AdminReviewsManagement />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="support" element={<AdminSupportTickets />} />
            <Route path="returns" element={<AdminReturnRequests />} />
            <Route path="suppliers" element={<AdminPermissionGuard permission="suppliers.read"><AdminSuppliers /></AdminPermissionGuard>} />
            <Route path="import-orders" element={<AdminPermissionGuard permission="imports.read"><AdminImportOrders /></AdminPermissionGuard>} />
            <Route path="import-receipts" element={<AdminPermissionGuard permission="imports.read"><AdminImportReceipts /></AdminPermissionGuard>} />
            <Route path="inventory-batches" element={<AdminPermissionGuard permission="inventory.read"><AdminInventoryBatches /></AdminPermissionGuard>} />
            <Route path="stock-movements" element={<AdminPermissionGuard permission="inventory.read"><AdminStockMovements /></AdminPermissionGuard>} />
            <Route path="roles" element={<AdminPermissionGuard superAdminOnly><AdminRolesPermissions /></AdminPermissionGuard>} />
            <Route path="audit-logs" element={<AdminPermissionGuard permission="audit.read"><AdminAuditLogs /></AdminPermissionGuard>} />
            <Route path="branch-locations" element={<AdminPermissionGuard permission="settings.read"><AdminBranchLocations /></AdminPermissionGuard>} />
          </Route>
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
      {!isAdminRoute && <CompareBar />}
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <StorefrontPopupModal />}
      <ToastContainer />
    </>
  );
}

export default App;
