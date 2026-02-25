---
phase: 01-business-hours-configuration
plan: 01
subsystem: api
tags: [zod, typescript, server-actions, validation, business-hours]

# Dependency graph
requires: []
provides:
  - BusinessHoursConfig type and BreakPeriod interface
  - DEFAULT_BUSINESS_HOURS constant (09:00-17:00, Mon-Fri, lunch 12:00-14:00)
  - businessHoursSchema Zod schema with cross-field refinements
  - getBusinessHours() server action with defaults fallback
  - updateBusinessHours() server action with auth and validation
affects: [01-business-hours-configuration]

# Tech tracking
tech-stack:
  added: []
  patterns: [zod-cross-field-refinements, systemconfig-json-storage, useactionstate-compatible-signature]

key-files:
  created:
    - src/lib/business-hours.ts
    - src/schemas/business-hours.schema.ts
    - src/server/actions/business-hours.actions.ts
  modified: []

key-decisions:
  - "String comparison for HH:MM times works correctly due to zero-padded format enforcement"
  - "Best-effort merge with defaults for corrupted/partial JSON data in SystemConfig"

patterns-established:
  - "Business hours stored as JSON in SystemConfig key-value table"
  - "Zod schema layered: base schemas -> object schema -> chained .refine() calls"
  - "Server action reads return domain type directly, writes use ActionResult"

requirements-completed: [BHRS-06, BHRS-07]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 1 Plan 1: Business Hours Foundation Summary

**Business hours types, Zod validation schema with 3 cross-field refinements, and server actions for SystemConfig persistence**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T20:15:24Z
- **Completed:** 2026-02-25T20:17:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- BusinessHoursConfig and BreakPeriod interfaces with DEFAULT_BUSINESS_HOURS constant (09:00-17:00, Mon-Fri, Mediodia 12:00-14:00)
- Zod schema enforcing zero-padded HH:MM format with refinements: opening < closing, breaks within range, no overlapping breaks
- getBusinessHours() server action with graceful fallback to defaults for missing/corrupted config
- updateBusinessHours() server action with requirePermission("config:manage") auth guard and Zod safeParse validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create business hours types, constants, and Zod schema** - `9a3c940` (feat)
2. **Task 2: Create server actions for reading and writing business hours** - `4c46dff` (feat)

## Files Created/Modified
- `src/lib/business-hours.ts` - BreakPeriod and BusinessHoursConfig interfaces, DEFAULT_BUSINESS_HOURS constant
- `src/schemas/business-hours.schema.ts` - Zod schema with timeRegex, breakPeriodSchema, businessHoursSchema with 3 refinements
- `src/server/actions/business-hours.actions.ts` - getBusinessHours() and updateBusinessHours() server actions

## Decisions Made
- String comparison for HH:MM times works correctly because the regex enforces zero-padded 24-hour format (no need to convert to minutes)
- Best-effort merge with defaults for corrupted/partial JSON data in SystemConfig (resilient to partial corruption)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All types, validation, and persistence layer are ready for Plan 02 (UI component)
- businessHoursSchema is importable for client-side form validation
- getBusinessHours() provides initial data for the configuration form
- updateBusinessHours() accepts FormData with useActionState-compatible signature

## Self-Check: PASSED

- [x] src/lib/business-hours.ts exists
- [x] src/schemas/business-hours.schema.ts exists
- [x] src/server/actions/business-hours.actions.ts exists
- [x] Commit 9a3c940 exists
- [x] Commit 4c46dff exists
- [x] TypeScript compiles with zero errors

---
*Phase: 01-business-hours-configuration*
*Completed: 2026-02-25*
