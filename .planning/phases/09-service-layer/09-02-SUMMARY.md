---
phase: 09-service-layer
plan: 02
subsystem: payments
tags: [prisma, transaction, commission, cash-movement, signing]

# Dependency graph
requires:
  - phase: 08-schema-data-layer
    provides: SigningSlot.saleId FK, CashMovement model with COMISION type
provides:
  - completeSigningSlot service function with atomic status + commission creation
  - updateSigningStatus action wired to signing service for COMPLETADA flow
affects: [firmas-ui, ventas-ui, caja]

# Tech tracking
tech-stack:
  added: []
  patterns: [service-layer-pattern, atomic-transaction-with-commission, idempotency-check]

key-files:
  created: [src/server/services/signing.service.ts]
  modified: [src/server/actions/signing.actions.ts]

key-decisions:
  - "Commission uses expense fields (usdExpense/arsExpense) since commissions are company outflows"
  - "Seller info stored in notes field since CashMovement has no sellerId column"
  - "Idempotency via findFirst on type=COMISION + saleId prevents duplicate commissions"
  - "personId: null on commission CashMovement — commission goes to seller, not client"

patterns-established:
  - "Service-to-action wiring: action routes specific status values through service, keeps other statuses on model layer"
  - "Idempotency pattern: check existing record before creating to prevent duplicates in atomic transactions"

requirements-completed: [COMIS-01, COMIS-02, COMIS-03]

# Metrics
duration: 2.2min
completed: 2026-03-16
---

# Phase 9 Plan 2: Signing Service Summary

**Atomic signing completion with auto-commission CashMovement creation using prisma.$transaction and idempotency protection**

## Performance

- **Duration:** 2.2 min
- **Started:** 2026-03-16T14:23:45Z
- **Completed:** 2026-03-16T14:25:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created signing.service.ts with completeSigningSlot that atomically updates signing status and creates COMISION CashMovement
- Wired updateSigningStatus action to route COMPLETADA through the service while preserving existing behavior for other statuses
- Built-in idempotency prevents duplicate commission creation for the same sale

## Task Commits

Each task was committed atomically:

1. **Task 1: Create signing.service.ts with completeSigningSlot function** - `e73b3fd` (feat)
2. **Task 2: Wire updateSigningStatus to call completeSigningSlot when status is COMPLETADA** - `b7e2f86` (feat)

## Files Created/Modified
- `src/server/services/signing.service.ts` - New service with completeSigningSlot: atomic transaction for signing status update + COMISION CashMovement creation
- `src/server/actions/signing.actions.ts` - Modified updateSigningStatus to route COMPLETADA through signing service, added try/catch for ServiceError, added revalidatePath for ventas

## Decisions Made
- Commission uses `usdExpense`/`arsExpense` (expense fields, not income) because commissions are company outflows
- Seller info recorded in `notes` field since CashMovement model has no `sellerId` column
- Idempotency via `tx.cashMovement.findFirst({ where: { type: "COMISION", saleId } })` prevents duplicate commissions
- `personId: null` on commission CashMovement since the commission goes to the seller, not the client
- signing.service.ts imports logAction from `@/lib/audit` (shared utility), while signing.actions.ts preserves its existing import from `@/server/actions/audit-log.actions` -- both are correct for their respective layers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Signing service complete and wired to the action layer
- Ready for UI integration or additional service-layer plans
- Commission flow can be tested end-to-end once a signing with a linked sale (with commissionAmount) is completed via the UI

## Self-Check: PASSED

All files and commits verified:
- src/server/services/signing.service.ts: FOUND
- src/server/actions/signing.actions.ts: FOUND
- 09-02-SUMMARY.md: FOUND
- Commit e73b3fd: FOUND
- Commit b7e2f86: FOUND

---
*Phase: 09-service-layer*
*Completed: 2026-03-16*
