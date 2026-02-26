---
phase: 02-dynamic-signing-calendar
plan: 01
subsystem: ui
tags: [calendar, business-hours, utility-functions, discriminated-union, typescript]

# Dependency graph
requires:
  - phase: 01-business-hours-configuration
    provides: BusinessHoursConfig type, getBusinessHours() server action, admin settings UI
provides:
  - CalendarSlotGroup / CalendarBreakGroup discriminated union types
  - generateCalendarSegments() pure function for time slot generation
  - getEnabledWeekDates() returning {date, dayOfWeek, label} for dynamic day columns
  - getAllSlotTimes() helper for O(1) out-of-hours detection
  - DAY_NAMES exported constant
  - businessHours prop flowing from page.tsx through SigningsView
  - getSigningsByWeek() covering full Mon-Sun range
affects: [02-02-PLAN dynamic calendar UI rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [discriminated-union-segments, pure-utility-functions, parallel-data-fetching]

key-files:
  created: []
  modified:
    - src/lib/business-hours.ts
    - src/server/actions/signing.actions.ts
    - src/app/(dashboard)/firmas/page.tsx
    - src/app/(dashboard)/firmas/_components/signings-view.tsx
    - src/app/(dashboard)/firmas/_components/signings-calendar.tsx

key-decisions:
  - "Used proper TypeScript discriminated union (CalendarSlotGroup | CalendarBreakGroup) instead of single interface with optional fields"
  - "Break segments now carry startTime/endTime for future duration display"
  - "DAY_NAMES uses no accents to match existing calendar style in codebase"
  - "getEnabledWeekDates returns rich objects {date, dayOfWeek, label} instead of bare Date[] for downstream convenience"
  - "String comparison sort for breaks (works because HH:MM is zero-padded)"

patterns-established:
  - "Discriminated union pattern: CalendarSegment = CalendarSlotGroup | CalendarBreakGroup with type field for narrowing"
  - "Pure utility function pattern: generateCalendarSegments and getEnabledWeekDates are pure functions with no side effects"
  - "Parallel data fetching: getBusinessHours() in Promise.all alongside other page-level queries"

requirements-completed: [DCAL-01, DCAL-02, DCAL-03, DCAL-05]

# Metrics
duration: 13min
completed: 2026-02-26
---

# Phase 02 Plan 01: Utility Functions and Server Data Flow Summary

**Discriminated union calendar segments with generateCalendarSegments/getEnabledWeekDates utilities and businessHours data flow from server page to SigningsView**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-26T02:29:21Z
- **Completed:** 2026-02-26T02:42:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added proper discriminated union types (CalendarSlotGroup, CalendarBreakGroup, CalendarSegment) with generateCalendarSegments pure function
- Added getEnabledWeekDates returning rich {date, dayOfWeek, label} objects and getAllSlotTimes helper
- Verified businessHours data flows from page.tsx through SigningsView to SigningsCalendar in parallel Promise.all fetch
- getSigningsByWeek already queries Mon-Sun (7-day range) for full week coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: Add calendar segment utilities to business-hours.ts** - `a6095bb` (feat)
2. **Task 2: Expand getSigningsByWeek range and wire businessHours into page** - `1b050f7` (feat)

## Files Created/Modified
- `src/lib/business-hours.ts` - CalendarSlotGroup/CalendarBreakGroup discriminated union, generateCalendarSegments, getEnabledWeekDates, DAY_NAMES, getAllSlotTimes
- `src/server/actions/signing.actions.ts` - getSigningsByWeek with Mon-Sun (7-day) range
- `src/app/(dashboard)/firmas/page.tsx` - Fetches getBusinessHours() in parallel, passes to SigningsView
- `src/app/(dashboard)/firmas/_components/signings-view.tsx` - Accepts businessHours prop, updated formatWeekRange for new API
- `src/app/(dashboard)/firmas/_components/signings-calendar.tsx` - Updated to use discriminated union types and getAllSlotTimes

## Decisions Made
- Used proper TypeScript discriminated union (CalendarSlotGroup | CalendarBreakGroup) instead of the existing single interface with optional fields -- enables type narrowing in consumers
- Break segments now carry startTime/endTime metadata (not just label) for potential future duration display
- DAY_NAMES exported without accents (Miercoles, Sabado) to match existing calendar style
- getEnabledWeekDates returns {date, dayOfWeek, label} instead of bare Date[] -- richer API for downstream components
- String comparison sort for breaks (localeCompare) since HH:MM format is zero-padded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated signings-calendar.tsx and signings-view.tsx for new API shapes**
- **Found during:** Task 1 (after changing CalendarSegment type and getEnabledWeekDates return type)
- **Issue:** Changing CalendarSegment from single interface to discriminated union changed `breakLabel` to `label`, and changing getEnabledWeekDates return from `Date[]` to `{date, dayOfWeek, label}[]` broke consumers
- **Fix:** Updated signings-calendar.tsx to use `segment.label` instead of `segment.breakLabel`, extract `weekDateEntries` and use `entry.label`/`entry.date`; updated signings-view.tsx formatWeekRange to access `.date` on returned entries; switched to `getAllSlotTimes` for out-of-hours detection
- **Files modified:** src/app/(dashboard)/firmas/_components/signings-calendar.tsx, src/app/(dashboard)/firmas/_components/signings-view.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 1b050f7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Consumer updates were necessary to maintain type safety after API shape changes. No scope creep.

## Issues Encountered
- signing.actions.ts and page.tsx already had the correct code (Mon-Sun range and businessHours fetching were implemented in a previous session). Verified existing code matched plan requirements and committed as-is.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All utility functions and data flow ready for Plan 02 to consume
- CalendarSegment discriminated union enables type-safe rendering of slots vs breaks
- businessHours prop already flows through to SigningsCalendar
- No blockers for Plan 02 (dynamic calendar UI rendering)

## Self-Check: PASSED

All 5 created/modified files verified on disk. Both task commits (a6095bb, 1b050f7) found in git log.

---
*Phase: 02-dynamic-signing-calendar*
*Completed: 2026-02-26*
