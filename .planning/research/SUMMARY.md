# Project Research Summary

**Project:** Sistema Inmobiliaria — Configurable Business Hours Calendar (Milestone 2)
**Domain:** ERP scheduling configuration — dynamic weekly signing calendar with admin-configurable business hours
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

This milestone adds configurable business hours to the existing signing calendar in a real estate ERP. The current calendar has hardcoded Mon-Fri hours and a fixed lunch break, which makes it inflexible for offices with different schedules. The work is fundamentally a parametric refactoring: replace hardcoded constants (`TIME_SLOTS`, `DAY_LABELS`, `getWeekDates()`, the morning/afternoon separator) with props driven by a `BusinessHoursConfig` object stored in the existing `SystemConfig` table. No new dependencies are required — the entire implementation uses Next.js 15 server components, react-hook-form, Zod, date-fns, and shadcn/ui, all of which are already installed in the project.

The recommended approach is a strict bottom-up build order: foundation types and Zod schema first, then the server read/write layer, then the settings UI, and finally the calendar integration. This ordering ensures each layer is independently testable before the next depends on it. The critical algorithm is a pure `generateTimeSlots(config)` function using date-fns that replaces the hardcoded time slot array. The config is fetched server-side in `firmas/page.tsx` and passed as props, following the same pattern already used for all other SystemConfig values in the project.

The primary risk is data integrity: existing SigningSlot records must never disappear from the calendar when business hours are changed. Break periods and hours configuration affect only which empty slots are available for new bookings — existing appointments must always render, with an out-of-hours indicator if they fall outside the new config. A secondary risk is JSON schema drift in the SystemConfig text column; this is mitigated by always parsing stored JSON through the Zod schema with safe defaults, and never trusting raw stored values. Both risks are well understood and have clear prevention strategies.

## Key Findings

### Recommended Stack

Zero new dependencies are needed. The existing stack provides everything required: Next.js App Router for server-side config fetching (no API route needed), react-hook-form with `useFieldArray` for the dynamic breaks list, Zod for schema validation including cross-field refinements, date-fns 4.1.0 for time slot generation, and shadcn/ui components (Switch, Input, Card, Form) for the settings UI. The existing `SystemConfig` key-value model handles storage of the business hours JSON blob under the key `"business_hours"`.

**Core technologies:**
- **Next.js 15 (App Router):** Server component fetches config in `firmas/page.tsx`, passes as props — eliminates client-side loading flash
- **react-hook-form 7.71.2 + useFieldArray:** Manages the dynamic break periods list; already integrated throughout the app
- **Zod 3.25.76:** Validates the `BusinessHoursConfig` schema with cross-field `.refine()` checks (opening before closing, breaks within hours, no overlapping breaks)
- **date-fns 4.1.0:** `parse`, `addMinutes`, `format` power the `generateTimeSlots()` pure utility function
- **shadcn/ui (radix-ui 1.4.3):** Switch for day toggles, `<Input type="time">` for time pickers — all installed; no new UI components needed
- **SystemConfig (Prisma key-value):** Single JSON blob under key `"business_hours"` in the existing `systemConfigModel.get/set` pattern

### Expected Features

**Must have (table stakes — this milestone):**
- Opening/closing time inputs (HH:MM) with Zod validation (opening < closing)
- Working day toggles (Mon-Sun, default Mon-Fri)
- Multiple custom break periods (array of `{start, end, label?}`) with overlap and range validation
- `generateTimeSlots(config)` pure function — replaces hardcoded `TIME_SLOTS` array with 30-min slots excluding breaks
- `getEnabledWeekDates(config, weekStart)` — replaces hardcoded 5-day generation
- Calendar renders dynamic slots and columns from config (not hardcoded)
- Break separator rows generated from config (not the single hardcoded morning/afternoon divider)
- Server-side config fetch in `firmas/page.tsx`, passed as props to calendar
- `DEFAULT_BUSINESS_HOURS` constant fallback (Mon-Fri 09:00-17:00, lunch 12:00-14:00) for fresh installs

**Should have (add after user validation — v1.x):**
- Live preview in settings UI — reduces admin trial-and-error when configuring hours
- Config change impact warning — alerts when future signings fall outside new hours (query SigningSlots, count affected)
- Named break labels — "Almuerzo" / "Descanso" shown in calendar separator rows

**Defer (v2+):**
- Google Calendar sync — explicitly deferred per PROJECT.md; requires OAuth2 infrastructure
- Per-day different hours — out of scope (same schedule for all enabled days); adds disproportionate UI/rendering complexity
- Customer self-booking portal — anti-feature for this internal ERP; staff books all signings
- Configurable slot duration — anti-feature; variable row heights create significant grid complexity for minimal gain

### Architecture Approach

The architecture follows the existing layered pattern precisely: Zod schema in `src/schemas/`, a pure utility library in `src/lib/business-hours.ts`, server actions in `src/server/actions/`, a client form component in the configuracion page's `_components/` folder, and calendar changes via prop-drilling from the server component page. The only new files are the schema, the utility library, and the settings UI component. All other changes are modifications to existing files. The grid column count must be derived from a single `dayCount` variable using an inline `style` attribute — dynamic Tailwind grid classes get purged at build time.

**Major components:**
1. `src/schemas/business-hours.schema.ts` — Zod schema for `BusinessHoursConfig` with all cross-field validations; foundation for everything else
2. `src/lib/business-hours.ts` — Pure functions: `generateTimeSlots()`, `getEnabledDayLabels()`, `DEFAULT_BUSINESS_HOURS` constant
3. `src/server/actions/config.actions.ts` (modified) — `getBusinessHours()` and `updateBusinessHours()` with safe parse/fallback logic
4. `src/app/(dashboard)/configuracion/_components/BusinessHoursSection.tsx` — Client form with react-hook-form + useFieldArray, save to server action
5. `src/app/(dashboard)/firmas/page.tsx` (modified) — Fetch config server-side, generate time slots, pass as props
6. `src/app/(dashboard)/firmas/_components/signings-calendar.tsx` (modified) — Accept `timeSlots` and `dayConfig` props, dynamic CSS grid, dynamic break separators

### Critical Pitfalls

1. **Orphaned signings after hours change** — Calendar MUST render all existing SigningSlots regardless of config; break config only controls which empty slots are clickable for new bookings. Never filter existing appointment data by the config. Add "fuera de horario" visual indicator.

2. **Hardcoded column count in 6+ locations** — The number "5" (Mon-Fri) is embedded in the CSS grid template, `getWeekDates()`, `DAY_LABELS` array, separator colspan, date range query, and calendar row grid. All must be parameterized simultaneously from a single `dayCount` source. Use `style={{ gridTemplateColumns: ... }}` (not dynamic Tailwind classes which get purged).

3. **JSON schema drift in SystemConfig** — The `business_hours` text column has no versioning. Parse stored JSON through Zod with safe defaults: `{ ...DEFAULT_BUSINESS_HOURS, ...JSON.parse(stored) }`. Never trust raw stored values; always apply schema and merge with defaults.

4. **Config fetch crash on missing key** — `systemConfigModel.get("business_hours")` returns `null` on fresh install. `getBusinessHours()` must handle: key not found → return defaults, invalid JSON → return defaults, partial JSON → merge with defaults. A config read must never crash the signing calendar page.

5. **revalidatePath scope after config save** — `updateBusinessHours()` must call `revalidatePath("/firmas")` in addition to `revalidatePath("/configuracion")`. Without this, the calendar page retains stale server-side cached slots after a business hours change until manual refresh.

## Implications for Roadmap

Research establishes a clear 5-phase build order driven by dependency chain. Each phase can be tested independently before the next depends on it.

### Phase 1: Foundation — Types, Schema, Defaults, Utilities

**Rationale:** Everything downstream depends on the `BusinessHoursConfig` type and `businessHoursSchema`. The Zod schema is the single source of truth for what valid config looks like. The `DEFAULT_BUSINESS_HOURS` constant must exist before any code path that reads config. The slot generation utility must be pure and independently testable.
**Delivers:** `BusinessHoursConfig` TypeScript type, `businessHoursSchema` Zod schema with all validations, `DEFAULT_BUSINESS_HOURS` constant, `generateTimeSlots()` pure function, `getEnabledDayLabels()` pure function — all in `src/lib/business-hours.ts` and `src/schemas/business-hours.schema.ts`
**Addresses:** Business hours schema, slot generation algorithm, default fallback, enabled days structure
**Avoids:** Pitfall #5 (JSON schema drift), #8 (break validation edge cases), #9 (DAY_LABELS index coupling), #11 (off-by-one at closing time), #13 (empty calendar on fresh install)

### Phase 2: Server Layer — Config Read/Write Actions

**Rationale:** The settings UI and the calendar page both need a stable, safe config read/write API before they can be built. The server actions must gracefully handle null, invalid JSON, and partial configs before any client code calls them.
**Delivers:** `getBusinessHours()` server action with safe parse/fallback, `updateBusinessHours()` server action with Zod validation and dual `revalidatePath` calls
**Uses:** `businessHoursSchema` from Phase 1, `systemConfigModel.get/set` (existing), `DEFAULT_BUSINESS_HOURS` from Phase 1
**Implements:** Server actions layer in `src/server/actions/config.actions.ts`
**Avoids:** Pitfall #7 (config fetch crash on missing/invalid key), #10 (revalidatePath scope)

### Phase 3: Settings UI — BusinessHoursSection Component

**Rationale:** Building the settings form after the server layer means the form can immediately call real server actions and be tested end-to-end. Settings changes can be validated before touching the calendar.
**Delivers:** `BusinessHoursSection` client component in `configuracion/_components/`, integrated into `configuracion/page.tsx` as a new tab/card — time pickers, day toggles, dynamic break list with add/remove
**Uses:** react-hook-form + useFieldArray, `businessHoursSchema`, `updateBusinessHours()` from Phase 2, shadcn/ui Switch + Input + Button + Form
**Implements:** Business hours settings form component
**Avoids:** Pitfall #8 (break validation edge cases — form shows inline Zod errors)

### Phase 4: Calendar Integration — Dynamic SigningsCalendar

**Rationale:** Calendar changes are the highest-risk phase because they modify a complex existing component with 6+ interdependent hardcoded values. Building this last means all the supporting infrastructure (schema, utilities, server layer, settings) is proven before touching the calendar.
**Delivers:** Modified `signings-calendar.tsx` accepting `timeSlots` and `dayConfig` props, dynamic CSS grid columns via inline style, dynamic break separator rows from config, "fuera de horario" indicator for out-of-range signings, updated `firmas/page.tsx` with server-side config fetch
**Uses:** `generateTimeSlots()` and `getEnabledDayLabels()` from Phase 1, `getBusinessHours()` from Phase 2
**Implements:** Full calendar integration, end-to-end flow from SystemConfig to rendered grid
**Avoids:** Pitfall #1 (orphaned signings), #2 (break overlap hides appointments), #3 (hardcoded column count in 6+ locations), #4 (form allows booking outside hours — soft warning), #12 (morning/afternoon separator follows breaks)

### Phase 5: Hydration Fix — NotificationBell

**Rationale:** This is an independent bug fix for a React hydration mismatch in `NotificationBell` (timeAgo uses `new Date()` on server and client, producing different output). It is architecturally unrelated to the business hours work but is included in this milestone. Can be built in parallel with any phase.
**Delivers:** Hydration-safe `NotificationBell` using `useState("")` + `useEffect` pattern, consistent with `HeaderInfo` sibling component
**Avoids:** Pitfall #6 (hydration mismatch in NotificationBell)

### Phase Ordering Rationale

- **Schema before everything:** The Zod schema defines the data contract. Without it, the server layer cannot validate, the form cannot resolve, and the calendar cannot type-check its props.
- **Server layer before UI:** Both the settings form and the calendar page call server functions. Building these in isolation (before the form exists) allows testing with Prisma Studio directly.
- **Settings before calendar:** Verifying that config saves correctly end-to-end (form → action → SystemConfig) reduces debugging surface when the calendar integration is added.
- **Calendar last:** The calendar modification is the most complex change (6+ locations, existing component with interactions). All dependencies are proven before this phase starts.
- **Phase 5 is independent:** The NotificationBell fix touches no business hours code. It can be developed in parallel or appended as a cleanup step.

### Research Flags

Phases with standard, well-understood patterns (skip additional research):
- **Phase 1 (Foundation):** Pure TypeScript/Zod — standard patterns, HIGH confidence
- **Phase 2 (Server Layer):** Follows exact existing SystemConfig pattern, HIGH confidence
- **Phase 3 (Settings UI):** Follows existing form patterns in the codebase, MEDIUM-HIGH confidence
- **Phase 5 (Hydration Fix):** Standard Next.js useState/useEffect pattern, HIGH confidence

Phases that may benefit from targeted implementation review:
- **Phase 4 (Calendar Integration):** The existing `signings-calendar.tsx` has subtle coupling between its grid template, date generation, and separator logic. A careful read of all 6+ hardcoded locations before writing code is essential. Not uncertain — just complex.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase analysis of package.json and all existing components. Zero new dependencies needed; all tools verified present and at correct versions. |
| Features | MEDIUM | Core feature set derived from codebase analysis and PROJECT.md requirements. Differentiator features (live preview, impact warning) based on domain knowledge without external source verification. |
| Architecture | HIGH | Direct codebase analysis of signings-calendar.tsx (340 lines), system-config-section.tsx, firmas/page.tsx. Build order confirmed by dependency analysis. |
| Pitfalls | HIGH | Most pitfalls identified from direct codebase analysis (hardcoded "5" locations, NULL handling, revalidatePath scope). These are concrete code issues, not speculative risks. |

**Overall confidence:** HIGH

### Gaps to Address

- **`useFieldArray` API surface:** Confirmed present in project but web verification unavailable. The `fields, append, remove` pattern is standard and extremely stable, but treat as MEDIUM confidence until implementation confirms behavior with React 19 + Next.js 15.
- **`<input type="time">` browser rendering:** Standard HTML5 API, but exact rendering in the admin's browser environment (likely Chrome/Edge on Windows) should be verified during Phase 3 implementation.
- **Out-of-hours signing indicator (Phase 4):** Research identifies the need to show existing signings outside new hours, but the exact UI treatment ("fuera de horario" badge, greyed row, etc.) is not specified. Requires a brief design decision during Phase 4 planning.
- **Zod `.passthrough()` vs merge strategy for schema evolution:** Research recommends `{ ...DEFAULT, ...stored }` merge. The interaction with Zod's parse behavior should be confirmed during Phase 1 implementation.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `src/app/(dashboard)/firmas/_components/signings-calendar.tsx` — grid structure, TIME_SLOTS, DAY_LABELS, separator logic
- Direct codebase analysis: `src/app/(dashboard)/configuracion/_components/system-config-section.tsx` — react-hook-form + useActionState pattern, SystemConfig integration
- Direct codebase analysis: `src/server/models/system-config.model.ts` — get/set key-value API
- Direct codebase analysis: `src/schemas/system-config.schema.ts` — existing Zod schema patterns
- Direct codebase analysis: `prisma/schema.prisma` — SystemConfig and SigningSlot model definitions
- Direct codebase analysis: `package.json` — Next.js 15.5.12, date-fns 4.1.0, react-hook-form 7.71.2, Zod 3.25.76, radix-ui 1.4.3 (all verified)
- `src/components/ui/switch.tsx` — confirmed present in project

### Secondary (MEDIUM confidence)
- Training data: react-hook-form `useFieldArray` API (`fields, append, remove`) — standard, stable API
- Training data: HTML5 `<input type="time">` behavior and HH:MM format
- Training data: date-fns v4 ESM-only import patterns
- PROJECT.md feature constraints and deferred items

### Tertiary (LOW confidence)
- Domain knowledge: scheduling UX patterns for internal ERP tools (no external sources available during research — WebSearch/WebFetch unavailable)

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
