import * as Types from '../types';
import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';
import { normalizeBranchProducts, normalizeCategories, normalizeProducts } from '../utils/productNormalization';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/** Safely extract array from any API response shape */
const arr = (res: any): any[] => {
  if (!res) return [];
  const d = res.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.result)) return d.result;
  return [];
};

/** Safely extract single object from response */
const obj = (res: any): any => {
  if (!res) return null;
  const d = res.data ?? res;
  return d.data ?? d;
};

/** Fire API, return safe fallback on error */

/** Fire API expecting array, return [] on error */
const safeArr = async (promise: Promise<any>): Promise<any[]> => {
  try {
    const res = await promise;
    return arr(res);
  } catch (err) {
    console.warn('[dataService] API error, returning []:', err);
    return [];
  }
};

/** Fire API expecting object, return null on error */
const safeObj = async (promise: Promise<any>): Promise<any> => {
  try {
    const res = await promise;
    return obj(res);
  } catch (err) {
    console.warn('[dataService] API error, returning null:', err);
    return null;
  }
};

// Validation regexes (still used for client-side pre-validation)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^(?:\+84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
// eslint-disable-next-line no-useless-escape
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()\[\]{}^~#\-+=<>/\\;:'",.])[A-Za-z\d@$!%*?&()\[\]{}^~#\-+=<>/\\;:'\",.]{8,}$/;

export const dataService = {
  // ═══════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════
  getUsers: async (params?: { role_type?: string }): Promise<Types.User[]> => {
    return safeArr(httpClient.get(endpoints.users.list, { params }));
  },
  searchUsers: async (query: string): Promise<Types.User[]> => {
    return safeArr(httpClient.get(endpoints.users.list, { params: { search: query, limit: 10 } }));
  },
  getUser: async (id: number | string): Promise<Types.User | undefined> => {
    return safeObj(httpClient.get(endpoints.users.detail(id)));
  },
  updateUserProfile: async (userId: number | string, updateObj: Partial<Types.User>): Promise<Types.User> => {
    const res = await httpClient.put(endpoints.users.update(userId), updateObj);
    return obj(res);
  },
  changePassword: async (_userId: number | string, currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    const res = await httpClient.post(endpoints.auth.changePassword, { currentPassword: currentPass, newPassword: newPass });
    return obj(res) || { success: true, message: 'Đổi mật khẩu thành công' };
  },
  logoutAllDevices: async (_userId: number | string): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await httpClient.post(endpoints.auth.logoutAll, {});
    return obj(res) || { success: true, message: 'Đã đăng xuất khỏi tất cả thiết bị' };
  },
  updateUserSettings: async (userId: number | string, patch: Partial<Types.User>): Promise<Types.User> => {
    const res = await httpClient.put(endpoints.users.settings(userId), patch);
    return obj(res);
  },
  toggleUserStatus: async (userId: number | string): Promise<Types.User> => {
    const res = await httpClient.post(endpoints.users.toggleStatus(userId));
    return obj(res);
  },
  resetUserPassword: async (userId: number | string, password?: string): Promise<{ success: boolean; newPass: string }> => {
    const res = await httpClient.post(endpoints.users.resetPassword(userId), { password });
    const data = obj(res);
    return { success: true, newPass: data?.newPassword || 'RESET' };
  },
  deleteUser: async (userId: number | string): Promise<boolean> => {
    await httpClient.delete(`/users/${userId}`);
    return true;
  },
  adjustUserPoints: async (userId: number | string, points: number, reason: string): Promise<Types.User> => {
    const res = await httpClient.post(endpoints.users.adjustPoints(userId), { points, reason });
    return obj(res);
  },
  updateUserMembership: async (userId: number | string, level: string): Promise<Types.User> => {
    const res = await httpClient.put(endpoints.users.updateMembership(userId), { level });
    return obj(res);
  },
  getUserAddresses: async (userId: number | string): Promise<Types.UserAddress[]> => {
    return safeArr(httpClient.get(endpoints.addresses.list, { params: { user_id: userId } }));
  },
  getUserReviews: async (userId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.reviews.list, { params: { user_id: userId } }));
  },
  getUserWishlist: async (userId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.wishlist.list, { params: { user_id: userId } }));
  },
  getUserTickets: async (userId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.users.tickets(userId)));
  },
  getUserCouponUsage: async (userId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.users.couponUsage(userId)));
  },
  getUserLoyaltyTransactions: async (userId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.loyalty.transactions, { params: { user_id: userId } }));
  },
  getUserLoginHistory: async (userId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.users.loginHistory(userId)));
  },
  getProfileSummary: async (): Promise<any> => {
    return safeObj(httpClient.get(endpoints.auth.profileSummary));
  },

  // ═══════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════
  authRegister: async (payload: any): Promise<{ token: string; user: Types.User }> => {
    if (payload.email && !emailRegex.test(payload.email)) throw new Error('400_INVALID_EMAIL');
    if (payload.phone && !phoneRegex.test(payload.phone)) throw new Error('400_INVALID_PHONE');
    if (payload.password && !passwordRegex.test(payload.password)) throw new Error('400_PASSWORD_WEAK');
    const res = await httpClient.post(endpoints.auth.register, payload);
    return obj(res);
  },
  authLogin: async (credentials: any): Promise<{ token: string; user: Types.User }> => {
    const res = await httpClient.post(endpoints.auth.login, credentials);
    return obj(res);
  },
  authVerify: async (token: string): Promise<Types.User> => {
    const res = await httpClient.get(endpoints.auth.verify, { headers: { Authorization: `Bearer ${token}` } });
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════
  getProducts: async (): Promise<Types.Product[]> => {
    const rows = await safeArr(httpClient.get(endpoints.products.list));
    return normalizeProducts(rows);
  },
  getProduct: async (id: number | string): Promise<Types.Product | undefined> => {
    return safeObj(httpClient.get(endpoints.products.detail(id)));
  },
  getProductsByIds: async (ids: (number | string)[]): Promise<Types.Product[]> => {
    // Fetch each individually; backend doesn't have a bulk endpoint yet
    try {
      const results = await Promise.all(ids.map(id => httpClient.get(endpoints.products.detail(id)).catch(() => null)));
      return results.filter(Boolean).map(r => obj(r)).filter(Boolean);
    } catch { return []; }
  },
  searchProducts: async (query: string, branchId?: string): Promise<Types.BranchProduct[]> => {
    return safeArr(httpClient.get(endpoints.products.search, { params: { search: query, ...(branchId ? { branchId } : {}) } }));
  },
  getProductPolicies: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.products.policies));
  },
  getRelatedProducts: async (productId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.products.related(productId)));
  },
  getProductQuestions: async (productId: number | string): Promise<Types.ProductQuestion[]> => {
    return safeArr(httpClient.get(endpoints.products.questions(productId)));
  },
  askProductQuestion: async (productId: number | string, content: string): Promise<any> => {
    const res = await httpClient.post(endpoints.products.askQuestion(productId), { content });
    return obj(res);
  },
  getProductRecommendations: async (productId: number | string): Promise<{ related: any[]; bought_together: any[] }> => {
    const payload = await safeObj(httpClient.get(endpoints.products.recommendations(productId)));
    return {
      related: Array.isArray(payload?.related) ? payload.related : [],
      bought_together: Array.isArray(payload?.bought_together) ? payload.bought_together : [],
    };
  },

  // ═══════════════════════════════════════════════
  // BRANCH PRODUCTS
  // ═══════════════════════════════════════════════
  getBranchProducts: async (branchId?: string): Promise<Types.BranchProduct[]> => {
    const rows = await safeArr(httpClient.get(endpoints.branchProducts.list, { params: branchId ? { branch_id: branchId } : {} }));
    return normalizeBranchProducts(rows);
  },
  getBranchProduct: async (id: string | number): Promise<Types.BranchProduct | undefined> => {
    return safeObj(httpClient.get(endpoints.branchProducts.detail(id)));
  },
  getAllBranchProducts: async (): Promise<Types.BranchProduct[]> => {
    return safeArr(httpClient.get(endpoints.branchProducts.list));
  },
  createBranchProduct: async (payload: any): Promise<Types.BranchProduct> => {
    const res = await httpClient.post(endpoints.branchProducts.create, payload);
    return obj(res);
  },
  updateBranchProduct: async (id: string | number, updates: Partial<Types.BranchProduct>): Promise<Types.BranchProduct> => {
    const res = await httpClient.put(endpoints.branchProducts.update(id), updates);
    return obj(res);
  },
  deleteBranchProduct: async (id: string | number): Promise<boolean> => {
    await httpClient.delete(endpoints.branchProducts.delete(id));
    return true;
  },
  adjustStock: async (id: string | number, quantityChange: number, reason: string): Promise<Types.BranchProduct> => {
    const res = await httpClient.post(endpoints.branchProducts.adjustStock(id), { quantityChange, reason });
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════
  getCategories: async (): Promise<Types.Category[]> => {
    const rows = await safeArr(httpClient.get(endpoints.categories.list));
    return normalizeCategories(rows);
  },

  // ═══════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════
  getOrders: async (branchId?: string): Promise<Types.Order[]> => {
    const raw = await safeArr(httpClient.get(endpoints.orders.list, { params: branchId && branchId !== 'ALL' ? { branch_id: branchId } : {} }));
    // Normalize: ensure every order has `id` field (some may only have `_id`)
    return raw.map((o: any) => ({
      ...o,
      id: o.id || o._id || '',
      branch_id: o.branch_id || '',
      branch_name: o.branch_name || '',
      order_address: o.order_address || o.shipping_address || null,
      items: Array.isArray(o.items) ? o.items : [],
      total_amount: o.total_amount || 0,
      subtotal: o.subtotal || 0,
      shipping_fee: o.shipping_fee || 0,
      discount_amount: o.discount_amount || 0,
      status: o.status || 'PENDING',
      payment: o.payment || null,
      payment_method: o.payment_method || o.payment?.method || 'COD',
      payment_status: o.payment_status || o.payment?.status || 'PENDING',
      created_at: o.created_at || o.createdAt || new Date().toISOString(),
      updated_at: o.updated_at || o.updatedAt || new Date().toISOString(),
    }));
  },
  getOrdersByUser: async (userId: string | number): Promise<Types.Order[]> => {
    const raw = await safeArr(httpClient.get(endpoints.orders.list, { params: { user_id: userId } }));
    return raw.map((o: any) => ({
      ...o,
      id: o.id || o._id || '',
      branch_id: o.branch_id || '',
      branch_name: o.branch_name || '',
      order_address: o.order_address || o.shipping_address || null,
      items: Array.isArray(o.items) ? o.items : [],
      total_amount: o.total_amount || 0,
      subtotal: o.subtotal || 0,
      shipping_fee: o.shipping_fee || 0,
      discount_amount: o.discount_amount || 0,
      status: o.status || 'PENDING',
      payment: o.payment || null,
      payment_method: o.payment_method || o.payment?.method || 'COD',
      payment_status: o.payment_status || o.payment?.status || 'PENDING',
      created_at: o.created_at || o.createdAt || new Date().toISOString(),
      updated_at: o.updated_at || o.updatedAt || new Date().toISOString(),
    }));
  },
  getOrder: async (id: string): Promise<Types.Order | undefined> => {
    return safeObj(httpClient.get(endpoints.orders.detail(id)));
  },
  createOrder: async (orderPayload: any): Promise<Types.Order> => {
    const res = await httpClient.post(endpoints.orders.create, orderPayload);
    // Backend returns { success, data: order } or legacy { success, order }
    const raw = res?.data ?? res;
    const o = raw?.data ?? raw?.order ?? raw;
    // Normalize: ensure id field
    if (o && !o.id && o._id) o.id = String(o._id);
    else if (o && o._id === undefined && o.id === undefined) console.warn('[dataService] createOrder returned no ID', o);
    console.log('[dataService] createOrder result — id:', o?.id, '_id:', o?._id);
    return o;
  },
  createOrderFromCart: async (orderPayload: any): Promise<Types.Order> => {
    const res = await httpClient.post(endpoints.orders.createFromCart, orderPayload);
    const o = obj(res);
    if (o && !o.id && o._id) o.id = String(o._id);
    return o;
  },
  calculateCheckout: async (payload: any): Promise<any> => {
    const res = await httpClient.post(endpoints.checkout.calculate, payload);
    return obj(res);
  },
  previewCheckout: async (payload: any): Promise<any> => {
    const res = await httpClient.post(endpoints.checkout.preview, payload);
    return obj(res);
  },
  cancelOrder: async (id: string, reason?: string): Promise<Types.Order> => {
    const res = await httpClient.put(endpoints.orders.cancel(id), { reason });
    const o = obj(res); if (o && !o.id && o._id) o.id = o._id; return o;
  },
  updateOrderStatus: async (id: string, status: string, note?: string, trackingMetadata?: { tracking_number?: string, carrier?: string, dispatch_branch?: string, dispatch_branch_name?: string }): Promise<Types.Order> => {
    const res = await httpClient.put(endpoints.orders.updateStatus(id), { status, note, ...trackingMetadata });
    const o = obj(res); if (o && !o.id && o._id) o.id = o._id; return o;
  },
  refundOrder: async (id: string, reason?: string): Promise<Types.Order> => {
    const res = await httpClient.post(endpoints.orders.refund(id), { reason });
    const o = obj(res); if (o && !o.id && o._id) o.id = o._id; return o;
  },
  assignTrackingNumber: async (id: string, tracking_number: string, provider?: string): Promise<Types.Order> => {
    const res = await httpClient.put(endpoints.orders.assignTracking(id), { tracking_number, provider });
    const o = obj(res); if (o && !o.id && o._id) o.id = o._id; return o;
  },
  reorderItems: async (id: string): Promise<any> => {
    try {
      const res = await httpClient.post(endpoints.orders.reorder(id));
      const raw = res?.data ?? res;
      if (raw && typeof raw === 'object' && 'success' in raw) {
        return raw as any;
      }
      return { success: true, message: 'Đã thêm sản phẩm vào giỏ hàng', data: raw } as any;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Lỗi khi đặt lại đơn hàng';
      return { success: false, message };
    }
  },
  getInvoice: async (id: string): Promise<{ success: boolean; url?: string; message?: string }> => {
    try {
      const res = await httpClient.get(endpoints.orders.invoice(id));
      return obj(res) || { success: true, url: '#', message: 'Đang tải hóa đơn...' };
    } catch { return { success: false, message: 'Không thể tải hóa đơn' }; }
  },
  trackOrder: async (id: string): Promise<any> => {
    return safeObj(httpClient.get(endpoints.orders.tracking(id)));
  },

  // ═══════════════════════════════════════════════
  // CARTS (BRANCH-BASED)
  // ═══════════════════════════════════════════════
  getCarts: async (): Promise<Types.Cart[]> => {
    return safeArr(httpClient.get('/carts'));
  },
  getCart: async (_userId: number | string, branchId?: string): Promise<Types.Cart | undefined> => {
    if (!branchId) return undefined;
    return safeObj(httpClient.get(endpoints.cart.get, { params: { branch_id: branchId } }));
  },
  getAllBranchCarts: async (): Promise<{ [branchId: string]: Types.CartItem[] }> => {
    try {
      const res = await httpClient.get(endpoints.cart.allBranches);
      // Backend returns: { data: { success: true, data: { branchId: items[] } } }
      // After axios: res = { data: { success: true, data: { branchId: items[] } } }
      // But httpClient interceptor may unwrap to res = { success: true, data: {...} }
      const body = res?.data ?? res;
      const cartMap = body?.data ?? body;
      console.log('[dataService] getAllBranchCarts — body:', body, 'cartMap:', cartMap);
      // cartMap should be { branchId: items[] } at this point
      if (cartMap && typeof cartMap === 'object' && !Array.isArray(cartMap)) {
        // Filter out non-cart-map keys like 'success', 'message'
        const result: { [key: string]: any[] } = {};
        for (const [key, val] of Object.entries(cartMap)) {
          if (Array.isArray(val)) {
            result[key] = val;
          }
        }
        return result;
      }
      return {};
    } catch { return {}; }
  },
  addToCart: async (
    _userId: number | string,
    branchProductId: number | string,
    qty: number = 1,
    branchId?: string,
    price?: number,
    unitPrice?: number,
    productName?: string,
    productImage?: string
  ): Promise<{success: boolean, message?: string, cart?: any}> => {
    try {
      const res = await httpClient.post(endpoints.cart.add, {
        branch_id: branchId,
        branch_product_id: String(branchProductId),
        quantity: qty,
        price: price || 0,
        unit_price: unitPrice || price || 0,
        product_name: productName || '',
        product_image: productImage || '',
      });
      // Backend returns: { success: true, data: cart, message: '...' }
      // After axios: res.data = { success: true, data: cart, message: '...' }
      // httpClient interceptor may unwrap res.data already
      const body = res?.data ?? res;
      console.log('[dataService] addToCart — raw body:', body);

      // body is either { success: true, data: cart } or the cart object itself
      if (body?.success !== undefined) {
        // Has success field — proper response
        return { success: body.success, message: body.message, cart: body.data };
      }
      // body IS the cart object (already unwrapped by obj/interceptor)
      if (body?._id || body?.items) {
        return { success: true, message: 'Đã thêm vào giỏ hàng', cart: body };
      }
      return { success: true, message: 'Đã thêm vào giỏ hàng' };
    } catch (err: any) {
      console.error('[dataService] addToCart error:', err);
      return { success: false, message: err?.response?.data?.message || 'Lỗi thêm giỏ hàng' };
    }
  },
  updateCartItem: async (branchProductId: string, quantity: number, branchId: string): Promise<{success: boolean}> => {
    try {
      await httpClient.put(endpoints.cart.update(branchProductId), { branch_id: branchId, quantity });
      return { success: true };
    } catch { return { success: false }; }
  },
  removeCartItem: async (branchProductId: string, branchId: string): Promise<{success: boolean}> => {
    try {
      await httpClient.delete(endpoints.cart.remove(branchProductId), { params: { branch_id: branchId } });
      return { success: true };
    } catch { return { success: false }; }
  },
  clearCartByBranch: async (_userId: number | string, branchId: string): Promise<{success: boolean}> => {
    try {
      await httpClient.post(endpoints.cart.clear, { branch_id: branchId });
      return { success: true };
    } catch { return { success: false }; }
  },

  // ═══════════════════════════════════════════════
  // COUPONS
  // ═══════════════════════════════════════════════
  getCoupons: async (): Promise<Types.Coupon[]> => {
    return safeArr(httpClient.get(endpoints.coupons.list));
  },
  getCoupon: async (code: string): Promise<Types.Coupon | undefined> => {
    return safeObj(httpClient.get(endpoints.coupons.detail(code)));
  },
  applyCoupon: async (code: string, _userId?: number): Promise<{success: boolean, message: string, discount?: number}> => {
    try {
      const res = await httpClient.post(endpoints.coupons.apply, { code });
      return obj(res) || { success: true, message: 'Áp dụng thành công' };
    } catch { return { success: false, message: 'Mã giảm giá không hợp lệ' }; }
  },
  removeCoupon: async (): Promise<{success: boolean, message: string}> => {
    try {
      const res = await httpClient.post(endpoints.coupons.remove);
      return obj(res) || { success: true, message: 'Đã bỏ coupon' };
    } catch {
      return { success: false, message: 'Không thể bỏ coupon' };
    }
  },
  getCouponUsage: async (): Promise<Types.CouponUsage[]> => {
    return safeArr(httpClient.get(endpoints.coupons.usage));
  },

  // ═══════════════════════════════════════════════
  // DELIVERY SLOTS
  // ═══════════════════════════════════════════════
  getDeliverySlots: async (branchId?: string): Promise<Types.DeliverySlot[]> => {
    return safeArr(httpClient.get(endpoints.deliverySlots.list, { params: branchId ? { branchId } : {} }));
  },

  // ═══════════════════════════════════════════════
  // ADDRESSES
  // ═══════════════════════════════════════════════
  getAddresses: async (): Promise<Types.UserAddress[]> => {
    const raw = await safeArr(httpClient.get(endpoints.addresses.list));
    return raw.map((a: any) => ({ ...a, id: a.id || a._id }));
  },
  createAddress: async (payload: any): Promise<Types.UserAddress> => {
    const res = await httpClient.post(endpoints.addresses.create, payload);
    const o = obj(res);
    if (o && !o.id && o._id) o.id = o._id;
    return o;
  },
  updateAddress: async (id: string | number, payload: any): Promise<Types.UserAddress> => {
    const res = await httpClient.put(endpoints.addresses.update(id), payload);
    const o = obj(res);
    if (o && !o.id && o._id) o.id = o._id;
    return o;
  },
  deleteAddress: async (id: string | number): Promise<Types.UserAddress[]> => {
    await httpClient.delete(endpoints.addresses.delete(id));
    const raw = await safeArr(httpClient.get(endpoints.addresses.list));
    return raw.map((a: any) => ({ ...a, id: a.id || a._id }));
  },
  setDefaultAddress: async (id: string | number): Promise<Types.UserAddress> => {
    const res = await httpClient.put(endpoints.addresses.setDefault(id));
    const o = obj(res);
    if (o && !o.id && o._id) o.id = o._id;
    return o;
  },

  // ═══════════════════════════════════════════════
  // WISHLIST
  // ═══════════════════════════════════════════════
  getWishlist: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.wishlist.list));
  },
  toggleWishlist: async (payload: { product_id?: string | number; branch_product_id?: string | number }): Promise<any> => {
    const res = await httpClient.post(endpoints.wishlist.toggle, payload);
    return obj(res);
  },
  addWishlist: async (payload: { product_id?: string | number; branch_product_id?: string | number }): Promise<any> => {
    const res = await httpClient.post(endpoints.wishlist.add, payload);
    return obj(res);
  },
  removeWishlist: async (id: string | number): Promise<void> => {
    await httpClient.delete(endpoints.wishlist.remove(id));
  },
  clearWishlist: async (): Promise<void> => {
    await httpClient.delete(endpoints.wishlist.clear);
  },

  // ═══════════════════════════════════════════════
  // VIEW HISTORY
  // ═══════════════════════════════════════════════
  getViewedHistory: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.viewHistory.list));
  },
  trackViewedProduct: async (payload: {
    product_id?: string | number;
    branch_product_id?: string | number;
    product_name?: string;
    product_image?: string;
    price?: number;
    original_price?: number;
    category?: string;
    viewed_at?: string;
  }): Promise<any> => {
    const res = await httpClient.post(endpoints.viewHistory.track, payload);
    return obj(res);
  },
  mergeViewedHistory: async (items: any[]): Promise<any> => {
    const res = await httpClient.post(endpoints.viewHistory.merge, { items: Array.isArray(items) ? items : [] });
    return obj(res);
  },
  removeViewedHistory: async (id: string | number): Promise<void> => {
    await httpClient.delete(endpoints.viewHistory.remove(id));
  },
  clearViewedHistory: async (): Promise<void> => {
    try {
      await httpClient.delete(endpoints.viewHistory.clear);
    } catch {
      await httpClient.delete(endpoints.viewHistory.clearLegacy);
    }
  },

  // ═══════════════════════════════════════════════
  // RETURN REQUESTS
  // ═══════════════════════════════════════════════
  getReturnRequests: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.returnRequests.list));
  },
  createReturnRequest: async (payload: any): Promise<any> => {
    const res = await httpClient.post(endpoints.returnRequests.create, payload);
    return obj(res);
  },
  cancelReturnRequest: async (id: string | number, note?: string): Promise<any> => {
    const res = await httpClient.put(endpoints.returnRequests.cancel(id), { note });
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // UPLOADS
  // ═══════════════════════════════════════════════
  uploadReviewImages: async (files: File[]): Promise<string[]> => {
    if (!Array.isArray(files) || files.length === 0) return [];
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    const res = await httpClient.post(endpoints.uploads.reviewImages, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const payload = res?.data ?? res;
    const urls = payload?.data?.urls || payload?.urls || [];
    return Array.isArray(urls) ? urls : [];
  },
  uploadEvidenceImages: async (files: File[]): Promise<string[]> => {
    if (!Array.isArray(files) || files.length === 0) return [];
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    const res = await httpClient.post(endpoints.uploads.evidenceImages, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const payload = res?.data ?? res;
    const urls = payload?.data?.urls || payload?.urls || [];
    return Array.isArray(urls) ? urls : [];
  },
  uploadEventImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const res = await httpClient.post(endpoints.uploads.eventImage, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const payload = res?.data ?? res;
    return payload?.data?.url || payload?.url || '';
  },


  // ═══════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════
  getPaymentMethods: async (): Promise<Types.PaymentMethod[]> => {
    return safeArr(httpClient.get(endpoints.payments.methods));
  },
  addPaymentMethod: async (payload: Partial<Types.PaymentMethod>): Promise<Types.PaymentMethod> => {
    const res = await httpClient.post(endpoints.payments.addMethod, payload);
    return obj(res);
  },
  updatePaymentMethod: async (id: string, updates: any): Promise<any> => {
    const res = await httpClient.put(endpoints.payments.updateMethod(id), updates);
    return obj(res);
  },
  deletePaymentMethod: async (methodId: string): Promise<void> => {
    await httpClient.delete(endpoints.payments.deleteMethod(methodId));
  },
  setDefaultPaymentMethod: async (methodId: string): Promise<Types.PaymentMethod[]> => {
    await httpClient.put(endpoints.payments.setDefault(methodId));
    return safeArr(httpClient.get(endpoints.payments.methods));
  },
  getPaymentTransactions: async (orderId?: string): Promise<Types.PaymentTransaction[]> => {
    return safeArr(httpClient.get(endpoints.payments.transactions, { params: orderId ? { orderId } : {} }));
  },
  createPaymentTransaction: async (data: any): Promise<any> => {
    const res = await httpClient.post(endpoints.payments.process, data);
    const o = obj(res);
    // Normalize: ensure id field exists (MongoDB returns _id)
    if (o && !o.id && o._id) o.id = String(o._id);
    console.log('[dataService] createPaymentTransaction result — id:', o?.id, '_id:', o?._id, 'order_id:', o?.order_id, 'transaction_id:', o?.transaction_id);
    return o;
  },
  getPaymentProviders: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.payments.providers));
  },
  updatePaymentProviders: async (providers: any[]): Promise<any[]> => {
    const res = await httpClient.put(endpoints.payments.updateProviders, providers);
    return arr(res) || providers;
  },

  // ═══════════════════════════════════════════════
  // REVIEWS
  // ═══════════════════════════════════════════════
  getReviews: async (): Promise<Types.Review[]> => {
    return safeArr(httpClient.get(endpoints.reviews.list));
  },
  getReviewsForProduct: async (productId: number | string): Promise<Types.Review[]> => {
    return safeArr(httpClient.get(endpoints.reviews.forProduct(productId)));
  },
  postReview: async (productId: number | string, reviewPayload: any): Promise<Types.Review> => {
    const res = await httpClient.post(endpoints.reviews.create(productId), reviewPayload);
    return obj(res);
  },
  updateReview: async (reviewId: string | number, payload: Partial<Types.Review>): Promise<Types.Review> => {
    const res = await httpClient.put(endpoints.reviews.update(reviewId), payload);
    return obj(res);
  },
  deleteReview: async (reviewId: string | number): Promise<void> => {
    await httpClient.delete(endpoints.reviews.delete(reviewId));
  },
  replyToReview: async (reviewId: number | string, replyPayload: any): Promise<Types.ReviewReply> => {
    const res = await httpClient.post(endpoints.reviews.reply(reviewId), replyPayload);
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // SUPPORT TICKETS
  // ═══════════════════════════════════════════════
  getSupportTickets: async (): Promise<Types.SupportTicket[]> => {
    return safeArr(httpClient.get(endpoints.support.tickets));
  },
  createSupportTicket: async (payload: Partial<Types.SupportTicket> & { message?: string; content?: string }): Promise<Types.SupportTicket> => {
    const res = await httpClient.post(endpoints.support.create, payload);
    return obj(res);
  },
  updateSupportTicketStatus: async (ticketId: string, status: string, internalNote?: string): Promise<Types.SupportTicket> => {
    const res = await httpClient.put(endpoints.support.updateStatus(ticketId), { status, internal_note: internalNote });
    return obj(res);
  },
  getMessages: async (ticketId: string): Promise<Types.Message[]> => {
    return safeArr(httpClient.get(endpoints.support.messages(ticketId)));
  },
  sendMessage: async (ticketId: string, _senderId: number | string, content: string, attachments: string[] = []): Promise<Types.Message> => {
    const res = await httpClient.post(endpoints.support.sendMessage(ticketId), { content, sender: 'user', attachments });
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════
  getNotifications: async (): Promise<Types.Notification[]> => {
    const rows = await safeArr(httpClient.get(endpoints.notifications.list));
    return rows.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      action_url: item.action_url || item.link || undefined,
      message: item.message || '',
      created_at: item.created_at || item.createdAt || new Date().toISOString(),
    }));
  },
  markNotificationRead: async (id: number | string): Promise<void> => {
    await httpClient.put(endpoints.notifications.markRead(id)).catch(() => {});
  },
  markAllNotificationsRead: async (): Promise<void> => {
    await httpClient.put(endpoints.notifications.markAllRead).catch(() => {});
  },
  deleteNotification: async (id: number | string): Promise<void> => {
    await httpClient.delete(endpoints.notifications.delete(id)).catch(() => {});
  },
  broadcastNotification: async (payload: { title: string; message?: string; type?: string; icon?: string; link?: string; metadata?: Record<string, any> }): Promise<{ delivered_count?: number }> => {
    const res = await httpClient.post(endpoints.notifications.broadcast, payload);
    return obj(res) || {};
  },

  // ═══════════════════════════════════════════════
  // LOYALTY
  // ═══════════════════════════════════════════════
  getLoyaltyTransactions: async (): Promise<Types.LoyaltyTransaction[]> => {
    return safeArr(httpClient.get(endpoints.loyalty.transactions));
  },
  getLoyaltyRules: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.loyalty.rules));
  },
  updateLoyaltyRules: async (rules: any[]): Promise<any[]> => {
    const res = await httpClient.put(endpoints.loyalty.updateRules, rules);
    return arr(res) || rules;
  },
  redeemLoyaltyPoints: async (points: number, rewardId: string, rewardTitle: string): Promise<any> => {
    const res = await httpClient.post(endpoints.loyalty.redeem, { points, rewardId, rewardTitle });
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // PROMOTIONS
  // ═══════════════════════════════════════════════
  ensureSnapshot: (): void => { /* no-op: mock data no longer used */ },

  getPromotions: async (): Promise<Types.Promotion[]> => {
    return safeArr(httpClient.get(endpoints.promotions.list));
  },
  createPromotion: async (data: Partial<Types.Promotion>): Promise<Types.Promotion> => {
    const res = await httpClient.post(endpoints.promotions.create, data);
    return obj(res);
  },
  updatePromotion: async (id: string | number, data: Partial<Types.Promotion>): Promise<Types.Promotion> => {
    const res = await httpClient.put(endpoints.promotions.update(id), data);
    return obj(res);
  },
  deletePromotion: async (id: string | number): Promise<boolean> => {
    await httpClient.delete(endpoints.promotions.delete(id));
    return true;
  },

  // ═══════════════════════════════════════════════
  // BANNERS
  // ═══════════════════════════════════════════════
  getBanners: async (options?: { includeInactive?: boolean; isActive?: boolean }): Promise<any[]> => {
    const params: Record<string, any> = {};
    if (options?.includeInactive) params.include_inactive = true;
    if (typeof options?.isActive === 'boolean') params.is_active = options.isActive;
    return safeArr(httpClient.get(endpoints.banners.list, { params }));
  },
  getHomeBanners: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.banners.home));
  },
  getPromoBanners: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.banners.promo));
  },
  createBanner: async (data: any): Promise<any> => {
    const res = await httpClient.post(endpoints.banners.create, data);
    return obj(res);
  },
  updateBanner: async (id: string | number, data: any): Promise<any> => {
    const res = await httpClient.put(endpoints.banners.update(id), data);
    return obj(res);
  },
  deleteBanner: async (id: string | number): Promise<boolean> => {
    await httpClient.delete(endpoints.banners.delete(id));
    return true;
  },

  // ═══════════════════════════════════════════════
  // HOT DEALS
  // ═══════════════════════════════════════════════
  getHotDeals: async (options?: { includeInactive?: boolean; isActive?: boolean; forceRefresh?: boolean }): Promise<any[]> => {
    const params: Record<string, any> = {};
    if (options?.includeInactive) params.include_inactive = true;
    if (typeof options?.isActive === 'boolean') params.is_active = options.isActive;
    if (options?.forceRefresh) params._ts = Date.now();
    return safeArr(httpClient.get(endpoints.flashDeals.list, {
      params,
      headers: {},
    }));
  },
  getHotDealById: async (id: string | number): Promise<any> => {
    return safeObj(httpClient.get(endpoints.flashDeals.detail(id)));
  },
  createHotDeal: async (data: any): Promise<any> => {
    const res = await httpClient.post(endpoints.flashDeals.create, data);
    return obj(res);
  },
  updateHotDeal: async (id: string | number, data: any): Promise<any> => {
    const res = await httpClient.put(endpoints.flashDeals.update(id), data);
    return obj(res);
  },
  deleteHotDeal: async (id: string | number): Promise<boolean> => {
    await httpClient.delete(endpoints.flashDeals.delete(id));
    return true;
  },
  toggleHotDeal: async (id: string | number): Promise<any> => {
    const res = await httpClient.patch(endpoints.flashDeals.toggle(id));
    return obj(res);
  },

  // Flash-deals alias methods for explicit usage
  getFlashDeals: async (options?: { includeInactive?: boolean; isActive?: boolean; forceRefresh?: boolean }): Promise<any[]> => {
    const params: Record<string, any> = {};
    if (options?.includeInactive) params.include_inactive = true;
    if (typeof options?.isActive === 'boolean') params.is_active = options.isActive;
    if (options?.forceRefresh) params._ts = Date.now();

    return safeArr(httpClient.get(endpoints.flashDeals.list, {
      params,
      headers: {},
    }));
  },
  getFlashDealById: async (id: string | number): Promise<any> => {
    return dataService.getHotDealById(id);
  },
  createFlashDeal: async (data: any): Promise<any> => {
    return dataService.createHotDeal(data);
  },
  updateFlashDeal: async (id: string | number, data: any): Promise<any> => {
    return dataService.updateHotDeal(id, data);
  },
  deleteFlashDeal: async (id: string | number): Promise<boolean> => {
    return dataService.deleteHotDeal(id);
  },
  toggleFlashDeal: async (id: string | number): Promise<any> => {
    return dataService.toggleHotDeal(id);
  },

  // Legacy endpoint fallback
  getHotDealsLegacy: async (options?: { includeInactive?: boolean; isActive?: boolean }): Promise<any[]> => {
    const params: Record<string, any> = {};
    if (options?.includeInactive) params.include_inactive = true;
    if (typeof options?.isActive === 'boolean') params.is_active = options.isActive;
    return safeArr(httpClient.get(endpoints.hotDeals.list, { params }));
  },
  createHotDealLegacy: async (data: any): Promise<any> => {
    const res = await httpClient.post(endpoints.hotDeals.create, data);
    return obj(res);
  },
  updateHotDealLegacy: async (id: string | number, data: any): Promise<any> => {
    const res = await httpClient.put(endpoints.hotDeals.update(id), data);
    return obj(res);
  },
  deleteHotDealLegacy: async (id: string | number): Promise<boolean> => {
    await httpClient.delete(endpoints.hotDeals.delete(id));
    return true;
  },

  // ═══════════════════════════════════════════════
  // FEATURED COLLECTIONS
  // ═══════════════════════════════════════════════
  getFeaturedCollections: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.featuredCollections.list));
  },

  // ═══════════════════════════════════════════════
  // BRANCHES
  // ═══════════════════════════════════════════════
  getBranches: async (): Promise<Types.Branch[]> => {
    return safeArr(httpClient.get(endpoints.branches.list));
  },
  getBranchById: async (branchId: number | string): Promise<Types.Branch | undefined> => {
    return safeObj(httpClient.get(endpoints.branches.detail(branchId)));
  },

  // ═══════════════════════════════════════════════
  // ROLES / MEMBERSHIP
  // ═══════════════════════════════════════════════
  getRoles: async (): Promise<Types.Role[]> => {
    return safeArr(httpClient.get(endpoints.roles.list));
  },
  getMembershipTiers: async (): Promise<Types.MembershipTier[]> => {
    return safeArr(httpClient.get(endpoints.membershipTiers.list));
  },

  // ═══════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════
  getAuditLogs: async (): Promise<Types.AuditLog[]> => {
    return safeArr(httpClient.get(endpoints.auditLogs.list));
  },

  // ═══════════════════════════════════════════════
  // ADMIN SETTINGS
  // ═══════════════════════════════════════════════
  getAdminSettings: async (): Promise<any> => {
    return safeObj(httpClient.get(endpoints.adminSettings.get)) || {};
  },
  updateAdminSettings: async (settings: any): Promise<any> => {
    const res = await httpClient.put(endpoints.adminSettings.update, settings);
    return obj(res) || settings;
  },
  resetAdminSettings: async (): Promise<any> => {
    await httpClient.post(endpoints.adminSettings.reset).catch(() => {});
    return true;
  },
  getMaintenanceStatus: async (): Promise<any> => {
    return safeObj(httpClient.get(endpoints.system.maintenanceStatus));
  },

  // ═══════════════════════════════════════════════
  // NOTIFICATION TEMPLATES
  // ═══════════════════════════════════════════════
  getNotificationTemplates: async (): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.notificationTemplates.list));
  },
  updateNotificationTemplate: async (id: string, data: any): Promise<any> => {
    const res = await httpClient.put(endpoints.notificationTemplates.update(id), data);
    return obj(res);
  },

  // ═══════════════════════════════════════════════
  // SEARCH / HISTORY
  // ═══════════════════════════════════════════════
  getSearchHistory: async (userId: number | string): Promise<Types.SearchHistory[]> => {
    return safeArr(httpClient.get(endpoints.search.history(userId)));
  },
  getPurchaseHistory: async (userId: number | string): Promise<Types.PurchaseHistory[]> => {
    return safeArr(httpClient.get(endpoints.purchaseHistory.list(userId)));
  },

  // ═══════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════
  _normalizeEventStatus: (post: any) => {
    if (!post) return post;
    if (!post.status) {
      post.status = post.is_published ? 'published' : 'draft';
    }
    return post;
  },

  getEventPosts: async () => {
    return safeArr(httpClient.get(endpoints.events.published));
  },
  getAllEventPosts: async () => {
    return safeArr(httpClient.get(endpoints.events.list));
  },
  getFeaturedEventPosts: async () => {
    return safeArr(httpClient.get(endpoints.events.featured));
  },
  getEventCategories: async () => {
    return safeArr(httpClient.get(endpoints.events.categories));
  },
  getEventPost: async (id: number | string): Promise<any | undefined> => {
    return safeObj(httpClient.get(endpoints.events.detail(id)));
  },
  getEventPostBySlug: async (slug: string): Promise<any | undefined> => {
    // Try by ID first, slug handling is backend's job
    return safeObj(httpClient.get(endpoints.events.detail(slug)));
  },
  getEventPostDetail: async (postId: number | string): Promise<any | undefined> => {
    return safeObj(httpClient.get(endpoints.events.postDetail(postId)));
  },
  getEventComments: async (postId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.events.comments(postId)));
  },
  addEventComment: async (comment: any): Promise<any> => {
    const postId = comment.post_id;
    const res = await httpClient.post(endpoints.events.addComment(postId), comment);
    return obj(res);
  },
  toggleEventLike: async (postId: number | string): Promise<any> => {
    const res = await httpClient.put(endpoints.events.like(postId));
    return obj(res);
  },
  toggleCommentLike: async (postId: number | string, commentId: number | string): Promise<any> => {
    const res = await httpClient.put(endpoints.events.likeComment(postId, commentId));
    return obj(res);
  },
  getRelatedEventPosts: async (postId: number | string): Promise<any[]> => {
    return safeArr(httpClient.get(endpoints.events.related(postId)));
  },
  createEventPost: async (post: Record<string, unknown>) => {
    const res = await httpClient.post(endpoints.events.create, post);
    return obj(res);
  },
  updateEventPost: async (postId: number | string, updates: Record<string, unknown>) => {
    const res = await httpClient.put(endpoints.events.update(postId), updates);
    return obj(res);
  },
  deleteEventPost: async (postId: number | string) => {
    await httpClient.delete(endpoints.events.delete(postId));
    return true;
  },
  toggleEventFeatured: async (postId: number | string) => {
    const res = await httpClient.put(endpoints.events.toggleFeatured(postId));
    return obj(res);
  },
  publishEventPost: async (postId: number | string) => {
    const res = await httpClient.put(endpoints.events.publish(postId));
    return obj(res);
  },
  unpublishEventPost: async (postId: number | string) => {
    const res = await httpClient.put(endpoints.events.unpublish(postId));
    return obj(res);
  },
  bulkDeleteEvents: async (postIds: (number | string)[]) => {
    await httpClient.post(endpoints.events.bulkDelete, { ids: postIds });
    return true;
  },

  // ═══════════════════════════════════════════════
  // ENTERPRISE MODULES (MỚI)
  // ═══════════════════════════════════════════════
  
  // -- Suppliers --
  getSuppliers: async (): Promise<any[]> => safeArr(httpClient.get('/suppliers')),
  createSupplier: async (data: any): Promise<any> => obj(await httpClient.post('/suppliers', data)),
  updateSupplier: async (id: string | number, data: any): Promise<any> => obj(await httpClient.put(`/suppliers/${id}`, data)),
  updateSupplierDebt: async (id: string | number, data: any): Promise<any> => obj(await httpClient.put(`/suppliers/${id}/debt`, data)),
  
  // -- Purchase Orders --
  getPurchaseOrders: async (): Promise<any[]> => safeArr(httpClient.get('/purchase-orders')),
  createPurchaseOrder: async (data: any): Promise<any> => obj(await httpClient.post('/purchase-orders', data)),
  updatePurchaseOrderStatus: async (id: string | number, status: string): Promise<any> => obj(await httpClient.put(`/purchase-orders/${id}/status`, { status })),

  // -- Inventory Batches & Alerts --
  getInventoryBatchesByBranch: async (branchId: string): Promise<any[]> => safeArr(httpClient.get(endpoints.inventoryBatches.list, { params: { branch_id: branchId } })),
  getLowStock: async (branchId: string): Promise<any[]> => {
    const url = endpoints.inventoryBatches.alertsLowStock;
    console.log('[dataService] getLowStock — endpoint:', url, '| baseURL:', httpClient.defaults.baseURL);
    const res = await safeArr(httpClient.get(url, { params: { branch_id: branchId } }));
    console.log('[dataService] getLowStock — response:', res);
    return Array.isArray(res) ? res : [];
  },
  getExpiringSoon: async (branchId: string): Promise<any[]> => {
    const url = endpoints.inventoryBatches.alertsExpiring;
    console.log('[dataService] getExpiringSoon — endpoint:', url, '| baseURL:', httpClient.defaults.baseURL);
    const res = await safeArr(httpClient.get(url, { params: { branch_id: branchId } }));
    console.log('[dataService] getExpiringSoon — response:', res);
    return Array.isArray(res) ? res : [];
  },

  // -- Stock Takes --
  getStockTakes: async (): Promise<any[]> => safeArr(httpClient.get('/stock-takes')),
  createStockTake: async (data: any): Promise<any> => obj(await httpClient.post('/stock-takes', data)),
  adjustStockTake: async (id: string | number, data: any): Promise<any> => obj(await httpClient.put(`/stock-takes/${id}/status`, data)),

  // -- Internal Requisitions --
  getRequisitions: async (): Promise<any[]> => safeArr(httpClient.get('/internal-requisitions')),
  createRequisition: async (data: any): Promise<any> => obj(await httpClient.post('/internal-requisitions', data)),
  updateRequisitionStatus: async (id: string | number, status: string): Promise<any> => obj(await httpClient.put(`/internal-requisitions/${id}/status`, { status })),

  // ═══════════════════════════════════════════════
  // GAMIFICATION
  // ═══════════════════════════════════════════════
  getGamificationCampaign: async (type: 'spin' | 'checkin'): Promise<any> => {
    return safeObj(httpClient.get('/gamification/campaign/active', { params: { type } }));
  },
  getCheckinState: async (): Promise<any> => {
    return safeObj(httpClient.get('/gamification/checkin/state'));
  },
  getMyLogs: async (params?: any): Promise<any> => {
    const res = await httpClient.get('/gamification/my-logs', { params });
    return res.data ?? res;
  },
  spinWheel: async (): Promise<any> => {
    const res = await httpClient.post('/gamification/spin');
    return res.data ?? res;
  },
  dailyCheckin: async (): Promise<any> => {
    const res = await httpClient.post('/gamification/checkin');
    return res.data ?? res;
  },
  adminGetCampaigns: async (): Promise<any[]> => {
    return safeArr(httpClient.get('/gamification/admin/campaigns'));
  },
  adminCreateCampaign: async (payload: any): Promise<any> => {
    const res = await httpClient.post('/gamification/admin/campaigns', payload);
    return res.data ?? res;
  },
  adminUpdateCampaign: async (id: string, payload: any): Promise<any> => {
    const res = await httpClient.put(`/gamification/admin/campaigns/${id}`, payload);
    return res.data ?? res;
  },
  adminDeleteCampaign: async (id: string): Promise<any> => {
    const res = await httpClient.delete(`/gamification/admin/campaigns/${id}`);
    return res.data ?? res;
  },
  adminGetLogs: async (params?: any): Promise<any> => {
    const res = await httpClient.get('/gamification/admin/logs', { params });
    return res.data ?? res;
  },
  adminGetAnalytics: async (campaignId: string): Promise<any> => {
    return safeObj(httpClient.get(`/gamification/admin/analytics/${campaignId}`));
  },
};

