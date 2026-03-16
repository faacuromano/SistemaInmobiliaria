# Roadmap: Sistema Inmobiliaria

## Milestones

- ✅ **v1.0 Delivery Hardening** — Phases 1-4 (shipped 2026-02-26)
- ✅ **v1.1 Bug Fixes & UX Polish** — Phases 5-7 (shipped 2026-02-26)
- ✅ **v1.2 Integracion Firma-Venta** — Phases 8-10 (shipped 2026-03-16)
- 🚧 **v1.3 Auditoria Tecnica Completa** — Phases 11-15 (in progress)

## Phases

<details>
<summary>✅ v1.0 Delivery Hardening (Phases 1-4) — SHIPPED 2026-02-26</summary>

- [x] Phase 1: Testing Infrastructure (2/2 plans) — completed 2026-02-26
- [x] Phase 2: Financial Logic Tests (2/2 plans) — completed 2026-02-26
- [x] Phase 3: Integration Tests (2/2 plans) — completed 2026-02-26
- [x] Phase 4: Delivery Gates and Lot Grid (3/3 plans) — completed 2026-02-26

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Bug Fixes & UX Polish (Phases 5-7) — SHIPPED 2026-02-26</summary>

- [x] Phase 5: Quick Fixes (1/1 plan) — completed 2026-02-26
- [x] Phase 6: Estadisticas Overhaul (1/1 plan) — completed 2026-02-26
- [x] Phase 7: Features & Polish (2/2 plans) — completed 2026-02-26

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Integracion Firma-Venta (Phases 8-10) — SHIPPED 2026-03-16</summary>

- [x] Phase 8: Schema & Data Layer (1/1 plan) — completed 2026-03-16
- [x] Phase 9: Service Layer (2/2 plans) — completed 2026-03-16
- [x] Phase 10: UI Integration (2/2 plans) — completed 2026-03-16

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 Auditoria Tecnica Completa (In Progress)

**Milestone Goal:** Produce 5 comprehensive audit documents covering the entire codebase so any developer can fully understand the system from scratch.

**Output:** All files written to `docs/` directory. No code changes.

**Parallelism:** Phases 11, 12, 13 are independent (Wave 1). Phase 14 builds on 13. Phase 15 synthesizes all prior phases.

- [x] **Phase 11: Conceptual Overview** — System purpose, modules, roles documented in AUDIT_CONCEPT.md (completed 2026-03-16)
- [ ] **Phase 12: Database Architecture** — Full schema, relationships, dual-currency, audit trail in AUDIT_DATABASE.md
- [ ] **Phase 13: Backend Audit** — Every server action exhaustively documented in AUDIT_BACKEND.md
- [ ] **Phase 14: Frontend Architecture** — Route map, component tree, auth flow, UI patterns in AUDIT_FRONTEND.md
- [ ] **Phase 15: Business Flows** — End-to-end critical flow walkthroughs in AUDIT_FLOWS.md

## Phase Details

### Phase 11: Conceptual Overview
**Goal**: Any developer can read one document and understand what the system does, how its modules connect, and what each user role can access
**Depends on**: Nothing (Wave 1 — parallel with 12, 13)
**Requirements**: CONC-01, CONC-02, CONC-03
**Success Criteria** (what must be TRUE):
  1. docs/AUDIT_CONCEPT.md exists and describes system purpose, business domain, and high-level architecture
  2. Document lists every module/feature with a description and shows how modules interconnect
  3. Document details all 4 RBAC roles with their exact access scope per module
**Plans**: TBD

Plans:
- [ ] 11-01: Write AUDIT_CONCEPT.md covering system overview, module map, and RBAC roles

### Phase 12: Database Architecture
**Goal**: Any developer can understand the full data model — every table, every relationship, how dual currency works, and how audit trail is implemented
**Depends on**: Nothing (Wave 1 — parallel with 11, 13)
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. docs/AUDIT_DATABASE.md exists with field-by-field description of every model in prisma/schema.prisma
  2. Document maps all relationships (1:1, 1:N, N:M), foreign keys, indexes, and constraints with explanations
  3. Document explains the dual USD/ARS currency modeling — which fields store which currency, how exchange rates connect to transactions
  4. Document details AuditLog implementation — what triggers logging, what data is captured, retention strategy
**Plans**: TBD

Plans:
- [ ] 12-01: Write AUDIT_DATABASE.md covering schema analysis, relationships, currency modeling, and audit trail

### Phase 13: Backend Audit
**Goal**: Every server action in the system is documented with its complete step-by-step logic — validation, guards, business rules, DB operations, and response shape
**Depends on**: Nothing (Wave 1 — parallel with 11, 12)
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05
**Success Criteria** (what must be TRUE):
  1. docs/AUDIT_BACKEND.md exists and covers every server action in src/server/actions/sale.actions.ts with step-by-step logic
  2. Document covers every server action for payments, installments, and extra charges (payment.actions.ts, extra-charge.actions.ts) with step-by-step logic
  3. Document covers every server action for cash movements (caja) with step-by-step logic
  4. Document covers every server action for signings, persons, users, developments, and remaining modules with step-by-step logic
  5. Every documented action includes: Zod validation, auth/role guards, business logic description, DB operations performed, and return type
**Plans**: TBD

Plans:
- [ ] 13-01: Document ventas and pagos server actions (BACK-01, BACK-02)
- [ ] 13-02: Document caja, firmas, personas, and remaining server actions (BACK-03, BACK-04, BACK-05)

### Phase 14: Frontend Architecture
**Goal**: Any developer can trace the UI — which pages exist, what components they use, which server actions they call, how auth protects routes, and what UI patterns are reused
**Depends on**: Phase 13 (server actions documented — needed to map page-to-action connections accurately)
**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04
**Success Criteria** (what must be TRUE):
  1. docs/AUDIT_FRONTEND.md exists with a complete route/page map and component tree for every page in src/app/(dashboard)/
  2. Document maps each page to the specific server actions it consumes (cross-referenced with AUDIT_BACKEND.md)
  3. Document describes the auth flow — Auth.js v5 setup, session handling, route protection middleware, and role-based UI gating
  4. Document catalogs reusable UI patterns — shared components, dialog patterns, form patterns, table patterns used across pages
**Plans**: TBD

Plans:
- [ ] 14-01: Write AUDIT_FRONTEND.md covering route map, component tree, action connections, auth flow, and UI patterns

### Phase 15: Business Flows
**Goal**: A developer can follow any critical business operation end-to-end across all layers — from user click through frontend, server action, database, and back
**Depends on**: Phases 12, 13, 14 (references database schema, server action logic, and frontend routes)
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05
**Success Criteria** (what must be TRUE):
  1. docs/AUDIT_FLOWS.md exists with complete sale creation walkthrough spanning UI form, server action, installment generation, lot status update, and cash movement
  2. Document includes complete installment payment flow with currency conversion, exchange rate lookup, partial payment handling, and receipt generation
  3. Document includes signing flow showing payment gate enforcement, signing completion, and auto-commission generation
  4. Document traces RBAC enforcement across all layers — middleware, server action guards, and UI conditional rendering
  5. Document identifies and lists any inconsistencies, dead code, or undocumented behaviors discovered during the audit
**Plans**: TBD

Plans:
- [ ] 15-01: Write AUDIT_FLOWS.md covering sale creation, payment, signing, RBAC enforcement, and inconsistency report

## Progress

**Execution Order:**
Wave 1 (parallel): Phases 11, 12, 13
Wave 2: Phase 14 (after 13)
Wave 3: Phase 15 (after 12, 13, 14)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Testing Infrastructure | v1.0 | 2/2 | Complete | 2026-02-26 |
| 2. Financial Logic Tests | v1.0 | 2/2 | Complete | 2026-02-26 |
| 3. Integration Tests | v1.0 | 2/2 | Complete | 2026-02-26 |
| 4. Delivery Gates and Lot Grid | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Quick Fixes | v1.1 | 1/1 | Complete | 2026-02-26 |
| 6. Estadisticas Overhaul | v1.1 | 1/1 | Complete | 2026-02-26 |
| 7. Features & Polish | v1.1 | 2/2 | Complete | 2026-02-26 |
| 8. Schema & Data Layer | v1.2 | 1/1 | Complete | 2026-03-16 |
| 9. Service Layer | v1.2 | 2/2 | Complete | 2026-03-16 |
| 10. UI Integration | v1.2 | 2/2 | Complete | 2026-03-16 |
| 11. Conceptual Overview | 1/1 | Complete   | 2026-03-16 | - |
| 12. Database Architecture | v1.3 | 0/1 | Not started | - |
| 13. Backend Audit | v1.3 | 0/2 | Not started | - |
| 14. Frontend Architecture | v1.3 | 0/1 | Not started | - |
| 15. Business Flows | v1.3 | 0/1 | Not started | - |
