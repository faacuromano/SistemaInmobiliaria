# Roadmap: Sistema Inmobiliaria -- Milestone 2

## Overview

This milestone replaces hardcoded signing calendar behavior with admin-configurable business hours. The work flows through three phases: first, build the complete settings infrastructure so admins can configure hours, days, and breaks; second, integrate that configuration into the signing calendar so it renders dynamically; third, fix an unrelated hydration bug in the notification bell. Each phase delivers an independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Business Hours Configuration** - Admin can configure working hours, days, and breaks through system settings
- [ ] **Phase 2: Dynamic Signing Calendar** - Calendar renders time slots and days from business hours config instead of hardcoded values
- [ ] **Phase 3: Hydration Fix** - NotificationBell no longer causes hydration mismatch errors

## Phase Details

### Phase 1: Business Hours Configuration
**Goal**: Administrators can fully configure the business's working schedule -- opening/closing times, enabled days, and multiple break periods -- through the existing settings interface
**Depends on**: Nothing (first phase)
**Requirements**: BHRS-01, BHRS-02, BHRS-03, BHRS-04, BHRS-05, BHRS-06, BHRS-07
**Success Criteria** (what must be TRUE):
  1. Admin can set opening and closing times via time pickers in system settings, and the values persist after page reload
  2. Admin can toggle each day of the week (Mon-Sun) on/off, and the selection persists after page reload
  3. Admin can add multiple named break periods (with start time, end time, and label) and remove any individual break
  4. System rejects invalid configurations (overlapping breaks, breaks outside business hours, closing before opening) with visible error messages
  5. A fresh install with no saved configuration loads sensible defaults (09:00-17:00, Mon-Fri, lunch break 12:00-14:00) without errors
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Foundation: types, constants, Zod schema, and server actions for business hours config
- [ ] 01-02-PLAN.md -- UI: BusinessHoursSection component and Horarios tab in settings page

### Phase 2: Dynamic Signing Calendar
**Goal**: The signing calendar dynamically reflects the configured business hours -- showing only enabled days, generating time slots from opening/closing times, and displaying break periods as visual separators
**Depends on**: Phase 1
**Requirements**: DCAL-01, DCAL-02, DCAL-03, DCAL-04, DCAL-05
**Success Criteria** (what must be TRUE):
  1. Calendar displays 30-minute time slots generated from the configured opening and closing times (not the old hardcoded list)
  2. Calendar shows only the days that are enabled in settings (e.g., if Saturday is enabled, 6 columns appear; if only Mon-Wed are enabled, 3 columns appear)
  3. Break periods appear as labeled separator rows in the calendar grid (e.g., "Almuerzo 12:00-14:00") replacing the old hardcoded morning/afternoon divider
  4. Existing signing appointments that fall outside the current configured hours are still visible on the calendar with an "out of hours" indicator -- they are never hidden
  5. Week navigation correctly adapts to configured days (date range queries and displayed dates match enabled days only)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Hydration Fix
**Goal**: The NotificationBell component renders without React hydration mismatch warnings
**Depends on**: Nothing (independent of Phases 1-2)
**Requirements**: BFIX-01
**Success Criteria** (what must be TRUE):
  1. NotificationBell renders on page load without hydration mismatch errors in the browser console
  2. Time-ago labels (e.g., "hace 5 minutos") appear correctly after the component mounts, using the same useState/useEffect pattern as the existing HeaderInfo component
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Business Hours Configuration | 0/2 | Not started | - |
| 2. Dynamic Signing Calendar | 0/2 | Not started | - |
| 3. Hydration Fix | 0/1 | Not started | - |
