# Phase 10: UI Integration - Research

**Researched:** 2026-03-16
**Domain:** React UI integration (Next.js App Router + shadcn/ui + Radix)
**Confidence:** HIGH

## Summary

Phase 10 is a purely presentational integration phase. All backend logic (signing-sale FK, signing gate, auto-commission) is complete from Phases 8 and 9. The work involves modifying 6 existing components and creating 2 new ones to surface signing status, manage firma linking, disable payments with tooltip feedback, and display currency equivalence in payment dialogs.

The codebase is well-structured with established patterns: server component pages fetch data, client components receive serialized props, dialogs use `useActionState` + `react-hook-form` + `zodResolver`, and status display uses `StatusBadge` with label/color maps from `constants.ts`. All required shadcn components (Tooltip, Dialog, Card, Select, Badge) are already installed. The signing form dialog (`SigningFormDialog`) already supports `saleId` as a hidden field, making reuse for "Crear Nueva" straightforward.

One new server action is needed: `getUnlinkedSignings(developmentId)` to fetch signings without a sale link for the "Vincular Existente" feature. Unlinking uses the existing `updateSigning` action with `saleId: null`. The exchange rate fetch uses the existing `fetchDolarApiRates()` server action with 1-hour cache.

**Primary recommendation:** Structure the work into 3 plans: (1) Sales list Firma column + sale detail Firma card with management dialog, (2) Payment blocking with Tooltip on disabled buttons, (3) Currency equivalence in both payment dialogs. Each plan touches independent files and can be verified in isolation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Firma card inside `SaleInfoCards` grid, same row as other info cards
- Card shows signing status badge, date/time when linked; "Sin firma vinculada" when unlinked
- Hide Firma card entirely for exempt sales (CONTADO, CESION)
- Sales with no signing linked: payments remain ENABLED (backward compat)
- Dialog for firma management (not inline expansion)
- Auto-fill when creating from sale: pre-populate all known fields, user only picks date/time
- Each "Pagar" button disabled with tooltip when signing gate active
- Tooltip text: "Complete la firma antes de registrar pagos"
- No banner/extra warning -- disabled buttons + tooltip is sufficient
- Live equivalence line below amount field in payment dialog
- Green check / amber warning for coverage status
- Equivalence updates reactively as user types
- Apply to both PayInstallmentDialog and PayExtraChargeDialog
- New "Firma" column in sales table after "Estado" column
- Em dash for sales with no signing

### Claude's Discretion
- Exact tooltip implementation (native title vs shadcn Tooltip component)
- Exchange rate fetch timing (on dialog mount, debounced, or cached)
- "Vincular Existente" UI pattern (dropdown, combobox, or mini-table)
- Whether "Desvincular" requires confirmation dialog

### Deferred Ideas (OUT OF SCOPE)
- FIRMA-06: Manual linking of legacy signings (text-matching) -- deferred to future release
- FIRMA-07: Notify sale creator when signing completes -- deferred to future release
- Commission display on sale detail -- not in scope, already visible in SaleMovements
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIRMA-02 | User can create a signing from sale detail | SigningFormDialog already supports saleId; auto-fill pattern documented in CONTEXT.md; reuse dialog from firmas page with pre-populated defaults |
| FIRMA-03 | User can link existing signing to sale from sale detail | Needs new `getUnlinkedSignings` server action; link via existing `updateSigning` action setting `saleId`; UI-SPEC specifies Select component pattern |
| FIRMA-04 | Sale detail shows firma section with current signing status | Firma card already partially exists in SaleInfoCards; needs refactor from IIFE to proper conditional rendering; signingSlots data already included in sale query |
| FIRMA-05 | Sales table shows signing status badge column | `signingSlots` data already included in sales list query; column uses existing StatusBadge + SIGNING_STATUS_LABELS/COLORS constants |
| PAGO-04 | UI disables payment buttons with tooltip when signing not completed | shadcn Tooltip component installed; gate logic mirrors server-side `checkSigningGate`; disabled prop + TooltipProvider wrapper pattern |
| PAGO-05 | Payment dialog shows ARS/USD equivalence with coverage check | `fetchDolarApiRates()` server action exists; payment dialogs already have `manualRate` field; CurrencyEquivalence component extracts to reusable unit |
</phase_requirements>

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 | App Router, server components, server actions | Project foundation |
| React | 19 | UI rendering, hooks (useState, useEffect, useActionState) | Project foundation |
| shadcn/ui | new-york preset | Dialog, Tooltip, Card, Badge, Select, Button, Form | UI component system |
| Radix UI | via shadcn | Tooltip primitive (already installed with shadcn Tooltip) | Accessible tooltip behavior |
| react-hook-form | installed | Form state management in dialogs | Established dialog pattern |
| zod | installed | Schema validation | Established validation layer |
| lucide-react | installed | Icons (PenTool, Check, AlertTriangle, Plus, Link2) | Established icon library |
| date-fns | installed | Date formatting via `formatDate` utility | Established formatting |

### Supporting (no new packages needed)

| Library | Purpose | Already Used In |
|---------|---------|-----------------|
| sonner | Toast notifications for success/error | All existing dialogs |
| @hookform/resolvers | Zod resolver for react-hook-form | All existing form dialogs |

**Installation:** No new packages required. All dependencies are already in the project.

## Architecture Patterns

### Existing Project Structure (relevant subset)
```
src/app/(dashboard)/ventas/
  [id]/
    page.tsx                          # Server component - fetches sale, passes to children
    _components/
      sale-info-cards.tsx             # MODIFY: Firma card + management dialog
      installments-table.tsx          # MODIFY: Signing gate on Pagar buttons
      pay-installment-dialog.tsx      # MODIFY: Currency equivalence
      pay-extra-charge-dialog.tsx     # MODIFY: Currency equivalence
      firma-management-dialog.tsx     # NEW: Manage signing from sale detail
      currency-equivalence.tsx        # NEW: Reusable equivalence + coverage display
  _components/
    sales-table.tsx                   # MODIFY: Add Firma column
```

### Pattern 1: Server-to-Client Data Flow
**What:** Server component (page.tsx) fetches all data and serializes Decimal fields, client components receive plain props.
**When to use:** Every page in the project follows this pattern.
**Existing example:** `SaleDetailPage` fetches `getSaleById()`, serializes via `serializeSaleForClient()`, and passes `sale` to `<SaleInfoCards sale={sale} />`.

**Key implication for this phase:** The signing gate determination (`signingGateActive`) should be computed in the server page and passed as a prop to `InstallmentsTable`, not computed inside the client component. This keeps gate logic centralized and testable.

### Pattern 2: Dialog with useActionState + react-hook-form
**What:** Dialogs combine `useActionState` for server action binding with `react-hook-form` for client validation.
**When to use:** Any form that submits via server action.
**Established in:** `SigningFormDialog`, `PayInstallmentDialog`, `PayExtraChargeDialog`.
```typescript
const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
  (_prev, formData) => serverAction({ success: false, error: "" }, formData),
  null
);

const form = useForm<FormInput>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});

useEffect(() => {
  if (state?.success) { toast.success(...); onOpenChange(false); router.refresh(); }
  else if (state) { toast.error(state.error); }
}, [state]);
```

### Pattern 3: Status Display via Constants Map
**What:** Status values mapped to labels and badge variants via centralized constants.
**Established in:** `constants.ts` with `SIGNING_STATUS_LABELS` and `SIGNING_STATUS_COLORS`.
```typescript
<StatusBadge
  label={SIGNING_STATUS_LABELS[signing.status as SigningStatus]}
  variant={SIGNING_STATUS_COLORS[signing.status as SigningStatus]}
/>
```

### Pattern 4: Conditional Card Rendering
**What:** Info cards in the sale detail grid are conditionally shown based on data.
**Established in:** `SaleInfoCards` -- the Seller/Commission card only shows when `sale.seller || sale.commissionAmount`.
**Apply to Firma card:** Hide when `sale.status === "CONTADO" || sale.status === "CESION"`.

### Anti-Patterns to Avoid
- **Duplicating server-side gate logic in complex client code:** The signing gate check must mirror `payment.service.ts::checkSigningGate` exactly. Use a simple derived boolean, not a reimplementation.
- **Fetching exchange rates on every keystroke:** Fetch once on dialog mount. Manual rate overrides are handled via `form.watch()`, not re-fetching.
- **Nesting dialog inside dialog without proper state management:** The FirmaManagementDialog may open SigningFormDialog. Use separate `useState` booleans for each dialog, not a single state machine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip on disabled buttons | Custom hover handler + absolutely-positioned div | shadcn `Tooltip` + `TooltipProvider` | Radix handles accessibility (aria), focus management, and positioning automatically |
| Signing form for "Crear Nueva" | A second signing form component | Reuse existing `SigningFormDialog` with `defaultValues` pre-filled | The component already accepts `defaultValues` with `saleId` and `saleLabel` fields |
| Confirmation dialog for "Desvincular" | Custom modal with confirm/cancel buttons | Existing `ConfirmDialog` component | Already handles loading state, async onConfirm, and DialogTrigger pattern |
| Currency formatting | Manual `toFixed()` + string concatenation | Existing `formatCurrency()` utility | Handles locale-specific formatting (USD: en-US, ARS: es-AR) |
| Date formatting | Manual date string manipulation | Existing `formatDate()` utility | Uses date-fns with Spanish locale |
| Exchange rate fetching | Custom fetch to dolarapi.com | Existing `fetchDolarApiRates()` server action | Already handles caching (revalidate: 3600), error handling, and type safety |

**Key insight:** This phase creates no new business logic. Every data operation (create signing, update signing to link/unlink, fetch exchange rates) already has a server action. The work is purely wiring existing actions to new UI surfaces.

## Common Pitfalls

### Pitfall 1: Tooltip on Disabled Buttons Not Showing
**What goes wrong:** Radix Tooltip triggers need to receive pointer events. A `disabled` HTML button does not receive `onPointerEnter`, so the tooltip never opens.
**Why it happens:** The `disabled` attribute suppresses all pointer events on the element.
**How to avoid:** Wrap the disabled button in a `<span>` or use `<TooltipTrigger asChild><span tabIndex={0}><Button disabled>...</Button></span></TooltipTrigger>`. The span receives the pointer events and triggers the tooltip, while the button remains visually and semantically disabled.
**Warning signs:** Tooltip works on enabled buttons but silently fails on disabled ones.

### Pitfall 2: Exchange Rate Fetch as Server Action from Client
**What goes wrong:** `fetchDolarApiRates()` is marked `"use server"` but uses `fetch` with `next: { revalidate }` which only works in server components, not server actions called from client.
**Why it happens:** The `next` option on `fetch` is a Next.js extension that works differently in server actions vs server components.
**How to avoid:** Call `fetchDolarApiRates()` from the server component (page.tsx) and pass the rates as a prop to the payment dialog, OR create a thin API route/server action that wraps the fetch without the `next` cache option. Alternatively, fetch from client directly using the dolarapi.com endpoint (it is a public API, CORS-friendly).
**Warning signs:** Exchange rate always returns null when called from client via server action.

### Pitfall 3: Stale Data After Linking/Unlinking Signing
**What goes wrong:** User links a signing from the FirmaManagementDialog, but the Firma card still shows "Sin firma" until page refresh.
**Why it happens:** The existing `updateSigning` action calls `revalidatePath("/firmas")` and conditionally `revalidatePath("/ventas")`, but the sale detail page at `/ventas/[id]` may need explicit revalidation.
**How to avoid:** After linking/unlinking, call `router.refresh()` to re-fetch server component data. The existing signing actions already call `revalidatePath("/ventas")`, so `router.refresh()` should pick up the new data.
**Warning signs:** Dialog closes successfully but parent page shows stale signing data.

### Pitfall 4: SigningFormDialog Requires developments and sellers Props
**What goes wrong:** Attempting to open `SigningFormDialog` from the sale detail page without passing the required `developments` and `sellers` arrays causes a runtime error.
**Why it happens:** The dialog component requires these arrays for its select dropdowns, but the sale detail page doesn't currently fetch them.
**How to avoid:** Fetch `getDevelopmentOptions()` and `getActiveSellers()` in the sale detail page's server component and pass them through to the `FirmaManagementDialog` (which in turn passes them to `SigningFormDialog`).
**Warning signs:** Missing props error when opening the create signing dialog from sale detail.

### Pitfall 5: SalesTable SaleRow Type Mismatch
**What goes wrong:** Adding `signingSlots` to the `SaleRow` type in `SalesTable` but the data from `saleModel.findAll()` includes it under a different shape.
**Why it happens:** The model query returns `signingSlots: { id: string; status: string }[]` but the client type was defined independently.
**How to avoid:** Check the existing `saleModel.findAll()` query -- it already includes `signingSlots: { select: { id: true, status: true } }`. Add the field to the `SaleRow` type definition in `sales-table.tsx` to match.
**Warning signs:** TypeScript compile errors when accessing `sale.signingSlots` in the table column render.

## Code Examples

### Signing Gate Client-Side Determination (page.tsx)
```typescript
// In ventas/[id]/page.tsx (server component)
const EXEMPT_STATUSES = ["CONTADO", "CESION"];
const isExempt = EXEMPT_STATUSES.includes(sale.status);
const signingGateActive = !isExempt
  && sale.signingSlots
  && sale.signingSlots.length > 0
  && !sale.signingSlots.some((s: { status: string }) => s.status === "COMPLETADA");

// Pass to InstallmentsTable
<InstallmentsTable
  installments={sale.installments}
  extraCharges={sale.extraCharges}
  canManage={canManage}
  saleId={sale.id}
  signingGateActive={!!signingGateActive}
/>
```

### Tooltip on Disabled Button Pattern
```typescript
// Source: shadcn Tooltip + Radix Tooltip behavior with disabled elements
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

// Inside InstallmentsTable column render
{signingGateActive ? (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-block">
          <Button variant="outline" size="sm" disabled className="pointer-events-none">
            Pagar
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Complete la firma antes de registrar pagos
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
) : (
  <Button variant="outline" size="sm" onClick={() => onPay(item)}>
    Pagar
  </Button>
)}
```

### Currency Equivalence Component Pattern
```typescript
// Source: Existing fetchDolarApiRates + formatCurrency patterns
interface CurrencyEquivalenceProps {
  enteredAmount: number;
  enteredCurrency: "USD" | "ARS";
  installmentCurrency: "USD" | "ARS";
  remainingAmount: number;
  manualRate: number | undefined;
  apiRate: { blueSell: number | null } | null;
}

// equivalence = amount * rate (USD->ARS) or amount / rate (ARS->USD)
// coverage = equivalent amount compared against remainingAmount
```

### Adding Firma Column to SalesTable
```typescript
// After the "status" column in SalesTable
{
  key: "firma",
  label: "Firma",
  render: (sale) => {
    const signing = sale.signingSlots?.[0];
    if (!signing) {
      return <span className="text-muted-foreground">{"\u2014"}</span>;
    }
    return (
      <StatusBadge
        label={SIGNING_STATUS_LABELS[signing.status as SigningStatus]}
        variant={SIGNING_STATUS_COLORS[signing.status as SigningStatus]}
      />
    );
  },
},
```

### Auto-Fill for SigningFormDialog from Sale
```typescript
// Build defaults for SigningFormDialog when creating from sale detail
const signingDefaults = {
  id: "",
  date: "",
  time: "",
  endTime: null,
  lotInfo: sale.lot.block
    ? `Lote ${sale.lot.lotNumber} - Mz ${sale.lot.block} - ${sale.lot.development.name}`
    : `Lote ${sale.lot.lotNumber} - ${sale.lot.development.name}`,
  clientName: `${sale.person.firstName} ${sale.person.lastName}`,
  lotNumbers: sale.lot.lotNumber,
  developmentId: sale.lot.development.id,
  sellerId: sale.sellerId,
  status: "PENDIENTE",
  notes: null,
  saleId: sale.id,
  saleLabel: `${sale.person.firstName} ${sale.person.lastName} - Lote ${sale.lot.lotNumber}`,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firma card as IIFE `{(() => { ... })()}` | Proper conditional render with dialog management | This phase | Cleaner, more maintainable card code |
| Navigate to /firmas to create signing | Create signing directly from sale detail via dialog | This phase | Fewer page transitions, better UX |
| Server-only signing gate (ServiceError on submit) | Client-side visual disable + server-side validation | This phase | Users see blocking before attempting payment |
| No currency equivalence in payment dialog | Live equivalence + coverage check | This phase | Reduces payment errors and manual calculation |

**No deprecated APIs or patterns to worry about.** All project patterns are current with Next.js 15 / React 19.

## Open Questions

1. **Exchange Rate Fetch Timing from Client**
   - What we know: `fetchDolarApiRates()` is a server action with `"use server"` directive. It uses `fetch` with `next: { revalidate: 3600 }`. This works from server components but behavior from server actions called by client may differ.
   - What's unclear: Whether the `next` cache option works correctly in server actions invoked from client components.
   - Recommendation: Test during implementation. If rates return null from client, either (a) pass rates from server page as props, or (b) fetch directly from `https://dolarapi.com/v1/dolares` on the client (public, CORS-enabled API). Option (a) is cleaner and avoids exposing the API call to the client.

2. **getUnlinkedSignings Query**
   - What we know: No existing server action fetches signings filtered by `saleId IS NULL` and a specific `developmentId`.
   - What's unclear: The exact volume of unlinked signings per development (affects whether Select or Combobox is better UX).
   - Recommendation: Use shadcn Select (simpler). Create a new server action `getUnlinkedSignings(developmentId: string)` that queries `signingSlot.findMany({ where: { saleId: null, developmentId } })`. The development typically has <20 signings at a time, so Select is sufficient.

3. **Unlinking Signing Server Action**
   - What we know: `updateSigning` server action accepts formData and can set `saleId` to null. However, it requires all other fields (date, time, lotInfo, etc.) to be re-submitted via FormData since it validates the full schema.
   - What's unclear: Whether a lightweight "unlink only" action would be better than submitting a full form just to clear saleId.
   - Recommendation: Create a dedicated `unlinkSigningFromSale(signingId: string)` server action that only updates `saleId: null` without requiring full schema validation. This is cleaner and avoids accidentally modifying other signing fields.

## Discretion Recommendations

Based on the "Claude's Discretion" areas from CONTEXT.md:

1. **Tooltip implementation:** Use shadcn Tooltip (Radix-based), not native `title` attribute. Native title has inconsistent timing across browsers, no styling control, and no dark mode support. The shadcn Tooltip is already installed and styled.

2. **Exchange rate fetch timing:** Fetch on dialog mount (single fetch per dialog open). The API already caches for 1 hour. No debouncing needed since we are not re-fetching -- just reading cached state. If the fetch fails, the manual rate field still works.

3. **"Vincular Existente" UI pattern:** Use shadcn Select component. The number of unlinked signings per development is typically small (<20). A combobox or mini-table would be over-engineering. Format entries as `"{clientName} - {lotInfo} ({date} {time})"` for easy identification.

4. **"Desvincular" confirmation:** Yes, require confirmation via existing `ConfirmDialog` component. Unlinking has real consequences (re-enables the signing gate for future re-links) and follows the project pattern for destructive-ish actions.

## Sources

### Primary (HIGH confidence)
- Project codebase: All files listed in CONTEXT.md canonical_refs (read in full)
- `src/components/ui/tooltip.tsx` -- Radix Tooltip already installed with shadcn
- `src/server/services/payment.service.ts` -- Signing gate logic (lines 11-48)
- `src/server/models/sale.model.ts` -- Both `findAll` and `findById` include `signingSlots`
- `src/lib/exchange-rate.ts` -- `fetchDolarApiRates()` with 1hr cache
- `src/components/shared/confirm-dialog.tsx` -- Existing confirmation pattern
- `.planning/phases/10-ui-integration/10-UI-SPEC.md` -- Full UI design contract
- `.planning/phases/10-ui-integration/10-CONTEXT.md` -- User decisions

### Secondary (MEDIUM confidence)
- Radix Tooltip behavior with disabled elements -- known behavior documented in Radix docs, verified by inspecting the shadcn wrapper

### Tertiary (LOW confidence)
- `fetchDolarApiRates()` behavior when called from client via server action -- needs runtime verification during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, verified in codebase
- Architecture: HIGH -- all patterns extracted from existing code, no new patterns introduced
- Pitfalls: HIGH -- identified from real code analysis (disabled tooltip, exchange rate scope, stale data, missing props)
- Code examples: HIGH -- derived directly from existing component patterns in the codebase

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- no external dependency changes expected)
