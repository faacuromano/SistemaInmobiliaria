# Requirements: Sistema Inmobiliaria — Milestone 2

**Defined:** 2026-02-25
**Core Value:** The signing calendar must dynamically reflect the business's actual working hours and breaks, configured by administrators.

## v1 Requirements

### Business Hours Configuration

- [ ] **BHRS-01**: Admin can set opening time (HH:MM format) in system settings
- [ ] **BHRS-02**: Admin can set closing time (HH:MM format) in system settings
- [ ] **BHRS-03**: Admin can add multiple custom breaks with label, start time, and end time
- [ ] **BHRS-04**: Admin can remove any break from the list
- [ ] **BHRS-05**: Admin can enable/disable each day of the week (Monday through Sunday)
- [ ] **BHRS-06**: System validates breaks don't overlap and fall within opening/closing range
- [ ] **BHRS-07**: System provides sensible defaults (09:00–17:00, Mon-Fri, lunch 12:00–14:00) on fresh install

### Dynamic Calendar

- [ ] **DCAL-01**: Signing calendar renders time slots generated from business hours config (30-min intervals)
- [ ] **DCAL-02**: Calendar shows only enabled days (dynamic column count, not hardcoded 5)
- [ ] **DCAL-03**: Break periods appear as visual separator rows with their labels
- [ ] **DCAL-04**: Existing signings at times outside configured hours are still visible with an "out of hours" indicator
- [ ] **DCAL-05**: Week navigation and date range queries adapt to configured days

### Bug Fix

- [ ] **BFIX-01**: NotificationBell no longer causes hydration mismatch (timeAgo deferred to post-mount)

## v2 Requirements

### Business Hours Enhancements

- **BHRS-08**: Live preview of generated time slots in settings UI
- **BHRS-09**: Warning when config changes would affect existing signings
- **BHRS-10**: Per-day different hours (e.g., shorter Fridays)

### Calendar Enhancements

- **DCAL-06**: Signing form restricts time picker to only configured hours
- **DCAL-07**: Google Calendar sync for signing slots

## Out of Scope

| Feature | Reason |
|---------|--------|
| Configurable slot duration (15/30/60 min) | Adds complexity without proportional value; 30-min fixed is sufficient |
| Customer self-booking portal | Internal ERP only; admins manage all bookings |
| Drag-and-drop calendar | High complexity; current click-to-book UX is adequate |
| Recurring appointments | Signing slots are one-off events by nature |
| Per-day different hours | User explicitly deferred; same schedule for all enabled days |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BHRS-01 | Phase 1 | Pending |
| BHRS-02 | Phase 1 | Pending |
| BHRS-03 | Phase 1 | Pending |
| BHRS-04 | Phase 1 | Pending |
| BHRS-05 | Phase 1 | Pending |
| BHRS-06 | Phase 1 | Pending |
| BHRS-07 | Phase 1 | Pending |
| DCAL-01 | Phase 2 | Pending |
| DCAL-02 | Phase 2 | Pending |
| DCAL-03 | Phase 2 | Pending |
| DCAL-04 | Phase 2 | Pending |
| DCAL-05 | Phase 2 | Pending |
| BFIX-01 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
