---
phase: 03-integration-tests
plan: 02
subsystem: testing
tags: [vitest, prisma-mock, payment-actions, server-actions, transaction-mock]

# Dependency graph
requires:
  - phase: 01-testing-infrastructure
    provides: Vitest config, prismaMock helper, auth mock helper
provides:
  - Integration tests for payInstallment server action (ACT-04)
  - Integration tests for payExtraCharge with recalculation chain (ACT-05)
  - Integration tests for partial-failure recovery path (ACT-06)
  - buildPaymentFormData and buildExtraChargePaymentFormData helpers
affects: [03-integration-tests, 04-ui-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [$transaction mock via callback execution, becamePaid closure verification, post-transaction error assertion]

key-files:
  created:
    - src/__tests__/integration/helpers/form-data-builders.ts
    - src/__tests__/integration/payment-actions.test.ts
  modified: []

key-decisions:
  - "$transaction mock passes prismaMock as tx so inner tx.* calls use same mock instance"
  - "ACT-06 proves payment persists despite recalculation failure by asserting cashMovement.create and extraCharge.update were called even when result is { success: false }"
  - "recalculateInstallments amount arg is total extraCharge.amount not payment amount -- verified in ACT-05 completing-partial test"

patterns-established:
  - "buildMockInstallment/buildMockExtraCharge: local factories matching Prisma include shapes for payment action tests"
  - "Post-transaction side-effect testing: mock the side-effect (recalculateInstallments), assert it was called/not-called based on business logic"
  - "Partial-failure assertion: verify committed mocks were called even when action returns error"

requirements-completed: [ACT-04, ACT-05, ACT-06]

# Metrics
duration: 3.1min
completed: 2026-02-26
---

# Phase 03 Plan 02: Payment Actions Integration Tests Summary

**payInstallment and payExtraCharge tested with mocked transactions covering full/partial payments, recalculation chain wiring, and partial-failure recovery path**

## Performance

- **Duration:** 3.1 min
- **Started:** 2026-02-26T07:41:44Z
- **Completed:** 2026-02-26T07:44:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 10 integration tests covering payment server actions with 100% pass rate
- ACT-04: Proved payInstallment creates CashMovement with type CUOTA, marks installment PAGADA/PARCIAL correctly, and validates all input edge cases
- ACT-05: Proved payExtraCharge triggers recalculateInstallments with (saleId, totalAmount) on full payment, skips on partial, and handles completing-partial scenario
- ACT-06: Proved the critical partial-failure recovery path -- payment data committed inside transaction persists even when post-transaction recalculateInstallments throws

## Task Commits

Each task was committed atomically:

1. **Task 1: Create payment FormData builders and payInstallment tests (ACT-04)** - `a236446` (test)
2. **Task 2: Add payExtraCharge recalculation and partial-failure tests (ACT-05, ACT-06)** - `782cdaa` (test)

## Files Created/Modified
- `src/__tests__/integration/helpers/form-data-builders.ts` - buildPaymentFormData and buildExtraChargePaymentFormData helpers (appended to existing file with buildSaleFormData from Plan 03-01)
- `src/__tests__/integration/payment-actions.test.ts` - 10 tests across 3 describe blocks covering ACT-04, ACT-05, ACT-06

## Decisions Made
- `$transaction` mock executes callback with `prismaMock` as tx argument, so all `tx.*` calls inside the transaction body hit the same mock instance -- enabling assertion of individual Prisma operations within the transaction
- ACT-06 partial-failure test relies on the fact that `recalculateInstallments` runs OUTSIDE the `$transaction` callback but INSIDE the try/catch, so its rejection triggers the catch while transaction operations are already resolved
- `recalculateInstallments` receives `Number(extraCharge.amount)` (the total charge amount), not the payment amount -- verified explicitly in the completing-partial test case

## Deviations from Plan

None - plan executed exactly as written.

## Out-of-Scope Discoveries

- **sale-actions.test.ts contado test failure (Plan 03-01):** The test "creates contado sale with zero installments and lot status CONTADO" fails because `generateInstallments` is called when it shouldn't be. This is a pre-existing issue in Plan 03-01's test file, not caused by Plan 03-02 changes. Logged to `deferred-items.md`.

## Issues Encountered
None - all 10 tests passed on first run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All payment action integration tests green (10/10)
- FormData builders ready for reuse in future action tests
- Phase 03 test suite: 18 integration tests total (8 sale + 10 payment) with 1 pre-existing failure in sale-actions from Plan 03-01

## Self-Check: PASSED

- [x] form-data-builders.ts exists
- [x] payment-actions.test.ts exists
- [x] 03-02-SUMMARY.md exists
- [x] Commit a236446 found
- [x] Commit 782cdaa found

---
*Phase: 03-integration-tests*
*Completed: 2026-02-26*
