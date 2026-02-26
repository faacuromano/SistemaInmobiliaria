# Requirements: Sistema Inmobiliaria

**Defined:** 2026-02-26
**Core Value:** The client can manage their entire real estate operation — from lot availability through sale, installment collection, and cash tracking — in one system, with every transaction auditable and every peso accounted for.

## v1 Requirements

Requirements for delivery release. Each maps to roadmap phases.

### Testing Infrastructure

- [x] **TEST-01**: Vitest installed and configured with jsdom environment, path aliases, and React plugin
- [x] **TEST-02**: Shared test helper `mockAuthenticatedUser(role)` mocks `requirePermission` and `auth()` for any of the 4 RBAC roles
- [x] **TEST-03**: Shared test helper `expectMoney(received, expected)` uses `toBeCloseTo(n, 2)` for financial assertions
- [x] **TEST-04**: `npm test` script runs all tests and reports results
- [x] **TEST-05**: Coverage reporting configured with @vitest/coverage-v8

### Financial Logic Tests

- [ ] **FIN-01**: `generateInstallments()` tested for collectionDay 31 clamping in Feb (28/29), Apr, Jun, Sep, Nov
- [ ] **FIN-02**: `generateInstallments()` tested for year rollover (Dec → Jan next year)
- [ ] **FIN-03**: `generateInstallments()` tested for variable first installment amount (`firstInstallmentAmount`)
- [ ] **FIN-04**: `generateInstallments()` tested for zero installments (contado sale)
- [ ] **FIN-05**: `calculateInstallmentPreview()` parity test — same inputs produce identical outputs as `generateInstallments()`
- [ ] **FIN-06**: `recalculateInstallments()` tested for first refuerzo — unpaid installments reduced, `originalAmount` set
- [ ] **FIN-07**: `recalculateInstallments()` tested for second refuerzo — `originalAmount` NOT overwritten
- [ ] **FIN-08**: `recalculateInstallments()` tested for edge case: reduction > installment amount → clamped to 0
- [ ] **FIN-09**: Decimal precision assertions for all monetary calculations using `expectMoney` helper

### Server Action Integration Tests

- [ ] **ACT-01**: `sale.actions` create sale test — verifies lot status changes to VENDIDO and installments are generated
- [ ] **ACT-02**: `sale.actions` cancel sale test — verifies lot status reverts to DISPONIBLE
- [ ] **ACT-03**: `sale.actions` contado sale test — verifies zero installments and lot status CONTADO
- [ ] **ACT-04**: `payment.actions` payment recording test — verifies CashMovement created and installment marked PAGADA
- [ ] **ACT-05**: `payment.actions` payment with recalculation test — verifies recalculation triggered after refuerzo payment
- [ ] **ACT-06**: `payment.actions` partial failure test — verifies behavior when payment commits but recalculation fails

### Lot Grid Polish

- [ ] **GRID-01**: Lots grouped by manzana/block with visual section headers
- [ ] **GRID-02**: Lot cards color-coded by status (DISPONIBLE=green, VENDIDO=blue, etc.)
- [ ] **GRID-03**: Clicking a lot opens detail panel showing buyer, price, area, tags, and sale link
- [ ] **GRID-04**: Mobile: lot detail opens as Sheet drawer
- [ ] **GRID-05**: View mode persists across navigation via localStorage
- [ ] **GRID-06**: Print view via `@media print` — hides controls, renders lots flat for client meetings

### Delivery Gates

- [ ] **GATE-01**: `tsc --noEmit` passes with zero errors
- [ ] **GATE-02**: `npm run lint` passes with zero warnings
- [ ] **GATE-03**: `npm run build` completes successfully

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### RBAC Tests

- **RBAC-01**: `hasPermission()` tested for full 4-role × 16-permission matrix with negative assertions
- **RBAC-02**: SUPER_ADMIN wildcard `["*"]` tested to grant every permission
- **RBAC-03**: Permission boundary tests for each role's excluded permissions

### Exchange Rate

- **XRATE-01**: `convertCurrency` tested for zero-rate silent fallback (returns 0 instead of throwing)
- **XRATE-02**: Exchange rate fetch tested with mock for dolarapi.com response

### QA

- **QA-01**: Formal smoke test run of all 13 TESTING.md sections on seed data
- **QA-02**: Decimal serialization type contract test (Prisma Decimal → number)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| E2E browser tests (Playwright) | Slow, brittle, expensive — unit tests + manual smoke sufficient for single-client delivery |
| Geographic/satellite map | Client wants manzana grid, not geography |
| 360° Virtual Tour integration | Deferred — separate project with own documentation |
| Real-time WebSocket updates | Not justified for low concurrent user count; `revalidatePath` sufficient |
| Multi-tenant support | Single client deployment |
| 100% code coverage requirement | Drives testing implementation details; cover risk areas instead |
| Docker-based test DB in CI | Out of scope for single-client handoff |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| TEST-04 | Phase 1 | Complete |
| TEST-05 | Phase 1 | Complete |
| FIN-01 | Phase 2 | Pending |
| FIN-02 | Phase 2 | Pending |
| FIN-03 | Phase 2 | Pending |
| FIN-04 | Phase 2 | Pending |
| FIN-05 | Phase 2 | Pending |
| FIN-06 | Phase 2 | Pending |
| FIN-07 | Phase 2 | Pending |
| FIN-08 | Phase 2 | Pending |
| FIN-09 | Phase 2 | Pending |
| ACT-01 | Phase 3 | Pending |
| ACT-02 | Phase 3 | Pending |
| ACT-03 | Phase 3 | Pending |
| ACT-04 | Phase 3 | Pending |
| ACT-05 | Phase 3 | Pending |
| ACT-06 | Phase 3 | Pending |
| GRID-01 | Phase 4 | Pending |
| GRID-02 | Phase 4 | Pending |
| GRID-03 | Phase 4 | Pending |
| GRID-04 | Phase 4 | Pending |
| GRID-05 | Phase 4 | Pending |
| GRID-06 | Phase 4 | Pending |
| GATE-01 | Phase 4 | Pending |
| GATE-02 | Phase 4 | Pending |
| GATE-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — traceability filled after roadmap creation*
