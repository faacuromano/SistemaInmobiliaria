# Phase 4: Delivery Gates and Lot Grid - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Two concerns: (1) Automated build quality gates — tsc, lint, and build must pass with zero errors. (2) Lot grid redesign — lots grouped by manzana with color-coded status badges, detail panel on click, mobile Sheet drawer, localStorage view persistence, and print view for client meetings.

</domain>

<decisions>
## Implementation Decisions

### Lot Card Design
- Each card shows: lot number (prominent), color-coded status badge, buyer name if sold
- Status colors: DISPONIBLE=green, VENDIDO=blue, CONTADO=yellow, PERMUTA=purple, RESERVADO=gray
- Color applied as left border accent (4px) + small status badge — white card, professional look
- Compact grid (~120px wide cards) for dense scanning — fits developments with 50+ lots

### Manzana Grouping
- Section headers labeled "Manzana A" / "Manzana 1", ordered alphabetically/numerically
- Sections are collapsible (click header to expand/collapse)
- Lots with no manzana assigned go in a "Sin Manzana" group at the bottom

### Detail Panel
- Desktop: right-side slide-out panel (doesn't navigate away from grid)
- Mobile: bottom Sheet drawer (per GRID-04 requirement)
- Fields shown: lot number, area (m²), status, manzana, tags. If sold: buyer name, price, currency, sale date, link to /ventas/{id}

### Print View
- Handled by @media print CSS — hides controls, renders lots flat for client meetings (per GRID-06)

### Claude's Discretion
- Print view layout details (one manzana per page vs continuous, header/footer content)
- How to fix any tsc/lint/build errors discovered during GATE-01..03
- Exact card hover/focus states and transitions
- Grid/list toggle UI placement and icon choice
- Collapsible section animation (if any)

</decisions>

<specifics>
## Specific Ideas

- Cards should feel scannable — the primary use case is a salesperson quickly checking lot availability per manzana during a client meeting
- The detail panel link to sale record should be a direct link to /ventas/{saleId}, not a button that opens another modal
- View mode toggle (grid/list) persists via localStorage (GRID-05)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-delivery-gates-and-lot-grid*
*Context gathered: 2026-02-26*
