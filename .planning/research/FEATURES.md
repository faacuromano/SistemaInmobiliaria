# Feature Landscape: v1.2 Integracion Firma-Venta

**Domain:** Real estate ERP -- signing-sale lifecycle integration
**Researched:** 2026-03-16
**Confidence:** HIGH

---

## Context

Sistema Inmobiliaria has two independent modules that need integration:

1. **Sales module** -- Sale creation, installment generation, payment processing, receipts. Fully functional. No awareness of signing status.
2. **Signing module** -- SigningSlot management with calendar/table views, status tracking (PENDIENTE/CONFIRMADA/COMPLETADA/CANCELADA/REPROGRAMADA). No FK relationship to Sale. Uses free-text `lotInfo`, `clientName`, `lotNumbers` fields.

The gap: a sale can have payments collected before the property signing (escrituracion) happens, which is legally and operationally incorrect for installment-based sales in Argentine real estate. Commissions are stored as `commissionAmount` on Sale but never trigger a CashMovement.

---

## Table Stakes

Features that are expected behavior for this milestone. Without these, the integration is incomplete.

### F1: SigningSlot-Sale FK Relationship (Schema)

| Aspect | Detail |
|--------|--------|
| **What** | Add `saleId` FK on `SigningSlot` linking each signing to its sale |
| **Why Expected** | Current `lotInfo`/`clientName` are free text -- no data integrity, no queryability. The entire milestone depends on this link existing in the DB |
| **Complexity** | LOW |
| **Dependencies** | None -- foundational schema change |
| **Notes** | 1:1 for normal sales (one lot = one signing). For multi-lote (same `groupId`), one SigningSlot links to the "primary" sale (first in group) and all sales in the group inherit the signing status. Do NOT create multiple SigningSlots per group -- that defeats the purpose of groupId |
| **Existing code impact** | `signing.model.ts` create/update need `saleId` parameter. `signing.schema.ts` needs `saleId` field. SigningSlot form dialog needs sale picker or auto-population |

### F2: Signing Status Display on Sales

| Aspect | Detail |
|--------|--------|
| **What** | Show signing status (Por fijarse / Fijada / Completada) on sales list and sale detail page |
| **Why Expected** | Users need to see at a glance whether a sale has a pending, scheduled, or completed signing without navigating to Firmas |
| **Complexity** | LOW |
| **Dependencies** | F1 (FK must exist to query signing for a sale) |
| **Notes** | Three derived states: (1) No SigningSlot linked = "Por fijarse", (2) SigningSlot exists with status PENDIENTE/CONFIRMADA/REPROGRAMADA = "Fijada", (3) SigningSlot with status COMPLETADA = "Completada". Show as a colored badge in `SalesTable` and `SaleInfoCards`. For multi-lote, all sales with same groupId share the signing status from the group's SigningSlot |
| **Existing code impact** | `sale.model.ts` findAll/findById includes need to join SigningSlot. `SalesTable` needs new column. `SaleInfoCards` needs signing status card |

### F3: Payment Gating (Block Until Firma Completada)

| Aspect | Detail |
|--------|--------|
| **What** | Block `payInstallment` and `payExtraCharge` for ACTIVA sales where the linked signing is NOT COMPLETADA |
| **Why Expected** | Core business rule: you cannot collect installment payments before the property signing is legally completed. This is the primary motivation for the entire milestone |
| **Complexity** | MEDIUM |
| **Dependencies** | F1 (FK needed to check signing status), F2 (visual feedback needed so users understand WHY payment is blocked) |
| **Notes** | Gate applies ONLY to sale status ACTIVA. Sales with status CONTADO, CESION, or with totalInstallments=0 are exempt (no signing required for these types). Delivery payments (`recordDeliveryPayment`) are also exempt -- down payments happen before signing. The gate must check: (1) does sale have a linked SigningSlot? (2) is that SigningSlot COMPLETADA? Both conditions required. If no SigningSlot linked at all, payments are also blocked (force linking first) |
| **Existing code impact** | `payment.service.ts` payInstallment and payExtraCharge need a pre-check. UI: `InstallmentsTable` pay buttons need disabled state with tooltip explaining why. Must NOT break existing tests |
| **Edge cases** | Multi-lote: check signing status via groupId lookup. Partial payments in progress when signing gets cancelled: current partial stays, new payments blocked. REPROGRAMADA status: still blocked (signing hasn't happened yet) |

### F4: Firma Exemption for Contado/Cesion/Permuta

| Aspect | Detail |
|--------|--------|
| **What** | Contado, cesion, and permuta sales do not require a linked signing to accept payments |
| **Why Expected** | Business reality: cash sales close immediately, supplier assignments (cesion/permuta) are internal transfers. Requiring a signing for these would break existing workflows |
| **Complexity** | LOW |
| **Dependencies** | F3 (this is an exemption rule within the payment gate) |
| **Notes** | The exemption logic: `if (sale.status === 'CONTADO' OR sale.status === 'CESION') then skip signing check`. The totalInstallments=0 check is redundant with CONTADO but adds safety. Permuta sales use status CESION with totalPrice=0 per existing schema comments |
| **Existing code impact** | Condition in `payment.service.ts` gate. UI should NOT show "Por fijarse" warning on these sale types |

### F5: Manage Firma from Sale Detail

| Aspect | Detail |
|--------|--------|
| **What** | On the sale detail page (`/ventas/[id]`), show the linked signing status and provide actions: create signing, view signing details, update signing status |
| **Why Expected** | Users managing a sale need to handle the signing without navigating away. The sale detail page is the natural workflow hub |
| **Complexity** | MEDIUM |
| **Dependencies** | F1 (FK), F2 (status display) |
| **Notes** | Three states the UI handles: (1) No signing linked: show "Asignar Firma" button that opens signing form pre-populated with sale data (client name, lot info, development, seller). (2) Signing linked but not complete: show signing info card with date/time/status, quick-action buttons (mark COMPLETADA, reschedule). (3) Signing COMPLETADA: show completed badge with completion date. For multi-lote, show one signing card shared across all sales in group |
| **Existing code impact** | New section in `SaleDetailPage`. Reuse `signing-form-dialog.tsx` with pre-population. New server action or modification of existing ones to link signing to sale |

---

## Differentiators

Features that add significant value but are not strictly required for the integration to function.

### F6: Auto-Commission on Signing Completion

| Aspect | Detail |
|--------|--------|
| **What** | When a SigningSlot transitions to COMPLETADA, automatically create a CashMovement of type COMISION for the seller |
| **Value Proposition** | Eliminates manual commission tracking. Currently `commissionAmount` on Sale is data-only -- never triggers an actual cash movement. This closes the loop |
| **Complexity** | MEDIUM |
| **Dependencies** | F1 (FK needed to find the sale) |
| **Notes** | Trigger: `updateSigningStatus(id, 'COMPLETADA')` in signing.actions.ts. Logic: (1) Find linked sale(s). (2) For each sale with a `sellerId` and `commissionAmount > 0`, create CashMovement type COMISION with `usdExpense` or `arsExpense` = commissionAmount, `personId` = null (seller is a User, not a Person), `concept` = "COMISION [seller name] - LOTE [lotNumber]". (3) Audit log the commission creation. For multi-lote: create one commission per sale in group (each has its own commissionAmount). If no seller or commissionAmount is 0/null, skip silently |
| **Edge cases** | Signing completed then re-opened (REPROGRAMADA): do NOT reverse commission. Commission is a one-time event. Idempotency: check if COMISION CashMovement already exists for this sale before creating duplicate. Sale cancelled after commission: commission stays as expense (manual reversal if needed) |

### F7: Exchange Rate Equivalence Display

| Aspect | Detail |
|--------|--------|
| **What** | In the payment dialog, show the current blue dollar rate and the ARS/USD equivalence of the amount being paid |
| **Value Proposition** | Operator sees "Cuota: USD 500 = ARS 625,000 al blue de hoy (1,250)" so they can verify coverage when client pays in ARS for a USD-denominated installment |
| **Complexity** | LOW |
| **Dependencies** | None -- uses existing `fetchDolarApiRates()` and `ExchangeRate` model |
| **Notes** | Display-only, not a gate or validation. Show: (1) installment amount in original currency, (2) equivalent in other currency at today's blue sell rate, (3) the rate being used. If manual rate is entered, recalculate equivalence with manual rate. If API is unreachable, show "Cotizacion no disponible" instead of blocking the payment. Already have `exchange-rate.ts` with `fetchDolarApiRates()` and `convertCurrency()`. Fetch happens server-side, passed to client component |
| **Existing code impact** | Modify payment dialog component(s) to accept and display rate data. Add rate fetching to the page/action that opens the payment dialog |

---

## Anti-Features

Features to explicitly NOT build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Google Calendar sync for signings** | Out of scope, requires OAuth, API key management, calendar API complexity | Schema already has placeholder `googleEventId` comment for future. Keep as future milestone |
| **Automatic signing creation on sale creation** | Sale creation happens before signing is scheduled. Forcing signing data at sale time adds friction and may not be known yet | Let users link signing manually from sale detail page (F5) |
| **Commission approval workflow** | Over-engineering for 6 users. Adds state machine complexity (PENDING_APPROVAL, APPROVED, PAID) for no real benefit | Auto-create on signing completion (F6). Manual reversal via Caja if needed |
| **Exchange rate lock-in at signing time** | Adds complexity (which rate? signing date? payment date?). Business uses payment-date rate | Show equivalence (F7) but use payment-date rate for actual recording, as already implemented |
| **Multi-currency commission** | Commissions are always in the sale's currency. No need for separate commission currency field | Use `sale.currency` and `sale.commissionAmount` as-is |
| **Signing document upload/storage** | File management complexity (S3/storage), out of scope | Notes field on SigningSlot is sufficient for now |
| **Payment schedule adjustment on signing** | Signing date should not recalculate installment due dates -- those are set at sale creation | Keep installment dates as-is. Signing is a gate, not a schedule modifier |
| **Reverse commission on signing cancellation** | Creates audit complexity. Signing cancellation is rare, manual commission reversal via Caja is sufficient | If signing is cancelled after commission, admin handles via Caja manually |

---

## Feature Dependencies

```
F1: SigningSlot-Sale FK (Schema)
 |
 +---> F2: Signing Status Display on Sales
 |      |
 |      +---> F3: Payment Gating
 |      |      |
 |      |      +---> F4: Firma Exemption (contado/cesion/permuta)
 |      |
 |      +---> F5: Manage Firma from Sale Detail
 |
 +---> F6: Auto-Commission on Signing Completion
 |
 (independent)
 +---> F7: Exchange Rate Equivalence Display
```

**Critical path:** F1 -> F2 -> F3 -> F4 (must be sequential)
**Parallel work:** F5 can start after F2. F6 can start after F1. F7 is fully independent.

---

## MVP Recommendation

**Phase 1 (Core -- must ship together):**
1. F1: SigningSlot-Sale FK -- schema migration, model updates
2. F2: Signing status display -- visual feedback on sales
3. F3: Payment gating -- the business rule that motivates the milestone
4. F4: Firma exemption -- safety valve for contado/cesion

**Phase 2 (Integration UX):**
5. F5: Manage firma from sale detail -- workflow convenience

**Phase 3 (Automation):**
6. F6: Auto-commission -- closes the commission loop
7. F7: Exchange rate equivalence -- informational improvement

**Defer:**
- None. All 7 features are scoped appropriately for one milestone.

---

## Implementation Complexity Assessment

| Feature | Schema Change | Service Layer | UI Change | Test Impact | Total Effort |
|---------|--------------|---------------|-----------|-------------|-------------|
| F1: FK relationship | YES (migration) | Model updates | Form updates | Existing tests need FK mock | MEDIUM |
| F2: Status display | NO | Query joins | New column + card | None | LOW |
| F3: Payment gating | NO | Guard logic in payment.service | Disabled buttons + tooltip | New tests needed | MEDIUM |
| F4: Exemption logic | NO | Condition in guard | Conditional UI | Test exemption cases | LOW |
| F5: Sale-detail firma | NO | Action reuse | New section component | None | MEDIUM |
| F6: Auto-commission | NO | New service logic | None (backend only) | New tests for commission creation | MEDIUM |
| F7: Rate equivalence | NO | Data fetching | Display component | None | LOW |

**Total estimated effort:** ~5-7 focused implementation sessions

---

## Data Migration Consideration

The existing `SigningSlot` records have no `saleId`. After adding the FK:
- Existing SigningSlots become "orphaned" (no sale linked). This is acceptable -- they can be linked manually.
- The FK should be OPTIONAL (`saleId String?`) to support this migration path.
- No data migration script needed -- just add the nullable column.
- Existing signing create/update forms should offer a sale picker to link signings.

---

## Confidence Assessment

| Feature | Confidence | Reasoning |
|---------|------------|-----------|
| F1: FK Schema | HIGH | Standard Prisma migration, clear schema. Reviewed existing models thoroughly |
| F2: Status Display | HIGH | Straightforward query join + UI badge. Pattern already used for SaleStatus |
| F3: Payment Gating | HIGH | Clear insertion point in `payment.service.ts`. Well-understood guard pattern |
| F4: Exemption | HIGH | Simple conditional. Sale status enum is well-defined |
| F5: Sale-Detail Firma | MEDIUM | UI integration requires careful component design. Signing form reuse may need refactoring |
| F6: Auto-Commission | MEDIUM | Commission creation is simple, but idempotency and edge cases (multi-lote, no seller) need careful handling |
| F7: Rate Equivalence | HIGH | Uses existing `fetchDolarApiRates()`. Display-only, no business logic risk |

---

## Sources

- Codebase analysis: `prisma/schema.prisma`, `payment.service.ts`, `sale.service.ts`, `signing.model.ts`, `signing.actions.ts`, `exchange-rate.ts`
- Domain knowledge: Argentine real estate escrituracion workflow, ERP payment gating patterns
- No web sources available (WebSearch denied). All findings based on codebase evidence and domain expertise.

*Feature research for: v1.2 Integracion Firma-Venta*
*Researched: 2026-03-16*
