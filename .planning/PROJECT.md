# Sistema Inmobiliaria

## What This Is

A property management ERP for a real estate/construction company, built by Koncepto as closed software for a single client. Manages the full lifecycle of real estate developments: lots, sales, installment plans, cash movements, exchange rates, receipts, and internal communications. The system is feature-complete and approaching delivery — the remaining work is QA, testing, and visual polish.

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

### Active

<!-- Current scope. Building toward these. -->

- [ ] Lots grid redesign — manzana-grouped visual grid with color-coded statuses and detail panel
- [ ] Full test coverage — systematic testing across all modules (models, actions, components)
- [ ] QA pass — bug detection and fixes across all critical business flows
- [ ] Delivery polish — UI consistency, error handling, edge cases

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- 360° Virtual Tour integration (Koncepto) — deferred, documented separately, will be a future milestone
- Geographic/satellite map view — client wants manzana grid, not a map
- Hosting/SSL/Backups — handled at deploy time, not in application code
- Multi-tenant support — single client deployment
- OAuth/social login — email/password sufficient for this client

## Context

- **Client**: Single real estate/construction company
- **Builder**: Koncepto (user's company)
- **Codebase state**: Feature-complete, ~21 server action files, ~19 model files, 16+ Prisma models
- **Stack**: Next.js 15 (App Router) + TypeScript + PostgreSQL + Prisma ORM + Auth.js v5
- **UI**: shadcn/ui + Tailwind CSS 4 + Lucide icons
- **Dual currency**: All monetary operations support USD/ARS with daily exchange rate
- **Architecture**: Server-first with Server Components/Actions, layered (presentation → actions → models → Prisma)
- **Existing codebase map**: `.planning/codebase/` with 7 documents covering stack, architecture, conventions, testing, concerns

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
| Manzana grid over geographic map | Client needs functional status view, not geography | — Pending |
| Full test coverage before delivery | System handles money — bugs are expensive | — Pending |
| Server-first architecture | Established pattern, no reason to change for remaining work | ✓ Good |

---
*Last updated: 2026-02-26 after initialization*
