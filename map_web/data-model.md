# Data Model Full-Fidelity Re-Audit

## 1. Audit Scope And Evidence Priority
This document is rebuilt from 3 sources (priority ordered):
1. MongoDB-like sample documents and seeded payloads (highest practical source in this repo):
- [fontend/temp_schema.json](../fontend/temp_schema.json)
- [fontend/schema_extract.json](../fontend/schema_extract.json)
- [fontend/mockData.json](../fontend/mockData.json)
- [backend/seed/index.js](../backend/seed/index.js)
2. Mongoose schemas (authoritative backend contract):
- [backend/models](../backend/models)
3. Frontend usage/mapping (consumer contract):
- [fontend/src/types](../fontend/src/types)
- [fontend/src/services](../fontend/src/services)
- [fontend/src/pages](../fontend/src/pages)
- [fontend/src/admin/pages](../fontend/src/admin/pages)
- [fontend/src/utils](../fontend/src/utils)

Labels used in this audit:
- `observed-in-db`: observed in sample document/seeded payload.
- `schema-defined`: present in Mongoose schema.
- `frontend-used`: consumed by FE type/page/service/normalizer.
- `computed`: derived aggregate field.
- `legacy`: retained for backward compatibility.
- `denormalized`: snapshot/copy of related entity data.
- `uncertain`: not enough evidence from runtime DB dump.

Status legend:
- ✅ schema + sample + FE aligned.
- ⚠️ present but drift/mapping mismatch exists.
- ❌ missing/duplicate/stale placeholder contract.

## 2. Entity Coverage Matrix
| Entity | Model Source | Sample Source | FE Usage Source | Status |
|---|---|---|---|---|
| Product | [backend/models/Product.js](../backend/models/Product.js) | [fontend/temp_schema.json](../fontend/temp_schema.json) | [fontend/src/pages/ProductDetail.tsx](../fontend/src/pages/ProductDetail.tsx), [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts) | ⚠️ |
| User | [backend/models/User.js](../backend/models/User.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/pages/Settings.tsx](../fontend/src/pages/Settings.tsx), [fontend/src/types/index.ts](../fontend/src/types/index.ts) | ✅ |
| Role | [backend/models/Role.js](../backend/models/Role.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/admin/pages/AdminRolesPermissions.tsx](../fontend/src/admin/pages/AdminRolesPermissions.tsx) | ✅ |
| Permission | [backend/models/Permission.js](../backend/models/Permission.js) | seeded via RBAC bootstrap | [fontend/src/admin/utils/permission.ts](../fontend/src/admin/utils/permission.ts) | ✅ |
| Category | [backend/models/Category.js](../backend/models/Category.js) | [fontend/temp_schema.json](../fontend/temp_schema.json) | [fontend/src/admin/pages/AdminCategoryManagement.tsx](../fontend/src/admin/pages/AdminCategoryManagement.tsx) | ✅ |
| Branch | [backend/models/Branch.js](../backend/models/Branch.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/services/branchService.ts](../fontend/src/services/branchService.ts) | ⚠️ |
| BranchProduct | [backend/models/BranchProduct.js](../backend/models/BranchProduct.js) | [fontend/temp_schema.json](../fontend/temp_schema.json) | [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts) | ⚠️ |
| Cart | [backend/models/Cart.js](../backend/models/Cart.js) | API/seed-driven | [fontend/src/slices/cartSlice.ts](../fontend/src/slices/cartSlice.ts) | ✅ |
| Order | [backend/models/Order.js](../backend/models/Order.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/pages/Payment.tsx](../fontend/src/pages/Payment.tsx), [fontend/src/services/orderService.ts](../fontend/src/services/orderService.ts) | ⚠️ |
| Payment (method/txn/provider) | [backend/models/Payment.js](../backend/models/Payment.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/services/paymentService.ts](../fontend/src/services/paymentService.ts) | ✅ |
| Promotion | [backend/models/Promotion.js](../backend/models/Promotion.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/services/promotionService.ts](../fontend/src/services/promotionService.ts) | ⚠️ |
| Coupon | [backend/models/Coupon.js](../backend/models/Coupon.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/services/couponService.ts](../fontend/src/services/couponService.ts) | ⚠️ |
| PromotionUsage/Claim | [backend/models/PromotionUsage.js](../backend/models/PromotionUsage.js) | order apply/claim flows | FE wallet/order flows | ✅ |
| ViewedHistory | [backend/models/ViewedHistory.js](../backend/models/ViewedHistory.js) | API-backed | [fontend/src/services/viewHistoryService.ts](../fontend/src/services/viewHistoryService.ts) | ✅ |
| Review | [backend/models/Review.js](../backend/models/Review.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/components/reviews/ReviewList.tsx](../fontend/src/components/reviews/ReviewList.tsx) | ⚠️ |
| SupportTicket | [backend/models/SupportTicket.js](../backend/models/SupportTicket.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/pages/SupportCenter.tsx](../fontend/src/pages/SupportCenter.tsx) | ⚠️ |
| Notification | [backend/models/Notification.js](../backend/models/Notification.js) | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/slices/notificationSlice.ts](../fontend/src/slices/notificationSlice.ts) | ⚠️ |
| Loyalty (txn/rule) | [backend/models/Loyalty.js](../backend/models/Loyalty.js) | API/seed-driven | [fontend/src/services/loyaltyService.ts](../fontend/src/services/loyaltyService.ts) | ✅ |
| ReturnRequest | [backend/models/ReturnRequest.js](../backend/models/ReturnRequest.js) | API-driven | [fontend/src/services/returnRequestService.ts](../fontend/src/services/returnRequestService.ts) | ✅ |
| InventoryBatch | [backend/models/InventoryBatch.js](../backend/models/InventoryBatch.js) | API/stock scripts | [fontend/src/admin/services/enterpriseService.ts](../fontend/src/admin/services/enterpriseService.ts) | ✅ |
| Supplier | [backend/models/Supplier.js](../backend/models/Supplier.js) | API/seed-driven | [fontend/src/admin/services/enterpriseService.ts](../fontend/src/admin/services/enterpriseService.ts) | ✅ |
| ImportOrder | [backend/models/ImportOrder.js](../backend/models/ImportOrder.js) | API/seed-driven | [fontend/src/admin/services/enterpriseService.ts](../fontend/src/admin/services/enterpriseService.ts) | ✅ |
| ImportReceipt | [backend/models/ImportReceipt.js](../backend/models/ImportReceipt.js) | API/seed-driven | [fontend/src/admin/services/enterpriseService.ts](../fontend/src/admin/services/enterpriseService.ts) | ✅ |
| StockMovement | [backend/models/StockMovement.js](../backend/models/StockMovement.js) | API/stock scripts | [fontend/src/admin/services/enterpriseService.ts](../fontend/src/admin/services/enterpriseService.ts) | ⚠️ |
| Misc/Duplicate Models | [backend/models/Misc.js](../backend/models/Misc.js) | marketing seed | mixed usage | ❌ |

## 3. Product Full-Fidelity Audit (Critical)
Model: [backend/models/Product.js](../backend/models/Product.js)
Reader files (field-level):
- [backend/controllers/productController.js](../backend/controllers/productController.js)
- [fontend/src/pages/ProductDetail.tsx](../fontend/src/pages/ProductDetail.tsx)
- [fontend/src/pages/Products.tsx](../fontend/src/pages/Products.tsx)
- [fontend/src/pages/SearchResults.tsx](../fontend/src/pages/SearchResults.tsx)
- [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts)

| Field | Sample (Mongo-like) | Schema | FE Use | Classification | Status |
|---|---|---|---|---|---|
| _id/id | id in sample | _id | yes | master | ✅ |
| name | yes | yes required | yes | master | ✅ |
| slug | optional | yes | yes | master | ✅ |
| description | yes | yes | yes | master | ✅ |
| short_description | yes | yes | yes | display/snapshot | ✅ |
| category_id | yes | yes | yes | master relation | ✅ |
| category_name | sparse | yes | yes | denormalized | ⚠️ |
| supplier_id | sparse | yes | partial | denormalized relation | ⚠️ |
| supplier_name | sparse | yes | partial | denormalized | ⚠️ |
| brand | yes | yes | yes | master | ✅ |
| origin | partial (origin_country used) | yes | yes | master | ✅ |
| origin_country | yes | yes | type/normalizer | display alias | ✅ |
| unit | yes | yes | yes | master | ✅ |
| weight | yes | yes | yes | master | ✅ |
| barcode | sparse | yes | yes | master | ✅ |
| sku | yes | yes | yes | master | ✅ |
| price | mostly in branch_product sample, sparse in product sample | yes required | yes | master | ⚠️ |
| original_price | sparse | yes | yes | display | ⚠️ |
| import_price | no in sample | yes | admin/internal | master internal | ⚠️ |
| discount_percent | sparse | yes | yes | computed/display | ⚠️ |
| images | yes | yes | yes | master asset | ✅ |
| gallery | yes | yes | partial | display asset | ✅ |
| thumbnail | sparse | yes | yes | display asset | ✅ |
| tags | yes | yes | yes | display/filter | ✅ |
| eco_label | yes | yes | yes | display/filter | ✅ |
| is_active | yes | yes | yes | master | ✅ |
| is_featured | in branch_product/sample flags | yes | yes | display flag | ✅ |
| is_best_seller | in branch_product/sample flags | yes | yes | computed/display | ✅ |
| is_new | in branch_product/sample flags | yes | yes | display flag | ✅ |
| rating / average_rating | yes | rating in schema; average_rating via FE mapping | yes | computed | ⚠️ |
| review_count | yes | yes | yes | computed | ✅ |
| total_reviews | yes | yes | yes fallback | computed/legacy alias | ✅ |
| sold_count | yes in branch_product | yes | yes | computed | ✅ |
| stock | yes in branch_product | yes | yes | computed/snapshot | ✅ |
| specifications | yes | yes | yes | master detail | ✅ |
| nutrition_info | sparse | yes | partial | master detail | ⚠️ |
| storage_instructions | sparse | yes | yes | master detail | ✅ |
| usage_guide | yes | yes | yes | display detail | ✅ |
| storage_guide | yes | yes | yes | display alias | ✅ |
| notes | yes | yes | yes | display detail | ✅ |
| recipe_suggestions | yes | yes | yes | display detail | ✅ |
| highlights | yes | yes | yes | display detail | ✅ |
| rating_breakdown | yes | yes | yes | computed | ✅ |
| related_product_ids | yes | yes | type-driven | computed/recommendation | ✅ |
| frequently_bought_together | yes | yes | type-driven | computed/recommendation | ✅ |
| vat_included | yes | yes | type-driven | display/compliance | ✅ |
| shipping_excluded | yes | yes | type-driven | display/compliance | ✅ |
| master_id | sparse | yes | limited | legacy | ⚠️ |
| manufacture_date/expiry_date/batch_code | sparse | yes | partial | master (perishable) | ✅ |
| is_expiring_soon/is_expired | sparse | yes | yes | computed | ✅ |
| created_by | yes in sample | yes | limited | audit | ✅ |
| created_at/updated_at | yes | yes | yes | audit | ✅ |

Product notes:
- `master product` fields: identity, descriptive, compliance and base attributes (`name`, `slug`, `brand`, `unit`, `barcode`, `sku`, `description`, `specifications`, `nutrition_info`, `storage_instructions`).
- `snapshot/denormalized` fields: `category_name`, `supplier_name`, `origin_country`.
- `display-only` fields: `highlights`, `gallery`, `recipe_suggestions`, `vat_included`, `shipping_excluded`, `badge-driven flags`.
- `computed` fields: `rating`, `review_count`, `total_reviews`, `sold_count`, `stock`, `rating_breakdown`, `discount_percent`.
- `legacy` fields: `master_id`, plus coexistence of `rating` vs `average_rating` and `origin` vs `origin_country`.

## 4. Entity Field Inventories (Schema + Usage)

### 4.1 User
Model: [backend/models/User.js](../backend/models/User.js)
- Fields: `username*`, `full_name`, `email`, `phone`, `password_hash`, `avatar`, `role_id`, `role_key`, `permissions[]`, `branch_id`, `lotte_points`, `membership_level`, `signup_method`, `login_provider`, `googleId`, `facebookId`, `facebook_id`, `social_providers[]`, `social_links`, `status`, `is_active`, `profile_completed`, `wallet_balance`, `default_payment_method`, `email_verified`, `email_verification_code`, `email_verification_expires_at`, `email_verification_attempts`, `email_otp_last_sent_at`, `dob`, `gender`, `address`, `bio`, `note`, `tags[]`, `preferences{...}`, `security{...}`, `settings{...}`, `last_login_at`, `refresh_token`, timestamps `created_at/updated_at`.
- Index: partial unique on `email`.
- FE readers: [fontend/src/pages/Settings.tsx](../fontend/src/pages/Settings.tsx), [fontend/src/slices/authSlice.ts](../fontend/src/slices/authSlice.ts).

### 4.2 Role
Model: [backend/models/Role.js](../backend/models/Role.js)
- Fields: `key* unique`, `name*`, `description`, `role_id`, `permissions[]`, `is_system`, `is_active`, timestamps.
- Index: `key`, `role_id`.

### 4.3 Permission
Model: [backend/models/Permission.js](../backend/models/Permission.js)
- Fields: `key* unique`, `label`, `group`, `description`, `is_active`, timestamps.
- Index: `key`, `(group,key)`.

### 4.4 Category
Model: [backend/models/Category.js](../backend/models/Category.js)
- Fields: `name*`, `slug`, `icon`, `image`, `banner`, `description`, `parent_id`, `sort_order`, `display_order`, `is_active`, `product_count`, `created_by`, timestamps.
- FE readers: [fontend/src/admin/pages/AdminCategoryManagement.tsx](../fontend/src/admin/pages/AdminCategoryManagement.tsx), [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts).

### 4.5 Branch
Model: [backend/models/Branch.js](../backend/models/Branch.js)
- Fields: `name*`, `address`, `city`, `phone`, `manager`, `is_active`, `operating_hours`, `coordinates{lat,lng}`, timestamps.

### 4.6 BranchProduct
Model: [backend/models/BranchProduct.js](../backend/models/BranchProduct.js)
- Fields: `product_id*`, `master_id`, `sku`, `category_id`, `category_name`, `supplier_id`, `supplier_name`, `branch_id*`, `price`, `original_price`, `import_price`, `discount_percent`, `stock`, `min_stock`, `max_purchase_limit`, `is_available`, `sold_count`, `manufacture_date`, `expiry_date`, `batch_code`, `is_expiring_soon`, `is_expired`, `promotion_tag`, `promotion_end_date`, timestamps.
- FE readers: [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts), [fontend/src/pages/Payment.tsx](../fontend/src/pages/Payment.tsx).

### 4.7 Cart
Model: [backend/models/Cart.js](../backend/models/Cart.js)
- Fields: `user_id* ObjectId`, `branch_id*`, `items[] {branch_product_id*, quantity, price, unit_price, product_name, product_image}`, timestamps.
- Unique index: `(user_id, branch_id)`.

### 4.8 Order
Model: [backend/models/Order.js](../backend/models/Order.js)
- Fields: `user_id*`, `items[]` (snapshot fields: product ids/names/images/sku/category/supplier/pricing/gift), `order_address{...}`, `status`, `subtotal`, `shipping_fee`, `discount_amount`, `total_amount`, `coupon_code`, `points_earned`, `payment{method,status,transaction_id}`, `tracking{tracking_number,carrier,estimated_delivery,history[]}`, `delivery_slot`, `branch_id`, `branch_name`, `pricing_breakdown{...}`, `applied_promotions[]`, `applied_coupon{...}`, `gift_items[]`, `note`, `generated_invoice_url`, `email_notification_status`, `email_notification_sent_at`, `email_notification_error`, timestamps.

### 4.9 Payment
Model: [backend/models/Payment.js](../backend/models/Payment.js)
- PaymentMethod fields: `user_id*`, `type`, `provider`, `brand`, `last4`, `holder_name`, `card_number`, `card_holder`, `expiry`, `phone`, `is_default`, `icon`, timestamps.
- PaymentTransaction fields: `order_id`, `user_id`, `provider`, `method_id`, `transaction_id`, `amount`, `currency`, `status`, `qr_data{...}`, `paid_at`, `expired_at`, `metadata`, timestamps.
- PaymentProvider fields: `name*`, `code*`, `icon`, `is_active`, `config`, timestamps.

### 4.10 Promotion
Model: [backend/models/Promotion.js](../backend/models/Promotion.js)
- Fields: `title*`, `description`, `type*`, `voucher_type`, `status`, `start_date`, `end_date`, `is_active`, `priority`, `scope`, `target_product_ids[]`, `target_category_ids[]`, `target_branch_ids[]`, `excluded_product_ids[]`, `excluded_category_ids[]`, `is_auto_generated`, `source`, `suggested_by_system`, `total_quantity`, `remaining_quantity`, `claimed_count`, `hide_after_expired_hours`, `auto_hide_after_expired`, `notification_sent`, `usage_limit`, `max_redemptions`, `usage_count`, `usage_per_user`, `min_order_amount`, `min_quantity`, `gift_quantity`, `discount_value`, `max_discount_amount`, `gift_product_id`, `points_multiplier`, `badge_text`, `banner_image`, `image`, `banner_url`, `claim_campaign`, `stackable`, `created_by`, timestamps.
- Duplicate definition exists for `scope` and `target_*` inside schema file (needs cleanup).

### 4.11 Coupon
Model: [backend/models/Coupon.js](../backend/models/Coupon.js)
- Coupon fields: `code* unique`, `title`, `description`, `image`, `type`, `voucher_type`, `discount_value`, `min_order_amount`, `min_quantity`, `max_discount_amount`, `total_quantity`, `remaining_quantity`, `claimed_count`, `hide_after_expired_hours`, `auto_hide_after_expired`, `start_date`, `end_date`, `usage_limit`, `usage_per_user`, `used_count`, `is_active`, `status`, `claim_campaign`, `badge_text`, `banner_image`, `scope`, targets/exclusions arrays, `created_by`, timestamps.
- CouponUsage fields: `coupon_id*`, `user_id*`, `order_id`, `discount_amount`, `used_at`.
- CouponClaim fields: `coupon_id*`, `user_id*`, `claimed_at`, `status`, `used_order_id`, timestamps.

### 4.12 PromotionUsage And Claim
Model: [backend/models/PromotionUsage.js](../backend/models/PromotionUsage.js)
- PromotionClaim: `promotion_id*`, `user_id*`, `branch_id`, `claimed_at`, `status`, `used_order_id`, timestamps.
- PromotionUsage: `promotion_id*`, `user_id`, `order_id*`, `discount_amount`, `created_at`.

### 4.13 ViewedHistory
Model: [backend/models/ViewedHistory.js](../backend/models/ViewedHistory.js)
- Fields: `user_id*`, `product_id*`, `branch_product_id`, `product_name`, `product_image`, `price`, `original_price`, `category`, `view_count`, `viewed_at`, timestamps.
- Unique index: `(user_id, product_id, branch_product_id)`.

### 4.14 Review
Model: [backend/models/Review.js](../backend/models/Review.js)
- Fields: `user_id*`, `user_name`, `user_avatar`, `product_id*`, `product_name`, `branch_id`, `branch_name`, `order_id`, `rating*`, `title`, `content`, `images[]`, `status`, `is_verified_purchase`, `helpful_count`, `reported_count`, `is_featured`, `is_hidden`, `is_deleted`, `admin_notes`, `moderation_reason`, `reply{content,admin_id,admin_name,replied_at}`, timestamps.

### 4.15 SupportTicket
Model: [backend/models/SupportTicket.js](../backend/models/SupportTicket.js)
- Fields: `ticket_code unique`, `user_id*`, `user_name`, `user_email`, `user_avatar`, `branch_id`, `branch_name`, `order_id`, `category`, `priority`, `status`, `subject*`, `message`, `attachments[]`, `thread[]`, `messages[]` (legacy), `internal_notes[]`, `assigned_agent_id`, `assigned_agent_name`, `assigned_to` (legacy), `sla_due_at`, `first_response_at`, `resolved_at`, `closed_at`, timestamps.

### 4.16 Notification
Model: [backend/models/Notification.js](../backend/models/Notification.js)
- Fields: `user_id*`, `type`, `title*`, `message`, `icon`, `link`, `is_read`, `metadata`, timestamps.

### 4.17 Loyalty
Model: [backend/models/Loyalty.js](../backend/models/Loyalty.js)
- LoyaltyTransaction: `user_id*`, `type`, `points*`, `source`, `description`, `order_id`, `balance_after`, `created_at`.
- LoyaltyRule: `name*`, `description`, `type`, `points_per_unit`, `min_order_value`, `multiplier`, `is_active`, timestamps.

### 4.18 ReturnRequest
Model: [backend/models/ReturnRequest.js](../backend/models/ReturnRequest.js)
- Fields: `user_id*`, `order_id*`, `branch_id`, `status`, `reason*`, `description`, `refund_method`, `contact_phone`, `amount_requested`, `evidence_images[]`, `items[]`, `admin_note`, `resolved_by`, `resolved_at`, `timeline[]`, timestamps.

### 4.19 InventoryBatch
Model: [backend/models/InventoryBatch.js](../backend/models/InventoryBatch.js)
- Fields: `branch_product_id*`, `batch_code`, `quantity*`, `exp_date`, `manufacture_date`, `received_date`, `cost_price`, `supplier_id`, `supplier_name`, `note`, `purchase_order_id`, `import_receipt_id`, timestamps.

### 4.20 Supplier
Model: [backend/models/Supplier.js](../backend/models/Supplier.js)
- Fields: `code`, `name*`, `contact_name`, `email`, `phone`, `address`, `tax_code`, `payment_terms`, `note`, `total_debt`, `is_active`, timestamps.

### 4.21 ImportOrder
Model: [backend/models/ImportOrder.js](../backend/models/ImportOrder.js)
- Fields: `order_code* unique`, `supplier_id*`, `branch_id*`, `status`, `expected_date`, `ordered_date`, `received_date`, `currency`, `items[]`, `total_amount`, `total_received_amount`, `note`, `timeline[]`, `created_by`, `updated_by`, timestamps.

### 4.22 ImportReceipt
Model: [backend/models/ImportReceipt.js](../backend/models/ImportReceipt.js)
- Fields: `receipt_code* unique`, `import_order_id*`, `supplier_id*`, `branch_id*`, `received_date`, `status`, `items[]`, `total_amount`, `note`, `created_by`, `updated_by`, timestamps.

### 4.23 StockMovement
Model: [backend/models/StockMovement.js](../backend/models/StockMovement.js)
- Fields: `branch_id*`, `branch_name`, `product_id*`, `product_name`, `branch_product_id*`, `batch_code`, `movement_type*`, `quantity*`, `before_stock*`, `after_stock*`, `reference_type`, `reference_id`, `created_by`, `note`, timestamps.
- Duplicate alternate schema also exists in [backend/models/Misc.js](../backend/models/Misc.js) as `StockMovement` export.

## 5. Three-Way Comparison Tables (Mismatch-Focused)

### Product
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `eco_label`, `highlights`, `rating_breakdown`, `usage_guide`, `recipe_suggestions` | yes | yes | yes | ✅ |
| `origin_country` vs `origin` | mostly `origin_country` | both | FE mainly reads `origin` | ⚠️ rename/alias drift |
| `average_rating` vs `rating` | mostly `average_rating` | `rating` (+ `total_reviews`) | FE maps both | ⚠️ dual contract |
| `price/original_price` in product doc | sparse (often in branch_product) | yes | yes | ⚠️ depends on branch snapshot |

### User
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `profile_completed`, `wallet_balance`, `security`, `settings` | yes | yes | yes (`Settings.tsx`) | ✅ |
| `social providers ids` | partial | yes (`googleId/facebookId/...`) | auth uses provider data | ✅ |

### Category
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `description`, `display_order`, `created_by` | yes | yes | FE types/admin uses order | ✅ |
| `sort_order` | mixed naming | yes | FE admin uses `sort_order` | ⚠️ dual naming |

### Branch
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `opening_hours` | yes | `operating_hours` | FE reads opening/operating | ⚠️ mapping alias needed |
| `manager_user_id` | yes | `manager` string | low FE dependency | ⚠️ shape mismatch |

### BranchProduct
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `badges`, `policies`, `lead_time_days`, `status`, `last_updated` | yes | no | yes in UI cards/detail | ⚠️ schema missing |
| core pricing/stock fields | yes | yes | yes | ✅ |

### Order
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `tax_amount`, `vat_percent`, `payment_method`, `payment_transaction_id`, `qr_code_url`, `is_pickup` | yes | no (partly represented in nested objects) | FE uses payment/order summary | ⚠️ schema missing/renamed |
| `pricing_breakdown`, `applied_promotions`, `email_notification_status` | partial sample, strong runtime usage | yes | yes | ✅ |

### Payment
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| transaction core fields | yes | yes | yes | ✅ |
| provider config details | limited sample | yes | admin uses provider list | ✅ |

### Promotion
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `value` (sample) vs `discount_value` (schema) | yes | yes (different key) | FE maps both in some service paths | ⚠️ naming drift |
| scope/target arrays | yes | yes (duplicated defs) | yes | ⚠️ duplicate schema definitions |

### Coupon
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `min_order`/`discount_type`/`max_discount_value` (sample) | yes | canonical fields use `_amount` / `type` / `max_discount_amount` | FE has mixed legacy contracts | ⚠️ rename drift |

### PromotionUsage
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| usage/claim core fields | transactional runtime data | yes | consumed indirectly via wallet/order APIs | ✅ |

### ViewedHistory
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| list/track/merge fields | runtime observed | yes | yes | ✅ |

### Review
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `comment` + `replies` in sample | yes | schema canonical `content` + `reply` | FE supports both patterns | ⚠️ legacy naming |

### SupportTicket
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| minimal ticket shape in sample | yes | full rich schema | FE chat uses rich thread/message | ⚠️ sample under-represented |

### Notification
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| `action_url` | yes | schema uses `link` | FE handles link/action mapping | ⚠️ rename drift |

### Loyalty
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| points transactions/rules | runtime-driven | yes | yes | ✅ |

### ReturnRequest
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| return lifecycle fields | runtime-driven | yes | yes | ✅ |

### InventoryBatch
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| batch/expiry/cost fields | runtime-driven | yes | admin enterprise pages | ✅ |

### Supplier
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| supplier master/debt fields | runtime-driven | yes | admin enterprise pages | ✅ |

### ImportOrder
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| item timeline/procurement fields | runtime-driven | yes | admin enterprise pages | ✅ |

### ImportReceipt
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| receipt item/batch fields | runtime-driven | yes | admin enterprise pages | ✅ |

### StockMovement
| Field | Mongo sample | Schema | FE use | Status |
|---|---|---|---|---|
| canonical movement fields | runtime-driven | yes in [backend/models/StockMovement.js](../backend/models/StockMovement.js) | admin reports use this model | ✅ |
| duplicate movement schema in Misc | n/a | yes duplicate | potential confusion | ❌ duplicate model |

## 6. Schema vs MongoDB Mismatch

### 6.1 DB/Sample Has Field But Schema Missing
| Entity | Field(s) | DB/Sample Evidence | Reader Files | File(s) Need Update |
|---|---|---|---|---|
| BranchProduct | `badges`, `policies`, `lead_time_days`, `status`, `last_updated` | [fontend/temp_schema.json](../fontend/temp_schema.json) | [fontend/src/pages/ProductDetail.tsx](../fontend/src/pages/ProductDetail.tsx), [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts) | [backend/models/BranchProduct.js](../backend/models/BranchProduct.js) |
| Order | `tax_amount`, `vat_percent`, `payment_method`, `payment_transaction_id`, `qr_code_url`, `is_pickup` | [fontend/schema_extract.json](../fontend/schema_extract.json) | [fontend/src/pages/Payment.tsx](../fontend/src/pages/Payment.tsx) | [backend/models/Order.js](../backend/models/Order.js) |

### 6.2 Schema Has Field But Sample Under-Represents / Missing
| Entity | Field(s) | Reader Files | Note |
|---|---|---|---|
| Product | `nutrition_info`, `supplier_id`, `import_price`, perishable fields | product detail + admin/inventory flow | likely present in production DB, weak in sample docs |
| Promotion | campaign governance fields (`remaining_quantity`, `source`, `claim_campaign`) | promotions service/admin pages | sample schema is lightweight |
| Coupon | wallet/governance fields (`claimed_count`, `remaining_quantity`, `usage_per_user`) | coupon wallet flows | sample docs are legacy shape |

### 6.3 Rename / Alias Mismatches
- Product: `average_rating` (sample/FE) vs `rating` (schema).
- Product: `origin_country` (sample) vs `origin` (schema canonical).
- Category: `display_order` (sample/FE) vs `sort_order` (existing controller sort key).
- Branch: `opening_hours` (sample) vs `operating_hours` (schema).
- Notification: `action_url` (sample) vs `link` (schema).
- Coupon/Promotion legacy payload keys: `value`, `min_order`, `discount_type` vs canonical schema keys.

### 6.4 Duplicate Schema / Stale Contracts
- `StockMovement` defined in both [backend/models/StockMovement.js](../backend/models/StockMovement.js) and [backend/models/Misc.js](../backend/models/Misc.js).
- `Promotion` defines `scope` and `target_*` twice in [backend/models/Promotion.js](../backend/models/Promotion.js).

### 6.5 Mixed ID Strategy
- Widespread use of `mongoose.Schema.Types.Mixed` for relational ids across Product/Order/Promotion/Coupon/inventory entities.
- Risk: inconsistent `number`/`string`/`ObjectId` comparisons and FE normalization complexity.

## 7. Changes Implemented In This Re-Audit
Code changes made to improve fidelity:
- [backend/models/Product.js](../backend/models/Product.js): added missing sample/frontend-used fields (`eco_label`, `gallery`, `ar_model_url`, `origin_country`, `rating_breakdown`, `highlights`, `related_product_ids`, etc.).
- [backend/models/User.js](../backend/models/User.js): added `profile_completed`, `wallet_balance`, `default_payment_method`, `security`, `settings` and expanded `preferences` shape.
- [backend/models/Category.js](../backend/models/Category.js): added `description`, `banner`, `display_order`, `created_by`.
- [backend/seed/index.js](../backend/seed/index.js): mapped new Product/User/Category fields from sample docs so seeded Mongo data preserves them.
- [fontend/src/types/index.ts](../fontend/src/types/index.ts): synchronized Product/Category type contracts with schema and sample payload.

## 8. Open Items (Not Auto-Changed Yet)
1. Add missing BranchProduct fields from sample (`badges`, `policies`, `lead_time_days`, `status`, `last_updated`) into schema if business-confirmed.
2. Decide canonical source for rating/origin naming (`rating` vs `average_rating`, `origin` vs `origin_country`) and normalize API response.
3. Remove duplicate StockMovement model from Misc or alias explicitly to avoid accidental divergent writes.
4. Clean duplicate field declarations in Promotion schema to avoid override ambiguity.
5. Confirm whether sample-only Order tax/pickup/payment alias fields should be first-class schema fields or normalized under existing `payment/pricing_breakdown` objects.
