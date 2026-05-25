# Feature And Data Contract Summary (Synced)

This file summarizes the synchronized state after full re-audit of Mongo sample docs, backend schemas, and frontend usage.

## 1. What Was Fully Synchronized
- Product model now includes rich detail fields used in FE rendering (highlights, rating_breakdown, usage/storage guides, recommendation arrays, eco label, alias fields).
- User model now includes settings/security/profile fields used by account Settings UI.
- Category model now includes description/display_order/banner/created_by to match sample and admin FE contract.
- Seed pipeline now preserves these fields into Mongo instead of dropping them.
- FE types updated to align with new schema coverage.

## 2. Documentation Pack Status
- [data-model.md](data-model.md): rewritten with full-fidelity field coverage, per-entity comparison, and mismatch matrix.
- [architecture.md](architecture.md): synchronized around data-contract pipeline and bounded contexts.
- [api-map.md](api-map.md): includes endpoint and field-level contract drift.
- [flows.md](flows.md): includes flow-level field integrity and known drifts.
- [feature-map.md](feature-map.md): reflects implementation state with data-model alignment status.
- [issues-and-gaps.md](issues-and-gaps.md): updated with fixed vs unresolved items.

## 3. Remaining High-Impact Gaps
1. Phone OTP FE contract still missing backend route implementation.
2. BranchProduct and Order sample alias fields still partially outside canonical schema.
3. Duplicate Promotion field definitions and duplicate StockMovement models remain technical debt.
4. Placeholder enterprise routes still reduce true feature readiness.

## 4. Source Of Truth Rule (Now Enforced In Docs)
1. Runtime Mongo document shape (or closest sample/seed evidence in this repo).
2. Mongoose schema definitions.
3. FE types/services/pages normalization usage.

When conflicts exist, docs now explicitly mark: `observed-in-db`, `schema-defined`, `frontend-used`, `legacy`, `computed`, `uncertain`.
