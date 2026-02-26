---
phase: 02-financial-logic-tests
plan: 02
subsystem: testing
tags: [vitest, installments, parity, recalculator, financial-precision, prisma-mock]

# Dependency graph
requires:
  - phase: 02-financial-logic-tests
    plan: 01
    provides: Shared installment fixtures (8 scenarios), toGeneratorParams(), expectMoney
  - phase: 01-testing-infrastructure
    provides: Vitest setup, path aliases, prismaMock helper
provides:
  - Parity tests proving calculateInstallmentPreview matches generateInstallments
  - Recalculator tests covering first/second refuerzo, clamping, and atomicity
affects: [03-server-action-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [module-level-vi-mock-before-import, createMockInstallment-factory, assertParity-helper]

key-files:
  created:
    - src/__tests__/unit/lib/installment-preview-parity.test.ts
    - src/__tests__/unit/lib/installment-recalculator.test.ts
  modified: []

key-decisions:
  - "Parity helper assertParity() abstracts field-by-field comparison into reusable function for scenario coverage"
  - "vi.mock placed at module level before dynamic import to satisfy Vitest hoisting for Prisma mock"
  - "createMockInstallment factory uses plain numbers (not Decimal) since source code calls Number() on amounts"
  - "originalAmount undefined (not null) for Prisma skip-update semantics verified in FIN-07"

patterns-established:
  - "assertParity pattern: shared helper that runs both functions and compares field-by-field"
  - "Module-level vi.mock before import for Prisma-dependent modules"
  - "createMockInstallment factory: sensible defaults with override pattern for readable tests"

requirements-completed: [FIN-05, FIN-06, FIN-07, FIN-08, FIN-09]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 2 Plan 2: Preview Parity & Recalculator Tests Summary

**Preview/generator parity tests across 4 scenarios plus recalculator tests for first/second refuerzo, zero-clamping boundaries, and $transaction atomicity -- all with expectMoney precision**

## Performance

- **Duration:** 1 min 56s
- **Started:** 2026-02-26T07:09:34Z
- **Completed:** 2026-02-26T07:11:30Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- 4 parity tests proving calculateInstallmentPreview and generateInstallments produce identical financial results across standard, variable-first, year-rollover, and day-31-clamping scenarios (FIN-05)
- 7 recalculator tests covering: first refuerzo reduces amounts and sets originalAmount (FIN-06), second refuerzo preserves originalAmount via undefined (FIN-07), three boundary scenarios for zero-clamping (FIN-08)
- Full FIN-09 compliance: zero raw toBe() on monetary values across both test files
- Total test count: 33 (22 prior + 4 parity + 7 recalculator), all passing in 1.65s

## Task Commits

Each task was committed atomically:

1. **Task 1: Write parity tests between preview and generator (FIN-05)** - `1b90096` (test)
2. **Task 2: Write recalculateInstallments test suite (FIN-06, FIN-07, FIN-08)** - `91aecdb` (test)

## Files Created/Modified
- `src/__tests__/unit/lib/installment-preview-parity.test.ts` - 4 parity tests with assertParity helper comparing amount (expectMoney), dueDate (getTime), monthLabel, and number/installmentNumber mapping
- `src/__tests__/unit/lib/installment-recalculator.test.ts` - 7 tests: FIN-06 (first refuerzo), FIN-07 (second refuerzo guard), FIN-08 (3 boundary scenarios), edge cases (empty list, status filter query)

## Decisions Made
- Created assertParity() helper inside the parity test file to DRY the field-by-field comparison logic across 4 scenarios
- Placed vi.mock('@/lib/prisma') at module level before importing recalculateInstallments, following the RESEARCH.md Pitfall 6 guidance
- Used createMockInstallment factory with plain numbers for amounts (Number() conversion in source code makes Decimal unnecessary)
- Verified originalAmount=undefined (not null, not the value) for Prisma's skip-update semantics on second refuerzo

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 financial logic tests complete (FIN-01 through FIN-09)
- 33 tests passing across 5 test files in 1.65s
- prismaMock pattern proven for recalculator -- ready for Phase 3 server action tests
- Shared fixtures consumed successfully by all Phase 2 test files

## Self-Check: PASSED

- [x] src/__tests__/unit/lib/installment-preview-parity.test.ts exists
- [x] src/__tests__/unit/lib/installment-recalculator.test.ts exists
- [x] 02-02-SUMMARY.md exists
- [x] Commit 1b90096 found in git log
- [x] Commit 91aecdb found in git log

---
*Phase: 02-financial-logic-tests*
*Completed: 2026-02-26*
