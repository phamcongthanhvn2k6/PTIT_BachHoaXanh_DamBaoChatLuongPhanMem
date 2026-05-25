# Issues And Gaps Re-Audit (After Full Data-Model Sync)

## 1. Critical (P0)
| ID | Issue | Current State | Evidence | Action |
|---|---|---|---|---|
| P0-01 | FE phone OTP endpoints have no backend route | Unchanged | [fontend/src/api/endpoints.ts](../fontend/src/api/endpoints.ts), [backend/routes/auth.js](../backend/routes/auth.js) | Implement `/auth/otp/send` + `/auth/otp/verify` or remove FE path.
| P0-02 | Runtime admin bootstrap with default credential risk | Unchanged | [backend/routes/admin.js](../backend/routes/admin.js) | Move bootstrap to secured one-off migration/seed.

## 2. High (P1)
| ID | Issue | Current State | Evidence | Action |
|---|---|---|---|---|
| P1-01 | BranchProduct sample fields missing in schema (`badges`, `policies`, `lead_time_days`, `status`, `last_updated`) | Unchanged | [fontend/temp_schema.json](../fontend/temp_schema.json), [backend/models/BranchProduct.js](../backend/models/BranchProduct.js) | Add fields or define explicit API mapper.
| P1-02 | Order sample aliases not represented in canonical schema (`tax_amount`, `vat_percent`, `payment_method`, `payment_transaction_id`, `is_pickup`, `qr_code_url`) | Unchanged | [fontend/schema_extract.json](../fontend/schema_extract.json), [backend/models/Order.js](../backend/models/Order.js) | Decide canonical keys and map aliases.
| P1-03 | Dead FE endpoint calls (`/products/:id/active`, `/suppliers/:id/debt`) | Unchanged | [fontend/src/services/productService.ts](../fontend/src/services/productService.ts), [fontend/src/services/dataService.ts](../fontend/src/services/dataService.ts) | Remove dead calls or add backend support.
| P1-04 | Promotion schema duplicate field declarations | Unchanged | [backend/models/Promotion.js](../backend/models/Promotion.js) | Deduplicate schema definitions.

## 3. Medium (P2)
| ID | Issue | Current State | Evidence | Action |
|---|---|---|---|---|
| P2-01 | Duplicate StockMovement model definitions | Unchanged | [backend/models/StockMovement.js](../backend/models/StockMovement.js), [backend/models/Misc.js](../backend/models/Misc.js) | Keep one canonical model and remove duplicate export.
| P2-02 | Naming drift aliases (`origin/origin_country`, `rating/average_rating`, `link/action_url`, `sort_order/display_order`) | Partially improved | updated schemas + docs | Standardize API response key policy.
| P2-03 | Placeholder enterprise routes (stock-takes/internal-requisitions) | Unchanged | [backend/routes/stockTakes.js](../backend/routes/stockTakes.js), [backend/routes/internalRequisitions.js](../backend/routes/internalRequisitions.js) | Implement real lifecycle or flag as beta.
| P2-04 | Sample schema under-models support/review richness | Unchanged | [fontend/schema_extract.json](../fontend/schema_extract.json), [backend/models/Review.js](../backend/models/Review.js), [backend/models/SupportTicket.js](../backend/models/SupportTicket.js) | Regenerate sample schema from real DB snapshots.

## 4. Fixed In This Re-Audit
| Item | Change |
|---|---|
| Product schema fidelity | Added missing sample/FE-used fields in [backend/models/Product.js](../backend/models/Product.js).
| User schema fidelity | Added profile/security/settings/wallet fields in [backend/models/User.js](../backend/models/User.js).
| Category schema fidelity | Added description/display_order/banner/created_by in [backend/models/Category.js](../backend/models/Category.js).
| Seed data loss | Expanded seed mapping in [backend/seed/index.js](../backend/seed/index.js) so fields are persisted to Mongo.
| FE type drift | Updated [fontend/src/types/index.ts](../fontend/src/types/index.ts) to match schema/sample contracts.
| Documentation drift | Rebuilt all docs in [map_wed](.) around 3-way field audit model.

## 4.1 Fixed — Recipe System Overhaul (2026-05-04)
| Item | Change |
|---|---|
| AI recipe quality | Rewrote Gemini prompt in [backend/services/aiService.js](../backend/services/aiService.js) with hyper-specific examples, 20+ banned phrases, min 8 ingredients, min 5 steps with timing/fire level. |
| AI validation | Added per-ingredient quantity check, per-step description length check (≥20 chars), expanded banned-phrase list. Retry with stricter re-prompt on second attempt. |
| Recipe controller | Enhanced [backend/controllers/recipeController.js](../backend/controllers/recipeController.js) with input length validation, appetite sanitization, quality gates before DB save, structured logging. |
| Recipe frontend UX | Fixed [fontend/src/pages/RecipeDetail.tsx](../fontend/src/pages/RecipeDetail.tsx): replaced ambiguous `needsGeneration` with `showForm` state, improved generating animation, Enter-key submit, form disabled during generation, dark mode, conditional "Mua tất cả" button. |
| Mock fallback safety | Confirmed no recipe-specific mock fallback exists in httpClient. Error states are always real. |
| DB caching | Confirmed DB-first lookup with normalized key `dish-servings-appetite`. AI is fallback only, recipes are cached permanently. |

## 5. Residual Risk Summary
1. API route mismatch risks still present in auth and a few service calls.
2. Duplicate models and duplicate schema fields still pose maintenance risk.
3. Mixed-ID strategy continues to increase normalization overhead and subtle bugs.

## 6. Suggested Execution Order
1. Fix P0 auth/security issues.
2. Resolve P1 schema/endpoint drifts.
3. Deduplicate Promotion + StockMovement models.
4. Regenerate sample schema snapshots from a real production-like Mongo dump.
