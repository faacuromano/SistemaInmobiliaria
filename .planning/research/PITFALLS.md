# Pitfalls Research

**Research Date:** 2026-02-25
**Dimension:** Pitfalls
**Context:** Adding configurable business hours and dynamic signing calendar to existing real estate ERP

## Critical Pitfalls

### 1. Orphaned Signings After Hours Change
**Severity:** CRITICAL
**Warning signs:** Existing SigningSlot records at times outside new business hours become invisible in calendar but still exist in DB.
**Prevention:** Calendar must render ALL existing signings for the week, even those outside configured hours. Add a visual indicator ("fuera de horario") for out-of-range signings. Never filter existing data by config.
**Phase:** Calendar Integration (Phase 4)

### 2. Break Overlap Hides Appointments
**Severity:** CRITICAL
**Warning signs:** Admin adds a break period that covers times where signings already exist. Those signings disappear from the calendar.
**Prevention:** Same as #1 — always render existing signings. Break periods only affect empty slot generation (which slots are clickable for new bookings), not display of existing data.
**Phase:** Calendar Integration (Phase 4)

### 3. Grid Column Count Hardcoded in 6+ Locations
**Severity:** CRITICAL
**Warning signs:** The number "5" (for Mon-Fri) appears in: CSS grid template, `getWeekDates()` function (adds 4 days), `DAY_LABELS` array length, morning/afternoon separator colspan, `getSigningsByWeek()` date range calculation, and calendar row grid template.
**Prevention:** All 6+ locations must be parameterized simultaneously. Use a single `dayCount` variable derived from config. Test with 1 day, 3 days, 5 days, and 7 days enabled.
**Phase:** Calendar Integration (Phase 4)

### 4. Form Allows Booking Outside Business Hours
**Severity:** CRITICAL
**Warning signs:** The signing form dialog uses free-form `<input type="time">`. Users can book at 03:00 AM.
**Prevention:** Add soft validation — show a warning (not blocking error) when time is outside configured hours. Keep free-form input for admin override flexibility.
**Phase:** Calendar Integration (Phase 4)

### 5. JSON Schema Drift in SystemConfig
**Severity:** CRITICAL
**Warning signs:** Business hours config JSON stored in a simple text column with no versioning. Future changes to the schema (adding fields, renaming) break existing stored values.
**Prevention:** Always parse with Zod schema that has `.passthrough()` or defaults for new fields. Use `DEFAULT_BUSINESS_HOURS` as merge base: `{ ...DEFAULT, ...stored }`. Never trust stored JSON blindly.
**Phase:** Foundation (Phase 1)

## Moderate Pitfalls

### 6. Hydration Mismatch in NotificationBell
**Severity:** MODERATE
**Warning signs:** `timeAgo()` calls `new Date()` during render. Server time ≠ client time → different output → React hydration warning.
**Prevention:** Use `useState("")` + `useEffect(() => setTimeAgo(...))` pattern. Render empty/placeholder on first render, populate after mount. The sibling `HeaderInfo` component already implements this correctly.
**Phase:** Hydration Fix (Phase 5)

### 7. Config Fetch Crash on Missing/Invalid Key
**Severity:** MODERATE
**Warning signs:** `systemConfigModel.get("business_hours")` returns `null` on fresh install. `JSON.parse(null)` throws.
**Prevention:** `getBusinessHours()` must handle: key not found → return defaults, invalid JSON → return defaults, partial JSON → merge with defaults. Never let a config read crash the page.
**Phase:** Server Layer (Phase 2)

### 8. Break Validation Edge Cases
**Severity:** MODERATE
**Warning signs:** Overlapping breaks, breaks outside opening/closing hours, break start ≥ break end, break that covers entire day.
**Prevention:** Zod schema with `.refine()` checks: breaks within opening/closing range, no overlap between breaks, start < end for each break. UI should show inline errors.
**Phase:** Foundation (Phase 1)

### 9. DAY_LABELS Array Index Coupling
**Severity:** MODERATE
**Warning signs:** Current code uses array position to match days. With configurable days (e.g., [1,3,5] for Mon/Wed/Fri), positions no longer map to consecutive weekdays.
**Prevention:** Switch from positional arrays to objects: `{ dayIndex: 1, label: "Lunes", date: "2026-02-25" }`. Calendar iterates over config objects, not positional arrays.
**Phase:** Foundation (Phase 1)

### 10. revalidatePath Scope After Config Save
**Severity:** MODERATE
**Warning signs:** Saving business hours calls `revalidatePath("/configuracion")` but the calendar at `/firmas` still shows old slots until manual refresh.
**Prevention:** `updateBusinessHours()` must also call `revalidatePath("/firmas")` to invalidate the calendar page's server-side cache.
**Phase:** Server Layer (Phase 2)

## Minor Pitfalls

### 11. Off-by-One at Closing Time
**Severity:** MINOR
**Warning signs:** If closing time is "17:00" and last slot starts at "16:30", should "17:00" be included? The slot at 17:00 would end at 17:30, which is past closing.
**Prevention:** Generate slots where `slotStart < closingTime`, not `<=`. A slot at 16:30 is the last valid slot for a 17:00 close.
**Phase:** Foundation (Phase 1)

### 12. Morning/Afternoon Separator Should Follow Breaks
**Severity:** MINOR
**Warning signs:** Current calendar has a hardcoded "MEDIOD." divider between morning and afternoon blocks. With custom breaks, this separator should appear at each break boundary, not at a fixed position.
**Prevention:** Render a separator row for each break period in the config. Label it with the break's label (e.g., "Almuerzo", "Descanso").
**Phase:** Calendar Integration (Phase 4)

### 13. Empty Calendar on Fresh Install
**Severity:** MINOR
**Warning signs:** If `DEFAULT_BUSINESS_HOURS` is not set and the config key doesn't exist, the calendar renders with zero slots.
**Prevention:** Hardcode `DEFAULT_BUSINESS_HOURS` constant that matches current hardcoded behavior (09:00-17:00, Mon-Fri, lunch break 12:00-14:00). Calendar always has a fallback.
**Phase:** Foundation (Phase 1)

## Pitfall-to-Phase Mapping

| Phase | Pitfalls to Address |
|-------|-------------------|
| Foundation (Phase 1) | #5, #8, #9, #11, #13 |
| Server Layer (Phase 2) | #7, #10 |
| Settings UI (Phase 3) | (none — UI just renders what schema validates) |
| Calendar Integration (Phase 4) | #1, #2, #3, #4, #12 |
| Hydration Fix (Phase 5) | #6 |

---

*Research completed: 2026-02-25*
