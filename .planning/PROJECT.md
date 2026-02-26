# Sistema Inmobiliaria

## What This Is

A property management ERP for a real estate/construction company, built by Koncepto as closed software for a single client. Manages the full lifecycle of real estate developments: lots, sales, installment plans, cash movements, exchange rates, receipts, and internal communications. The system is feature-complete with polished UX, bulk operations, Google Maps integration, and comprehensive statistics dashboards.

## Core Value

The client can manage their entire real estate operation — from lot availability through sale, installment collection, and cash tracking — in one system, with every transaction auditable and every peso accounted for.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Authentication with email/password and JWT sessions — existing
- ✓ RBAC with 4 roles (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA) — existing
- ✓ Development management (INMOBILIARIO, OTROS types) — existing
- ✓ Lot management with statuses (DISPONIBLE, VENDIDO, CONTADO, CESION, PERMUTA) — existing
- ✓ Person/Client management (CLIENTE, PROVEEDOR, AMBOS) — existing
- ✓ Sales system with multiple types (ACTIVA, CANCELADA, COMPLETADA, CONTADO, CESION) — existing
- ✓ Automatic installment generation with variable plans — existing
- ✓ Extra charges (refuerzos) with installment recalculation — existing
- ✓ Cash movements (14 types: CUOTA, SUELDO, COMISION, etc.) — existing
- ✓ Daily blue dollar exchange rate from dolarapi.com — existing
- ✓ Payment receipts with auto-generation — existing
- ✓ Signing slot management with email alerts — existing
- ✓ Internal messaging between users — existing
- ✓ Notification system with read/unread tracking — existing
- ✓ CSV/Excel data import — existing
- ✓ Audit logging for all operations — existing
- ✓ Seller/commission tracking — existing
- ✓ Customer file (ficha) with unified debt and payment history — existing
- ✓ Supplier management with lot assignments — existing
- ✓ Responsive layout with mobile sidebar — existing
- ✓ Vitest test infrastructure with auth/Prisma mocks and financial assertions — v1.0
- ✓ Financial logic tests (installment generation, preview parity, recalculation) — v1.0
- ✓ Integration tests (sale/payment server actions, partial-failure recovery) — v1.0
- ✓ Delivery gates (tsc, lint, build — zero errors) — v1.0
- ✓ Lots grid redesign with manzana grouping, collapsible sections, and status-colored cards — v1.0
- ✓ Lot detail panel with sale fields, mobile bottom Sheet, and print view — v1.0

- ✓ Dialog spacing fixes for lot and message dialogs — v1.1
- ✓ Lot status-reset bug fix (sold lots no longer reset to DISPONIBLE on edit) — v1.1
- ✓ Estadisticas overhaul: filterable movements table, color-coded badges, proportional PARCIAL collection rate, help tooltips — v1.1
- ✓ Google Maps URL field on developments with clickable external link — v1.1
- ✓ Person detail page redesign with unified contact card, month-grouped payment history, professional tables — v1.1
- ✓ Bulk lot editing with checkbox selection, floating actions bar, tag assignment, and status changes with safety guards — v1.1

### Active

<!-- Current scope. Building toward these. -->

(No active milestone — ready for next milestone planning)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- 360° Virtual Tour integration (Koncepto) — deferred, documented separately, will be a future milestone
- Geographic/satellite map view — client wants manzana grid, not a map
- Hosting/SSL/Backups — handled at deploy time, not in application code
- Multi-tenant support — single client deployment
- OAuth/social login — email/password sufficient for this client
- E2E browser tests (Playwright) — slow, brittle, expensive; unit + integration tests sufficient for single-client delivery
- 100% code coverage — drives testing implementation details; cover risk areas instead

## Context

- **Client**: Single real estate/construction company
- **Builder**: Koncepto (user's company)
- **Codebase state**: Feature-complete with polished UX, ~75,600 LOC TypeScript/TSX, 51 tests passing
- **Stack**: Next.js 15 (App Router) + TypeScript + PostgreSQL + Prisma ORM + Auth.js v5
- **UI**: shadcn/ui + Tailwind CSS 4 + Lucide icons + Radix Collapsible
- **Dual currency**: All monetary operations support USD/ARS with daily exchange rate
- **Architecture**: Server-first with Server Components/Actions, layered (presentation → actions → models → Prisma)
- **Testing**: Vitest 4.x with jsdom, vitest-mock-extended for Prisma, expectMoney for financial precision
- **Build status**: `tsc --noEmit` ✓, `npm run lint` ✓, `npm run build` ✓
- **Shipped**: v1.0 Delivery Hardening (2026-02-26), v1.1 Bug Fixes & UX Polish (2026-02-26)
- **Current milestone**: None — ready for next milestone planning

## Constraints

- **Tech stack**: Next.js 15 + Prisma + PostgreSQL — already established, no changes
- **Single client**: No multi-tenancy requirements
- **Currency**: Must support dual USD/ARS operations with blue dollar rate
- **Roles**: Fixed 4-level RBAC — SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA
- **Language**: UI in Spanish, code in English

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Defer 360° tour integration | Separate project with own docs, don't block delivery | — Pending |
| Manzana grid over geographic map | Client needs functional status view, not geography | ✓ Good — shipped in v1.0 |
| Full test coverage before delivery | System handles money — bugs are expensive | ✓ Good — 51 tests covering financial logic and server actions |
| Server-first architecture | Established pattern, no reason to change for remaining work | ✓ Good |
| Vitest over Jest | Vite-native, no transform config needed for Next.js 15 | ✓ Good |
| File-level eslint-disable for test files | Preferred over 40+ inline disables for Prisma mock any casts | ✓ Good |
| Consolidate lot view modes to 2 (grid/table) | CONTEXT.md's compact grid with manzana grouping replaces 3-mode design | ✓ Good |
| RESERVADO status = gray | Per client preference, not orange | ✓ Good |
| Hidden input pattern for disabled Select | Always submit value via hidden input, not relying on disabled Select name | ✓ Good — v1.1 |
| Per-type-per-month Map aggregation on server | Avoid sending raw movement rows to client | ✓ Good — v1.1 |
| PARCIAL proportional credit | sum(paidAmount/amount) fraction rather than binary count | ✓ Good — v1.1 |
| Google Maps as URL link, not iframe | Simple URL field, no API key management | ✓ Good — v1.1 |
| Bulk operations with safety guards | 200-lot limit, sales guard rejects lots with active sales | ✓ Good — v1.1 |
| Dialog for bulk tags, DropdownMenu for status | Tags need confirm, status is instant apply | ✓ Good — v1.1 |

---
*Last updated: 2026-02-26 after v1.1 milestone completion*
