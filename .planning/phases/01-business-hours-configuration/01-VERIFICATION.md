---
phase: 01-business-hours-configuration
verified: 2026-02-25T21:00:00Z
status: human_needed
score: 12/12 must-haves verified
human_verification:
  - test: "Navigate to /configuracion as SUPER_ADMIN and confirm Horarios tab appears"
    expected: "A Horarios tab is visible in the TabsList between Importar and other tabs"
    why_human: "Tab visibility depends on RBAC session state and live DOM rendering"
  - test: "Load Horarios tab on a fresh install (no saved config in SystemConfig)"
    expected: "Default values show: apertura 09:00, cierre 17:00, one break Mediodia 12:00-14:00, Mon-Fri switches on"
    why_human: "Requires runtime DB state to verify defaults-fallback path"
  - test: "Change opening time to 08:00, save, reload page, return to Horarios tab"
    expected: "Opening time persists as 08:00 after page reload"
    why_human: "Persistence across reload requires a live DB and network round-trip"
  - test: "Add a second break labeled Merienda from 16:00 to 16:30, then save"
    expected: "Success toast appears and both breaks survive page reload"
    why_human: "Dynamic break append + persistence requires live interaction"
  - test: "Try adding a break overlapping 12:00-13:00 (overlaps with Mediodia), click save"
    expected: "Inline error message appears: Los descansos no pueden superponerse"
    why_human: "Cross-field validation error surfacing in the DOM cannot be verified statically"
  - test: "Set closing time to 08:00 (before opening time of 09:00), attempt save"
    expected: "Inline error on cierre field: La hora de apertura debe ser anterior a la de cierre"
    why_human: "Requires real form interaction to trigger submit-time refinement"
  - test: "Toggle all day switches off, attempt save"
    expected: "Inline error: Al menos un dia debe estar habilitado"
    why_human: "Switch state and enabledDays array length check requires live DOM"
  - test: "Remove a break using its Trash2 icon button"
    expected: "Break row disappears immediately from the list"
    why_human: "useFieldArray remove behavior is a live DOM interaction"
---

# Phase 1: Business Hours Configuration Verification Report

**Phase Goal:** Administrators can fully configure the business's working schedule -- opening/closing times, enabled days, and multiple break periods -- through the existing settings interface
**Verified:** 2026-02-25T21:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DEFAULT_BUSINESS_HOURS constant provides 09:00-17:00, Mon-Fri, lunch 12:00-14:00 | VERIFIED | `src/lib/business-hours.ts` lines 14-25: exact values confirmed |
| 2 | Zod schema rejects overlapping breaks with a descriptive error message | VERIFIED | `src/schemas/business-hours.schema.ts` lines 43-56: sorted overlap check, message "Los descansos no pueden superponerse" |
| 3 | Zod schema rejects breaks outside business hours with a descriptive error message | VERIFIED | `src/schemas/business-hours.schema.ts` lines 33-42: every-break boundary check, message "Los descansos deben estar dentro del horario laboral" |
| 4 | Zod schema rejects closing time before opening time | VERIFIED | `src/schemas/business-hours.schema.ts` lines 29-32: `data.openingTime < data.closingTime`, message "La hora de apertura debe ser anterior a la de cierre" |
| 5 | Zod schema requires at least one enabled day | VERIFIED | `src/schemas/business-hours.schema.ts` line 27: `.min(1, "Al menos un dia debe estar habilitado")` |
| 6 | getBusinessHours() returns defaults when no config stored in DB | VERIFIED | `src/server/actions/business-hours.actions.ts` lines 17-19: `if (!raw) return DEFAULT_BUSINESS_HOURS` |
| 7 | updateBusinessHours() validates input server-side and persists to SystemConfig | VERIFIED | `src/server/actions/business-hours.actions.ts` lines 51-57: `safeParse` then `systemConfigModel.set` |
| 8 | Admin can set opening time via a time picker input in the Horarios tab | VERIFIED | `business-hours-section.tsx` lines 95-107: FormField openingTime with `<Input type="time">` |
| 9 | Admin can set closing time via a time picker input in the Horarios tab | VERIFIED | `business-hours-section.tsx` lines 108-121: FormField closingTime with `<Input type="time">` |
| 10 | Admin can add a break with label, start time, and end time by clicking Agregar descanso | VERIFIED | `business-hours-section.tsx` lines 194-204: Button onClick appends `{ label: "", startTime: "", endTime: "" }` |
| 11 | Admin can remove any individual break by clicking its trash icon | VERIFIED | `business-hours-section.tsx` lines 171-179: Trash2 Button onClick calls `remove(index)` |
| 12 | Admin can toggle each day of the week (Mon-Sun) on or off via Switch components | VERIFIED | `business-hours-section.tsx` lines 213-231: DAY_OPTIONS mapped to Switch components with `form.setValue` |

**Score:** 12/12 truths verified (all automated checks pass)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/business-hours.ts` | BusinessHoursConfig type and DEFAULT_BUSINESS_HOURS constant | VERIFIED | 25 lines; exports BreakPeriod, BusinessHoursConfig, DEFAULT_BUSINESS_HOURS |
| `src/schemas/business-hours.schema.ts` | Zod schema with cross-field refinements | VERIFIED | 59 lines; exports businessHoursSchema and BusinessHoursInput type |
| `src/server/actions/business-hours.actions.ts` | Server actions for reading and writing | VERIFIED | 67 lines; exports getBusinessHours and updateBusinessHours with "use server" |
| `src/app/(dashboard)/configuracion/_components/business-hours-section.tsx` | Client component with form | VERIFIED | 249 lines (min 100 required); three-Card layout, useFieldArray, Switch toggles |
| `src/app/(dashboard)/configuracion/page.tsx` | Updated settings page with Horarios tab | VERIFIED | Contains BusinessHoursSection, getBusinessHours, Horarios TabsTrigger and TabsContent |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `business-hours.actions.ts` | `business-hours.schema.ts` | `businessHoursSchema.safeParse` | WIRED | Lines 24 and 51: two safeParse calls (read validation + write validation) |
| `business-hours.actions.ts` | `system-config.model.ts` | `systemConfigModel.get/set` | WIRED | Line 16: `.get(CONFIG_KEY)`, line 57: `.set(CONFIG_KEY, ...)` |
| `business-hours.actions.ts` | `business-hours.ts` | `DEFAULT_BUSINESS_HOURS` | WIRED | Lines 8, 19, 31, 34: imported and used in three fallback paths |
| `business-hours-section.tsx` | `business-hours.actions.ts` | `updateBusinessHours` | WIRED | Line 26: imported, line 69: called directly in onSubmit handler |
| `business-hours-section.tsx` | `business-hours.schema.ts` | `businessHoursSchema` | WIRED | Line 23: imported, line 48: used in zodResolver |
| `business-hours-section.tsx` | `business-hours.ts` | `BusinessHoursConfig` | WIRED | Line 27: type imported for Props interface |
| `configuracion/page.tsx` | `business-hours.actions.ts` | `getBusinessHours` | WIRED | Line 16: imported, line 42: called in Promise.all |
| `configuracion/page.tsx` | `business-hours-section.tsx` | `<BusinessHoursSection` | WIRED | Line 18: imported, line 107: rendered with config prop |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BHRS-01 | 01-02-PLAN.md | Admin can set opening time (HH:MM) in system settings | SATISFIED | `business-hours-section.tsx` FormField openingTime with `<Input type="time">` |
| BHRS-02 | 01-02-PLAN.md | Admin can set closing time (HH:MM) in system settings | SATISFIED | `business-hours-section.tsx` FormField closingTime with `<Input type="time">` |
| BHRS-03 | 01-02-PLAN.md | Admin can add multiple custom breaks with label, start time, and end time | SATISFIED | `business-hours-section.tsx` useFieldArray with append button and three-field rows |
| BHRS-04 | 01-02-PLAN.md | Admin can remove any break from the list | SATISFIED | `business-hours-section.tsx` Trash2 Button per row calling `remove(index)` |
| BHRS-05 | 01-02-PLAN.md | Admin can enable/disable each day of the week (Monday through Sunday) | SATISFIED | `business-hours-section.tsx` DAY_OPTIONS (Mon through Sun) with Switch per day |
| BHRS-06 | 01-01-PLAN.md | System validates breaks don't overlap and fall within opening/closing range | SATISFIED | `business-hours.schema.ts` refinements 2 and 3; `business-hours.actions.ts` server-side safeParse |
| BHRS-07 | 01-01-PLAN.md | System provides sensible defaults (09:00-17:00, Mon-Fri, lunch 12:00-14:00) on fresh install | SATISFIED | `business-hours.ts` DEFAULT_BUSINESS_HOURS constant; `business-hours.actions.ts` null-guard returns defaults |

All 7 phase requirements (BHRS-01 through BHRS-07) are accounted for across the two plans. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `business-hours-section.tsx` | 139 | `placeholder="Almuerzo"` | Info | This is a legitimate UX hint, not a stub. No impact on goal. |

No blockers or warnings found. The placeholder on line 139 is an HTML placeholder attribute for a text input (example hint text), not a stub implementation.

### Human Verification Required

The following behaviors require live browser interaction to confirm. All code paths are wired correctly -- these are functional completeness checks that cannot be resolved statically.

#### 1. Horarios Tab Visibility

**Test:** Log in as SUPER_ADMIN (or any role with config:manage), navigate to /configuracion
**Expected:** "Horarios" appears as a tab in the TabsList alongside Usuarios, Sistema, Permisos, Importar
**Why human:** Tab rendering depends on live RBAC session evaluation (`canManageConfig` check)

#### 2. Default Values on Fresh Install

**Test:** With no business_hours key in the SystemConfig table, load the Horarios tab
**Expected:** Form pre-fills with apertura 09:00, cierre 17:00, one break "Mediodia" 12:00-14:00, Mon-Fri switches on
**Why human:** Requires verifying the defaults-fallback path executes against a real DB state

#### 3. Persistence Across Page Reload

**Test:** Change opening time to 08:00, click "Guardar Horarios", observe toast, reload page, reopen Horarios tab
**Expected:** Opening time shows 08:00 (not 09:00), confirming SystemConfig.set and getBusinessHours.get round-trip work
**Why human:** Requires a live DB write + read cycle

#### 4. Adding and Persisting Multiple Breaks

**Test:** Click "Agregar descanso", fill in "Merienda" / 16:00 / 16:30, save, reload, return to Horarios
**Expected:** Both the original Mediodia break and the new Merienda break appear after reload
**Why human:** Dynamic append + serialization + DB persistence requires live interaction

#### 5. Overlapping Breaks Validation Error

**Test:** Add a break with times 12:00-13:00 (overlaps existing Mediodia 12:00-14:00), click "Guardar Horarios"
**Expected:** Inline error appears in the Descansos card: "Los descansos no pueden superponerse"
**Why human:** Cross-field refinement error surface (breaks.root vs breaks.message DOM path) requires live form observation

#### 6. Closing Before Opening Validation Error

**Test:** Set "Hora de cierre" to 08:00 while "Hora de apertura" is 09:00, click "Guardar Horarios"
**Expected:** Error on the closing time field: "La hora de apertura debe ser anterior a la de cierre"
**Why human:** Submit-time Zod refinement error path requires live form interaction

#### 7. Zero Enabled Days Validation Error

**Test:** Toggle off all seven day switches, click "Guardar Horarios"
**Expected:** Error below the switches: "Al menos un dia debe estar habilitado"
**Why human:** Array length validation via Switch state requires live DOM state

#### 8. Removing a Break

**Test:** Click the Trash2 icon next to the Mediodia break
**Expected:** The break row disappears immediately from the Descansos card without a page reload
**Why human:** useFieldArray remove behavior requires live React state update observation

### Gaps Summary

No gaps found. All 12 automated must-have truths are verified, all 5 artifacts pass all three levels (exists, substantive, wired), all 8 key links are confirmed wired, and all 7 requirement IDs (BHRS-01 through BHRS-07) map to satisfied implementations.

The only items pending are 8 human verification tests for live browser behavior -- these are all consistent with what the code implements. The automated layer is complete and correct.

---

_Verified: 2026-02-25T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
