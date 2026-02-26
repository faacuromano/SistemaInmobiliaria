---
phase: 06-estadisticas-overhaul
plan: 01
subsystem: ui
tags: [react, shadcn, tailwind, prisma, statistics, badges, tooltips]

# Dependency graph
requires:
  - phase: none
    provides: existing estadisticas page with monthly movements and collection metrics
provides:
  - MonthlyMovementsTable client component with type filter and color-coded badges
  - CollectionHelpTooltip reusable tooltip component
  - PARCIAL proportional credit in collection rate calculation
  - Per-type-per-month movementsByType data structure
affects: [estadisticas, cobranza]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-type-per-month aggregation, color-coded badges by movement type, proportional partial credit]

key-files:
  created:
    - src/app/(dashboard)/estadisticas/_components/monthly-movements-table.tsx
    - src/app/(dashboard)/estadisticas/_components/collection-help-tooltip.tsx
  modified:
    - src/app/(dashboard)/estadisticas/page.tsx

key-decisions:
  - "Used per-type-per-month Map aggregation on server to avoid sending raw movement rows to client"
  - "Color-coded badges use semantic Tailwind colors: income types green/blue, expense types red/orange"
  - "PARCIAL credit computed as sum(paidAmount/amount) fraction rather than binary count"

patterns-established:
  - "MovementByType: server computes per-type-per-month aggregation, client filters client-side"
  - "CollectionHelpTooltip: reusable info icon + tooltip pattern for metric explanations"

requirements-completed: [STAT-01, STAT-02, STAT-03, STAT-04]

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 6 Plan 1: Estadisticas Overhaul Summary

**Movement type filtering with color-coded badges, PARCIAL proportional collection rate fix, and metric help tooltips on Estadisticas page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T15:52:21Z
- **Completed:** 2026-02-26T15:56:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Monthly movements table now has a type filter dropdown (18 movement types) with client-side filtering
- Each movement type is visually distinguishable via a unique color-coded Badge (semantic: income=green/blue, expense=red/orange)
- Collection rate (Tasa de Cobranza) now counts PARCIAL installments proportionally instead of zero
- All 8 metrics in Rendimiento de Cobranza have info tooltips explaining what they measure and how

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix server queries and extract movements data with type field** - `d08f1c1` (feat)
2. **Task 2: Create monthly movements client component with type filter and color-coded badges, and add collection help tooltips** - `273d8f1` (feat)

## Files Created/Modified
- `src/app/(dashboard)/estadisticas/page.tsx` - Added type field to query, PARCIAL proportional credit, movementsByType aggregation, CollectionHelpTooltip on all metrics
- `src/app/(dashboard)/estadisticas/_components/monthly-movements-table.tsx` - New client component: type filter dropdown, color-coded badges, filtered monthly data table
- `src/app/(dashboard)/estadisticas/_components/collection-help-tooltip.tsx` - New reusable tooltip component wrapping shadcn Tooltip with Info icon

## Decisions Made
- Used per-type-per-month Map aggregation on server to minimize data sent to client (not raw movement rows)
- Color-coded badges use semantic Tailwind colors: income types get green/blue tones, expense types get red/orange/amber tones
- PARCIAL credit computed as sum(paidAmount/amount) fraction per installment rather than binary count
- Applied same PARCIAL fix to previous year collection rate for accurate YoY comparison

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Estadisticas overhaul complete with all 4 STAT requirements fulfilled
- Components are self-contained client components receiving server data as props
- CollectionHelpTooltip is reusable for other pages if needed

## Self-Check: PASSED

All files verified present, all commit hashes confirmed in git log.

---
*Phase: 06-estadisticas-overhaul*
*Completed: 2026-02-26*
