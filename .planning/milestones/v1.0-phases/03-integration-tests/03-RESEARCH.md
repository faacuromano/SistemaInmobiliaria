# Phase 3: Integration Tests - Research

**Researched:** 2026-02-26
**Domain:** Server action integration testing with Vitest + mocked Prisma
**Confidence:** HIGH

## Summary

Phase 3 tests six server actions across two modules (`sale.actions.ts` and `payment.actions.ts`) using the Vitest + vitest-mock-extended stack already established in Phases 1-2. The core technical challenge is mocking Prisma interactive transactions (`$transaction` with callback), which differs from the array-based `$transaction` pattern already tested in Phase 2's recalculator tests. The `payExtraCharge` action has a subtle control flow where `becamePaid` is set inside the transaction callback, but `recalculateInstallments` is called outside -- this means the partial-failure path (ACT-06) catches recalculation errors AFTER the transaction is committed, returning `{ success: false }` while payment data persists.

All six requirements (ACT-01 through ACT-06) are well-defined, the source code is clear, and the existing test infrastructure (prismaMock, mockAuthenticatedUser, expectMoney) covers all foundation needs. No new dependencies are required. The only research-worthy challenge is the `$transaction` callback mock pattern, which is well-documented in the Prisma community.

**Primary recommendation:** Mock `prisma.$transaction` with `mockImplementation((cb) => cb(prismaMock))` to pass the same DeepMockProxy as the `tx` parameter. Build FormData helper functions local to the integration test directory. Use `vi.mock` at module level for all six external dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Mock everything at module boundaries: prisma, requirePermission, revalidatePath, logAction, generateReceipt, generateInstallments, recalculateInstallments -- true isolation per test
- Mock Next.js functions (vi.mock('next/cache') for revalidatePath) -- no Next.js runtime needed, actions stay unchanged
- Always authorize with mockAuthenticatedUser from Phase 1 -- focus on business logic, not auth. RBAC testing is a separate concern
- logAction and generateReceipt should be silently mocked (no-op) -- they're side effects not central to the flows being tested
- Create helper builders: buildSaleFormData({lotId, personId, ...}) and buildPaymentFormData({installmentId, amount, ...}) that create FormData with sensible defaults. Override only what each test needs
- Builders should live local to action tests (e.g., src/__tests__/integration/ or next to test files), not in the shared helpers directory -- they're specific to server action testing
- Use independent realistic data (saleDate: '2025-06-15', totalPrice: 25000, etc.) -- not coupled to Phase 2 fixtures
- Include 1-2 validation error tests per action (missing required fields, invalid amounts) to prove the full FormData -> Zod -> error pipeline
- Current payExtraCharge behavior is correct: when recalculateInstallments throws after payment commit, the catch returns { success: false } to the user. Payment data is safe (committed), recalculation can be retried
- ACT-06 test MUST verify committed state despite error response: assert $transaction mock shows CashMovement.create and ExtraCharge.update were called before the throw, even though action returns { success: false }
- ACT-05 test MUST verify recalculateInstallments was called with correct args (saleId, extraChargeAmount) after a fully-paid extra charge -- proves the chain is wired
- Test partial payment scenario: partial payment -> extraCharge status = PARCIAL, recalculateInstallments NOT called. Then full payment -> status = PAGADA, recalculation IS called
- All monetary assertions must use expectMoney helper from Phase 1 (per FIN-09 pattern)
- The payExtraCharge action has a subtle control flow: becamePaid flag set inside transaction, recalculateInstallments called outside -- tests must verify this ordering
- createSale has ~10 FormData fields -- the builder pattern is essential to avoid test verbosity
- The cancelSale action validates sale.status !== "ACTIVA" via saleModel.findById -- mock must return a sale object with the correct shape

### Claude's Discretion
- Transaction mock strategy (how to mock prisma.$transaction callback)
- Test file organization (single file per action module or split further)
- Exact describe/it structure and naming
- Whether to use beforeEach for common mock setup

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACT-01 | sale.actions create sale test -- verifies lot status changes to VENDIDO and installments are generated | createSale uses $transaction callback with tx.sale.create + tx.installment.createMany + tx.lot.update. Mock $transaction to invoke callback with prismaMock. Assert lot.update called with VENDIDO and installment.createMany called with correct count |
| ACT-02 | sale.actions cancel sale test -- verifies lot status reverts to DISPONIBLE | cancelSale uses saleModel.findById (must mock) then $transaction with tx.sale.update + tx.lot.update. Assert lot.update called with DISPONIBLE |
| ACT-03 | sale.actions contado sale test -- verifies zero installments and lot status CONTADO | createSale with status=CONTADO, totalInstallments=0. Transaction should NOT call installment.createMany. Lot updated to CONTADO via getLotStatusForSale mapping |
| ACT-04 | payment.actions payment recording test -- verifies CashMovement created and installment marked PAGADA | payInstallment uses $transaction callback. Mock installment.findUnique with sale+lot include shape. Assert cashMovement.create and installment.update called with PAGADA status |
| ACT-05 | payment.actions payment with recalculation test -- verifies recalculation triggered after refuerzo payment | payExtraCharge fully-paid path: becamePaid=true -> recalculateInstallments called OUTSIDE transaction with (saleId, amount). Must also test partial payment where recalculate is NOT called |
| ACT-06 | payment.actions partial failure test -- verifies behavior when payment commits but recalculation fails | Mock recalculateInstallments to throw after $transaction resolves. Assert action returns { success: false } AND that cashMovement.create + extraCharge.update were still called (committed data persists) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.18 | Test runner | Already configured in vitest.config.ts, Vite-native |
| vitest-mock-extended | 3.1.0 | Deep Prisma mocking | Already installed, provides mockDeep/DeepMockProxy |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | 4.0.18 | Coverage reporting | Already configured, src/server coverage includes actions |
| jsdom | 28.1.0 | DOM environment | Already configured in vitest.config.ts (needed for FormData) |

### No New Dependencies Required
The existing Phase 1 infrastructure covers all needs. The `jsdom` environment already provides a global `FormData` constructor, which is critical since server actions receive FormData objects.

## Architecture Patterns

### Recommended Test File Structure
```
src/__tests__/
├── helpers/              # Phase 1 shared helpers (existing)
│   ├── auth.ts           # mockAuthenticatedUser
│   ├── prisma.ts         # prismaMock (DeepMockProxy<PrismaClient>)
│   └── money.ts          # expectMoney
├── fixtures/             # Phase 2 fixtures (existing)
│   └── installment-fixtures.ts
├── unit/                 # Phase 2 unit tests (existing)
│   └── lib/
└── integration/          # Phase 3 NEW
    ├── helpers/
    │   └── form-data-builders.ts  # buildSaleFormData, buildPaymentFormData
    ├── sale-actions.test.ts       # ACT-01, ACT-02, ACT-03
    └── payment-actions.test.ts    # ACT-04, ACT-05, ACT-06
```

### Pattern 1: Interactive Transaction Mock (Claude's Discretion -- RECOMMENDED)

**What:** Mock `prisma.$transaction` to invoke its callback argument with `prismaMock` itself, so `tx.sale.create` resolves to the same mock as `prismaMock.sale.create`.

**When to use:** All server actions in this phase use interactive transactions (callback pattern), NOT the array pattern.

**Example:**
```typescript
// Source: Prisma community pattern (https://github.com/prisma/prisma/discussions/14435)
// + adapted for existing prismaMock from Phase 1

import { prismaMock } from '@/__tests__/helpers/prisma'

// In test setup or beforeEach:
prismaMock.$transaction.mockImplementation(async (cb: any) => {
  return cb(prismaMock)
})
```

**Why this works:** The `prismaMock` is a `DeepMockProxy<PrismaClient>` -- it already has all nested model methods auto-mocked. When the action does `tx.sale.create(...)`, it calls `prismaMock.sale.create(...)`, which we can configure with `mockResolvedValue`.

**IMPORTANT distinction from Phase 2:** The recalculator test mocked `$transaction` with array pattern: `prismaMock.$transaction.mockImplementation((ops: any) => Promise.resolve(ops))`. Phase 3 actions use the callback pattern, so the mock must invoke the callback.

### Pattern 2: FormData Builder with Sensible Defaults

**What:** Helper functions that construct FormData objects with all required fields, allowing tests to override only what matters.

**Example:**
```typescript
// Source: CONTEXT.md locked decision

interface SaleFormDataOverrides {
  lotId?: string
  personId?: string
  sellerId?: string
  saleDate?: string
  totalPrice?: string
  downPayment?: string
  currency?: string
  totalInstallments?: string
  firstInstallmentAmount?: string
  firstInstallmentMonth?: string
  collectionDay?: string
  commissionAmount?: string
  status?: string
  notes?: string
  paymentWindow?: string
}

export function buildSaleFormData(overrides: SaleFormDataOverrides = {}): FormData {
  const defaults: Record<string, string> = {
    lotId: 'lot-1',
    personId: 'person-1',
    saleDate: '2025-06-15',
    totalPrice: '25000',
    currency: 'USD',
    totalInstallments: '12',
    firstInstallmentMonth: '2025-07',
    collectionDay: '10',
    status: 'ACTIVA',
  }

  const merged = { ...defaults, ...overrides }
  const formData = new FormData()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      formData.append(key, value)
    }
  }
  return formData
}
```

### Pattern 3: Module-Level vi.mock with Dependency Isolation

**What:** All external dependencies mocked at module level before imports. This is the established project pattern from Phase 2.

**Example for sale.actions.test.ts:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/__tests__/helpers/prisma'
import { mockAuthenticatedUser } from '@/__tests__/helpers/auth'
import { expectMoney } from '@/__tests__/helpers/money'

// Module-level mocks -- hoisted by Vitest
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('SUPER_ADMIN'))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/actions/audit-log.actions', () => ({ logAction: vi.fn() }))
vi.mock('@/lib/installment-generator', () => ({
  generateInstallments: vi.fn().mockReturnValue([
    /* mock installment data */
  ]),
}))

// Import AFTER mocks
import { createSale, cancelSale } from '@/server/actions/sale.actions'
```

### Pattern 4: Asserting Transaction Side Effects

**What:** After calling the action, inspect mock call args to verify what happened inside the transaction.

**Example for ACT-01:**
```typescript
it('creates sale, generates installments, updates lot to VENDIDO', async () => {
  // Setup: lot is available
  prismaMock.lot.findUnique.mockResolvedValue({ id: 'lot-1', status: 'DISPONIBLE' })
  prismaMock.person.findUnique.mockResolvedValue({ id: 'person-1' })
  prismaMock.sale.create.mockResolvedValue({ id: 'sale-new' })

  const formData = buildSaleFormData()
  const result = await createSale({ success: false, error: '' }, formData)

  expect(result).toEqual({ success: true })

  // Verify lot status updated to VENDIDO inside transaction
  expect(prismaMock.lot.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'lot-1' },
      data: { status: 'VENDIDO' },
    })
  )

  // Verify installments were generated
  expect(prismaMock.installment.createMany).toHaveBeenCalled()
})
```

### Anti-Patterns to Avoid
- **Testing implementation sequence order with `toHaveBeenCalledBefore`:** Vitest does not have this matcher. Instead, verify that each expected call was made with correct arguments. The transaction guarantees atomicity in production; in tests, verify the calls happened.
- **Mocking inside describe/it blocks:** `vi.mock` is hoisted to module level. Placing it inside `describe` or `it` blocks causes confusing behavior. Always mock at module level.
- **Using real FormData parsing with actual Zod validation in mocks:** The server actions parse FormData through Zod internally. Tests should provide valid FormData and let the real Zod schema run -- this is part of the integration.
- **Forgetting the `_prevState` parameter:** Both `createSale` and `payInstallment` follow the `useActionState` convention with `_prevState` as first arg. Tests must pass a dummy: `createSale({ success: false, error: '' }, formData)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep Prisma mocking | Manual mock objects for each model | `prismaMock` from `vitest-mock-extended` (Phase 1) | Auto-mocks all 16+ models with type safety |
| Auth session simulation | Inline session objects | `mockAuthenticatedUser(role)` (Phase 1) | Matches exact auth-guard return shape |
| Financial precision assertions | `toBe()` for money values | `expectMoney()` (Phase 1) | Handles IEEE 754 float imprecision |
| FormData construction | Inline `new FormData(); fd.append(...)` x10 | `buildSaleFormData(overrides)` builders | Reduces test verbosity from 15 lines to 1 |

## Common Pitfalls

### Pitfall 1: $transaction Callback vs Array Pattern Confusion
**What goes wrong:** Phase 2 tests mock `$transaction` for array-of-promises pattern (`recalculateInstallments` uses `prisma.$transaction([op1, op2, ...])`). Phase 3 actions use the interactive callback pattern (`prisma.$transaction(async (tx) => {...})`). Using the wrong mock pattern causes silent test failures.
**Why it happens:** Both patterns use the same `$transaction` method but with fundamentally different argument types.
**How to avoid:** Always use `mockImplementation(async (cb) => cb(prismaMock))` for callback transactions. The Phase 2 array pattern mock (`mockImplementation((ops) => Promise.resolve(ops))`) must NOT be reused.
**Warning signs:** `$transaction` mock never invokes the callback; transaction side effects (sale.create, lot.update) never fire.

### Pitfall 2: Zod Schema Expects String Inputs from FormData
**What goes wrong:** Passing numeric values directly to FormData causes Zod validation to fail because `saleCreateSchema` applies `.string().transform(v => parseFloat(v))` -- it expects the raw value to be a string.
**Why it happens:** FormData values are always strings in the browser, but in tests you might accidentally pass a number.
**How to avoid:** Always use string values in FormData builders: `totalPrice: '25000'` not `totalPrice: 25000`. The Zod schema handles the string-to-number transform.
**Warning signs:** Tests return `{ success: false, error: "El precio es requerido" }` despite providing a price value.

### Pitfall 3: cancelSale Uses saleModel.findById, Not prisma Directly
**What goes wrong:** Mocking `prismaMock.sale.findUnique` for cancelSale but the action calls `saleModel.findById(id)` which is a separate import.
**Why it happens:** `cancelSale` uses the model layer, not raw prisma, for its initial fetch. But `createSale` uses raw `prisma.lot.findUnique` directly. Different patterns in the same file.
**How to avoid:** Mock `@/server/models/sale.model` at module level: `vi.mock('@/server/models/sale.model', () => ({ saleModel: { findById: vi.fn() } }))`. Then configure `saleModel.findById.mockResolvedValue(...)`.
**Warning signs:** cancelSale returns `{ success: false, error: "Venta no encontrada" }` even with prismaMock configured.

### Pitfall 4: payExtraCharge becamePaid Flag Scoping
**What goes wrong:** Testing that `recalculateInstallments` is called after full payment requires the mock $transaction to properly set `becamePaid` via the callback's side effect on a closure variable.
**Why it happens:** `becamePaid` is declared with `let` before the `$transaction` call, set inside the callback, then read after `$transaction` resolves. If the mock doesn't await the callback, `becamePaid` stays `false`.
**How to avoid:** The `$transaction` mock MUST be `async (cb) => cb(prismaMock)` (awaiting the callback) so the closure variable is set before the code after the transaction reads it.
**Warning signs:** `recalculateInstallments` never called even when the extra charge should be fully paid.

### Pitfall 5: payment.actions.ts Inline Validation (No Zod Schema)
**What goes wrong:** Expecting Zod schema validation errors from payment actions, but `payInstallment` and `payExtraCharge` use inline validation (`if (!amount || amount <= 0)`) -- there is no Zod schema import.
**Why it happens:** Unlike `createSale` which uses `saleCreateSchema.safeParse()`, the payment actions parse FormData manually with helper functions and validate inline.
**How to avoid:** Validation error tests for payment actions should test the inline checks (missing installmentId, amount <= 0, invalid currency) and NOT expect Zod error message formats.
**Warning signs:** Looking for a payment schema that doesn't exist.

### Pitfall 6: Mock Return Shape Must Match include/select Queries
**What goes wrong:** `payInstallment` queries `prisma.installment.findUnique` with `include: { sale: { include: { lot: { select: { lotNumber, developmentId } } } } }`. The mock return value must match this nested shape or the action will throw on property access.
**Why it happens:** The action destructures deep properties like `installment.sale.lot.lotNumber`.
**How to avoid:** Build mock return objects that match the full query shape. Include all accessed nested properties.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'lot')`.

## Code Examples

### Complete $transaction Callback Mock Setup
```typescript
// The critical pattern for Phase 3 -- interactive transaction mock
// Source: Prisma community (https://github.com/prisma/prisma/discussions/14435)
// adapted for vitest-mock-extended DeepMockProxy

beforeEach(() => {
  // prismaMock is already reset by the helper's beforeEach (via mockReset)
  // Configure $transaction to invoke callback with prismaMock itself
  prismaMock.$transaction.mockImplementation(async (cb: any) => {
    return cb(prismaMock)
  })
})
```

### Mock Installment with Nested Sale+Lot Shape (for payInstallment)
```typescript
// Must match the include shape in payInstallment's prisma.installment.findUnique
function buildMockInstallment(overrides: Partial<{
  id: string
  installmentNumber: number
  amount: number
  paidAmount: number
  status: string
  saleId: string
}> = {}) {
  const saleId = overrides.saleId ?? 'sale-1'
  return {
    id: overrides.id ?? 'inst-1',
    saleId,
    installmentNumber: overrides.installmentNumber ?? 1,
    amount: overrides.amount ?? 2083.33,
    paidAmount: overrides.paidAmount ?? 0,
    status: overrides.status ?? 'PENDIENTE',
    dueDate: new Date('2025-07-10'),
    monthLabel: 'JULIO 2025',
    currency: 'USD',
    originalAmount: null,
    paidDate: null,
    paidInCurrency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Nested include shape
    sale: {
      id: saleId,
      personId: 'person-1',
      lot: {
        lotNumber: 'A-15',
        developmentId: 'dev-1',
      },
    },
  }
}
```

### Mock Sale Shape (for cancelSale via saleModel.findById)
```typescript
// Must match the include shape returned by saleModel.findById
function buildMockSale(overrides: Partial<{
  id: string
  status: string
  lotId: string
}> = {}) {
  return {
    id: overrides.id ?? 'sale-1',
    lotId: overrides.lotId ?? 'lot-1',
    personId: 'person-1',
    sellerId: null,
    saleDate: new Date('2025-06-15'),
    totalPrice: 25000,
    downPayment: 5000,
    currency: 'USD',
    totalInstallments: 12,
    firstInstallmentAmount: null,
    regularInstallmentAmount: 2083.33,
    firstInstallmentMonth: '2025-07',
    collectionDay: 10,
    commissionAmount: null,
    status: overrides.status ?? 'ACTIVA',
    notes: null,
    paymentWindow: null,
    createdById: 'test-super_admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    // saleModel.findById includes:
    lot: {
      id: overrides.lotId ?? 'lot-1',
      development: { id: 'dev-1', name: 'Test Development', slug: 'test-dev' },
    },
    person: { id: 'person-1', firstName: 'Juan', lastName: 'Perez', dni: '12345678', phone: null, email: null },
    seller: null,
    installments: [],
    extraCharges: [],
  }
}
```

### ACT-06 Partial Failure Verification Pattern
```typescript
// Source: CONTEXT.md requirement + code analysis of payExtraCharge lines 248-304

it('returns error but payment data is committed when recalculation throws', async () => {
  // Setup: fully paid extra charge scenario
  const mockExtraCharge = buildMockExtraCharge({
    amount: 5000,
    paidAmount: 0,  // will become fully paid with amount=5000
    status: 'PENDIENTE',
  })
  prismaMock.extraCharge.findUnique.mockResolvedValue(mockExtraCharge as any)

  // Transaction succeeds (payment committed)
  prismaMock.cashMovement.create.mockResolvedValue({ id: 'cm-1' } as any)
  prismaMock.extraCharge.update.mockResolvedValue({} as any)

  // recalculateInstallments throws AFTER transaction
  const recalcMock = vi.mocked(recalculateInstallments)
  recalcMock.mockRejectedValue(new Error('DB connection lost'))

  const formData = buildPaymentFormData({
    extraChargeId: 'ec-1',
    amount: '5000',
  })

  const result = await payExtraCharge({ success: false, error: '' }, formData)

  // Action returns error (caught by outer try/catch)
  expect(result).toEqual({ success: false, error: 'Error al procesar el pago' })

  // BUT: transaction side effects DID execute (committed)
  expect(prismaMock.cashMovement.create).toHaveBeenCalledTimes(1)
  expect(prismaMock.extraCharge.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: 'PAGADA' }),
    })
  )

  // AND: recalculateInstallments WAS called (proving the chain is wired)
  expect(recalcMock).toHaveBeenCalledWith('sale-1', 5000)
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jest-mock-extended | vitest-mock-extended v3.1 | vitest-mock-extended forked for Vitest | Same API, native Vitest integration |
| Array $transaction mock | Callback $transaction mock | Prisma 4+ interactive transactions | Must use `mockImplementation((cb) => cb(mock))` |
| Manual FormData construction | Builder pattern with defaults | Best practice | Reduces test noise, highlights what varies |

## Open Questions

1. **Exact `saleModel.findById` return shape**
   - What we know: cancelSale calls `saleModel.findById(id)` which returns a sale with includes (lot, person, seller, installments, extraCharges). The mock must match.
   - What's unclear: Whether the action reads all nested fields or just `status` and `lotId`. Code shows it reads `sale.status` and `sale.lotId`.
   - Recommendation: Mock the full shape (shown in Code Examples above) to be safe. Only `status` and `lotId` are functionally required for cancelSale.

2. **generateInstallments return value in createSale test**
   - What we know: createSale calls `generateInstallments(...)` and passes result to `tx.installment.createMany({ data: installments })`.
   - What's unclear: Whether to mock generateInstallments with a realistic array or minimal stub.
   - Recommendation: Mock with a realistic 2-3 item array so `installment.createMany` receives real data. This proves the wiring without testing the generator (already covered by Phase 2).

## Sources

### Primary (HIGH confidence)
- Project source code: `src/server/actions/sale.actions.ts` -- full action implementation read
- Project source code: `src/server/actions/payment.actions.ts` -- full action implementation read
- Project source code: `src/schemas/sale.schema.ts` -- Zod schema structure verified
- Project source code: `src/server/models/sale.model.ts` -- findById include shape verified
- Project source code: `src/__tests__/helpers/prisma.ts` -- existing DeepMockProxy setup verified
- Project source code: `src/__tests__/unit/lib/installment-recalculator.test.ts` -- existing $transaction array mock pattern verified
- vitest.config.ts -- jsdom environment confirmed (provides global FormData)

### Secondary (MEDIUM confidence)
- [Prisma discussion #14435: How to test interactive transactions](https://github.com/prisma/prisma/discussions/14435) -- `$transaction` callback mock pattern
- [Prisma testing guide: Mocking Prisma Client](https://www.prisma.io/blog/testing-series-1-8eRB5p0Y8o) -- mockDeep pattern reference

### Tertiary (LOW confidence)
- None. All findings verified against project source code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and configured in vitest.config.ts
- Architecture: HIGH -- test patterns established in Phase 1-2, only new pattern is $transaction callback mock (well-documented)
- Pitfalls: HIGH -- all six pitfalls derived from direct code reading of the action implementations
- Code examples: HIGH -- based on actual import paths, actual Prisma query shapes, and actual function signatures in the codebase

**Research date:** 2026-02-26
**Valid until:** Stable -- no version changes expected within project delivery window
