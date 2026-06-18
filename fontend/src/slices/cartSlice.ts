import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Coupon } from '../types';
import { dataService } from '../services/dataService';
import { showBranchConflictModal } from '../components/BranchConflictModal/BranchConflictModal';

// ═══════════════════════════════════════════════
// ASYNC THUNKS
// ═══════════════════════════════════════════════

/** Load all branch carts for the current authenticated user */
export const loadAllBranchCarts = createAsyncThunk(
  'cart/loadAllBranchCarts',
  async () => {
    const result = await dataService.getAllBranchCarts();
    console.log('[cartSlice] loadAllBranchCarts raw result:', result);
    return result; // { branchId: CartItem[] }
  }
);

/** Add item to cart — calls backend API, returns full server cart for that branch */
export const addToCartAsync = createAsyncThunk(
  'cart/addToCartAsync',
  async (payload: {
    branchId: string;
    branch_product_id: string;
    quantity: number;
    price: number;
    unit_price?: number;
    product_name?: string;
    product_image?: string;
    branchProduct?: any;
    clearOtherCarts?: boolean;
  }, { rejectWithValue }) => {
    console.log('[cartSlice] addToCartAsync payload:', payload);
    let result = await dataService.addToCart(
      0, // userId ignored — JWT used on backend
      payload.branch_product_id,
      payload.quantity,
      payload.branchId,
      payload.price,
      payload.unit_price || payload.price,
      payload.product_name,
      payload.product_image,
      payload.clearOtherCarts
    );
    console.log('[cartSlice] addToCartAsync API result:', result);

    if (!result.success) {
      if (result.code === 'CROSS_BRANCH_CONFLICT') {
        const confirmMessage = result.message || 'Bạn đang có sản phẩm ở giỏ hàng thuộc chi nhánh khác. Bạn có muốn xóa giỏ hàng cũ để tiếp tục không?';
        const shouldClear = await showBranchConflictModal(confirmMessage);
        if (shouldClear) {
          console.log('[cartSlice] User agreed to clear other branch carts. Retrying add to cart...');
          result = await dataService.addToCart(
            0,
            payload.branch_product_id,
            payload.quantity,
            payload.branchId,
            payload.price,
            payload.unit_price || payload.price,
            payload.product_name,
            payload.product_image,
            true // clearOtherCarts = true
          );
          if (!result.success) {
            return rejectWithValue(result.message || 'Lỗi thêm vào giỏ hàng');
          }
        } else {
          return rejectWithValue('Đã hủy thao tác để giữ giỏ hàng chi nhánh cũ.');
        }
      } else {
        return rejectWithValue(result.message || 'Lỗi thêm vào giỏ hàng');
      }
    }

    // Return both the server cart AND the original payload for branchProduct metadata
    return {
      branchId: payload.branchId,
      serverCart: result.cart, // full cart from backend: { _id, user_id, branch_id, items[] }
      fallbackPayload: payload, // used if server cart is empty/missing
    };
  }
);

/** Update item quantity in cart — calls backend API */
export const updateCartItemAsync = createAsyncThunk(
  'cart/updateCartItemAsync',
  async (payload: { branch_product_id: string; quantity: number; branch_id: string }) => {
    await dataService.updateCartItem(payload.branch_product_id, payload.quantity, payload.branch_id);
    return payload;
  }
);

/** Remove item from cart — calls backend API */
export const removeCartItemAsync = createAsyncThunk(
  'cart/removeCartItemAsync',
  async (payload: { branch_product_id: string; branch_id: string }) => {
    await dataService.removeCartItem(payload.branch_product_id, payload.branch_id);
    return payload;
  }
);

// Legacy thunk kept for compatibility
export const loadCart = createAsyncThunk(
  'cart/loadCart',
  async (_userId: number) => {
    const result = await dataService.getAllBranchCarts();
    return result;
  }
);

/** Re-order from a previous order — adds all order items to cart for that branch */
export const reorderFromOrder = createAsyncThunk(
  'cart/reorderFromOrder',
  async (payload: { orderId: string; userId: number }, { dispatch, rejectWithValue }) => {
    try {
      const result = await dataService.reorderItems(payload.orderId);
      if (!result?.success) {
        return rejectWithValue({ message: result?.message || 'Lỗi khi mua lại' });
      }

      // Reload all carts from server
      await dispatch(loadAllBranchCarts());
      return {
        message: result?.message || 'Đã thêm lại sản phẩm vào giỏ hàng!',
        added_count: Number(result?.data?.added_count || 0),
        unavailable_items: Array.isArray(result?.data?.unavailable_items) ? result.data.unavailable_items : [],
        repriced_items: Array.isArray(result?.data?.repriced_items) ? result.data.repriced_items : [],
        adjusted_items: Array.isArray(result?.data?.adjusted_items) ? result.data.adjusted_items : [],
      };
    } catch (err: any) {
      return rejectWithValue({ message: err?.message || 'Lỗi khi mua lại' });
    }
  }
);

// ═══════════════════════════════════════════════
// HELPERS — normalize server cart items
// ═══════════════════════════════════════════════

/** Normalize a raw server items array into our CartItem[] shape */
const normalizeItems = (serverItems: any[]): CartItem[] => {
  if (!Array.isArray(serverItems)) return [];
  return serverItems.map(item => ({
    branch_product_id: String(item.branch_product_id),
    quantity: Number(item.quantity) || 1,
    price: Number(item.price) || 0,
    unit_price: Number(item.unit_price) || Number(item.price) || 0,
    product_name: item.product_name || '',
    product_image: item.product_image || '',
    branchProduct: item.branchProduct,
  }));
};

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

interface CartState {
  /** Items stored per branch: { [branchId]: CartItem[] } */
  itemsByBranch: { [branchId: string]: CartItem[] };
  appliedCoupon: Coupon | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const STORAGE_KEY = 'lotte_cart_state';

const loadState = (): CartState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        itemsByBranch: parsed.itemsByBranch || {},
        appliedCoupon: parsed.appliedCoupon || null,
        status: 'idle',
        error: null,
      };
    }
  } catch { /* ignore */ }
  return { itemsByBranch: {}, appliedCoupon: null, status: 'idle', error: null };
};

const saveState = (state: CartState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      itemsByBranch: state.itemsByBranch,
      appliedCoupon: state.appliedCoupon,
    }));
  } catch { /* ignore */ }
};

const initialState: CartState = loadState();

// ═══════════════════════════════════════════════
// SLICE
// ═══════════════════════════════════════════════

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /** Local-only add (fallback) */
    addItem: (state, action: PayloadAction<CartItem & { branch_id?: string; branchId?: string; product?: any }>) => {
      const branchKey = String(action.payload.branchId || action.payload.branch_id || 'default');
      if (!state.itemsByBranch[branchKey]) {
        state.itemsByBranch[branchKey] = [];
      }
      const branchCart = state.itemsByBranch[branchKey];
      const existingItem = branchCart.find(i => String(i.branch_product_id) === String(action.payload.branch_product_id));
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        branchCart.push({
          branch_product_id: String(action.payload.branch_product_id),
          quantity: action.payload.quantity,
          price: action.payload.price || 0,
          unit_price: action.payload.unit_price || action.payload.price || 0,
          branchProduct: action.payload.branchProduct,
        });
      }
      saveState(state);
    },

    updateQuantity: (state, action: PayloadAction<{ branch_product_id: string; quantity: number; branch_id?: string }>) => {
      const branchId = String(action.payload.branch_id || 'default');
      const branchCart = state.itemsByBranch[branchId];
      if (branchCart) {
        const item = branchCart.find(i => String(i.branch_product_id) === String(action.payload.branch_product_id));
        if (item) {
          item.quantity = action.payload.quantity;
        }
      }
      saveState(state);
    },

    removeItem: (state, action: PayloadAction<{ branch_product_id: string; branch_id?: string }>) => {
      const branchId = String(action.payload.branch_id || 'default');
      if (state.itemsByBranch[branchId]) {
        state.itemsByBranch[branchId] = state.itemsByBranch[branchId].filter(
          i => String(i.branch_product_id) !== String(action.payload.branch_product_id)
        );
      }
      saveState(state);
    },

    clearCartByBranch: (state, action: PayloadAction<string>) => {
      state.itemsByBranch[action.payload] = [];
      saveState(state);
    },

    clearCart: (state) => {
      state.itemsByBranch = {};
      state.appliedCoupon = null;
      saveState(state);
    },

    applyCoupon: (state, action: PayloadAction<Coupon>) => {
      state.appliedCoupon = action.payload;
      saveState(state);
    },

    removeCoupon: (state) => {
      state.appliedCoupon = null;
      saveState(state);
    },

    /** Used during logout to fully reset cart state */
    resetCartState: (state) => {
      state.itemsByBranch = {};
      state.appliedCoupon = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem(STORAGE_KEY);
    },

    /** Used by Socket.IO to sync cart state in real-time */
    updateCartFromServer: (state, action: PayloadAction<{ branch_id: string; cart?: any; cleared?: boolean }>) => {
      const { branch_id, cart, cleared } = action.payload;
      if (cleared) {
        if (branch_id === 'all') {
          state.itemsByBranch = {};
        } else {
          state.itemsByBranch[branch_id] = [];
        }
      } else if (cart && Array.isArray(cart.items)) {
        // Enforce single branch cart locally if replacing from server
        Object.keys(state.itemsByBranch).forEach(k => {
          if (k !== String(branch_id)) delete state.itemsByBranch[k];
        });
        state.itemsByBranch[branch_id] = normalizeItems(cart.items);
      }
      saveState(state);
    },
  },
  extraReducers: (builder) => {
    // ─── loadAllBranchCarts ───
    builder
      .addCase(loadAllBranchCarts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadAllBranchCarts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const serverCarts = action.payload || {};
        console.log('[cartSlice] loadAllBranchCarts.fulfilled — server data:', serverCarts);
        // Server is source of truth — replace all
        state.itemsByBranch = {};
        for (const [branchId, items] of Object.entries(serverCarts)) {
          state.itemsByBranch[branchId] = normalizeItems(items as any[]);
        }
        console.log('[cartSlice] loadAllBranchCarts.fulfilled — state.itemsByBranch:', JSON.stringify(state.itemsByBranch));
        saveState(state);
      })
      .addCase(loadAllBranchCarts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      });

    // ─── loadCart (legacy — same handler) ───
    builder
      .addCase(loadCart.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const serverCarts = action.payload || {};
        state.itemsByBranch = {};
        for (const [branchId, items] of Object.entries(serverCarts)) {
          state.itemsByBranch[branchId] = normalizeItems(items as any[]);
        }
        saveState(state);
      })
      .addCase(loadCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      });

    // ─── addToCartAsync ───
    // KEY FIX: Use the SERVER cart to replace the entire branch cart,
    // so state always matches what the DB actually has.
    builder
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        const { branchId, serverCart, fallbackPayload } = action.payload;
        console.log('[cartSlice] addToCartAsync.fulfilled — branchId:', branchId, 'serverCart:', serverCart);

        if (serverCart && Array.isArray(serverCart.items) && serverCart.items.length > 0) {
          // Enforce SINGLE branch cart locally
          Object.keys(state.itemsByBranch).forEach(k => {
            if (k !== String(branchId)) delete state.itemsByBranch[k];
          });
          // Use the full server cart items as the source of truth
          state.itemsByBranch[branchId] = normalizeItems(serverCart.items);
          console.log('[cartSlice] SET from server — items count:', serverCart.items.length);
        } else {
          // Enforce SINGLE branch cart locally
          Object.keys(state.itemsByBranch).forEach(k => {
            if (k !== String(branchId)) delete state.itemsByBranch[k];
          });
          // Fallback: optimistically update from payload (e.g. mock mode)
          if (!state.itemsByBranch[branchId]) {
            state.itemsByBranch[branchId] = [];
          }
          const branchCart = state.itemsByBranch[branchId];
          const existing = branchCart.find(i =>
            String(i.branch_product_id) === String(fallbackPayload.branch_product_id)
          );
          if (existing) {
            existing.quantity += fallbackPayload.quantity;
          } else {
            branchCart.push({
              branch_product_id: String(fallbackPayload.branch_product_id),
              quantity: fallbackPayload.quantity,
              price: fallbackPayload.price || 0,
              unit_price: fallbackPayload.unit_price || fallbackPayload.price || 0,
              product_name: (fallbackPayload as any).product_name || '',
              product_image: (fallbackPayload as any).product_image || '',
              branchProduct: fallbackPayload.branchProduct,
            });
          }
          console.log('[cartSlice] SET from fallback payload');
        }
        saveState(state);
      });

    // ─── updateCartItemAsync ───
    builder
      .addCase(updateCartItemAsync.fulfilled, (state, action) => {
        const { branch_product_id, quantity, branch_id } = action.payload;
        const branchCart = state.itemsByBranch[branch_id];
        if (branchCart) {
          const item = branchCart.find(i => String(i.branch_product_id) === String(branch_product_id));
          if (item) item.quantity = quantity;
        }
        saveState(state);
      });

    // ─── removeCartItemAsync ───
    builder
      .addCase(removeCartItemAsync.fulfilled, (state, action) => {
        const { branch_product_id, branch_id } = action.payload;
        if (state.itemsByBranch[branch_id]) {
          state.itemsByBranch[branch_id] = state.itemsByBranch[branch_id].filter(
            i => String(i.branch_product_id) !== String(branch_product_id)
          );
        }
        saveState(state);
      });
  },
});

// ═══════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════

export const selectCurrentBranchItems = createSelector(
  [(state: { cart: CartState }) => state.cart.itemsByBranch, (_state: any, branchId: string) => String(branchId || '')],
  (itemsByBranch, branchId) => {
    if (!itemsByBranch || !branchId) return [];
    return itemsByBranch[branchId] || [];
  }
);

export const selectCartCountForBranch = createSelector(
  [(state: { cart: CartState }) => state.cart.itemsByBranch, (_state: any, branchId: string) => String(branchId || '')],
  (itemsByBranch, branchId) => {
    if (!itemsByBranch || !branchId) return 0;
    const items = itemsByBranch[branchId] || [];
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }
);

export const {
  addItem,
  removeItem,
  updateQuantity,
  applyCoupon,
  removeCoupon,
  clearCart,
  clearCartByBranch,
  resetCartState,
  updateCartFromServer,
} = cartSlice.actions;

export default cartSlice.reducer;