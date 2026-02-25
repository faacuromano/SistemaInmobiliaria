# Architecture Research

**Research Date:** 2026-02-25
**Dimension:** Architecture
**Context:** Adding configurable business hours and dynamic signing calendar to existing real estate ERP

## Component Structure

### New Components

| Component | Location | Type | Purpose |
|-----------|----------|------|---------|
| `BusinessHoursSection` | `src/app/(dashboard)/configuracion/_components/` | Client | Settings UI for hours/breaks/days config |
| `generateTimeSlots()` | `src/lib/business-hours.ts` | Utility | Pure function: config → string[] of time slots |
| `getEnabledDayLabels()` | `src/lib/business-hours.ts` | Utility | Pure function: config → day labels + indices |
| `businessHoursSchema` | `src/schemas/business-hours.schema.ts` | Schema | Zod validation for business hours config |
| `getBusinessHours()` | `src/server/actions/config.actions.ts` | Action | Read config from SystemConfig |
| `updateBusinessHours()` | `src/server/actions/config.actions.ts` | Action | Write config to SystemConfig |

### Modified Components

| Component | Location | Change |
|-----------|----------|--------|
| `SigningsCalendar` | `src/app/(dashboard)/firmas/_components/signings-calendar.tsx` | Replace hardcoded TIME_SLOTS/DAY_LABELS with props |
| `firmas/page.tsx` | `src/app/(dashboard)/firmas/page.tsx` | Fetch business hours config server-side |
| `signings-view.tsx` | `src/app/(dashboard)/firmas/_components/signings-view.tsx` | Pass config props through |
| `NotificationBell` | `src/components/shared/notification-bell.tsx` | Defer timeAgo to post-hydration |
| `configuracion/page.tsx` | `src/app/(dashboard)/configuracion/page.tsx` | Add BusinessHoursSection tab |

## Data Flow

### Business Hours Config Storage

```
SystemConfig table (key-value)
  key: "business_hours"
  value: JSON string →
  {
    "openingTime": "09:00",
    "closingTime": "17:00",
    "breaks": [
      { "label": "Almuerzo", "startTime": "12:00", "endTime": "14:00" }
    ],
    "enabledDays": [1, 2, 3, 4, 5]  // 0=Sun, 1=Mon, ..., 6=Sat
  }
```

### Settings Save Flow

```
BusinessHoursSection (client form)
  → react-hook-form with useFieldArray for breaks
  → Zod validation (businessHoursSchema)
  → updateBusinessHours(config) server action
  → systemConfigModel.set("business_hours", JSON.stringify(config))
  → revalidatePath("/firmas")
  → revalidatePath("/configuracion")
```

### Calendar Render Flow

```
firmas/page.tsx (server component)
  → getBusinessHours() → systemConfigModel.get("business_hours")
  → JSON.parse() with fallback to DEFAULT_BUSINESS_HOURS
  → generateTimeSlots(config) → ["09:00", "09:30", ..., "16:30"]
  → getEnabledDayLabels(config) → [{ index: 1, label: "Lunes" }, ...]
  → Pass timeSlots + dayConfig as props to <SigningsView>
  → <SigningsCalendar timeSlots={...} dayConfig={...} />
  → Dynamic CSS grid: gridTemplateColumns = `80px repeat(${dayCount}, 1fr)`
```

### Slot Generation Algorithm

```typescript
function generateTimeSlots(config: BusinessHoursConfig): string[] {
  const slots: string[] = [];
  let current = parseTime(config.openingTime); // e.g., 540 (minutes)
  const end = parseTime(config.closingTime);    // e.g., 1020

  while (current < end) {
    const timeStr = formatTime(current); // "09:00"
    const inBreak = config.breaks.some(b =>
      current >= parseTime(b.startTime) && current < parseTime(b.endTime)
    );
    if (!inBreak) slots.push(timeStr);
    current += 30; // fixed 30-min intervals
  }
  return slots;
}
```

## Build Order

```
Phase 1: Foundation (types, schema, defaults, utilities)
    ↓
Phase 2: Server Layer (getBusinessHours, updateBusinessHours)
    ↓
Phase 3: Settings UI (BusinessHoursSection in configuracion)
    ↓
Phase 4: Calendar Integration (dynamic SigningsCalendar)
    ↓
Phase 5: Hydration Fix (NotificationBell — independent, can parallel)
```

Each phase depends on the previous one (except Phase 5). This ordering ensures each layer can be tested independently before integration.

## Anti-Patterns to Avoid

- Do NOT store generated slots in the database (compute at render time)
- Do NOT fetch config client-side (causes flash of defaults)
- Do NOT use separate SystemConfig keys for each setting (breaks array can't be represented)
- Do NOT mix business hours into the existing flat config form
- Do NOT hardcode grid column count while making days dynamic (use inline style)
- Do NOT use dynamic Tailwind classes for grid columns (they get purged at build time)

## Default Fallback

When no `business_hours` key exists in SystemConfig (fresh install), use:

```typescript
const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  openingTime: "09:00",
  closingTime: "17:00",
  breaks: [{ label: "Mediodía", startTime: "12:00", endTime: "14:00" }],
  enabledDays: [1, 2, 3, 4, 5], // Mon-Fri
};
```

This matches the current hardcoded behavior, ensuring zero disruption on upgrade.

---

*Research completed: 2026-02-25*
