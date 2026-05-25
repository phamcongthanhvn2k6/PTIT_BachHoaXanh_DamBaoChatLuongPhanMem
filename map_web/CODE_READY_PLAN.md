# CODE_READY_PLAN.md - Lotte Mart Ecommerce System

> **Generated:** 2026-04-01
> **Mode:** Full Project Scan — READ ONLY (No code changes)
> **Status:** Ready for implementation

---

## 1. PROJECT OVERVIEW

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Redux Toolkit
- **Backend:** Node.js + Express.js (ESM modules)
- **Database:** MongoDB + Mongoose ODM
- **Communication:** RESTful API (Axios httpClient)

**Architecture Pattern:** MVC + Redux + Service Layer

---

## 2. CURRENT ARCHITECTURE

### 2.1 Frontend Structure (`fontend/src/`)

```
src/
├── api/
│   ├── endpoints.ts        # All API endpoint definitions
│   └── httpClient.ts       # Axios instance + interceptors + mock fallback
├── pages/                  # User-facing pages (26 files)
├── admin/
│   ├── pages/             # Admin pages (12 files)
│   ├── slices/            # Admin Redux slices
│   └── guards/            # AdminGuard
├── services/              # API service wrappers (15+ files)
├── slices/                # Redux slices (14 files)
├── components/            # Shared components
├── component/             # Legacy components (Header, Footer, AuthGuard)
├── hooks/                 # Custom hooks (4 files)
├── types/                 # TypeScript interfaces
├── layouts/               # AccountLayout, AdminLayout
├── i18n/                  # i18next config + locales
└── store.ts               # Redux store config
```

### 2.2 Backend Structure (`backend/`)

```
backend/
├── app.js                 # Express app config + routes
├── server.js              # Entry point (port 3001)
├── controllers/           # Business logic (18 files)
├── models/                # Mongoose schemas (20+ files)
├── routes/                # API routes (25 files)
├── services/              # Business services (4 files)
├── middlewares/           # auth.js, errorHandler.js
├── utils/                 # jwt.js, helpers.js
└── seed/                  # Seed data script
```

---

## 3. FILE MAP BY MODULE

### 3.1 Authentication Module

| Layer | File | Role |
|-------|------|------|
| UI | `pages/Login.tsx`, `pages/Register.tsx` | Login/Register forms |
| Service | `services/authService.ts` | API calls |
| Slice | `slices/authSlice.ts` | State + thunks |
| API | `endpoints.auth.*` | Route definitions |
| Route | `routes/auth.js` | Backend endpoints |
| Controller | `controllers/authController.js` | Logic |
| Model | `models/User.js` | User schema |

### 3.2 Products Module

| Layer | File | Role |
|-------|------|------|
| UI | `pages/Home.tsx`, `pages/Products.tsx`, `pages/ProductDetail.tsx` | Product display |
| Service | `services/productService.ts`, `services/dataService.ts` | API calls |
| Slice | `slices/productSlice.ts` | Products + branchProducts state |
| Hook | `hooks/useBranchData.ts` | Branch-filtered products |
| API | `endpoints.products.*`, `endpoints.branchProducts.*` | Routes |
| Route | `routes/products.js`, `routes/branchProducts.js` | Backend |
| Controller | `controllers/productController.js`, `controllers/branchProductController.js` | Logic |
| Model | `models/Product.js`, `models/BranchProduct.js` | Schemas |

### 3.3 Cart Module

| Layer | File | Role |
|-------|------|------|
| UI | `pages/Cart.tsx` | Cart display |
| Service | `services/cartService.ts`, `services/dataService.ts` | API calls |
| Slice | `slices/cartSlice.ts` | Branch-based cart state |
| API | `endpoints.cart.*` | Route definitions |
| Route | `routes/cart.js` | Backend endpoints |
| Controller | `controllers/cartController.js` | Cart logic |
| Model | `models/Cart.js` | Cart schema (user_id + branch_id unique) |

### 3.4 Orders Module

| Layer | File | Role |
|-------|------|------|
| UI | `pages/Orders.tsx`, `pages/OrderDetail.tsx`, `pages/Checkout.tsx`, `pages/Payment.tsx` | Order flow |
| Service | `services/orderService.ts`, `services/dataService.ts` | API calls |
| Slice | `slices/orderSlice.ts` | Order state |
| API | `endpoints.orders.*` | Route definitions |
| Route | `routes/orders.js` | Backend endpoints |
| Controller | `controllers/orderController.js` | Order logic |
| Model | `models/Order.js` | Order schema |

### 3.5 Promotions/Coupons Module

| Layer | File | Role |
|-------|------|------|
| UI | `pages/Promotions.tsx`, `pages/MyCoupons.tsx` | Display |
| Service | `services/promotionService.ts`, `services/couponService.ts` | API |
| Slice | `slices/promotionsSlice.ts`, `slices/couponSlice.ts` | State |
| API | `endpoints.promotions.*`, `endpoints.coupons.*` | Routes |
| Route | `routes/promotions.js`, `routes/coupons.js` | Backend |
| Controller | `controllers/promotionController.js`, `controllers/couponController.js` | Logic |
| Model | `models/Promotion.js`, `models/Coupon.js` | Schemas |

### 3.6 Branch Module

| Layer | File | Role |
|-------|------|------|
| UI | `component/Header/BranchSelector.tsx` | Map-based branch selector (Leaflet) |
| Admin UI | `admin/pages/AdminBranchLocations.tsx` | Admin map editor for branch coordinates |
| Service | `services/dataService.ts` | API calls |
| Slice | `slices/branchSlice.ts` | Current branch state |
| API | `endpoints.branches.*` | Routes |
| Route | `routes/branches.js` | Backend |
| Controller | `controllers/branchController.js` | Logic |
| Model | `models/Branch.js` | Schema (coordinates.lat, coordinates.lng) |

### 3.7 Admin Module

| Layer | File | Role |
|-------|------|------|
| UI | `admin/pages/Admin*.tsx` | 10+ admin pages |
| Service | `services/adminAnalyticsService.ts` | Dashboard data |
| Slice | `admin/slices/adminAuthSlice.ts` | Admin auth state |
| Guard | `admin/guards/AdminGuard.tsx` | Route protection |
| API | `endpoints.adminAuth.*`, `endpoints.adminSettings.*` | Routes |
| Route | `routes/admin.js` | Backend admin routes |

---

## 4. API MAP BY MODULE

### 4.1 Auth APIs

| Method | Endpoint | Status | Frontend Usage |
|--------|----------|--------|----------------|
| POST | `/api/auth/login` | ✅ Working | `authSlice.login` |
| POST | `/api/auth/register` | ✅ Working | `authSlice.register` |
| POST | `/api/auth/google` | ✅ Working | `authSlice.googleLogin` |
| GET | `/api/auth/verify` | ✅ Working | `authSlice.authVerify` |
| GET | `/api/auth/profile` | ✅ Working | `authSlice.getProfile` |
| PUT | `/api/auth/profile` | ✅ Working | `authSlice.updateProfile` |
| POST | `/api/auth/change-password` | ✅ Working | `Settings.tsx` |
| GET | `/api/auth/profile/summary` | ✅ Working | `Profile.tsx` |

### 4.2 Products APIs

| Method | Endpoint | Status | Frontend Usage |
|--------|----------|--------|----------------|
| GET | `/api/products` | ✅ Working | `productSlice.loadProductsData` |
| GET | `/api/products/:id` | ✅ Working | `ProductDetail.tsx` |
| GET | `/api/products/:id/related` | ✅ Working | `ProductDetail.tsx` |
| GET | `/api/products/:id/questions` | ✅ Working | `ProductDetail.tsx` |
| GET | `/api/products/policies` | ✅ Working | `ProductDetail.tsx` |
| GET | `/api/products/search` | ⚠️ Limited | Backend exists, FE uses client-side |
| GET | `/api/branch-products` | ✅ Working | `productSlice.loadProductsData` |
| POST | `/api/branch-products` | ✅ Working | Admin create |
| PUT | `/api/branch-products/:id` | ✅ Working | Admin update |

### 4.3 Cart APIs

| Method | Endpoint | Status | Frontend Usage |
|--------|----------|--------|----------------|
| GET | `/api/cart?branch_id=xxx` | ✅ Working | `cartSlice` |
| GET | `/api/cart/all-branches` | ✅ Working | `cartSlice.loadAllBranchCarts` |
| POST | `/api/cart/items` | ✅ Working | `cartSlice.addToCartAsync` |
| PUT | `/api/cart/items/:id` | ✅ Working | `cartSlice.updateCartItemAsync` |
| DELETE | `/api/cart/items/:id` | ✅ Working | `cartSlice.removeCartItemAsync` |
| POST | `/api/cart/clear` | ✅ Working | `Payment.tsx` |

### 4.4 Orders APIs

| Method | Endpoint | Status | Frontend Usage |
|--------|----------|--------|----------------|
| GET | `/api/orders` | ✅ Working | `orderSlice.loadOrders` |
| GET | `/api/orders/:id` | ✅ Working | `OrderDetail.tsx` |
| POST | `/api/orders` | ✅ Working | `Payment.tsx` → `orderSlice.createOrder` |
| PUT | `/api/orders/:id/cancel` | ✅ Working | `OrderDetail.tsx` |
| GET | `/api/orders/:id/tracking` | ✅ Working | `OrderTracking.tsx` |
| PUT | `/api/orders/:id/status` | ✅ Working | Admin |
| GET | `/api/orders/:id/invoice` | ✅ Working | `OrderDetail.tsx` |

### 4.5 Promotions/Coupons APIs

| Method | Endpoint | Status | Frontend Usage |
|--------|----------|--------|----------------|
| GET | `/api/promotions` | ✅ Working | `Promotions.tsx` |
| POST | `/api/promotions/calculate` | ✅ Working | `Cart.tsx`, `Checkout.tsx` |
| GET | `/api/coupons` | ✅ Working | `MyCoupons.tsx` |
| POST | `/api/coupons/validate` | ✅ Working | `Cart.tsx` |

### 4.6 Other APIs

| Method | Endpoint | Status | Frontend Usage |
|--------|----------|--------|----------------|
| GET | `/api/banners` | ✅ Working | `Home.tsx` |
| GET | `/api/events` | ✅ Working | `FeaturedEvents.tsx` |
| GET | `/api/branches` | ✅ Working | `branchSlice.loadBranches` |
| GET | `/api/hot-deals` | ✅ Working | `ShopAtHome.tsx` |
| GET | `/api/admin/settings` | ✅ Working | `App.tsx`, `AdminSystemSettings.tsx` |

---

## 5. MONGODB COLLECTIONS MAP

| Collection | Model File | Used By | Has Data |
|------------|-----------|---------|----------|
| `users` | `models/User.js` | Auth, Admin | ✅ |
| `products` | `models/Product.js` | Products | ✅ |
| `branchproducts` | `models/BranchProduct.js` | Branch pricing | ✅ |
| `branches` | `models/Branch.js` | Branch selector | ✅ |
| `carts` | `models/Cart.js` | Cart (per user/branch) | ✅ |
| `orders` | `models/Order.js` | Orders | ✅ |
| `promotions` | `models/Promotion.js` | Promotions | ✅ |
| `coupons` | `models/Coupon.js` | Coupons | ✅ |
| `couponusages` | `models/Coupon.js` | Coupon tracking | ✅ |
| `reviews` | `models/Review.js` | Reviews | ✅ |
| `addresses` | `models/Address.js` | User addresses | ✅ |
| `paymentmethods` | `models/Payment.js` | Saved cards | ⚠️ |
| `paymenttransactions` | `models/Payment.js` | Transactions | ⚠️ |
| `notifications` | `models/Notification.js` | Notifications | ⚠️ |
| `supporttickets` | `models/SupportTicket.js` | Support | ⚠️ |
| `event_posts` | `models/EventPost.js` | Events CMS | ✅ |
| `banners` | `models/Misc.js` | Banners | ✅ |
| `hotdeals` | `models/Misc.js` | Hot deals | ✅ |
| `adminsettings` | `models/Misc.js` | System config | ✅ |
| `auditlogs` | `models/Misc.js` | Admin audit | ⚠️ |
| `loyaltytransactions` | `models/Loyalty.js` | Points | ⚠️ |
| `categories` | `models/Category.js` | Categories | ✅ |

---

## 6. LIST OF BUGS / MISMATCHES / MISSING FEATURES

### 6.1 CRITICAL BUGS

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 1 | **Mock fallback on network error** — httpClient returns mock data when API fails (500/network), may show wrong data silently | `httpClient.ts:186-199` | High |
| 2 | **ProductDetail hardcoded branchId** — Uses `'HCM01'` instead of Redux `currentBranch` for branch pricing | `ProductDetail.tsx` | High |
| 3 | **Reviews POST without auth** — `/api/products/:productId/reviews` POST has no `auth` middleware | `app.js:101` | Medium |
| 4 | **Payment validation bypassed** — Checkout validation is commented out | `Payment.tsx` | High |
| 5 | **SearchResults client-side only** — No backend search API integration | `SearchResults.tsx` | Medium |

### 6.2 DATA MISMATCHES

| # | Issue | Frontend | Backend | Fix |
|---|-------|----------|---------|-----|
| 1 | `loyalty_points` vs `lotte_points` | Uses both | Schema has `lotte_points` | Standardize |
| 2 | `dataService.getCarts` wrong endpoint | Uses `/carts` | Should use `/cart/all-branches` | Fix path |
| 3 | Order `_id` vs `id` | Expects `id` | Returns `_id` | Already normalized in dataService |
| 4 | Promotion `type: 'percentage'` vs `percent` | Seed uses `percentage` | Schema enum is `percent` | Fix seed |

### 6.3 MISSING FEATURES

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Wishlist API | Backend stub only | No real DB operation |
| 2 | Login history | Backend stub only | Returns empty array |
| 3 | Purchase history | Backend stub only | Returns empty array |
| 4 | Supplier management | Route stubs | Enterprise module incomplete |
| 5 | Inventory batches FIFO | Service exists | Not wired to API |
| 6 | Stock takes | Route stubs | No real implementation |
| 7 | Internal requisitions | Route stubs | No real implementation |

### 6.4 UNUSED/ORPHAN FILES

| File | Issue |
|------|-------|
| `pages/Coupons.tsx` | Not routed in App.tsx |
| `pages/Account.tsx` | Not imported in App.tsx |
| `pages/Reviews.tsx` | Not routed in App.tsx |
| `admin/pages/AdminProducts.tsx` | Deprecated, returns null |
| `admin/pages/AdminLotteMartCouponManagement.tsx` | Static demo UI only |
| `admin/pages/AdminLotteMartCustomerManagement.tsx` | Static demo UI only |

---

## 7. PRIORITY FIXES

### P0 - Critical (Fix immediately)

1. **Remove/disable mock fallback in production** — `httpClient.ts`
2. **Fix ProductDetail branch pricing** — Use `currentBranch` from Redux
3. **Add auth middleware to review POST** — `app.js:101`
4. **Enable payment validation** — `Payment.tsx`

### P1 - High (Fix this sprint)

1. **Integrate backend search API** — `SearchResults.tsx` → `/api/products/search`
2. **Fix `dataService.getCarts`** — Use correct endpoint
3. **Standardize loyalty_points field name**
4. **Fix promotion seed data** — Match schema enums

### P2 - Medium (Next sprint)

1. Implement wishlist backend
2. Implement login/purchase history
3. Add proper audit logging
4. Complete inventory batch FIFO integration

### P3 - Low (Backlog)

1. Remove orphan pages
2. Complete enterprise modules (suppliers, stock takes, requisitions)
3. Add comprehensive error handling

---

## 8. SUGGESTED IMPLEMENTATION ORDER

### Phase 1: Critical Bug Fixes (Day 1-2)
1. `httpClient.ts` — Disable mock fallback or add env flag
2. `ProductDetail.tsx` — Fix hardcoded branchId
3. `app.js` — Add auth to review POST
4. `Payment.tsx` — Re-enable validation

### Phase 2: Data Flow Fixes (Day 3-5)
1. `dataService.ts` — Fix getCarts endpoint
2. `SearchResults.tsx` — Integrate backend search
3. Backend `seed/index.js` — Fix promotion type enum
4. Standardize `lotte_points` everywhere

### Phase 3: Missing Features (Day 6-10)
1. Wishlist — Full CRUD backend
2. Login history tracking
3. Purchase history from orders
4. Audit logging integration

### Phase 4: Cleanup (Day 11+)
1. Remove orphan pages
2. Clean up deprecated admin pages
3. Complete enterprise module stubs or remove them

---

## 9. FILES TO FIX (PRIORITY ORDER)

### Immediate Fix Required

| Priority | File | Issue |
|----------|------|-------|
| P0 | `fontend/src/api/httpClient.ts` | Mock fallback logic |
| P0 | `fontend/src/pages/ProductDetail.tsx` | Hardcoded branchId |
| P0 | `backend/app.js` | Missing auth on review POST |
| P0 | `fontend/src/pages/Payment.tsx` | Bypassed validation |
| P1 | `fontend/src/pages/SearchResults.tsx` | Client-side only search |
| P1 | `fontend/src/services/dataService.ts` | getCarts wrong endpoint |

### Review/Test Required

| File | Check |
|------|-------|
| `fontend/src/slices/cartSlice.ts` | Branch-based cart logic |
| `fontend/src/slices/orderSlice.ts` | Order creation flow |
| `backend/controllers/orderController.js` | Inventory deduction |
| `backend/services/promotionCalculationService.js` | Discount calculations |
| `fontend/src/pages/Checkout.tsx` | Address + payment flow |

---

## 10. RISKS / EDGE CASES

### Authentication Risks
- Admin and user tokens stored separately but use same User collection
- Token refresh logic may conflict between user/admin flows
- Social login (Google/FB) tokens not fully tested

### Cart Risks
- Cart persisted in localStorage AND MongoDB — potential sync issues
- Branch switching doesn't clear cart — may have items from wrong branch
- Price changes between add-to-cart and checkout not detected

### Order Risks
- Inventory deduction uses FIFO service but may not restore correctly on cancel
- Order status transitions not validated (can skip states)
- Refund credits `loyalty_points` which doesn't exist in User schema

### Branch Risks
- Some pages hardcode `'HCM01'` instead of using Redux state
- Branch products may not exist for all branches
- Branch switching mid-checkout could cause issues

---

## 11. DATA FLOW TRACES

### Login User Flow
```
Login.tsx 
  → authSlice.login() 
  → authService.login() 
  → POST /api/auth/login 
  → authController.login() 
  → User.findOne() 
  → comparePassword() 
  → generateToken() 
  → Response: { token, user }
  → Store token in localStorage
  → Redux state update
```

### Add to Cart Flow
```
Home.tsx/ProductDetail.tsx
  → dispatch(addToCartAsync())
  → cartSlice.addToCartAsync()
  → dataService.addToCart()
  → POST /api/cart/items
  → cartController.addItem()
  → Cart.findOne({ user_id, branch_id })
  → cart.items.push() / update quantity
  → cart.save()
  → populateCartItems()
  → Response: { cart with branchProduct data }
  → Redux state update
  → localStorage sync
```

### Create Order Flow
```
Payment.tsx
  → orderService.createOrder()
  → POST /api/orders
  → orderController.create()
  → inventoryService.deductInventoryForOrder()
  → new Order(payload).save()
  → Clear cart (if requested)
  → Response: { order }
  → Navigate to success page
```

### Admin Dashboard Flow
```
AdminDashboard.tsx
  → adminAnalyticsService.getDashboardData()
  → Multiple dataService calls:
    - getOrders()
    - getUsers()
    - getProducts()
    - getBranches()
  → Client-side aggregation
  → Display KPIs and charts
```

---

## 12. NEXT STEPS

After this scan, you should:

1. **Review this document** — Understand the full system architecture
2. **Start with P0 fixes** — Critical bugs first
3. **Test each fix** — Run frontend and backend together
4. **Update this document** — Mark completed items
5. **Create detailed tickets** — For P1-P3 items

---

## 13. CHANGE LOG

### 2026-05-04 — Recipe System Production-Ready Overhaul

**Problem:** Recipe generation page was unstable, AI outputs were too generic/vague, some results had placeholder content like "vừa đủ" or "sơ chế nguyên liệu". Mock fallback could mask real failures.

**Files Changed:**

| File | Change |
|------|--------|
| `backend/services/aiService.js` | Complete prompt rewrite with hyper-specific examples, expanded banned-phrase list (20+ phrases), stricter quality validation (ingredient quantity check, step description length check), improved retry with re-prompt, better JSON parsing with regex fence extraction |
| `backend/controllers/recipeController.js` | Enhanced input validation (length checks, appetite sanitization), stronger quality gates before DB save, structured logging, proper error differentiation (400/500/503) |
| `fontend/src/pages/RecipeDetail.tsx` | Fixed display logic (`showForm` state replaces ambiguous `needsGeneration`), improved generating animation (double spinner), Enter-key submit, form disabled during generation, conditional "Mua tất cả" button, full dark mode support, better error display |
| `map_wed/feature-map.md` | Updated Recipe to Cart entry with production-ready status and full feature description |

**What was NOT changed (already correct):**
- `backend/models/Recipe.js` — Schema already has `quantity: String` which handles "200g", "1/2 tsp", "1 muỗng canh" correctly
- `backend/routes/recipes.js` — Route registration is correct
- `fontend/src/services/recipeService.ts` — Already has 60s timeout and correct endpoint mapping
- `fontend/src/api/endpoints.ts` — Recipe endpoints are correctly defined

**Architecture:**
```
User Input (dish name + servings + appetite)
  → RecipeDetail.tsx
  → recipeService.generateRecipe()
  → POST /api/recipes/generate
  → recipeController.generateUserRecipe()
    → DB lookup (normalized_name = dish-servings-appetite)
    → IF cached: return immediately ✅
    → IF not cached: aiService.generateRecipe()
      → Gemini AI (hyper-specific prompt, 2 retry attempts)
      → JSON parse + quality validation
      → Save to MongoDB
      → Return to frontend
  → RecipeDetail.tsx renders full recipe with store product matching
```

### 2026-05-04 — Admin Procurement / Import Order Flow Fixes

**Problem:** The Admin "Create Import Order" flow had several issues preventing smooth procurement operations. The UI for inline product creation was broken (button text invisible due to absolute positioning), the branch selection error was ambiguous, and new products created inline were not immediately available for selection in the branch due to missing `BranchProduct` linkage.

**Files Changed:**

| File | Change |
|------|--------|
| `fontend/src/admin/pages/AdminImportOrders.tsx` | Fixed `+ Tạo mới` button layout (`flex gap-1` instead of `absolute` overlapping), improved branch validation error messaging, added accessibility `title` tags to icon buttons, and enhanced `handleInlineCreateProduct` to immediately call `productService.createBranchProduct` to link new products to the current branch. |

**Architecture:**
```
Admin Input (Create Import Order -> Inline Product Creation)
  → AdminImportOrders.tsx
  → handleInlineCreateProduct
    → productService.createProduct()
    → IF success: productService.createBranchProduct() linking product to currentBranchId
    → loadData() re-fetches branchProducts
    → New product is immediately available in dropdown
```

### 5. Stabilizing Enterprise Inventory & Tailwind CDN Crash Fix (Hoàn thành)
- **Tối ưu hóa API `getBranchProducts`**: Loại bỏ các phép join đắt đỏ (`InventoryBatch`, `Supplier`) trong quá trình tải dữ liệu mặc định của hệ thống. Các phép join này trước đây gây ra timeout 10000ms do phải xử lý hàng ngàn sản phẩm khi khởi tạo app.
- **Khắc phục lỗi điều hướng TailwindCDN**: Nguyên nhân gốc là do Tailwind CSS CDN gặp lỗi "Maximum call stack size" khi phải scan hàng ngàn thẻ `<option>` được sinh ra cùng lúc trong quá trình load `AdminImportOrders`. Giải pháp là áp dụng **Lazy Loading** cho danh sách sản phẩm nhánh:
  - Chỉ fetch `branchProducts` khi người dùng bấm nút "Tạo đơn nhập".
  - Thêm trạng thái `loadingProducts` để block UI trong lúc fetch, giúp bảo vệ Tailwind CDN khỏi việc bị nghẽn DOM.
- **Audit Routes**: Đã kiểm tra cấu hình Route trong `App.tsx` và `AdminSidebar.tsx`, đảm bảo tất cả các module (`AdminInventoryBatches`, `AdminStockMovements`, `AdminImportOrders`, `AdminImportReceipts`) được mount chính xác qua `AdminPermissionGuard`.

---

## APPENDIX A: ENVIRONMENT SETUP

### Frontend (.env)
```
VITE_API_HOST=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=xxx
```

### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/lottemart
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
FRONTEND_URL=http://localhost:5173
GEMINI_RECIPE_KEY=your-gemini-api-key
GEMINI_COMPARE_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### Running
```bash
# Backend
cd backend && npm run dev

# Frontend
cd fontend && npm run dev
```

---

## APPENDIX B: KEY DEPENDENCIES

### Frontend
- React 18, React Router 6
- Redux Toolkit
- Axios
- Tailwind CSS
- i18next
- react-three/fiber (3D demo)

### Backend
- Express 4
- Mongoose 8
- JWT (jsonwebtoken)
- bcryptjs
- google-auth-library
- @google/generative-ai (Gemini AI)
- morgan, cors

---

*End of CODE_READY_PLAN.md*

