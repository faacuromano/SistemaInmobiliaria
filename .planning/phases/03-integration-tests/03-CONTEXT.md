# Phase 3: Integration Tests - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Integration tests for server actions: `sale.actions` (createSale, cancelSale) and `payment.actions` (payInstallment, payExtraCharge). Tests verify the full business flows with mocked dependencies — sale creation updates lot status and generates installments, cancellation reverts lot status, payment creates CashMovements and marks installments paid, and the partial-failure recovery path when recalculation throws after a committed transaction.

</domain>

<decisions>
## Implementation Decisions

### Mocking Depth
- Mock everything at module boundaries: prisma, requirePermission, revalidatePath, logAction, generateReceipt, generateInstallments, recalculateInstallments — true isolation per test
- Mock Next.js functions (vi.mock('next/cache') for revalidatePath) — no Next.js runtime needed, actions stay unchanged
- Always authorize with mockAuthenticatedUser from Phase 1 — focus on business logic, not auth. RBAC testing is a separate concern
- logAction and generateReceipt should be silently mocked (no-op) — they're side effects not central to the flows being tested

### FormData Construction
- Create helper builders: buildSaleFormData({lotId, personId, ...}) and buildPaymentFormData({installmentId, amount, ...}) that create FormData with sensible defaults. Override only what each test needs
- Builders should live local to action tests (e.g., src/__tests__/integration/ or next to test files), not in the shared helpers directory — they're specific to server action testing
- Use independent realistic data (saleDate: '2025-06-15', totalPrice: 25000, etc.) — not coupled to Phase 2 fixtures
- Include 1-2 validation error tests per action (missing required fields, invalid amounts) to prove the full FormData → Zod → error pipeline

### Partial Failure Behavior (ACT-05, ACT-06)
- Current behavior is correct: when recalculateInstallments throws after payment commit, the catch returns { success: false } to the user. Payment data is safe (committed), recalculation can be retried
- ACT-06 test MUST verify committed state despite error response: assert $transaction mock shows CashMovement.create and ExtraCharge.update were called before the throw, even though action returns { success: false }
- ACT-05 test MUST verify recalculateInstallments was called with correct args (saleId, extraChargeAmount) after a fully-paid extra charge — proves the chain is wired
- Test partial payment scenario: partial payment → extraCharge status = PARCIAL, recalculateInstallments NOT called. Then full payment → status = PAGADA, recalculation IS called

### Claude's Discretion
- Transaction mock strategy (how to mock prisma.$transaction callback)
- Test file organization (single file per action module or split further)
- Exact describe/it structure and naming
- Whether to use beforeEach for common mock setup

</decisions>

<specifics>
## Specific Ideas

- All monetary assertions must use `expectMoney` helper from Phase 1 (per FIN-09 pattern)
- The `payExtraCharge` action has a subtle control flow: `becamePaid` flag set inside transaction, `recalculateInstallments` called outside — tests must verify this ordering
- `createSale` has ~10 FormData fields — the builder pattern is essential to avoid test verbosity
- The `cancelSale` action validates `sale.status !== "ACTIVA"` via `saleModel.findById` — mock must return a sale object with the correct shape

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-integration-tests*
*Context gathered: 2026-02-26*
