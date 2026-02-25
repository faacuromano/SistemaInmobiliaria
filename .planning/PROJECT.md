# Sistema Inmobiliaria — Milestone 2: Signing Calendar & UX Fixes

## What This Is

An ERP for managing real estate developments, lot sales, installment payments, and notary signings. Built with Next.js 15, TypeScript, PostgreSQL, and Prisma. This milestone adds configurable business hours for the signing calendar and fixes a hydration bug.

## Core Value

The signing calendar must dynamically reflect the business's actual working hours and breaks, configured by administrators — no more hardcoded time slots.

## Requirements

### Validated

- ✓ User authentication with RBAC (4 roles, dynamic permissions) — existing
- ✓ Development and lot management (CRUD, status tracking) — existing
- ✓ Person/client management (CLIENTE, PROVEEDOR, AMBOS) — existing
- ✓ Sale creation with automatic installment generation — existing
- ✓ Payment collection with dual-currency (USD/ARS) and exchange rate tracking — existing
- ✓ Extra charge (refuerzo) payment with installment recalculation — existing
- ✓ Cash movement ledger (14 types) with audit trail — existing
- ✓ Signing slot scheduling with weekly calendar view — existing
- ✓ In-app notifications and messaging — existing
- ✓ Dashboard with KPIs and statistics — existing
- ✓ System configuration (company info, SMTP, receipts) — existing
- ✓ Permission management per role — existing
- ✓ Data import from external sources — existing

### Active

- [ ] Configurable business hours in settings (opening, closing, multiple custom breaks)
- [ ] Configurable working days (enable/disable each day Mon-Sun)
- [ ] Dynamic signing calendar that reads business hours from settings
- [ ] Fix hydration mismatch in NotificationBell component

### Out of Scope

- Google Calendar sync — planned for future milestone
- Configurable slot duration — staying at fixed 30-minute intervals
- Per-day different hours — same schedule applies to all enabled days
- Lot/Person FK linking in SigningSlot — remains free-text for now

## Context

- The signing calendar currently has hardcoded time slots in `signings-calendar.tsx`: `["09:00", "09:30", "10:00", "10:30", "11:00", "14:30", "15:00", "15:30", "16:00", "16:30"]`
- Days are hardcoded to Mon-Fri only
- `SystemConfig` is a key-value table — business hours config will be stored as JSON under a new key
- The hydration error in `NotificationBell` is caused by `timeAgo()` calling `new Date()` at render time; the sibling `HeaderInfo` component already uses the correct `useState`/`useEffect` pattern
- The Radix ID mismatch in the error trace is from a browser extension, not application code

## Constraints

- **Tech stack**: Must use existing SystemConfig key-value table for settings storage
- **Slot duration**: Fixed at 30 minutes — no configurability needed
- **Compatibility**: Calendar must gracefully fall back to defaults if no business hours are configured
- **Performance**: Settings should be fetched server-side and passed as props to avoid client-side API calls

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Store business hours as JSON in SystemConfig | Avoids schema migration; flexible structure for hours + breaks + days | — Pending |
| Fixed 30-minute slot intervals | Reduces complexity; matches current calendar behavior | — Pending |
| Same schedule for all enabled days | User requested simplicity over per-day configuration | — Pending |
| Multiple custom breaks | User wants full flexibility to define any number of break periods | — Pending |

---
*Last updated: 2026-02-25 after initialization*
