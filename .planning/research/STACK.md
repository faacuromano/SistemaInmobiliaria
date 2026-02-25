# Stack Research: Configurable Business Hours Calendar

**Domain:** Business hours settings + dynamic weekly calendar grid for a real estate ERP
**Researched:** 2026-02-25
**Confidence:** HIGH

## Recommendation Summary

**Zero new dependencies.** The existing stack already contains everything needed. The work is parametric refactoring of the custom calendar grid and a new settings form section using existing UI primitives.

## Recommended Stack

### Core Technologies (Already Installed)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js (App Router) | 15.5.12 | Server-side config fetch, page rendering | Already in use. Fetch business hours in `firmas/page.tsx` server component, pass as props to client components. No API routes needed. |
| react-hook-form | 7.71.2 | Business hours settings form | Already powers every form in the app. `useFieldArray` handles the dynamic break periods list natively. |
| Zod | 3.25.76 | Business hours JSON schema validation | Already validates all forms. Define a `businessHoursSchema` to validate the JSON before storing in SystemConfig. |
| date-fns | 4.1.0 | Time slot generation from config | Already installed. Use `parse`, `addMinutes`, `format`, `isBefore`/`isAfter` to generate 30-minute slot arrays from opening/closing times, excluding break periods. |
| radix-ui (shadcn/ui) | 1.4.3 | UI components for settings form | Switch (day toggles), Input (time fields), Button (add/remove breaks), Card, Form -- all already installed. |

### Supporting Libraries (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.1.0 | Generate time slot arrays | `generateTimeSlots(openingTime, closingTime, breaks, intervalMinutes)` utility function |
| `zustand` | 5 | N/A for this feature | Not needed -- settings are server-fetched and passed as props |
| `sonner` | 2.0.7 | Toast on config save | Already used in SystemConfigSection pattern |
| `lucide-react` | 0.500 | Icons for add/remove break buttons | `Plus`, `Trash2`, `Clock` icons |

### Development Tools (No Changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | Type safety for business hours config shape | Define `BusinessHoursConfig` type for the JSON blob |
| Prisma Studio | Inspect SystemConfig values | Useful for debugging the stored JSON |

## Installation

```bash
# No new packages needed. Zero npm installs.
# Everything required is already in the project.
```

## Key Technical Decisions

### 1. Keep the Custom Calendar Grid (Do NOT Add a Calendar Library)

**Confidence:** HIGH (direct codebase analysis)

The existing `signings-calendar.tsx` is a ~340-line custom CSS grid component that:
- Uses `grid-cols-[80px_repeat(N,1fr)]` for the weekly layout
- Has a `TIME_SLOTS` constant array for row generation
- Has a `DAY_LABELS` constant for column headers
- Already handles morning/afternoon split with a separator
- Already has tooltip integration, click-to-create, status colors

The refactor is straightforward:
1. Replace `const TIME_SLOTS = [...]` with a prop: `timeSlots: string[]`
2. Replace `const DAY_LABELS = [...]` with a prop: `enabledDays: { index: number; label: string }[]`
3. Replace `repeat(5,1fr)` with `repeat(${enabledDays.length},1fr)`
4. Replace `for (let i = 0; i < 5; i++)` with iteration over enabled day offsets
5. Generate time slots from config in the parent server component

This is parametric -- the grid structure and interaction model stay identical.

### 2. Use Native HTML `<input type="time">` for Time Inputs

**Confidence:** MEDIUM (standard HTML, but could not verify shadcn/ui docs online)

The existing shadcn/ui `<Input>` component already wraps `<input>` and supports `type="time"`. Usage:

```typescript
<Input type="time" value="09:00" onChange={...} />
```

This renders the browser's native time picker (HH:MM format). It works consistently across modern browsers, requires zero additional code, and matches the existing `"HH:MM"` string format used throughout the codebase (SigningSlot.time, the TIME_SLOTS array).

No need for a custom time picker component or third-party time picker library.

### 3. Use `useFieldArray` for Dynamic Break Periods

**Confidence:** HIGH (standard react-hook-form API, already in project)

The breaks list (e.g., "12:00-14:30", "16:00-16:30") is a classic `useFieldArray` use case:

```typescript
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "breaks",
});
```

Each break has `{ start: string; end: string }`. The UI is a list of paired time inputs with an add/remove button.

### 4. Store Config as Single JSON Value in SystemConfig

**Confidence:** HIGH (matches existing architecture exactly)

The `SystemConfig` model is a key-value store with `value: String @db.Text`. Store the entire business hours config as a single JSON string under key `"business_hours"`:

```json
{
  "openingTime": "09:00",
  "closingTime": "17:00",
  "breaks": [
    { "start": "12:00", "end": "14:30" }
  ],
  "enabledDays": [1, 2, 3, 4, 5]
}
```

The existing `systemConfigModel.set(key, value)` and `systemConfigModel.get(key)` handle this directly. `JSON.parse()` on read, `JSON.stringify()` on write.

### 5. Generate Time Slots with date-fns Utility

**Confidence:** HIGH (date-fns already installed at v4.1.0)

Create a pure utility function:

```typescript
// lib/business-hours.ts
import { parse, addMinutes, format, isWithinInterval } from "date-fns";

export function generateTimeSlots(config: BusinessHoursConfig): string[] {
  const slots: string[] = [];
  const refDate = new Date(2000, 0, 1); // arbitrary reference date
  let current = parse(config.openingTime, "HH:mm", refDate);
  const end = parse(config.closingTime, "HH:mm", refDate);

  while (current < end) {
    const timeStr = format(current, "HH:mm");
    const isInBreak = config.breaks.some((b) => {
      const breakStart = parse(b.start, "HH:mm", refDate);
      const breakEnd = parse(b.end, "HH:mm", refDate);
      return current >= breakStart && current < breakEnd;
    });
    if (!isInBreak) {
      slots.push(timeStr);
    }
    current = addMinutes(current, 30); // fixed 30-min intervals per project constraint
  }
  return slots;
}
```

This replaces the hardcoded `TIME_SLOTS` array entirely and runs server-side in the page component.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Custom CSS grid (existing) | react-big-calendar | Massive overhead (50KB+ gzipped), brings its own event model, requires CSS theme overrides to match shadcn/ui. The existing grid does exactly what's needed in 340 lines. |
| Custom CSS grid (existing) | FullCalendar | Even heavier (~100KB+), designed for general-purpose calendaring with drag-and-drop, recurring events, etc. Overkill for a fixed-interval signing schedule. |
| Custom CSS grid (existing) | @schedule-x/react | Newer but still general-purpose. Would require adapting the existing SigningRow data model and reimplementing all the custom tooltips/status colors. |
| Native `<input type="time">` | react-time-picker | Extra dependency for something the browser already does natively. The `"HH:MM"` string format is already the standard in this codebase. |
| Native `<input type="time">` | shadcn/ui time-picker (community) | Community extensions exist but are not official shadcn/ui components. Adding an unofficial component creates a maintenance burden for something a plain `<Input type="time">` handles. |
| `useFieldArray` (react-hook-form) | Manual state management for breaks | react-hook-form is already the form library. `useFieldArray` is purpose-built for dynamic lists. Manual state would mean duplicating validation logic. |
| Single JSON in SystemConfig | Separate DB table for business hours | Over-engineered for a single config record. The SystemConfig key-value pattern is already established and works perfectly for this. No migration needed. |
| date-fns slot generation | Manual loop with string comparison | date-fns is already installed and provides robust time parsing/comparison. String-based time math is error-prone (e.g., "09:30" + 30 minutes). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-big-calendar | 50KB+ bundle, incompatible event model, requires moment.js or date-fns adapter setup, would need complete restyling to match shadcn/ui | Keep existing custom grid, parameterize it |
| FullCalendar | 100KB+ bundle, complex licensing (Premium features), massive API surface for a simple weekly grid | Keep existing custom grid |
| Any time-picker library | Adds dependency for native browser capability. The `"HH:MM"` format is already the standard in the codebase. | `<Input type="time" />` |
| Separate API route for config | Unnecessary network hop. Settings page is server-rendered; fetch in the page component. | `systemConfigModel.get("business_hours")` in server component |
| Client-side config fetch in calendar | Causes loading flash, adds client-side API call. Calendar is already rendered server-side. | Fetch in `firmas/page.tsx`, pass `timeSlots` and `enabledDays` as props |
| moment.js | Deprecated for new projects, date-fns already installed | date-fns 4.1.0 (already installed) |

## Stack Patterns by Variant

**If business hours are NOT yet configured (first run, fallback):**
- Use sensible defaults: Mon-Fri, 09:00-17:00, break 12:00-14:30
- Define defaults as a constant in `lib/business-hours.ts`
- The calendar renders normally with default slots -- no error state needed

**If all days are disabled (edge case):**
- Show empty state message in calendar: "No hay dias habiles configurados"
- The settings UI should warn but not prevent saving (admin may be temporarily disabling the calendar)

**If breaks overlap or exceed opening/closing times (validation):**
- Zod schema validates at form submission: breaks must be within opening-closing range, no overlaps
- `refine()` on the Zod schema handles cross-field validation

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-hook-form@7.71.2 | React 19, Next.js 15 | `useFieldArray` works with `useActionState` pattern already used in the project |
| date-fns@4.1.0 | ESM-only | Project uses `"type": "module"`, so ESM-only date-fns v4 works fine |
| radix-ui@1.4.3 | React 19 | Unified package already installed. Switch component confirmed working. |
| Zod@3.25.76 | @hookform/resolvers@3.10.0 | Already integrated, no compatibility concerns |

## Zod Schema Design

```typescript
// schemas/business-hours.schema.ts
import { z } from "zod";

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM requerido");

const breakPeriodSchema = z.object({
  start: timeStringSchema,
  end: timeStringSchema,
}).refine((b) => b.start < b.end, {
  message: "El inicio del descanso debe ser anterior al fin",
});

export const businessHoursSchema = z.object({
  openingTime: timeStringSchema,
  closingTime: timeStringSchema,
  breaks: z.array(breakPeriodSchema).max(5, "Maximo 5 descansos"),
  enabledDays: z.array(z.number().min(0).max(6)).min(1, "Al menos un dia debe estar habilitado"),
}).refine((data) => data.openingTime < data.closingTime, {
  message: "La hora de apertura debe ser anterior a la de cierre",
  path: ["closingTime"],
}).refine((data) => {
  return data.breaks.every(
    (b) => b.start >= data.openingTime && b.end <= data.closingTime
  );
}, {
  message: "Los descansos deben estar dentro del horario laboral",
  path: ["breaks"],
});

export type BusinessHoursConfig = z.infer<typeof businessHoursSchema>;
```

## Data Flow Summary

```
[Settings Page]
  SystemConfigSection (or new BusinessHoursSection)
    -> react-hook-form + useFieldArray (breaks)
    -> Zod validation (businessHoursSchema)
    -> Server Action: JSON.stringify() -> systemConfigModel.set("business_hours", json)

[Calendar Page]
  firmas/page.tsx (server component)
    -> systemConfigModel.get("business_hours")
    -> JSON.parse() with fallback to defaults
    -> generateTimeSlots(config) -> string[]
    -> getEnabledDayLabels(config) -> {index, label}[]
    -> Pass timeSlots + enabledDays as props to SigningsView
    -> SigningsCalendar renders dynamic grid
```

## Sources

- Direct codebase analysis of `signings-calendar.tsx` (340 lines, custom grid) -- HIGH confidence
- Direct codebase analysis of `system-config-section.tsx` (react-hook-form + useActionState pattern) -- HIGH confidence
- `package.json` verified versions: Next.js 15.5.12, date-fns 4.1.0, react-hook-form 7.71.2, Zod 3.25.76, radix-ui 1.4.3 -- HIGH confidence
- `switch.tsx` component confirmed present in project -- HIGH confidence
- `systemConfigModel` key-value pattern confirmed in `system-config.model.ts` -- HIGH confidence
- react-hook-form `useFieldArray` API -- MEDIUM confidence (based on training data; standard API unlikely to have changed but web verification was unavailable)
- HTML `<input type="time">` behavior -- MEDIUM confidence (standard web platform API, but couldn't verify latest browser compat tables)

**Note:** WebSearch, WebFetch, and Brave Search were all unavailable during this research. All recommendations are derived from direct codebase analysis and training data. The MEDIUM confidence items are standard web platform and library APIs that are extremely unlikely to have changed, but are flagged per protocol.

---
*Stack research for: Configurable Business Hours Calendar (Milestone 2)*
*Researched: 2026-02-25*
