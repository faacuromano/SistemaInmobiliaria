# Milestones

## v1.0 Delivery Hardening (Shipped: 2026-02-26)

**Phases completed:** 4 phases, 9 plans
**Timeline:** 2 days (2026-02-25 → 2026-02-26)
**Files modified:** 90 | **Lines of code:** ~69,500 TypeScript/TSX
**Requirements:** 29/29 complete

**Key accomplishments:**
1. Vitest test infrastructure with shared helpers — auth mock, Prisma mock, financial precision assertions
2. Financial logic test suite covering installment generation date edge cases, preview/generator parity, and recalculation guards
3. Integration tests for sale and payment server actions including partial-failure recovery path (ACT-06)
4. All delivery gates passing — `tsc --noEmit`, `npm run lint`, `npm run build` zero errors
5. Lot grid redesigned with manzana grouping, collapsible sections, white-card status borders, and localStorage view persistence
6. Detail panel with sale fields (price, currency, date), mobile bottom Sheet drawer, and @media print view

---


## v1.1 Bug Fixes & UX Polish (Shipped: 2026-02-26)

**Phases completed:** 3 phases, 4 plans, 8 tasks
**Timeline:** 2 days (2026-02-25 → 2026-02-26)
**Files modified:** 37 | **Lines added:** 6,149
**Requirements:** 10/10 complete

**Key accomplishments:**
1. Fixed dialog spacing (lot + message dialogs) and status-reset bug on sold lots using hidden input pattern
2. Overhauled Estadisticas with filterable monthly movements table, color-coded type badges, and proportional PARCIAL collection rate
3. Added Google Maps URL field to developments (Prisma → Zod → form → detail page with clickable external link)
4. Redesigned Person detail page with unified contact card, month-grouped payment history, and professional table design
5. Added bulk lot editing with checkbox selection, floating actions bar, tag assignment dialog, and status changes with sales guards

---

