# Phase 9: Service Layer - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement business rules that enforce payment gating (require completed signing before paying installments/refuerzos), exempt certain sale types, and auto-generate seller commissions when a signing is completed. This is pure service-layer logic — no UI changes.

</domain>

<decisions>
## Implementation Decisions

### Payment Gate Behavior
- Gate check lives in the **service layer** (`payment.service.ts`), at the top of `payInstallment()` and `payExtraCharge()` before the transaction
- **Gate logic:** If sale has a linked SigningSlot AND that SigningSlot's status is NOT `COMPLETADA`, block payment with `ServiceError`
- **No SigningSlot = no gate:** Legacy sales without any linked SigningSlot are allowed to pay (backward compatibility)
- **Exempt sale types:** CONTADO, CESION, and PERMUTA sales skip the signing gate entirely regardless of SigningSlot status
- **Delivery payments exempt:** `recordDeliveryPayment` (ENTREGA type) is NOT gated — deliveries happen at time of sale, before signing
- **Error message:** "No se puede registrar el pago: la firma de escritura no está completada. Complete la firma antes de registrar pagos."

### Commission Creation (Auto-Commission)
- **Trigger location:** New `src/server/services/signing.service.ts` with a `completeSigningSlot()` function
- `updateSigningStatus` in `signing.actions.ts` calls `completeSigningSlot()` when new status is `COMPLETADA`
- Commission creation happens **inside a transaction** (atomic with status update — if commission fails, status doesn't update)
- Commission amount comes from `Sale.commissionAmount` field
- **Skip if null/0:** If `commissionAmount` is null or 0, no CashMovement is created (silent skip — no warning)
- **Currency follows sale:** If sale is USD, commission is `usdExpense`. If ARS, `arsExpense`
- **Concept format:** `COMISION - LOTE {lotNumber}` (matches existing patterns like `CUOTA 3 - LOTE A12`)
- **CashMovement fields:** type=COMISION, saleId=sale.id, personId=null (commission goes to seller, not client), developmentId from sale.lot, sellerId (if CashMovement has that field, otherwise use notes)

### Multi-Lote Handling
- Commission created for each Sale individually that has the SigningSlot linked via saleId
- No groupId lookup — Phase 8 decided each sale links individually to the signing

### Edge Cases & Idempotency
- **Duplicate prevention (COMIS-02):** Before creating commission, check `CashMovement.findFirst({ where: { type: COMISION, saleId } })`. If exists, skip
- **Signing reopened/cancelled after commission:** Leave commission CashMovement as-is (per PROJECT.md out-of-scope: "Reversa de comision al reabrir firma — manejar manualmente si ocurre")
- **Cancelled sale with completed signing:** No special handling — commission was already created at completion time

### Claude's Discretion
- Exact structure of the signing.service.ts file (function signatures, helper extraction)
- Whether to add the signing gate as a shared helper function or inline in each payment function
- Audit log entries for commission creation
- How to fetch the sale + lot info needed for the commission (include in signing query or separate fetch)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Service Layer (where changes go)
- `src/server/services/payment.service.ts` — Current payInstallment() and payExtraCharge() where gate check will be added
- `src/server/services/sale.service.ts` — Sale creation flow, existing ServiceError pattern, transaction patterns
- `src/server/actions/signing.actions.ts` — updateSigningStatus() that will call the new signing service

### Data Layer (Phase 8 output)
- `prisma/schema.prisma` — SigningSlot model with saleId FK, Sale model with signingSlots relation, CashMovement types (COMISION at line 457)
- `src/server/models/signing.model.ts` — Signing model with sale include in queries
- `src/server/models/sale.model.ts` — Sale model with signingSlots include

### Shared Utilities
- `src/lib/service-error.ts` — ServiceError class for business rule violations
- `src/lib/audit.ts` — logAction() for audit trail

### Requirements
- `.planning/REQUIREMENTS.md` — PAGO-01, PAGO-02, PAGO-03, COMIS-01, COMIS-02, COMIS-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ServiceError` class — used for all business rule violations, caught by action layer and returned as `{ success: false, error: message }`
- `logAction()` — audit trail for all mutations
- `prisma.$transaction()` — established pattern for atomic operations (used in payment.service.ts and sale.service.ts)
- `generateReceipt()` — pattern for post-transaction side effects (called outside transaction)

### Established Patterns
- Service functions accept typed params objects and throw `ServiceError` on validation failure
- Action layer catches `ServiceError` and returns `ActionResult`
- CashMovement creation: income fields (usdIncome/arsIncome) for client payments, expense fields (usdExpense/arsExpense) for company expenses like commissions
- Transaction includes: fetch entity → validate → create movement → update status (payment flow pattern)

### Integration Points
- `payment.service.ts` payInstallment() — add signing gate check before transaction (fetch sale → check signingSlots)
- `payment.service.ts` payExtraCharge() — same signing gate check
- `signing.actions.ts` updateSigningStatus() — call new signing.service.ts when status=COMPLETADA
- New `src/server/services/signing.service.ts` — completeSigningSlot() function with commission logic

</code_context>

<specifics>
## Specific Ideas

- The payment gate query needs to join Sale → signingSlots to check status. Since sale.model.ts findById already includes signingSlots (Phase 8), the signing status is readily available.
- The existing `installment.sale` include in the transaction already fetches the sale — extend that include to also fetch `signingSlots` for the gate check.

</specifics>

<deferred>
## Deferred Ideas

- Commission reversal on signing reopen — explicitly out of scope per PROJECT.md
- Multi-lote commission via groupId lookup (COMIS-04) — deferred to v1.3
- Payment gate notification (alert user why payment is blocked) — Phase 10 UI handles this with disabled buttons + tooltips

</deferred>

---

*Phase: 09-service-layer*
*Context gathered: 2026-03-16*
