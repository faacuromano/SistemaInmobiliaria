---
phase: 01-testing-infrastructure
plan: 02
subsystem: testing
tags: [vitest, auth-mock, prisma-mock, financial-assertions, test-helpers]

# Dependency graph
requires:
  - phase: 01-testing-infrastructure-01
    provides: "Vitest 4.x runner with jsdom, path aliases, vitest-mock-extended"
provides:
  - "mockAuthenticatedUser(role) for bypassing auth-guard in tests"
  - "createAuthMock(role) for granular auth mock control"
  - "expectMoney(received, expected) for IEEE 754-safe financial assertions"
  - "prismaMock DeepMockProxy<PrismaClient> singleton with auto-reset"
affects: [02-unit-tests, 03-integration-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [auth-mock-pattern, financial-assertion-pattern, prisma-mock-pattern]

key-files:
  created:
    - src/__tests__/helpers/auth.ts
    - src/__tests__/helpers/money.ts
    - src/__tests__/helpers/prisma.ts
    - src/__tests__/unit/helpers/helpers.test.ts
  modified: []

key-decisions:
  - "Prisma mock helper not tested in isolation -- will be validated by first consumer in Phase 2/3"
  - "Auth mock returns full session shape matching auth-guard.ts requirePermission return type"
  - "expectMoney uses toBeCloseTo(n, 2) for 2-decimal precision financial comparisons"

patterns-established:
  - "Auth bypass: vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('ROLE'))"
  - "Prisma mock: vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))"
  - "Financial assertions: expectMoney(calculated, expected) instead of toBe()"

requirements-completed: [TEST-02, TEST-03]

# Metrics
duration: 1min
completed: 2026-02-26
---

# Phase 1 Plan 2: Shared Test Helpers Summary

**Auth mock (4 RBAC roles), financial assertion (IEEE 754-safe), and Prisma DeepMockProxy helpers for all future test phases**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T06:40:09Z
- **Completed:** 2026-02-26T06:41:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Three shared test helpers created covering auth bypass, money precision, and database mocking
- All 4 RBAC roles verified (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA)
- IEEE 754 floating-point edge case handled (0.1 + 0.2 = 0.3 passes)
- 9 total tests passing (2 smoke + 7 helper tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared test helpers** - `abc2afa` (feat)
2. **Task 2: Create tests proving helpers work correctly** - `c6a82dd` (test)

## Files Created/Modified
- `src/__tests__/helpers/auth.ts` - mockAuthenticatedUser and createAuthMock for RBAC role-based auth bypass
- `src/__tests__/helpers/money.ts` - expectMoney for 2-decimal-place financial assertions
- `src/__tests__/helpers/prisma.ts` - DeepMockProxy<PrismaClient> singleton with beforeEach auto-reset
- `src/__tests__/unit/helpers/helpers.test.ts` - 7 tests proving auth mock and money assertion correctness

## Decisions Made
- Prisma mock helper not tested in isolation to avoid triggering beforeEach side effect without consumers -- will be validated when Phase 2/3 tests import it
- Auth mock session shape mirrors exact auth-guard.ts return: { user: { id, email, name, role }, expires }
- expectMoney uses toBeCloseTo precision of 2 (hundredths) matching financial domain requirements

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three helper modules ready for consumption by Phase 2 (unit tests) and Phase 3 (integration tests)
- Patterns established: auth bypass via vi.mock, prisma mock via vi.mock, money assertions via expectMoney
- Test count at 9 passing -- baseline for future regression detection

## Self-Check: PASSED

- src/__tests__/helpers/auth.ts: FOUND
- src/__tests__/helpers/money.ts: FOUND
- src/__tests__/helpers/prisma.ts: FOUND
- src/__tests__/unit/helpers/helpers.test.ts: FOUND
- Commit abc2afa: FOUND
- Commit c6a82dd: FOUND

---
*Phase: 01-testing-infrastructure*
*Completed: 2026-02-26*
