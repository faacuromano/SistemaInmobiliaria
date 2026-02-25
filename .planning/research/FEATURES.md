# Feature Research

**Domain:** Configurable business hours and dynamic signing calendar for internal real estate ERP
**Researched:** 2026-02-25
**Confidence:** MEDIUM

> **Important context:** This is an **internal ERP scheduling tool** for a real estate company managing notary signing appointments, NOT a customer-facing SaaS booking system. The audience is 4-10 internal staff. This dramatically narrows the required feature set compared to products like Calendly or Cal.com.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Opening/closing time inputs | Cannot define business hours without them | LOW | Two time pickers (HH:MM). Store as `business_hours` JSON key in SystemConfig. Default: 09:00-17:00 |
| Working days toggle (Mon-Sun) | Users need to enable/disable Saturday work, skip specific days | LOW | Seven checkbox toggles. Default: Mon-Fri enabled. Stored in same JSON object |
| Multiple custom break periods | Explicitly requested; real estate offices have lunch + mate breaks | MEDIUM | Array of `{start, end, label?}` objects. Must validate no overlaps and within business hours |
| Calendar generates slots from config | Core requirement -- the entire purpose of this milestone | MEDIUM | Replace hardcoded `TIME_SLOTS` array with a function that reads config, generates 30-min slots, excludes break windows |
| Calendar shows only enabled days | Days must reflect config, not hardcoded Mon-Fri | LOW | Replace hardcoded `DAY_LABELS` / `getWeekDates()` with config-driven day list. Grid columns adjust dynamically |
| Visual break separators in calendar | Users need to see where breaks fall to understand scheduling gaps | LOW | Already exists as morning/afternoon separator. Generalize to render a separator row for each configured break |
| Graceful fallback to defaults | System must work without any config saved (first-time use, migration) | LOW | Define `DEFAULT_BUSINESS_HOURS` constant: Mon-Fri, 09:00-17:00, one break 12:00-14:00. Used when SystemConfig key is null |
| Validation: opening before closing | Prevents nonsensical "17:00-09:00" config | LOW | Zod schema validation. `openingTime < closingTime` check |
| Validation: breaks within business hours | Break at 08:00 when office opens at 09:00 makes no sense | LOW | Zod `.refine()` to check each break falls within opening-closing window |
| Validation: no overlapping breaks | Two breaks 12:00-13:00 and 12:30-14:00 would corrupt slot generation | LOW | Sort breaks by start time, check each `break[n].end <= break[n+1].start` |
| Server-side settings fetch | Avoid client-side API calls; pass config as props for SSR | LOW | Already the pattern used for SystemConfig. Fetch in `page.tsx`, pass to `SigningsCalendar` as prop |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live preview in settings UI | Admin sees exactly how calendar will look before saving; reduces trial-and-error | MEDIUM | Render a mini-calendar preview below the form that updates as inputs change. Uses same slot generation logic |
| Named breaks with labels | "Almuerzo", "Mate", "Reunion de equipo" shown in calendar separator rows | LOW | Optional `label` field on each break object. Displayed in the separator row instead of generic "Break" |
| Occupancy indicator per slot | Quick visual of how full each time slot is across the week (e.g., "2/3 signings") | MEDIUM | Count signings per slot, show a subtle badge or fill level. Helps admin spot scheduling bottlenecks |
| Quick-add from empty slot with time pre-filled | Click empty cell, form opens with date+time already set | LOW | **Already implemented.** `handleSlotClick` passes date and time to `SigningFormDialog`. Just needs to work with dynamic slots |
| Config change impact warning | When admin changes hours, warn if existing future signings fall outside new hours | MEDIUM | Query future SigningSlots, check if any `time` falls outside new config range or inside a new break. Show count in a confirmation dialog |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Configurable slot duration | "Some signings need 1 hour, others 15 min" | Massively increases calendar complexity: variable-height rows, overlapping slots, span calculations. The signing form already has `endTime` for actual duration tracking | Keep fixed 30-min grid. Signings that run longer are tracked via `endTime` field, which is already in the form. The grid is for scheduling, not duration tracking |
| Per-day different hours | "Saturday is 09:00-13:00 but weekdays are 09:00-17:00" | Doubles the config UI complexity (7 sets of hours + breaks). Calendar rendering becomes per-column instead of uniform rows. Bug surface area explodes | Same schedule for all enabled days (explicit project constraint). If Saturday needs shorter hours, disable Saturday in calendar and book signings manually via the form with free-form time |
| Google Calendar sync | "I want to see signings in my Google Calendar" | OAuth2 setup, token refresh, conflict resolution, two-way sync complexity, Google API quotas, failure modes when Google is down | Explicitly deferred to future milestone per PROJECT.md. The signing form captures all needed data internally |
| Customer self-booking portal | "Clients should pick their own signing time" | Requires public-facing auth, availability calculation, confirmation flows, cancellation policies, email notifications. Completely different product surface | This is an internal ERP. Staff books signings on behalf of clients. The form dialog is the correct UX for this context |
| Drag-and-drop rescheduling | "Drag a signing from one slot to another" | Requires complex DnD library integration, collision detection, optimistic updates, undo capability. Volume of signings (a few per week) does not justify the engineering cost | Click signing to edit, change date/time in form. Already works. Low volume makes form-based editing perfectly adequate |
| Recurring appointment templates | "We have weekly signing sessions" | Adds recurrence rules (RRULE), exception handling, series-vs-instance editing. Notary signings are inherently one-off events tied to specific sales | Each signing is a unique event. If patterns emerge, users can use the form to create them quickly with click-to-create from empty slots |
| Timezone handling | "Support multiple timezones" | Single-office company in Argentina. Adding timezone support means TZ-aware date math everywhere, user timezone preferences, display conversion | Hard-code to America/Argentina/Buenos_Aires implicitly (server and all clients are same TZ). Not a multi-tenant SaaS |

## Feature Dependencies

```
[Business Hours Config Schema (Zod)]
    |
    +--requires--> [SystemConfig Storage (JSON key)]
    |                  |
    |                  +--requires--> [Settings UI Form]
    |                  |
    |                  +--requires--> [Server-side Config Fetch]
    |                                     |
    |                                     +--requires--> [Dynamic Slot Generation]
    |                                                        |
    |                                                        +--requires--> [Calendar Renders Dynamic Slots]
    |                                                        |
    |                                                        +--requires--> [Calendar Shows Dynamic Days]
    |                                                        |
    |                                                        +--requires--> [Break Separators in Calendar]
    |
    +--enhances--> [Live Preview in Settings]
    |
    +--enhances--> [Config Change Impact Warning]

[Default Fallback Values]
    |
    +--required-by--> [Dynamic Slot Generation] (when no config exists)
    +--required-by--> [Calendar Renders Dynamic Slots]
```

### Dependency Notes

- **Zod Schema is the foundation:** Everything flows from the validated business hours data structure. Build this first.
- **SystemConfig storage before UI:** The model layer for reading/writing the JSON config must exist before building the settings form or the calendar consumer.
- **Server-side fetch before calendar:** The calendar component receives config as props from `page.tsx`. The fetch mechanism must work before the calendar can consume it.
- **Slot generation is the critical algorithm:** A pure function `generateTimeSlots(config) => string[]` that replaces the hardcoded `TIME_SLOTS` array. This is the single most important piece of logic.
- **Default fallback is a safety net:** Must be defined alongside the slot generation logic so the app works without any saved config.
- **Live preview and impact warning are independent enhancers:** They consume the same Zod schema and slot generation logic but do not block any core features.

## MVP Definition

### Launch With (v1 -- This Milestone)

Minimum viable product -- what is needed to replace hardcoded calendar behavior.

- [x] Business hours Zod schema with opening, closing, breaks, enabled days
- [x] Store/retrieve `business_hours` JSON key in SystemConfig
- [x] Settings UI card for business hours (time pickers, day toggles, break list)
- [x] Default fallback constant (`DEFAULT_BUSINESS_HOURS`)
- [x] `generateTimeSlots(config)` pure function (30-min slots, excluding breaks)
- [x] `getEnabledWeekDates(config, weekStart)` function replacing hardcoded 5-day generation
- [x] Calendar renders dynamic slots and dynamic days from config
- [x] Break separator rows generated from config (not hardcoded morning/afternoon)
- [x] Validation: opening < closing, breaks within hours, no overlapping breaks
- [x] Server-side config fetch in `firmas/page.tsx`, passed as props

### Add After Validation (v1.x)

Features to add once core is working and users have provided feedback.

- [ ] Live preview in settings UI -- add when admins report confusion about how config changes affect calendar
- [ ] Config change impact warning -- add when there is evidence of signings orphaned outside new hours
- [ ] Named break labels -- add when users request distinguishing between different break types
- [ ] Occupancy indicator per slot -- add when scheduling volume increases and admins need density visibility

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Google Calendar sync -- explicit future milestone per PROJECT.md
- [ ] Per-day different hours -- only if uniform schedule proves genuinely insufficient
- [ ] Holiday/exception days -- only if recurring national holidays cause booking confusion
- [ ] Lot/Person FK linking in SigningSlot -- remains free-text per PROJECT.md scope

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Business hours Zod schema | HIGH | LOW | P1 |
| SystemConfig JSON storage | HIGH | LOW | P1 |
| Settings UI card (hours/days/breaks) | HIGH | MEDIUM | P1 |
| Default fallback constant | HIGH | LOW | P1 |
| `generateTimeSlots()` function | HIGH | LOW | P1 |
| Dynamic day generation | HIGH | LOW | P1 |
| Calendar renders from config | HIGH | MEDIUM | P1 |
| Dynamic break separators | MEDIUM | LOW | P1 |
| Input validation (Zod refines) | MEDIUM | LOW | P1 |
| Server-side fetch + props | HIGH | LOW | P1 |
| Live preview in settings | MEDIUM | MEDIUM | P2 |
| Config change impact warning | MEDIUM | MEDIUM | P2 |
| Named break labels | LOW | LOW | P2 |
| Occupancy indicator | LOW | MEDIUM | P3 |
| Google Calendar sync | MEDIUM | HIGH | P3 (future milestone) |

**Priority key:**
- P1: Must have for this milestone launch
- P2: Should have, add based on user feedback
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Calendly/Cal.com (SaaS booking) | Google Calendar | This App (Internal ERP) |
|---------|--------------------------------|-----------------|------------------------|
| Business hours config | Per-user availability windows | Working hours in settings | Global company hours in SystemConfig |
| Break periods | "Buffer time" before/after events | N/A (free-form) | Multiple named break periods |
| Working days | Per-user day selection | Workweek start setting | Global Mon-Sun toggles |
| Slot duration | Configurable per event type | N/A (free-form) | Fixed 30-min (intentional simplification) |
| Per-day hours | Fully supported | Supported | Explicitly out of scope (same hours all days) |
| Visual calendar | Complex multi-view (day/week/month) | Full featured | Weekly grid view (sufficient for signing volume) |
| Self-booking | Core feature (public links) | N/A | Anti-feature (internal staff books all) |
| Timezone | Per-attendee TZ handling | Full TZ support | Single TZ (Argentina), implicit |

**Key insight:** SaaS booking tools are designed for high-volume, multi-user, public-facing scheduling. This app needs a fraction of that complexity. The weekly grid calendar with admin-configured hours is the right level of sophistication for an internal notary signing schedule.

## Sources

- Codebase analysis of `signings-calendar.tsx`, `signings-view.tsx`, `signing-form-dialog.tsx`, `system-config-section.tsx`, `system-config.actions.ts`, `system-config.model.ts`, `system-config.schema.ts`, `schema.prisma` (SigningSlot model, SystemConfig model)
- PROJECT.md constraints and requirements
- Domain knowledge of scheduling systems (MEDIUM confidence -- no external sources available to verify)

---
*Feature research for: Configurable business hours and dynamic signing calendar*
*Researched: 2026-02-25*
