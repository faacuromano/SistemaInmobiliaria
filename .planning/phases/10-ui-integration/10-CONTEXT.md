# Phase 10: UI Integration - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Show signing status on every sale, manage signings from the sale detail page, disable payment buttons with explanatory feedback when signing is not completed, and display ARS/USD equivalence with coverage check in payment dialogs. No new business logic — purely UI presentation of Phase 8 data and Phase 9 rules.

</domain>

<decisions>
## Implementation Decisions

### Firma Info Card (Sale Detail)
- Add a new Firma card inside `SaleInfoCards` grid — same row as Cliente, Lote, Precio cards
- Card shows: signing status badge (using existing `SIGNING_STATUS_LABELS`), signing date/time if available
- If no signing linked: card shows "Sin firma vinculada" with prompt to create/link
- Clicking the Firma card opens a **dialog** with signing details and management actions
- **Hide the Firma card entirely for exempt sales** (CONTADO, CESION) — they don't need signings
- Sales with no signing linked (ACTIVA, legacy): show Firma card with "Sin firma" + actions, payments remain ENABLED (backward compat from Phase 9)

### Firma Management Dialog
- Dialog shows: signing status badge, date/time, development name, seller name
- Actions when signing exists: "Desvincular" (unlink), "Ver en /firmas" (navigate to firmas page)
- Actions when no signing: "Crear Nueva" (opens SigningFormDialog), "Vincular Existente" (select from list)
- **Auto-fill when creating from sale**: pre-populate clientName from sale.person, lotInfo/lotNumbers from sale.lot, developmentId from sale.lot.development, sellerId from sale.seller, saleId auto-linked. User only picks date/time.

### Payment Blocking Feedback
- Each "Pagar" button on installments and refuerzos is **disabled** when signing gate is active
- Disabled buttons show a **tooltip**: "Complete la firma antes de registrar pagos"
- The gate check is determined client-side: sale has signingSlots AND none have status COMPLETADA
- No banner or extra warning above the table — disabled buttons + tooltip is sufficient
- Exempt sales (CONTADO, CESION): no gate, buttons always enabled as before
- Sales with NO signing linked: buttons remain ENABLED (Phase 9 backward compat)

### Currency Equivalence in Payment Dialog
- Show a **live equivalence line below the amount field**: "Equivale a ARS X,XXX,XXX (cotiz. $X,XXX.XX)"
- Auto-fetch exchange rate from existing `dolarapi.com` integration (`src/lib/exchange-rate.ts`) on dialog open
- If user enters a manual rate in "Cotización Manual" field, equivalence updates to use the manual rate instead
- Show **coverage check** below equivalence:
  - Green check: "Cubre la cuota pendiente (ARS X,XXX,XXX)" when amount >= remaining
  - Amber warning: "No cubre la cuota completa — Faltan ARS X,XXX,XXX" when amount < remaining
- Equivalence and coverage update reactively as user types amount or changes manual rate
- Apply to both `PayInstallmentDialog` and `PayExtraChargeDialog`

### Sales List Signing Badge
- Add a new **"Firma" column** to the sales table (SalesTable component)
- Use existing `StatusBadge` component with `SIGNING_STATUS_LABELS` and `SIGNING_STATUS_COLORS`
- For sales with no signing (CONTADO, CESION, or simply unlinked): show "—" (em dash)
- Column position: after "Estado" column
- Data already available: Phase 8 added `signingSlots: { select: { id, status } }` to sales list query

### Claude's Discretion
- Exact tooltip implementation (native title vs shadcn Tooltip component)
- Exchange rate fetch timing (on dialog mount, debounced, or cached)
- "Vincular Existente" UI pattern (dropdown, combobox, or mini-table)
- Whether "Desvincular" requires confirmation dialog

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sale Detail Page (where Firma card and payment blocking go)
- `src/app/(dashboard)/ventas/[id]/page.tsx` — Sale detail page layout, data fetching, component composition
- `src/app/(dashboard)/ventas/[id]/_components/sale-info-cards.tsx` — Info cards grid where Firma card will be added
- `src/app/(dashboard)/ventas/[id]/_components/installments-table.tsx` — Installments + extra charges table with "Pagar" buttons
- `src/app/(dashboard)/ventas/[id]/_components/pay-installment-dialog.tsx` — Payment dialog where equivalence will be added
- `src/app/(dashboard)/ventas/[id]/_components/pay-extra-charge-dialog.tsx` — Extra charge payment dialog (same equivalence treatment)

### Sales List Page (where signing badge goes)
- `src/app/(dashboard)/ventas/page.tsx` — Sales list page with SalesTable
- `src/app/(dashboard)/ventas/_components/sales-table.tsx` — Table component where Firma column will be added

### Signing Components (reusable for Firma management)
- `src/app/(dashboard)/firmas/_components/signing-form-dialog.tsx` — Existing signing create/edit dialog (reuse for "Crear Nueva")
- `src/app/(dashboard)/firmas/_components/signing-status-select.tsx` — Status select component

### Shared UI Components
- `src/components/shared/status-badge.tsx` — StatusBadge component for consistent badge rendering
- `src/components/shared/price.tsx` — Price component for currency display

### Constants and Types
- `src/lib/constants.ts` — SIGNING_STATUS_LABELS, SIGNING_STATUS_COLORS, CURRENCY_LABELS
- `src/types/enums.ts` — SigningStatus, SaleStatus, Currency enums

### Service Layer (Phase 9 output)
- `src/server/services/payment.service.ts` — checkSigningGate helper, EXEMPT_SALE_STATUSES array
- `src/lib/exchange-rate.ts` — Exchange rate fetching from dolarapi.com

### Data Layer
- `src/server/actions/sale.actions.ts` — getSaleById (includes signingSlots), getSales (includes signingSlots select)
- `src/server/actions/signing.actions.ts` — createSigning, updateSigning, updateSigningStatus
- `src/server/models/sale.model.ts` — Sale model includes for signingSlots
- `src/schemas/signing.schema.ts` — Signing create/update schemas (has saleId field from Phase 8)

### Requirements
- `.planning/REQUIREMENTS.md` — FIRMA-02, FIRMA-03, FIRMA-04, FIRMA-05, PAGO-04, PAGO-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusBadge` component: simple wrapper around shadcn `Badge` with label + variant props
- `SIGNING_STATUS_LABELS/COLORS`: already defined in constants.ts (Pendiente, Confirmada, Completada, Cancelada, Reprogramada)
- `SigningFormDialog`: full create/edit form for signings — can be reused for "Crear Nueva" from sale detail
- `Price` component: currency-aware amount display
- `DataTable` component: generic table with columns config pattern
- `exchange-rate.ts`: `getExchangeRate()` function that fetches from dolarapi.com

### Established Patterns
- Sale detail uses server component page + client component children
- Dialog pattern: `useActionState` + `useForm` with `zodResolver` + `formAction`
- Info cards are a grid of small cards in `SaleInfoCards` component
- Status badges use label/variant mapping from constants
- Client components receive serialized data (Decimal → Number conversion in page.tsx)

### Integration Points
- `SaleInfoCards` — add Firma card to existing grid
- `InstallmentsTable` — modify "Pagar" button rendering to check signing gate
- `PayInstallmentDialog` / `PayExtraChargeDialog` — add equivalence display
- `SalesTable` — add Firma column with signing status badge
- `sale detail page.tsx` — pass signingSlots data to child components

</code_context>

<specifics>
## Specific Ideas

- Firma card follows the compact pattern from user's mockup: status badge + date, clickable to open management dialog
- Coverage check in payment dialog inspired by existing "Pago parcial" warning (amber box) — use same visual pattern
- "Vincular Existente" needs to show unlinked signings from the same development for easy selection

</specifics>

<deferred>
## Deferred Ideas

- FIRMA-06: Manual linking of legacy signings (text-matching) — deferred to future release per REQUIREMENTS.md
- FIRMA-07: Notify sale creator when signing completes — deferred to future release
- Commission display on sale detail (show COMISION CashMovement) — not in this phase scope, already visible in SaleMovements section

</deferred>

---

*Phase: 10-ui-integration*
*Context gathered: 2026-03-16*
