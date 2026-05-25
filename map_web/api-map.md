    # API Map Re-Audit (Route + Field Contract)

    ## 1. Evidence
    - FE endpoint contracts: [fontend/src/api/endpoints.ts](../fontend/src/api/endpoints.ts)
    - FE callers: [fontend/src/services](../fontend/src/services), [fontend/src/pages](../fontend/src/pages)
    - BE route mounts: [backend/app.js](../backend/app.js), [backend/routes](../backend/routes)
    - BE handlers: [backend/controllers](../backend/controllers)
    - Route inventory snapshot: [backend/route_inventory.json](../backend/route_inventory.json)

    ## 2. Core Endpoint Status

    ### Auth
    | Endpoint | Status | Notes |
    |---|---|---|
    | `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/auth/verify` | ✅ | wired and used |
    | `/auth/email/request-otp`, `/auth/email/resend-otp`, `/auth/email/verify-otp` | ✅ | checkout/register gating uses these |
    | `/auth/otp/send`, `/auth/otp/verify` | ❌ | FE still declares phone OTP, backend routes missing |
    | `/auth/forgot-password`, `/auth/reset-password` | ⚠️ | backend exists, FE service path still partially NOT_IMPLEMENTED logic |

    ### Catalog
    | Endpoint | Status | Notes |
    |---|---|---|
    | `/products`, `/products/:id`, `/products/search`, `/products/:id/related` | ✅ | active |
    | `/products/:id/promotions`, `/products/:id/coupons` | ✅ | detail pricing badges flow |
    | `/products/:id/active` | ❌ | FE service has dead call; backend route absent |
    | `/categories` CRUD | ✅ | active |
    | `/branches`, `/branch-products` | ✅ | active |

    ### Commerce
    | Endpoint | Status | Notes |
    |---|---|---|
    | `/cart*` | ✅ | branch-scoped cart |
    | `/checkout/calculate`, `/checkout/preview` | ✅ | pricing core |
    | `/orders*` | ✅ | create/list/detail/cancel/tracking/refund/reorder/invoice |
    | `/payments/process`, `/payments/:id/status`, `/payments/:id/confirm` | ✅ | transaction flow active |

    ### Campaign / Voucher
    | Endpoint | Status | Notes |
    |---|---|---|
    | `/promotions*` + claim/wallet/usage | ✅ | active |
    | `/coupons*` + claim/wallet/usage | ✅ | active |

    ### CX
    | Endpoint | Status | Notes |
    |---|---|---|
    | `/view-history*` | ✅ | includes merge local |
    | `/reviews*` and `/products/:id/reviews` | ✅ | moderation + product reviews |
    | `/support/tickets*` | ✅ | includes message thread |
    | `/notifications*` | ✅ | list/read/read-all/delete/broadcast |
    | `/loyalty*` | ✅ | transaction/rule APIs |
    | `/return-requests*` | ✅ | user/admin lifecycle |

    ### Enterprise / Admin
    | Endpoint | Status | Notes |
    |---|---|---|
    | `/suppliers*`, `/import-orders*`, `/import-receipts*`, `/inventory-batches*`, `/stock-movements*` | ✅ | admin enterprise stack |
    | `/suppliers/:id/debt` | ❌ | FE dead call, backend missing |
    | `/stock-takes*`, `/internal-requisitions*` | ⚠️ | placeholder/static responses |
    | `/roles*`, `/permissions`, `/audit-logs*`, `/admin/settings*` | ✅ | RBAC/admin ops active |

    ## 3. Field-Level Contract Drift (API Payload)

    ### Product payload drift
    | Field | API/FE expectation | Schema support | Status |
    |---|---|---|---|
    | `highlights`, `rating_breakdown`, `usage_guide`, `recipe_suggestions`, `eco_label` | FE product detail/list | now in Product schema | ✅ |
    | `average_rating` | FE uses this key | schema canonical `rating` + fallback mapping | ⚠️ alias |
    | `origin_country` | sample + FE type | schema now supports alias with `origin` | ⚠️ dual naming |

    ### User payload drift
    | Field | API/FE expectation | Schema support | Status |
    |---|---|---|---|
    | `security.*`, `settings.*`, `profile_completed`, `wallet_balance` | Settings page and user type | now in User schema | ✅ |

    ### Category payload drift
    | Field | API/FE expectation | Schema support | Status |
    |---|---|---|---|
    | `description`, `display_order` | Admin category + FE type | now in Category schema | ✅ |
    | `sort_order` vs `display_order` | both appear across FE/BE | both stored, controller still sorts by `sort_order` | ⚠️ needs canonicalization |

    ### Remaining unresolved drifts
    | Entity | Field(s) | Status |
    |---|---|---|
    | BranchProduct | `badges`, `policies`, `lead_time_days`, `status`, `last_updated` | ⚠️ unresolved schema gap |
    | Order | `tax_amount`, `payment_method`, `payment_transaction_id`, `vat_percent`, `is_pickup`, `qr_code_url` | ⚠️ unresolved schema gap |
    | Notification | `action_url` vs `link` | ⚠️ alias mismatch |

    ## 4. Implementation Delta In This Pass
    - Added Product/User/Category schema fields to reduce API-field loss from seed/sample to DB.
    - Updated seed transformer to persist these fields.
    - Updated FE core type interfaces accordingly.

    ## 5. Next API Hardening Targets
    1. Implement or remove dead FE endpoint contracts (`/auth/otp/send`, `/auth/otp/verify`, `/products/:id/active`, `/suppliers/:id/debt`).
    2. Normalize alias keys in API responses (`average_rating/rating`, `origin/origin_country`, `link/action_url`).
    3. Add schema-backed handling for BranchProduct and Order sample-only fields if business requires.
