---
phase: 03-integration-tests
plan: 01
subsystem: testing
tags: [vitest, integration-tests, server-actions, prisma-mock, formdata]

# Dependency graph
requires:
  - phase: 01-testing-infrastructure
    provides: "prismaMock, mockAuthenticatedUser, expectMoney shared helpers"
provides:
  - "Integration tests for createSale and cancelSale server actions (ACT-01, ACT-02, ACT-03)"
  - "buildSaleFormData helper for sale action test scenarios"
affects: [03-02-payment-actions]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Interactive $transaction callback mock via mockImplementation((cb) => cb(prismaMock))", "FormData builder pattern with sensible defaults for server action tests", "vi.mocked().mockClear() in beforeEach for non-prismaMock module-level mocks"]

key-files:
  created:
    - src/__tests__/integration/sale-actions.test.ts
  modified:
    - src/__tests__/integration/helpers/form-data-builders.ts

key-decisions:
  - "Mock generateInstallments at module level with realistic 2-item return value to prove wiring without testing generator"
  - "Clear generateInstallments mock calls in beforeEach to prevent cross-test pollution"
  - "Use accented Spanish in stringContaining assertions to match actual error messages (no esta -> no esta with accent)"

patterns-established:
  - "ACT-XX describe block naming: requirement ID prefix for direct traceability"
  - "beforeEach sets up $transaction callback mock + default entity mocks for happy path"
  - "cancelSale tests mock saleModel.findById (model layer), not prismaMock.sale.findUnique (Prisma direct)"

requirements-completed: [ACT-01, ACT-02, ACT-03]

# Metrics
duration: 3.4min
completed: 2026-02-26
---

# Phase 3 Plan 01: Sale Actions Integration Tests Summary

**Integration tests for createSale and cancelSale covering lot status transitions (VENDIDO, DISPONIBLE, CONTADO), installment generation wiring, and Zod FormData validation pipeline**

## Performance

- **Duration:** 3.4 min
- **Started:** 2026-02-26T07:41:55Z
- **Completed:** 2026-02-26T07:45:19Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- 8 integration tests covering 3 requirement IDs (ACT-01, ACT-02, ACT-03) all passing
- Verified createSale transaction: sale creation, lot status to VENDIDO, installment generation via createMany
- Verified cancelSale uses saleModel.findById (model layer) and reverts lot to DISPONIBLE
- Verified contado sale skips installment generation entirely and sets lot to CONTADO
- Validated Zod schema error pipeline with missing required FormData fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FormData builder and sale actions test file with module-level mocks** - `a99158f` (test)

**Plan metadata:** `753728e` (docs: complete plan)

## Files Created/Modified
- `src/__tests__/integration/sale-actions.test.ts` - 8 integration tests across 3 describe blocks (ACT-01, ACT-02, ACT-03)
- `src/__tests__/integration/helpers/form-data-builders.ts` - Added buildSaleFormData helper (already committed by 03-02 plan)

## Decisions Made
- Mock `generateInstallments` at module level with realistic 2-item array return value -- proves the wiring from createSale to the generator without re-testing the generator logic (covered by Phase 2)
- Added `vi.mocked(generateInstallments).mockClear()` in `beforeEach` to prevent call count leakage between test cases, since the prismaMock helper's `mockReset` only covers Prisma-related mocks
- Used `expect.stringContaining('no esta disponible')` with proper accented characters matching the actual Spanish error messages in sale.actions.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cross-test mock pollution for generateInstallments**
- **Found during:** Task 1 (sale-actions.test.ts creation)
- **Issue:** The ACT-03 contado test asserted `generateInstallments` was NOT called, but it had been called by ACT-01 in the same test run. The prismaMock helper resets only prismaMock, not other module-level mocks.
- **Fix:** Added `vi.mocked(generateInstallments).mockClear()` to `beforeEach`
- **Files modified:** src/__tests__/integration/sale-actions.test.ts
- **Verification:** All 8 tests pass, ACT-03 contado correctly asserts generateInstallments not called
- **Committed in:** a99158f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for test correctness. No scope creep.

## Issues Encountered
- The buildSaleFormData helper was already committed by the 03-02 plan execution (payment actions tests), so no file changes were needed for that file. The plan's file list was accurate but the work had already been done.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Sale action integration tests complete, covering all three sale flow variants
- 03-02 plan (payment action tests) already executed -- full Phase 3 may be complete pending verification
- All 51 tests across 7 test files pass with zero pollution

## Self-Check: PASSED

- FOUND: src/__tests__/integration/sale-actions.test.ts
- FOUND: src/__tests__/integration/helpers/form-data-builders.ts
- FOUND: commit a99158f

---
*Phase: 03-integration-tests*
*Completed: 2026-02-26*
