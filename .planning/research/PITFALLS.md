# Domain Pitfalls: v1.2 Integrating Firma-Venta

**Domain:** Real estate ERP -- adding signing-sale integration, payment gating, auto-commission, and exchange rate validation to an existing production system
**Researched:** 2026-03-16
**Confidence:** HIGH (grounded in direct codebase analysis of 10+ source files, Prisma schema, and existing data model)

---

## Critical Pitfalls

Mistakes that cause data corruption, broken production workflows, or require migration rollbacks.

---

### Pitfall 1: SigningSlot Text-to-FK Migration Breaks Existing Records

**What goes wrong:** SigningSlot currently stores `clientName` (text), `lotInfo` (text), and `lotNumbers` (text) -- none of these are FKs. Adding a `saleId` FK column to `signing_slots` is straightforward for new records, but existing SigningSlot rows have no corresponding Sale relationship. If the migration makes `saleId` NOT NULL, it fails on the existing data. If the migration leaves it nullable, the codebase must handle two states (FK-linked vs text-only) forever.

**Why it happens:** The schema was designed in v0.4 as a standalone calendar feature. The text fields were intentional ("Phase 1 MVP"). Now that SigningSlot must become a gate for payments, it needs a real FK, but production has existing rows.

**Consequences:**
- Migration failure in production if NOT NULL constraint is applied to populated table
- Orphaned text-only records that the new signing-status UI cannot resolve
- Dual code paths: "check FK first, fallback to text" creates maintenance burden

**Prevention:**
1. Add `saleId` as a nullable FK column: `saleId String? @map("sale_id")`
2. Write a one-time data migration script (not a Prisma migration) that attempts to match existing SigningSlots to Sales by `clientName` <-> `person.firstName + lastName` and `lotNumbers` <-> `lot.lotNumber`. Log unmatched records for manual review.
3. Keep `clientName`, `lotInfo`, `lotNumbers` columns as-is for backward compatibility and display fallback. Never remove them in this milestone.
4. New code should always populate both the FK AND the text fields (belt and suspenders), so future reads can use either.

**Detection:** Before deploying, run `SELECT COUNT(*) FROM signing_slots WHERE sale_id IS NULL` after migration. If > 0 and those are active records (status != CANCELADA), they need manual linking.

**Phase:** Must be the FIRST phase -- schema migration before any logic changes.

---

### Pitfall 2: Payment Gating Breaks Existing Active Sales Without Signing Slots

**What goes wrong:** Adding a "firma must be COMPLETADA before paying installments" check to `paymentService.payInstallment()` immediately blocks ALL existing ACTIVA sales that have no SigningSlot linked. The client cannot collect any payments until every active sale has a signing slot retroactively created.

**Why it happens:** The gating logic is applied uniformly without considering that existing sales never had a signing requirement. This is the #1 risk because it breaks the core revenue collection workflow.

**Consequences:**
- Complete payment blockage for existing active sales (production outage for collections)
- Client panics: "we can't collect payments"
- Hasty hotfix to remove the gate, losing trust in the feature

**Prevention:**
1. The gate must ONLY apply to sales created AFTER the feature is deployed. Add a `signingRequired` boolean to Sale (default false for existing, true for new ACTIVA sales), OR gate based on whether a SigningSlot FK exists (no slot = no gate).
2. The recommended approach: `if (sale.signingSlot === null) { /* allow payment -- legacy sale */ }`. Only enforce the gate when a SigningSlot IS linked but its status is not COMPLETADA.
3. CONTADO, CESION, and PERMUTA sales must be explicitly excluded from the gate regardless. Check `sale.status` against an allowlist: `["CONTADO", "CESION"].includes(sale.status)` skips the gate.
4. Add a clear UI indicator on the sale detail page: "Firma no requerida (venta anterior al sistema de firmas)" vs "Firma pendiente - pagos bloqueados."

**Detection:** After deployment, test: can a COBRANZA user pay installment #5 on a sale created last month (no signing slot)? If not, the gate is too aggressive.

**Phase:** Payment gating logic -- AFTER schema migration, AFTER signing management UI exists.

---

### Pitfall 3: Auto-Commission Creates Duplicate CashMovements on Double Status Change

**What goes wrong:** When a SigningSlot status transitions to COMPLETADA, the system auto-creates a CashMovement of type COMISION. If the user accidentally clicks "Completar Firma" twice (double-click, slow network, retry), or if the status is toggled COMPLETADA -> REPROGRAMADA -> COMPLETADA, a duplicate COMISION CashMovement is created. This doubles the commission payout.

**Why it happens:** The current `signingModel.updateStatus()` is a simple Prisma update with no side effects. Adding commission auto-creation as a side effect of status change introduces a new invariant: "exactly one COMISION per signing completion." The existing codebase has no idempotency guards for CashMovement creation.

**Consequences:**
- Seller paid double commission
- Cash balance reports inflated
- Difficult to detect because commission amounts are small relative to sale amounts
- Once paid out, the incorrect cash movement must be manually reversed

**Prevention:**
1. Before creating the COMISION CashMovement, check for existence: `SELECT COUNT(*) FROM cash_movements WHERE sale_id = X AND type = 'COMISION'`. If > 0, skip.
2. Wrap the check + create in a transaction to prevent TOCTOU race conditions.
3. On the UI side, disable the "Completar" button immediately on click and show a loading state.
4. Add an audit log entry specifically for commission creation with the signing slot ID, so the link is traceable.
5. Consider making the commission creation a separate explicit action (button "Generar Comision") rather than auto-triggered, if the client wants manual approval. The PROJECT.md says "no manual approval" so auto is correct, but the idempotency guard is mandatory.

**Detection:** Query: `SELECT sale_id, COUNT(*) as cnt FROM cash_movements WHERE type = 'COMISION' GROUP BY sale_id HAVING cnt > 1`. Should return 0 rows. Add this as a periodic health check.

**Phase:** Auto-commission logic -- requires its own focused phase with dedicated tests.

---

### Pitfall 4: Exchange Rate Precision Loss in ARS<->USD Display Conversion

**What goes wrong:** When showing the ARS equivalent of a USD installment (or vice versa), JavaScript floating-point math produces imprecise results. Example: USD 1,500 * ARS 1,285.50 = ARS 1,928,250 exactly, but `1500 * 1285.5` in JS = `1928250.0` (works). However, USD 847.33 * ARS 1,285.50 = ARS 1,089,262.815 -- rounding this to 2 decimals can show ARS 1,089,262.82 to the user, but if the actual payment uses ARS 1,089,262.81 (banker's rounding), the system says "insufficient amount." The existing `convertCurrency()` in `exchange-rate.ts` does raw multiplication with no rounding.

**Why it happens:** The `convertCurrency` function (line 59-68 in exchange-rate.ts) returns raw `amount * rate` or `amount / rate` without rounding. The calling code assumes the result is display-ready. CashMovement stores `Decimal(14,2)` which truncates at the DB level, but the UI display and the validation comparison both happen in JS float-land.

**Consequences:**
- User sees "USD 847.33 = ARS 1,089,262.82" but when they enter ARS 1,089,262.82, the backend calculates a slightly different number and rejects it
- Rounding direction inconsistency: display rounds one way, validation rounds another
- Client reports: "I entered exactly what the system told me to enter and it says it's wrong"

**Prevention:**
1. Round the converted amount to 2 decimal places in `convertCurrency` itself: `Math.round(result * 100) / 100`.
2. When validating payment sufficiency, use a tolerance: `Math.abs(paidArs - expectedArs) < 0.01` rather than strict equality/greater-than.
3. In the UI, show the conversion as an approximation with explicit wording: "~ ARS 1,089,262.82 (cotizacion blue venta: 1,285.50)".
4. Store the exchange rate used for the conversion alongside the CashMovement (already done via `exchangeRateId` and `manualRate`), so there is no ambiguity about which rate was applied.
5. Use `Decimal` from Prisma/decimal.js for intermediate calculations if precision is critical, but for display purposes, consistent rounding at 2 decimals is sufficient.

**Detection:** Test with known edge-case rates. ARS blue dollar rates > 1000 amplify rounding errors. Test: USD 1.01 * rate 1285.50 = ARS 1298.355 -- does the system round to 1298.36 or 1298.35?

**Phase:** Exchange rate validation -- can be done in parallel with payment gating since it's an independent concern.

---

### Pitfall 5: Multi-Lote (groupId) Sales with Shared Signing Create N:1 Ambiguity

**What goes wrong:** A multi-lote sale (e.g., groupId "SUMMER-MARCELO" with lots 212, 213, 214) creates 3 Sale records sharing one groupId. The signing is ONE event for all 3 lots. If SigningSlot gets a `saleId` FK, which of the 3 Sale IDs does it point to? If it points to just one, the other two sales appear to have no signing. If SigningSlot gets a separate `groupId` field, it duplicates the grouping concept.

**Why it happens:** The Sale model uses `groupId` (a string tag) for multi-lote grouping rather than a parent-child relationship. This is a flat grouping -- all 3 sales are peers, none is the "primary." Adding a 1:1 FK doesn't model this correctly.

**Consequences:**
- Payment gating fails for 2 of 3 sales in a group (they have no signing linked)
- Commission is either created 3 times (once per sale) or 0 times (if only checked against the one linked sale)
- UI shows inconsistent signing status across sales in the same group

**Prevention:**
1. Add `groupId String?` to SigningSlot (not `saleId`). This links the signing to the group, not to one sale.
2. ALSO add `saleId String? @unique` for non-grouped (single-lot) sales. The lookup logic becomes: `if sale.groupId -> find SigningSlot by groupId; else -> find SigningSlot by saleId`.
3. For commission calculation: commission should be calculated ONCE per group. Store `commissionAmount` on the primary sale (lowest lot number, or first created). The commission CashMovement should reference this primary sale's ID.
4. Test the exact scenario: 3 lots sold together, 1 signing, signing completes -> verify exactly 1 COMISION CashMovement created, all 3 sales show "Firma Completada."
5. Alternative simpler approach: add `signingSlotId` FK on the Sale model instead. Multiple sales point to one SigningSlot. This is cleaner: `Sale.signingSlotId -> SigningSlot.id`. Then `SigningSlot` has a `sales: Sale[]` relation.

**Detection:** Query after implementation: `SELECT group_id, COUNT(DISTINCT signing_status) as statuses FROM sales WHERE group_id IS NOT NULL GROUP BY group_id HAVING statuses > 1` -- should return 0 (all sales in a group must show same signing status).

**Phase:** Schema design -- must be resolved BEFORE any signing logic is written.

---

### Pitfall 6: Signing Status Change Without Transaction Causes Partial State

**What goes wrong:** Completing a signing triggers multiple side effects: (1) update SigningSlot.status to COMPLETADA, (2) create COMISION CashMovement, (3) potentially update Sale status or signing display fields, (4) create notification. If these are not in a single transaction and step 2 fails (e.g., seller has no commissionRate), the signing shows COMPLETADA but no commission was created. The user sees "completed" and assumes the commission was paid.

**Why it happens:** The current `signingModel.updateStatus()` is a bare `prisma.signingSlot.update()` with no transaction wrapper (line 113-118 in signing.model.ts). Adding side effects to this call without wrapping everything in `$transaction` creates partial-commit scenarios.

**Consequences:**
- SigningSlot shows COMPLETADA but commission CashMovement missing
- No easy way to detect this inconsistency without a health-check query
- Manual correction needed after the fact

**Prevention:**
1. Create a new service function `completeSigningSlot(signingId, userId)` in a dedicated `signing.service.ts`.
2. This function wraps ALL side effects in a single `prisma.$transaction()`:
   - Validate signing exists and is in valid state for completion
   - Update signing status
   - Look up the associated sale(s) and seller
   - Create COMISION CashMovement (if seller has commissionRate and commissionAmount)
   - Create audit log entry
3. If ANY step fails, the entire transaction rolls back.
4. The model layer (`signing.model.ts`) should NOT be called directly for status changes that have side effects. Route through the service.
5. Follow the existing pattern from `paymentService.payInstallment()` which correctly uses `$transaction`.

**Detection:** Post-deploy check: `SELECT ss.id FROM signing_slots ss WHERE ss.status = 'COMPLETADA' AND NOT EXISTS (SELECT 1 FROM cash_movements cm WHERE cm.sale_id = <linked-sale> AND cm.type = 'COMISION')`. Non-zero = problem.

**Phase:** Auto-commission implementation -- same phase as Pitfall 3.

---

## Moderate Pitfalls

---

### Pitfall 7: Notification referenceType "SigningSlot" String Is Not Type-Checked

**What goes wrong:** The existing cron route (line 243 in route.ts) creates notifications with `referenceType: "SigningSlot"`. The notification model stores this as a plain `String?` (line 665 in schema.prisma). If the new feature adds a different referenceType string (e.g., "Signing" or "FirmaSlot"), the notification click-handler in the frontend won't know how to route to the correct detail page. Existing notifications use "ExtraCharge", "Installment", "SigningSlot" -- these are conventions, not enforced types.

**Prevention:**
1. Document the canonical referenceType strings in a constants file: `NOTIFICATION_REFERENCE_TYPES = { EXTRA_CHARGE: "ExtraCharge", INSTALLMENT: "Installment", SIGNING_SLOT: "SigningSlot", SALE: "Sale" }`.
2. Use the constant in both creation and routing. Never use raw strings.
3. Add "Sale" as a new referenceType for commission-related notifications.
4. In the notification click handler, add routing for `referenceType === "Sale"` -> `/ventas/[id]`.

**Phase:** Notification updates -- can be done alongside any phase that creates notifications.

---

### Pitfall 8: Seller Without commissionRate or Sale Without commissionAmount

**What goes wrong:** The auto-commission feature assumes `sale.commissionAmount` is set and `sale.seller.commissionRate` is available. But in the current schema, both are nullable (`commissionAmount Decimal?`, `commissionRate Decimal?`). A sale can have a `sellerId` but no `commissionAmount` (the field was left empty when the sale was created). The auto-commission code creates a CashMovement with amount 0, or throws an error mid-transaction.

**Why it happens:** The `commissionAmount` field on Sale is optional in the schema (line 343) and in the Zod validation (line 49 in sale.schema.ts -- `.optional()`). Older sales may have sellers assigned but no commission amount recorded.

**Consequences:**
- CashMovement COMISION with usdExpense=0 clutters the cash register
- Or: transaction fails, signing completion is blocked by a missing data issue
- User sees "Error al completar firma" with no indication that the problem is a missing commission field

**Prevention:**
1. When completing a signing, check: if `sale.commissionAmount` is null or 0, AND `sale.sellerId` exists, log a warning but skip commission creation (not an error). The signing should still complete.
2. If `sale.sellerId` is null, skip commission entirely (no seller = no commission).
3. If `sale.commissionAmount` > 0 but `sale.seller.commissionRate` is null, use the `commissionAmount` directly (it's already an absolute value, not a percentage).
4. Surface a UI warning on the sale detail page: "Esta venta tiene vendedor pero no tiene monto de comision configurado."

**Phase:** Auto-commission -- validation checks within the commission creation logic.

---

### Pitfall 9: Adding saleId FK to SigningSlot Allows Multiple Signings Per Sale

**What goes wrong:** If `saleId` on SigningSlot is not unique, a sale could accidentally get multiple signing slots. The system then doesn't know which one to check for payment gating (the PENDIENTE one? The COMPLETADA one?). If the most recent one is PENDIENTE but an older one was COMPLETADA, payments may be incorrectly blocked.

**Prevention:**
1. If using `saleId` on SigningSlot: add `@@unique([saleId])` constraint -- BUT this blocks rescheduling (CANCELADA + new slot for same sale).
2. Better approach: allow multiple SigningSlots per Sale (rescheduling scenario is real), but only one can be in an active status. The payment gate checks: `ANY signing for this sale has status COMPLETADA`. Don't check the most recent -- check if ANY is completed.
3. Query pattern: `prisma.signingSlot.findFirst({ where: { saleId, status: "COMPLETADA" } })`. Existence = gate passed.
4. For display: show the latest non-CANCELADA signing slot's status.

**Phase:** Schema design and payment gating.

---

### Pitfall 10: CashMovement COMISION Uses Wrong Currency/Direction Fields

**What goes wrong:** The existing CashMovement model has 4 amount fields: `arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`. A commission is an EXPENSE to the company (money going out to the seller). If the code accidentally sets `usdIncome` instead of `usdExpense`, the cash balance shows a credit instead of a debit. The commission amount on Sale is stored in the sale's currency, but the seller may want payment in a different currency.

**Why it happens:** There is no existing code that creates COMISION CashMovements -- this is entirely new. The developer must correctly map: commission paid in USD = `usdExpense: amount`, commission paid in ARS = `arsExpense: amount`. This is the opposite of payment income (CUOTA) which uses `usdIncome`/`arsIncome`.

**Prevention:**
1. Commission CashMovement data must use `Expense` fields:
   ```typescript
   {
     type: "COMISION",
     usdExpense: currency === "USD" ? amount : null,
     arsExpense: currency === "ARS" ? amount : null,
     usdIncome: null,
     arsIncome: null,
   }
   ```
2. The `currency` for the commission should default to the sale's currency.
3. Write a unit test that creates a COMISION CashMovement and verifies: `usdIncome === null && arsIncome === null` (commissions are never income to the company).
4. Add a concept template: `COMISION VENDEDOR ${sellerName} - LOTE ${lotNumber}`.

**Phase:** Auto-commission implementation.

---

### Pitfall 11: Exchange Rate Stale/Missing on Weekends and Holidays

**What goes wrong:** The dolarapi.com API may not update on weekends/holidays (no market activity). The `exchangeRateModel.findByDate(today)` returns null on a Saturday if the last rate was stored on Friday. The payment form shows "No se pudo obtener cotizacion" and the user can't proceed, OR the system silently uses a stale rate from days ago.

**Why it happens:** The `findByDate` method (line 4-18 in exchange-rate.model.ts) searches for a rate within the exact day. No fallback to the most recent available rate.

**Prevention:**
1. For the ARS<->USD display feature, use `exchangeRateModel.findLatest()` as fallback when `findByDate(today)` returns null.
2. Show the rate's date in the UI: "Cotizacion blue venta: ARS 1,285.50 (14/03/2026)" -- so the user knows it's from Friday, not today.
3. The `manualRate` field on CashMovement already allows the user to override. Display the auto-fetched rate as a suggestion, with an editable field.
4. Never block a payment because the exchange rate is unavailable. The rate is informational for the display feature, not a hard requirement.

**Phase:** Exchange rate validation.

---

### Pitfall 12: Prisma Migration Fails Because SigningSlot.saleId References Sale.id Which Uses CUID

**What goes wrong:** Adding an FK is straightforward, but the migration SQL must match exactly. If the migration accidentally creates `sale_id` as an integer column (Prisma default for some providers) rather than `String`, the FK constraint fails. This is unlikely with Prisma but possible if the migration is manually edited.

**Prevention:**
1. Use `npx prisma migrate dev --name add-signing-sale-fk` and let Prisma generate the SQL.
2. Review the generated SQL before applying to production: verify the column type matches `text` or `varchar` (same as `sales.id`).
3. Back up the production database before running `npx prisma migrate deploy`.
4. Test the migration against a copy of production data first.

**Phase:** Schema migration -- first phase.

---

## Minor Pitfalls

---

### Pitfall 13: Signing Calendar UI Doesn't Refresh After Status Change

**What goes wrong:** The firmas page uses `getSignings()` and `getSigningsByWeek()` server actions called at page load. When a user completes a signing from the sale detail page (a different route), the firmas calendar still shows the old status until a full page reload.

**Prevention:**
1. Call `revalidatePath("/firmas")` in the signing completion service, alongside the existing `revalidatePath("/ventas")`.
2. If the signing status is changed from within the sale detail page, also revalidate `/ventas/[id]`.

**Phase:** Any phase that changes signing status.

---

### Pitfall 14: Existing Tests Mock Sale Without signingSlot Field

**What goes wrong:** The existing 51 tests mock Sale objects that don't include any signing-related fields. After adding `signingSlotId` or a signing relation to Sale, these mocks break with TypeScript errors (missing required field) or produce false positives (tests pass but don't test the gating logic).

**Prevention:**
1. Add `signingSlotId: null` (or `signingSlot: null`) to ALL existing Sale test fixtures.
2. Write new tests specifically for the gating logic with signingSlot present in various states.
3. The existing payment-actions integration tests should still pass with `signingSlotId: null` (legacy sale, no gate).

**Phase:** Immediately after schema changes -- update test fixtures before writing new tests.

---

### Pitfall 15: Audit Log Does Not Capture Commission Auto-Creation Source

**What goes wrong:** The existing `logAction()` pattern logs entity/action/data. If a COMISION CashMovement is auto-created by signing completion, the audit log shows it as a CashMovement CREATE, but there's no indication it was auto-generated vs manually entered. If questioned later, the trail is ambiguous.

**Prevention:**
1. Include `{ source: "AUTO_FIRMA_COMPLETADA", signingSlotId: "..." }` in the `newData` of the audit log entry for auto-created commissions.
2. This distinguishes auto-commissions from any future manual commission entries.

**Phase:** Auto-commission implementation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema migration (add FK to SigningSlot) | #1 Text-to-FK migration, #12 column type mismatch, #5 multi-lote groupId ambiguity | Decide FK direction first: `Sale.signingSlotId` or `SigningSlot.saleId`. Nullable. Test on copy of prod data. |
| Payment gating | #2 Breaks existing sales, #9 multiple signings per sale | Gating only when signing exists AND is not COMPLETADA. Legacy sales = no gate. |
| Auto-commission | #3 Duplicate CashMovements, #6 partial state, #8 missing commissionAmount, #10 wrong currency direction | Idempotency check before creation. Full transaction. Handle null commissionAmount gracefully. |
| Exchange rate display | #4 Rounding errors, #11 missing weekend rates | Round to 2 decimals. Fallback to latest rate. Show rate date. |
| Notification updates | #7 referenceType strings | Use constants, add routing for "Sale" type. |
| Test updates | #14 Broken mocks | Add signingSlot: null to all existing fixtures first. |
| UI/UX | #13 Stale calendar | revalidatePath on all affected routes. |

---

## Dependency Order for Pitfall Mitigation

```
#5 (multi-lote FK design) ---- Must be resolved before ANY code
         |
         v
#1 (schema migration) -------- Run migration on dev/staging first
         |
         v
#14 (update test fixtures) --- Before writing new feature tests
         |
    +----+----+
    |         |
    v         v
#2 (payment gate) -----+  #4, #11 (exchange rate) --- Independent
    |                   |
    v                   v
#3, #6, #8, #10 (auto-commission) ---- Depends on signing completion existing
    |
    v
#15 (audit trail) ---- Alongside commission
#7 (notification types) ---- Alongside any notification creation
#13 (UI revalidation) ---- Last, after all server logic works
```

---

## Summary Risk Matrix

| Pitfall | Severity | Likelihood | Impact if Missed |
|---------|----------|------------|------------------|
| #1 Text-to-FK migration | CRITICAL | HIGH | Migration fails in production |
| #2 Payment gate breaks existing sales | CRITICAL | VERY HIGH | Revenue collection blocked |
| #3 Duplicate commission | CRITICAL | HIGH | Financial data corruption |
| #4 Exchange rate rounding | MODERATE | HIGH | User frustration, payment rejections |
| #5 Multi-lote FK ambiguity | CRITICAL | HIGH | Wrong architecture, requires rewrite |
| #6 Partial state on completion | CRITICAL | MEDIUM | Invisible data inconsistency |
| #7 referenceType strings | LOW | MEDIUM | Broken notification links |
| #8 Missing commissionAmount | MODERATE | HIGH | Transaction failure or 0-amount records |
| #9 Multiple signings per sale | MODERATE | MEDIUM | Wrong gating behavior |
| #10 Wrong currency direction | CRITICAL | MEDIUM | Cash balance reports wrong |
| #11 Missing weekend rates | LOW | HIGH | UI inconvenience |
| #12 Migration column type | LOW | LOW | Blocked by Prisma generation |
| #13 Stale calendar UI | LOW | HIGH | Minor UX issue |
| #14 Broken test fixtures | MODERATE | CERTAIN | All existing tests fail |
| #15 Audit trail ambiguity | LOW | MEDIUM | Traceability gap |

---

*Pitfalls research for: v1.2 Integracion Firma-Venta milestone*
*Researched: 2026-03-16*
*Sources: Direct codebase analysis of prisma/schema.prisma, payment.service.ts, sale.service.ts, signing.model.ts, exchange-rate.ts, cron route.ts, notification.model.ts, and existing test infrastructure*
