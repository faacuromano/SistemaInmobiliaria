# Phase 2: Dynamic Signing Calendar - Research

**Researched:** 2026-02-25
**Domain:** Calendar UI rendering driven by server-side business hours configuration
**Confidence:** HIGH

## Summary

Phase 2 replaces the hardcoded `TIME_SLOTS`, `DAY_LABELS`, and morning/afternoon separator in the signing calendar with values dynamically generated from the `BusinessHoursConfig` produced by Phase 1's `getBusinessHours()` server action. The calendar component (`signings-calendar.tsx`) currently uses a static array of 10 time slots, a fixed 5-day (Mon-Fri) layout, and a hardcoded "MEDIOD." divider. All three must become dynamic. Additionally, the week navigation in `signings-view.tsx` and the `getSigningsByWeek` server action both assume a fixed Monday-to-Friday range, which must adapt to the configured enabled days.

This is primarily a **refactoring phase** -- no new libraries, no schema changes, no new database models. The work involves: (1) piping `BusinessHoursConfig` from the server to the calendar component, (2) generating time slots and day columns from that config, (3) rendering break separators from the config's `breaks` array, (4) detecting and marking "out of hours" signings, and (5) adjusting the date range calculations for week navigation.

**Primary recommendation:** Create a pure utility function `generateTimeSlots(config: BusinessHoursConfig)` in `src/lib/business-hours.ts` that produces the slot list and break insertion points. Consume it in the calendar component. Pass `BusinessHoursConfig` as a prop from the server page component where `getBusinessHours()` is already callable.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DCAL-01 | Signing calendar renders time slots generated from business hours config (30-min intervals) | `generateTimeSlots()` utility produces `string[]` from `openingTime`/`closingTime`, excluding break ranges. Calendar replaces static `TIME_SLOTS` with this output. See Architecture Pattern 1. |
| DCAL-02 | Calendar shows only enabled days (dynamic column count, not hardcoded 5) | `enabledDays` array drives column count. `getWeekDates()` filters to only enabled day-of-week values. Grid template uses dynamic `repeat(N, 1fr)`. See Architecture Pattern 2. |
| DCAL-03 | Break periods appear as visual separator rows with their labels | `generateTimeSlots()` returns break metadata alongside slots. Calendar renders `BreakRow` components between slot groups. See Architecture Pattern 3. |
| DCAL-04 | Existing signings at times outside configured hours are still visible with "out of hours" indicator | After rendering configured slots, scan `signings` for entries whose `time` does not match any generated slot. Render them in a separate "Fuera de horario" section or append extra rows with a visual indicator. See Architecture Pattern 4. |
| DCAL-05 | Week navigation and date range queries adapt to configured days | `getSigningsByWeek()` must compute date range from first to last enabled day of the week. `getWeekDates()` in the view must produce only enabled-day dates. `formatWeekRange()` must adapt. See Architecture Pattern 5. |
</phase_requirements>

## Standard Stack

### Core

No new libraries required. This phase uses only what is already installed.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 (App Router) | Server component data fetching for `getBusinessHours()` | Already in use; server actions provide config data |
| React | 19 | Client component rendering | Already in use |
| TypeScript | 5.x | Type safety for `BusinessHoursConfig` contract | Already in use |
| Tailwind CSS | 4.x | Dynamic grid columns, conditional styling | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Tooltip | existing | Tooltip for "out of hours" indicator | Already used in `SigningCell` component |
| lucide-react | existing | Icon for "out of hours" badge if needed | Already in use project-wide |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure utility function for slot generation | A dedicated calendar library (e.g., @fullcalendar/react) | Overkill -- the current custom grid is lightweight and sufficient. A library would add bundle size for features not needed. |
| Inline slot computation in component | Computed in server action and passed as data | Server-side computation would mean the utility runs only on the server. Either works, but keeping it as a shared utility in `src/lib/` allows reuse by both server and client code. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── business-hours.ts          # ADD: generateTimeSlots(), getEnabledWeekDates() utilities
├── server/
│   └── actions/
│       ├── business-hours.actions.ts  # EXISTING: getBusinessHours() -- no changes needed
│       └── signing.actions.ts         # MODIFY: getSigningsByWeek() to accept enabledDays
├── app/(dashboard)/firmas/
│   ├── page.tsx                    # MODIFY: fetch businessHours, pass to SigningsView
│   └── _components/
│       ├── signings-calendar.tsx   # MODIFY: accept config prop, use generateTimeSlots()
│       └── signings-view.tsx       # MODIFY: accept config prop, adapt week navigation
```

### Pattern 1: Time Slot Generation (DCAL-01)

**What:** A pure function that takes `BusinessHoursConfig` and returns an array of time strings at 30-minute intervals, skipping times that fall within break periods.

**When to use:** Called once per render in the calendar component (memoized with `useMemo`).

**Example:**
```typescript
// src/lib/business-hours.ts

export interface CalendarSlotGroup {
  type: "slots";
  slots: string[];  // e.g., ["09:00", "09:30", "10:00", ...]
}

export interface CalendarBreakGroup {
  type: "break";
  label: string;
  startTime: string;
  endTime: string;
}

export type CalendarSegment = CalendarSlotGroup | CalendarBreakGroup;

/**
 * Generate calendar segments from business hours config.
 * Produces alternating slot groups and break separators.
 *
 * Example output for 09:00-17:00 with lunch 12:00-14:00:
 * [
 *   { type: "slots", slots: ["09:00","09:30","10:00","10:30","11:00","11:30"] },
 *   { type: "break", label: "Mediodia", startTime: "12:00", endTime: "14:00" },
 *   { type: "slots", slots: ["14:00","14:30","15:00","15:30","16:00","16:30"] },
 * ]
 */
export function generateCalendarSegments(config: BusinessHoursConfig): CalendarSegment[] {
  const { openingTime, closingTime, breaks } = config;
  const sortedBreaks = [...breaks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const segments: CalendarSegment[] = [];
  let cursor = openingTime;

  for (const brk of sortedBreaks) {
    // Slots before this break
    const slotsBeforeBreak = generateSlotRange(cursor, brk.startTime);
    if (slotsBeforeBreak.length > 0) {
      segments.push({ type: "slots", slots: slotsBeforeBreak });
    }
    // The break itself
    segments.push({ type: "break", label: brk.label, startTime: brk.startTime, endTime: brk.endTime });
    cursor = brk.endTime;
  }

  // Slots after last break (or all slots if no breaks)
  const remainingSlots = generateSlotRange(cursor, closingTime);
  if (remainingSlots.length > 0) {
    segments.push({ type: "slots", slots: remainingSlots });
  }

  return segments;
}

function generateSlotRange(from: string, to: string): string[] {
  const slots: string[] = [];
  let [h, m] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);

  while (h < toH || (h === toH && m < toM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h += 1; m -= 60; }
  }
  return slots;
}
```

### Pattern 2: Dynamic Day Columns (DCAL-02)

**What:** The calendar grid uses `enabledDays` to determine which days to show and how many columns to render.

**When to use:** In `signings-calendar.tsx` header and grid row templates.

**Key insight:** `enabledDays` uses JS `Date.getDay()` convention (0=Sun, 1=Mon, ..., 6=Sat). The current code always starts from Monday and shows 5 days. The new code must:
1. Sort `enabledDays` to determine display order
2. For a given week, compute the actual `Date` for each enabled day
3. Use `grid-cols-[80px_repeat(${enabledDays.length},1fr)]` for the grid template

**Example:**
```typescript
// src/lib/business-hours.ts

const DAY_NAMES: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes",
  3: "Miercoles", 4: "Jueves", 5: "Viernes", 6: "Sabado",
};

/**
 * Get the dates for enabled days within a week starting from weekStart (Monday).
 * enabledDays: [1,2,3,4,5] -> Mon-Fri dates
 * enabledDays: [1,3,5] -> Mon, Wed, Fri dates
 * enabledDays: [1,2,3,4,5,6] -> Mon-Sat dates
 */
export function getEnabledWeekDates(
  weekStart: Date,  // Always the Monday of the week
  enabledDays: number[]
): { date: Date; dayOfWeek: number; label: string }[] {
  const sorted = [...enabledDays].sort((a, b) => a - b);
  const monday = new Date(weekStart);
  monday.setHours(0, 0, 0, 0);

  return sorted.map((dayOfWeek) => {
    // Monday=1 -> offset 0, Tuesday=2 -> offset 1, ..., Sunday=0 -> offset 6
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return { date, dayOfWeek, label: DAY_NAMES[dayOfWeek] };
  });
}
```

**Grid template consideration:** Tailwind does not support arbitrary dynamic `grid-cols` via string interpolation in class names (classes must exist at build time). Use inline `style` for the grid template:

```tsx
<div style={{ gridTemplateColumns: `80px repeat(${dayCount}, 1fr)` }} className="grid border-b">
```

### Pattern 3: Break Separator Rows (DCAL-03)

**What:** Instead of a single hardcoded "MEDIOD." separator between morning and afternoon, render one separator row per break from the config.

**When to use:** In the calendar body, between slot groups.

**Example:**
```tsx
{segments.map((segment, i) => {
  if (segment.type === "break") {
    return (
      <div
        key={`break-${i}`}
        style={{ gridTemplateColumns: `80px repeat(${dayCount}, 1fr)` }}
        className="grid border-y-2 border-border/60"
      >
        <div className="p-1 text-[10px] font-medium text-muted-foreground/60 text-center border-r border-border">
          {segment.label} {segment.startTime}-{segment.endTime}
        </div>
        {enabledDates.map((_, j) => (
          <div key={j} className="p-1 border-r border-border last:border-r-0 bg-muted/30" />
        ))}
      </div>
    );
  }
  // type === "slots" -> render CalendarRow for each slot
  return segment.slots.map((time) => (
    <CalendarRow key={time} time={time} ... />
  ));
})}
```

### Pattern 4: Out-of-Hours Signings (DCAL-04)

**What:** Signings whose `time` field does not match any generated slot must still be visible, with a visual "fuera de horario" indicator.

**When to use:** After rendering the main calendar grid, check for unmatched signings.

**Key insight:** The simplest approach is:
1. Collect all generated slot times into a `Set<string>`
2. Filter the week's signings to find those whose `time` is NOT in the set
3. For each out-of-hours signing, either:
   - (a) Insert extra rows at the appropriate chronological position with a distinct style, OR
   - (b) Append them in a dedicated "Fuera de horario" section below the main grid

**Recommendation:** Option (a) is better UX -- inserting them chronologically keeps the timeline intuitive. Mark them with a distinctive background (e.g., dashed border, orange/yellow tint) and a small badge or tooltip: "Fuera de horario configurado".

**Example approach:**
```typescript
// Compute all valid slot times as a Set
const allSlotTimes = new Set(
  segments.flatMap(s => s.type === "slots" ? s.slots : [])
);

// Find out-of-hours signings
const outOfHoursSignings = signings.filter(s => !allSlotTimes.has(s.time));

// Collect unique out-of-hours times
const extraTimes = [...new Set(outOfHoursSignings.map(s => s.time))].sort();
```

Then render `CalendarRow` for each `extraTime` with an `isOutOfHours` flag that applies the visual indicator styling.

### Pattern 5: Adaptive Week Navigation (DCAL-05)

**What:** The week query range and displayed dates must match enabled days only.

**Where changes are needed:**

1. **`getSigningsByWeek()` in `signing.actions.ts`**: Currently adds 4 days to Monday (Mon-Fri). Must accept `enabledDays` and compute `from` as the earliest enabled day's date and `to` as the latest enabled day's date in the week.

2. **`getWeekDates()` in `signings-calendar.tsx`**: Replace with `getEnabledWeekDates()` from the utility.

3. **`formatWeekRange()` in `signings-view.tsx`**: Must compute range from first to last enabled day of the week, not hardcoded Monday-Friday.

4. **`getMonday()` in both `page.tsx` and `signings-view.tsx`**: The "anchor" for a week remains Monday (standard ISO week start). This should NOT change -- Monday is used as the reference point, and enabled days are computed relative to it.

**Example for the server action:**
```typescript
export async function getSigningsByWeek(weekStart: string, enabledDays: number[]) {
  await requirePermission("signings:view");
  const monday = new Date(weekStart);

  const sorted = [...enabledDays].sort((a, b) => a - b);
  const firstDay = sorted[0]; // e.g., 1 for Monday
  const lastDay = sorted[sorted.length - 1]; // e.g., 6 for Saturday

  const firstOffset = firstDay === 0 ? 6 : firstDay - 1;
  const lastOffset = lastDay === 0 ? 6 : lastDay - 1;

  const from = new Date(monday);
  from.setDate(monday.getDate() + firstOffset);

  const to = new Date(monday);
  to.setDate(monday.getDate() + lastOffset);
  to.setHours(23, 59, 59, 999);

  return signingModel.findByDateRange(from, to);
}
```

### Anti-Patterns to Avoid

- **Hardcoding column count in Tailwind classes:** `grid-cols-[80px_repeat(5,1fr)]` will not work for dynamic day counts. Use inline `style={{ gridTemplateColumns: ... }}` instead.
- **Computing slots inside the render tree without memoization:** `generateCalendarSegments()` should be wrapped in `useMemo` with `config` as the dependency to avoid recomputation on every render.
- **Filtering out out-of-hours signings:** The requirement explicitly states these must remain visible. Never filter them from the data -- always display them with an indicator.
- **Changing the week anchor away from Monday:** Even if Sunday is enabled, the week anchor should remain Monday for consistency with `getMonday()` usage throughout the app. Sunday would simply be rendered as the last column (offset 6 from Monday).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time slot generation at 30-min intervals | Manual string formatting in the component | `generateCalendarSegments()` utility function | Centralizes logic, testable in isolation, reusable for future features (e.g., slot restrictions in the form) |
| Day-of-week to date mapping | Ad-hoc arithmetic scattered across components | `getEnabledWeekDates()` utility function | The offset calculation (especially Sunday = 0 mapping to offset 6) is error-prone when duplicated |
| Dynamic Tailwind grid columns | `cn("grid-cols-[80px_repeat(3,1fr)]", ...)` conditional classes | Inline `style={{ gridTemplateColumns }}` | Tailwind purges classes not present at build time; dynamic interpolation breaks the purge |

**Key insight:** The complexity in this phase is not in any single operation but in the coordination between five interrelated changes. A utility layer (`generateCalendarSegments` + `getEnabledWeekDates`) cleanly separates computation from rendering and makes the calendar component a straightforward consumer.

## Common Pitfalls

### Pitfall 1: Sunday (day 0) Offset Calculation
**What goes wrong:** `Date.getDay()` returns 0 for Sunday, but the week layout starts from Monday (offset 0). Naive arithmetic like `dayOfWeek - 1` gives -1 for Sunday.
**Why it happens:** JS `Date.getDay()` is zero-indexed from Sunday, not Monday.
**How to avoid:** Always use the formula: `const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;` -- This maps Monday=0, Tuesday=1, ..., Sunday=6 relative to Monday.
**Warning signs:** Sunday column appears before Monday, or dates are off by one.

### Pitfall 2: Tailwind Dynamic Class Purging
**What goes wrong:** Using `grid-cols-[80px_repeat(${N},1fr)]` in a className results in the class being purged at build time because Tailwind cannot statically analyze the template literal.
**Why it happens:** Tailwind scans source files for class strings at build time; dynamic interpolation produces strings it never sees.
**How to avoid:** Use inline `style` for the grid template column definition. Keep Tailwind for everything else (borders, padding, colors).
**Warning signs:** Grid renders as a single column or falls back to default layout.

### Pitfall 3: Empty Slot Groups
**What goes wrong:** If a break starts exactly at `openingTime` or ends exactly at `closingTime`, the slot generation produces empty arrays, leading to empty `CalendarSlotGroup` segments.
**Why it happens:** Edge case in the range generation -- `generateSlotRange("09:00", "09:00")` returns `[]`.
**How to avoid:** Filter out empty slot groups: `if (slotsBeforeBreak.length > 0)` before pushing to segments.
**Warning signs:** Blank spaces in the calendar where slots should be, or React key warnings from empty arrays.

### Pitfall 4: Stale Config After Settings Change
**What goes wrong:** Admin changes business hours, but the calendar page still shows old slots until a hard refresh.
**Why it happens:** The `updateBusinessHours` action already calls `revalidatePath("/firmas")`, which triggers a server-side refetch. However, if the calendar component caches config client-side (e.g., in state), it would become stale.
**How to avoid:** Pass `BusinessHoursConfig` as a prop from the server component. Do NOT store it in client state. The server component re-fetches on every navigation thanks to `revalidatePath`.
**Warning signs:** Settings show new hours, but calendar shows old layout. Fixed by hard refresh.

### Pitfall 5: Out-of-Hours Detection with Time Precision
**What goes wrong:** A signing at "09:15" (not on a 30-min boundary) would never match any generated slot, appearing as "out of hours" even though 09:15 falls within business hours.
**Why it happens:** The slot generation produces only 30-min boundary times (09:00, 09:30, ...). Signings can have arbitrary times.
**How to avoid:** Out-of-hours detection should check whether the signing time falls within the business hours range AND outside break periods, not just whether it matches a slot exactly. If a signing is within business hours but not on a slot boundary, it should be rendered in the nearest slot row (or its own row without the "out of hours" indicator). However, for existing data in this system, the old `TIME_SLOTS` only allowed 30-min boundary times, so this edge case is unlikely in practice. Still, defensively check range rather than exact set membership.
**Warning signs:** Signings show "out of hours" despite being within configured hours.

## Code Examples

### Data Flow: Server Page to Calendar Component

```typescript
// src/app/(dashboard)/firmas/page.tsx
import { getBusinessHours } from "@/server/actions/business-hours.actions";

export default async function FirmasPage({ searchParams }: Props) {
  const session = await requirePermission("signings:view");
  const params = await searchParams;
  const weekStart = params.week || getMonday(new Date());

  const [signings, businessHours, weekSignings, developments, sellers] = await Promise.all([
    getSignings({ ... }),
    getBusinessHours(),
    getSigningsByWeek(weekStart, businessHours.enabledDays), // NOTE: need to restructure
    getDevelopments(),
    getActiveSellers(),
  ]);

  // Since getSigningsByWeek needs businessHours.enabledDays, and Promise.all runs in parallel,
  // we need to either:
  // (a) Fetch businessHours first, then the rest in parallel, or
  // (b) Keep getSigningsByWeek fetching Mon-Sat (full possible range) and filter client-side
  //
  // Option (b) is simpler and avoids a waterfall. The date range Mon-Sun is small (7 days).

  return (
    <SigningsView
      signings={signings}
      weekSignings={weekSignings}
      canManage={canManage}
      developments={developmentOptions}
      sellers={sellerOptions}
      initialWeekStart={weekStart}
      businessHours={businessHours}  // NEW PROP
    />
  );
}
```

### Calendar Component Refactored Skeleton

```tsx
// signings-calendar.tsx (simplified refactored structure)

interface Props {
  signings: SigningRow[];
  weekStart: Date;
  canManage: boolean;
  businessHours: BusinessHoursConfig;
  onSlotClick?: (date: Date, time: string) => void;
  onSigningClick?: (signing: SigningRow) => void;
}

export function SigningsCalendar({ signings, weekStart, canManage, businessHours, ... }: Props) {
  const enabledDates = useMemo(
    () => getEnabledWeekDates(weekStart, businessHours.enabledDays),
    [weekStart, businessHours.enabledDays]
  );

  const segments = useMemo(
    () => generateCalendarSegments(businessHours),
    [businessHours]
  );

  const dayCount = enabledDates.length;
  const gridCols = `80px repeat(${dayCount}, 1fr)`;

  // ... render header, segments, out-of-hours rows
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `TIME_SLOTS` array (10 entries) | Dynamic generation from `BusinessHoursConfig` | Phase 2 (this phase) | All calendar slots derived from config |
| Hardcoded `DAY_LABELS` (Mon-Fri) | Dynamic columns from `enabledDays` | Phase 2 (this phase) | Variable column count |
| Hardcoded "MEDIOD." separator | Dynamic break separators from `breaks[]` | Phase 2 (this phase) | Multiple labeled breaks possible |
| `getSigningsByWeek` assumes Mon-Fri (5 days) | Date range adapts to enabled days | Phase 2 (this phase) | Correct queries for any day combination |

**Deprecated/outdated:**
- `TIME_SLOTS` constant: Replaced entirely by `generateCalendarSegments()`
- `DAY_LABELS` constant: Replaced by `getEnabledWeekDates()` labels
- `morningSlots`/`afternoonSlots` filter logic: Replaced by segment-based rendering
- Hardcoded `grid-cols-[80px_repeat(5,1fr)]`: Replaced by inline style with dynamic count

## Open Questions

1. **Week range query optimization**
   - What we know: `getSigningsByWeek()` currently queries Mon-Fri. It needs to adapt to enabled days.
   - What's unclear: Should the server action accept `enabledDays` as a parameter, or should it always query the full Mon-Sun range and let the UI filter? The latter avoids a waterfall in `Promise.all` but fetches slightly more data.
   - Recommendation: Query the full Mon-Sun range (7 days). The extra data is minimal (at most 2 extra days of signings), and it avoids the need to restructure the `Promise.all` call or make `getBusinessHours()` a blocking dependency. It also naturally handles the DCAL-04 requirement (out-of-hours signings on disabled days would still be fetched).

2. **Out-of-hours display strategy**
   - What we know: Signings outside configured hours must be visible. Two approaches: (a) insert extra rows inline, (b) separate section.
   - What's unclear: User preference for visual treatment.
   - Recommendation: Insert extra rows at their chronological time position with a distinct dashed-border/amber background style and "Fuera de horario" label. This keeps the timeline linear and intuitive. If there are signings on a disabled day, they would appear only in the list view (not calendar), since that day has no column. However, since `getSigningsByWeek` would fetch the full week, we should consider whether to show a column for a disabled day if it has existing signings. The safest approach: always show only enabled days as columns, and add a small info banner "X firmas en dias no habilitados esta semana" linking to the list view.

3. **Break rendering when break lands exactly on slot boundary**
   - What we know: Breaks like 12:00-14:00 cleanly start/end on 30-min boundaries.
   - What's unclear: What if an admin configures a break like 12:15-13:45 (not on a 30-min boundary)?
   - Recommendation: The slot generation should still work -- it generates slots up to the break start and resumes from the break end. A slot at 12:00 would be generated (since 12:00 < 12:15), and the next slot after the break would be 14:00 (the first 30-min boundary >= 13:45). This is correct behavior. The break row would display "12:15-13:45". No special handling needed.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of all source files:
  - `src/app/(dashboard)/firmas/_components/signings-calendar.tsx` - Current hardcoded calendar implementation
  - `src/app/(dashboard)/firmas/_components/signings-view.tsx` - Week navigation and view switching
  - `src/app/(dashboard)/firmas/page.tsx` - Server component data fetching
  - `src/server/actions/signing.actions.ts` - `getSigningsByWeek()` with hardcoded Mon-Fri range
  - `src/server/models/signing.model.ts` - Prisma date range queries
  - `src/lib/business-hours.ts` - `BusinessHoursConfig` type and `DEFAULT_BUSINESS_HOURS`
  - `src/server/actions/business-hours.actions.ts` - `getBusinessHours()` server action
  - `src/schemas/business-hours.schema.ts` - Zod validation schema
  - `prisma/schema.prisma` - `SigningSlot` model with `date`, `time`, `endTime` fields

### Secondary (MEDIUM confidence)
- **Tailwind CSS dynamic classes** - Well-known limitation: Tailwind purges dynamically-constructed class names at build time. Inline `style` is the standard workaround for truly dynamic values like `gridTemplateColumns`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, pure refactoring of existing code
- Architecture: HIGH - All patterns derived from direct codebase analysis; changes are constrained and well-understood
- Pitfalls: HIGH - All pitfalls identified from reading the actual code and understanding JS Date/Tailwind behavior

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable -- no external dependencies to drift)
