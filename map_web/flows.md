  # Functional Flows Re-Audit (Synced With Data Fidelity)

  ## 1. Evidence
  - Backend flow handlers: [backend/controllers](../backend/controllers)
  - Route composition: [backend/app.js](../backend/app.js)
  - FE flow orchestrators: [fontend/src/pages](../fontend/src/pages), [fontend/src/services](../fontend/src/services)
  - Data normalization bridge: [fontend/src/utils/productNormalization.ts](../fontend/src/utils/productNormalization.ts)

  ## 2. Auth + Identity Flows

  ### Register/Login/Refresh
  ```mermaid
  sequenceDiagram
    participant FE
    participant API
    participant DB
    FE->>API: POST /auth/register or /auth/login
    API->>DB: User query/write
    API-->>FE: token + refresh + user payload
    FE->>API: /auth/verify and /auth/refresh when needed
  ```

  Field notes:
  - User payload now supports settings/security/profile fields in schema.
  - Email OTP flows are implemented and enforced in checkout/payment paths.

  Gap:
  - Phone OTP endpoints still declared in FE but missing in backend.

  ## 3. Product Detail Rich-Field Flow
  ```mermaid
  sequenceDiagram
    participant FE as ProductDetail
    participant API as /products/:id
    participant DB as Product/BranchProduct
    FE->>API: GET product detail + related/promo/coupon endpoints
    API->>DB: load product and pricing context
    API-->>FE: product payload
    FE->>FE: normalize rating/review aliases and render highlights/specs
  ```

  Critical fields in this flow:
  - `highlights`, `rating_breakdown`, `usage_guide`, `storage_guide`, `storage_instructions`, `recipe_suggestions`, `eco_label`.
  - `review_count` fallback to `total_reviews`.
  - `origin` and `origin_country` dual alias currently tolerated.

  ## 4. Cart -> Checkout -> Order -> Payment
  ```mermaid
  sequenceDiagram
    participant CartFE
    participant PromoAPI
    participant OrderAPI
    participant PayAPI
    participant DB

    CartFE->>PromoAPI: calculate discounts
    PromoAPI-->>CartFE: pricing breakdown
    CartFE->>OrderAPI: create order
    OrderAPI->>DB: persist order + usage logs
    CartFE->>PayAPI: process transaction
    PayAPI->>DB: persist transaction
    CartFE->>PayAPI: confirm payment
    PayAPI->>DB: update payment + order + loyalty
  ```

  Gap:
  - Sample docs expose order tax/pickup aliases not fully represented in Order schema.

  ## 5. Promotion/Coupon Wallet Claim Flow
  ```mermaid
  flowchart TD
    U[User] --> C1[Claim Promotion/Coupon]
    C1 --> T[Mongo Session Transaction]
    T --> V[Validate status/time/limit]
    V --> W[Create claim + increment counters]
    W --> M[My Wallet APIs]
  ```

  Field integrity:
  - Usage and claim models are schema-defined and transactional.
  - Legacy payload naming drift still exists in sample contracts (`value` vs `discount_value`).

  ## 6. ViewedHistory Merge Flow
  ```mermaid
  sequenceDiagram
    participant Guest
    participant FE
    participant API
    Guest->>FE: view product offline/local
    FE->>API: merge local history after login
    API-->>FE: merged history list
  ```

  Field integrity:
  - `user_id/product_id/branch_product_id` composite unique key prevents duplicates.

  ## 7. Support Ticket Realtime Flow
  ```mermaid
  sequenceDiagram
    participant FE
    participant API
    participant IO
    FE->>API: create ticket / post message
    API->>IO: emit room event
    IO-->>FE: new_message
  ```

  Schema supports:
  - rich `thread[]`, fallback `messages[]`, `internal_notes[]`, assignment and SLA fields.

  ## 8. Enterprise Inventory Flow
  ```mermaid
  flowchart LR
    Supplier --> ImportOrder --> ImportReceipt --> InventoryBatch --> StockMovement
  ```

  Contract observations:
  - Dedicated inventory models are complete.
  - Placeholder routes still exist for stock-takes/internal-requisitions.
  - Duplicate StockMovement schema remains in Misc model file.

  ## 9. Flow-Level Gaps Summary
  1. Missing phone OTP backend routes for declared FE auth flow.
  2. BranchProduct sample-only fields not represented in schema.
  3. Order sample alias fields (tax/pickup/payment aliases) not fully captured in canonical schema.
  4. Enterprise placeholder APIs can mislead flow-readiness assumptions.
