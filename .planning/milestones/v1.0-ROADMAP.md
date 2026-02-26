# Roadmap: Sistema Inmobiliaria — Delivery Hardening

## Overview

The codebase is feature-complete. The remaining work is getting it into a professionally deliverable state: a test suite that catches the highest-severity financial logic bugs, clean build/lint/typecheck gates, and lot grid polish. Phases execute in strict dependency order — infrastructure first, pure-function tests second, integration tests third, and delivery verification last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Testing Infrastructure** - Install Vitest, configure test environment, and build shared helpers that all subsequent test phases depend on
- [ ] **Phase 2: Financial Logic Tests** - Cover pure installment generation and recalculation functions with zero mocking complexity
- [ ] **Phase 3: Integration Tests** - Test server actions with mocked auth and Prisma, covering the highest-severity transactional flows
- [ ] **Phase 4: Delivery Gates and Lot Grid** - Verify build/lint/typecheck gates pass and polish the lot visualization UI before client handoff

## Phase Details

### Phase 1: Testing Infrastructure
**Goal**: Developers can run `npm test` and get meaningful results; shared helpers prevent rework across all test phases
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. `npm test` runs without crashing and exits with a clear pass/fail result
  2. Tests written in any `__tests__/` directory are discovered and executed automatically
  3. A shared `mockAuthenticatedUser(role)` helper suppresses auth redirects in action tests for all 4 RBAC roles
  4. A shared `expectMoney(received, expected)` helper enforces two-decimal precision on all financial assertions
  5. Coverage reports are generated when running `npm run test:coverage`
**Plans**: 2 plans
- [ ] 01-01-PLAN.md — Install Vitest, configure test environment, create smoke test
- [ ] 01-02-PLAN.md — Create shared test helpers (mockAuthenticatedUser, expectMoney, prismaMock)

### Phase 2: Financial Logic Tests
**Goal**: Pure installment generation and recalculation functions are verified against all known edge cases, including the high-risk parity divergence between preview and generator
**Depends on**: Phase 1
**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09
**Success Criteria** (what must be TRUE):
  1. `generateInstallments()` test suite passes including date edge cases (Feb 28/29, month-end clamping, year rollover)
  2. `calculateInstallmentPreview()` parity test passes — identical inputs produce byte-for-byte identical output to `generateInstallments()`
  3. `recalculateInstallments()` test suite passes including the second-refuerzo guard: `originalAmount` is set on first refuerzo and NOT overwritten on second
  4. All monetary assertions in the test suite use `expectMoney` — no raw `toBe()` on calculated amounts
**Plans**: 2 plans
- [ ] 02-01-PLAN.md — Create shared fixtures and test generateInstallments (FIN-01..04, FIN-09)
- [ ] 02-02-PLAN.md — Test preview/generator parity and recalculateInstallments (FIN-05..08, FIN-09)

### Phase 3: Integration Tests
**Goal**: Server actions for sale creation, cancellation, and payment recording are tested end-to-end with mocked dependencies, including the partial-failure recovery path after a committed transaction
**Depends on**: Phase 1
**Requirements**: ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06
**Success Criteria** (what must be TRUE):
  1. `sale.actions` test suite passes: creating a sale changes the lot status to VENDIDO and produces the correct installment count
  2. `sale.actions` test suite passes: cancelling a sale reverts the lot status to DISPONIBLE
  3. `sale.actions` test suite passes: a contado sale produces zero installments and sets lot status to CONTADO
  4. `payment.actions` test suite passes: recording a payment creates a CashMovement and marks the installment PAGADA
  5. `payment.actions` test suite passes: the partial-failure case (payment committed, recalculation throws) is tested and the expected behavior is asserted
**Plans**: 2 plans
- [ ] 03-01-PLAN.md — Test sale actions: createSale, cancelSale, contado (ACT-01, ACT-02, ACT-03)
- [ ] 03-02-PLAN.md — Test payment actions: payInstallment, payExtraCharge with recalculation and partial-failure (ACT-04, ACT-05, ACT-06)

### Phase 4: Delivery Gates and Lot Grid
**Goal**: The application passes all automated build and quality gates, and the lot grid presents a clean, client-ready manzana-grouped visualization with working detail panel
**Depends on**: Phase 2, Phase 3
**Requirements**: GATE-01, GATE-02, GATE-03, GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06
**Success Criteria** (what must be TRUE):
  1. `tsc --noEmit` completes with zero type errors
  2. `npm run lint` completes with zero warnings or errors
  3. `npm run build` completes successfully and produces a deployable build artifact
  4. Lots are grouped by manzana with labeled section headers and color-coded status badges visible at a glance
  5. Clicking a lot opens a detail panel (or Sheet drawer on mobile) showing buyer name, price, area, tags, and a link to the sale record
  6. Lot view preference (grid/list) survives page navigation and browser refresh via localStorage
**Plans**: 3 plans
- [ ] 04-01-PLAN.md — Fix delivery gates: tsc, lint, and build errors (GATE-01, GATE-02, GATE-03)
- [ ] 04-02-PLAN.md — Lot grid redesign: white cards with accent borders, collapsible manzana sections, localStorage view persistence (GRID-01, GRID-02, GRID-05)
- [ ] 04-03-PLAN.md — Detail panel enhancement, mobile bottom Sheet, print view (GRID-03, GRID-04, GRID-06)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Testing Infrastructure | 2/2 | Complete | 2026-02-26 |
| 2. Financial Logic Tests | 2/2 | Complete | 2026-02-26 |
| 3. Integration Tests | 0/2 | Not started | - |
| 4. Delivery Gates and Lot Grid | 0/3 | Not started | - |
