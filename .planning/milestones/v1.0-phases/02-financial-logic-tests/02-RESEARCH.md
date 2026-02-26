# Phase 2: Financial Logic Tests - Research

**Researched:** 2026-02-26
**Domain:** Unit testing of pure financial functions (installment generation, preview parity, recalculation)
**Confidence:** HIGH

## Summary

This phase tests three functions in the existing codebase: `generateInstallments()` (server-side installment creation), `calculateInstallmentPreview()` (client-side preview for the sale form), and `recalculateInstallments()` (adjusts unpaid installments after a refuerzo payment). The first two are pure functions with identical date-math logic; the third is async and depends on Prisma.

All test infrastructure is in place from Phase 1: Vitest 4.0.18 with jsdom, `@vitest/coverage-v8`, `vitest-mock-extended` for Prisma deep mocking, `expectMoney()` helper for financial assertions, and `prismaMock` singleton with automatic `mockReset` between tests. The 9 existing tests pass in 1.45 seconds.

**Primary recommendation:** Write pure-function unit tests for the generator and preview (no mocks needed), then mock-heavy unit tests for the recalculator using the existing `prismaMock`. Shared fixtures file provides named scenarios mapping to each FIN requirement. All monetary assertions use `expectMoney()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use realistic business amounts (e.g., $15,000 USD total, 60 cuotas de $250, collection day 10) -- tests reflect real usage and catch real rounding issues
- Create a shared fixtures file (e.g., `test-data.ts` or `fixtures.ts`) with named scenarios (`STANDARD_60_CUOTAS`, `CONTADO_SALE`, etc.) -- DRY across generator/preview/recalculator tests
- Pin dates to specific years for deterministic tests: 2024 for leap year, 2025 for non-leap year
- USD as primary currency throughout tests, with one ARS scenario to verify currency passthrough works
- Compare field-by-field on shared fields: amount, dueDate, monthLabel for each installment index. Map `number` (preview) to `installmentNumber` (generator). Ignore generator-only fields (saleId, currency)
- Run parity check against multiple scenarios (standard 60 cuotas, variable first installment, year rollover, day-31 clamping) -- catches divergence across edge cases
- Interpret "byte-for-byte identical" as "identical financial results" -- same amounts, same due dates, same month labels. Not literal JSON string comparison
- If a parity divergence is found, fix it in source code -- the test should pass, not document a known bug
- Mock Prisma using the shared prisma mock from Phase 1 -- stub findMany/update/$transaction. Test the function as-is without refactoring production code
- For second-refuerzo guard (FIN-07): use two-call sequence. First call: findMany returns installments with originalAmount=null, verify update sets originalAmount. Second call: findMany returns installments with originalAmount already set, verify update does NOT touch originalAmount
- Verify $transaction was called with all update operations -- ensures atomicity guarantee is maintained if someone refactors
- For FIN-08 (reduction > amount): test multiple boundary scenarios -- reduction exactly equals amount (result=0), reduction exceeds amount (clamped to 0), reduction barely below amount (small positive result)

### Claude's Discretion
- Test file organization (single file vs split by function)
- Exact fixture values beyond the realistic/pinned-date constraints
- describe/it block structure and naming conventions
- Whether to use `test.each` for parameterized scenarios

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIN-01 | `generateInstallments()` tested for collectionDay 31 clamping in Feb (28/29), Apr, Jun, Sep, Nov | Pure function, test with pinned years (2024 leap, 2025 non-leap), collectionDay=31, verify days-in-month clamping |
| FIN-02 | `generateInstallments()` tested for year rollover (Dec to Jan next year) | Test with firstInstallmentMonth starting in Nov/Dec, verify installments cross year boundary correctly |
| FIN-03 | `generateInstallments()` tested for variable first installment amount | Test with `firstInstallmentAmount` set vs undefined, verify installment[0].amount differs from rest |
| FIN-04 | `generateInstallments()` tested for zero installments (contado sale) | Pass totalInstallments=0, expect empty array returned |
| FIN-05 | `calculateInstallmentPreview()` parity test -- same inputs produce identical outputs as `generateInstallments()` | Field mapping: preview.number = generator.installmentNumber. Both use identical date math. Compare amount, dueDate, monthLabel across multiple scenarios |
| FIN-06 | `recalculateInstallments()` tested for first refuerzo -- unpaid installments reduced, `originalAmount` set | Mock prisma.installment.findMany to return installments with originalAmount=null, verify update data sets originalAmount |
| FIN-07 | `recalculateInstallments()` tested for second refuerzo -- `originalAmount` NOT overwritten | Mock findMany returning installments with originalAmount already set (non-null), verify update data uses `undefined` for originalAmount (Prisma skips undefined fields) |
| FIN-08 | `recalculateInstallments()` tested for edge case: reduction > installment amount clamped to 0 | Mock small-amount installments with large paidExtraChargeAmount, verify Math.max(..., 0) works. Test boundary: equal, exceeding, barely-below |
| FIN-09 | Decimal precision assertions for all monetary calculations using `expectMoney` helper | Every test asserting an amount value must use `expectMoney(received, expected)` -- no raw `toBe()` on calculated amounts |
</phase_requirements>

## Standard Stack

### Core (already installed from Phase 1)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| vitest | ^4.0.18 | Test runner | Installed, configured |
| @vitest/coverage-v8 | ^4.0.18 | Coverage reporting | Installed, configured |
| vitest-mock-extended | ^3.1.0 | Deep mocking for Prisma | Installed, configured |
| jsdom | ^28.1.0 | DOM environment | Installed, configured |

### Supporting (no new installs needed)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| vite-tsconfig-paths | Path alias resolution (@/) | Already in vitest.config.ts |
| @vitejs/plugin-react | React support for vitest | Already in vitest.config.ts |

### No New Dependencies
This phase requires zero new npm packages. Everything needed was installed in Phase 1.

## Architecture Patterns

### Test File Organization

**Recommended: Split by function, shared fixtures file**

```
src/__tests__/
  unit/
    lib/
      smoke.test.ts                        # Phase 1 (existing)
      installment-generator.test.ts        # FIN-01, FIN-02, FIN-03, FIN-04
      installment-preview-parity.test.ts   # FIN-05
      installment-recalculator.test.ts     # FIN-06, FIN-07, FIN-08
    helpers/
      helpers.test.ts                      # Phase 1 (existing)
  fixtures/
    installment-fixtures.ts                # Named scenarios, shared across all 3 test files
  helpers/
    auth.ts                                # Phase 1 (existing)
    money.ts                               # Phase 1 (existing)
    prisma.ts                              # Phase 1 (existing)
```

**Rationale:** Three separate test files avoid a monolithic test file and let each requirement group run independently. The fixtures file is the single source of test data.

### Pattern 1: Pure Function Testing (Generator + Preview)

**What:** Import function directly, call with test data, assert outputs. No mocks needed.
**When to use:** `generateInstallments()` and `calculateInstallmentPreview()` are pure functions with no side effects.

```typescript
// Source: Direct analysis of src/lib/installment-generator.ts
import { describe, it, expect } from 'vitest'
import { generateInstallments } from '@/lib/installment-generator'
import { expectMoney } from '@/__tests__/helpers/money'
import { STANDARD_60_CUOTAS } from '@/__tests__/fixtures/installment-fixtures'

describe('generateInstallments', () => {
  it('clamps collectionDay 31 to Feb 28 in non-leap year', () => {
    const result = generateInstallments({
      saleId: 'test-sale-1',
      totalInstallments: 1,
      regularInstallmentAmount: 250,
      firstInstallmentMonth: '2025-02',  // Feb 2025 has 28 days
      collectionDay: 31,
      currency: 'USD',
    })
    expect(result[0].dueDate.getDate()).toBe(28)
  })
})
```

### Pattern 2: Parity Testing (Preview vs Generator)

**What:** Run both functions with equivalent inputs, compare shared output fields.
**When to use:** FIN-05. Map `number` (preview) to `installmentNumber` (generator).

```typescript
// Source: Direct analysis of src/lib/sale-helpers.ts and src/lib/installment-generator.ts
import { generateInstallments } from '@/lib/installment-generator'
import { calculateInstallmentPreview } from '@/lib/sale-helpers'

// Shared params (preview has no saleId/currency)
const shared = {
  totalInstallments: 60,
  regularInstallmentAmount: 250,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}

const generated = generateInstallments({ ...shared, saleId: 'x', currency: 'USD' })
const preview = calculateInstallmentPreview(shared)

// Compare field-by-field
generated.forEach((gen, i) => {
  const prev = preview[i]
  expectMoney(gen.amount, prev.amount)
  expect(gen.dueDate.getTime()).toBe(prev.dueDate.getTime())
  expect(gen.monthLabel).toBe(prev.monthLabel)
  expect(gen.installmentNumber).toBe(prev.number)
})
```

### Pattern 3: Prisma Mock Testing (Recalculator)

**What:** Mock the prisma singleton, stub findMany/update/$transaction, test recalculation logic.
**When to use:** `recalculateInstallments()` imports `prisma` from `@/lib/prisma` directly.

```typescript
// Source: Analysis of src/lib/installment-recalculator.ts and src/__tests__/helpers/prisma.ts
import { describe, it, expect, vi } from 'vitest'
import { prismaMock } from '@/__tests__/helpers/prisma'

// CRITICAL: vi.mock must be at top level, hoisted by Vitest
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { recalculateInstallments } from '@/lib/installment-recalculator'

describe('recalculateInstallments', () => {
  it('reduces unpaid installments and sets originalAmount on first refuerzo', async () => {
    prismaMock.installment.findMany.mockResolvedValue([
      mockInstallment({ id: 'inst-1', amount: new Decimal(250), originalAmount: null }),
      mockInstallment({ id: 'inst-2', amount: new Decimal(250), originalAmount: null }),
    ])
    prismaMock.$transaction.mockImplementation((ops) => Promise.resolve(ops))

    await recalculateInstallments('sale-1', 100)

    // Verify update was called for each installment
    expect(prismaMock.installment.update).toHaveBeenCalledTimes(2)
  })
})
```

### Anti-Patterns to Avoid

- **Using `toBe()` for monetary values:** Always use `expectMoney()` -- IEEE 754 can cause `250.005` to not equal `250.01` with strict equality.
- **Comparing Date objects with `toBe()`:** Use `.getTime()` or `toISOString()` for date comparisons, since different Date objects with same timestamp are not referentially equal.
- **Mocking inside describe/beforeEach:** `vi.mock()` calls are hoisted to file top by Vitest. Place them at module level, not inside blocks.
- **Testing Prisma Decimal with raw numbers:** The mock returns whatever you give it. When setting up mock data for recalculator tests, use objects that mimic Prisma's Decimal type (see Prisma Mock Decimal section below).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Financial precision assertions | Custom `Math.abs(a-b) < epsilon` | `expectMoney()` from Phase 1 | Already built, uses `toBeCloseTo(n, 2)`, tested |
| Prisma client mocking | Manual stub objects | `prismaMock` from Phase 1 | Deep mock with auto-reset, type-safe |
| Date comparison | Custom date diff functions | `date.getTime()` comparison | Built-in, no dependency needed |
| Test data management | Inline objects in every test | Shared fixtures file | DRY, scenario names map to requirements |

## Common Pitfalls

### Pitfall 1: Prisma Decimal Type in Mocks
**What goes wrong:** The recalculator does `Number(installment.amount)` to convert Prisma's Decimal to a JS number. In mocked tests, `amount` is whatever you set in the mock return value.
**Why it happens:** Prisma's generated type declares `amount: runtime.Decimal`, but `vitest-mock-extended`'s `mockDeep` creates a mock that accepts any value.
**How to avoid:** In mock data, provide a value that `Number()` can convert correctly. Options:
1. Use a plain number (simplest, `Number(250)` = 250)
2. Use an object with `toNumber()` method to mimic Decimal
3. Use Prisma's `Prisma.Decimal` if you want type safety

**Recommendation:** Use plain numbers in mock data. `Number(250)` = 250 works perfectly. The test is verifying business logic, not Prisma's Decimal serialization.

```typescript
// Mock installment with plain numbers -- Number() converts fine
const mockInst = {
  id: 'inst-1',
  saleId: 'sale-1',
  installmentNumber: 1,
  amount: 250,           // Number(250) = 250
  originalAmount: null,  // First refuerzo: null
  status: 'PENDIENTE',
  // ... other fields
}
```

### Pitfall 2: Month Label Generation Divergence
**What goes wrong:** Generator uses `MONTH_NAMES[dueDate.getMonth()]` directly, preview uses `getMonthLabel(dueDate)` which also calls `MONTH_NAMES[date.getMonth()]`. Both produce identical strings.
**Why it matters:** This is the primary parity concern. Code analysis shows they are functionally identical.
**How to avoid:** Parity tests should still run against multiple scenarios to catch any future divergence. Current code review shows no divergence.
**Warning signs:** If someone modifies `getMonthLabel()` without also updating `generateInstallments()`, parity breaks.

### Pitfall 3: JavaScript Date Month Overflow Behavior
**What goes wrong:** `new Date(2025, 12, 10)` creates January 10, 2026 (not an error). JavaScript automatically rolls month overflow into next year.
**Why it matters:** Both functions rely on this behavior for year rollover (`baseMonth + (i - 1)` can exceed 11). This is correct behavior and should be verified, not avoided.
**How to avoid:** Year rollover tests (FIN-02) should explicitly verify that the Date constructor's month overflow produces correct dates across December-to-January boundaries.

### Pitfall 4: The `originalAmount: undefined` vs `null` Distinction
**What goes wrong:** In `recalculateInstallments()`, when `originalAmount` is already set, the code passes `undefined` (not `null`) to Prisma's update. Prisma ignores `undefined` fields (no-op), but sets `null` fields to NULL.
**Why it matters:** The second-refuerzo guard (FIN-07) relies on this behavior. The test must verify that the update data contains `originalAmount: undefined` (or simply doesn't include it), NOT `originalAmount: null`.
**How to avoid:** In FIN-07 test, inspect the arguments passed to `prismaMock.installment.update` and verify `originalAmount` is `undefined` (meaning Prisma will not overwrite the existing value).

```typescript
// In the recalculator source code:
originalAmount: installment.originalAmount === null ? currentAmount : undefined
// When originalAmount is already set (non-null): passes undefined -> Prisma skips the field
```

### Pitfall 5: Rounding in Recalculator
**What goes wrong:** The recalculator applies `Math.round(newAmount * 100) / 100` for 2-decimal rounding. With many installments and a non-evenly-divisible amount, the total of recalculated amounts may not exactly equal the expected remaining balance.
**Why it matters:** This is expected behavior -- the rounding is per-installment, not cumulative. Tests should assert individual installment amounts with `expectMoney()`, not sum-total equality.
**How to avoid:** Assert each installment's new amount individually. If testing total, use `expectMoney()` with appropriate tolerance.

### Pitfall 6: vi.mock Hoisting and Import Order
**What goes wrong:** If `vi.mock('@/lib/prisma', ...)` is placed after `import { recalculateInstallments }`, it still works because Vitest hoists `vi.mock()` to the top. But if the factory function references variables defined after it, those will be `undefined`.
**Why it happens:** Vitest transforms `vi.mock()` calls to execute before any imports.
**How to avoid:** Always place `vi.mock()` at the top of the file, before the import of the module being tested. Reference only the `prismaMock` import from the helpers file (which is also hoisted).

## Code Examples

### Fixture File Pattern

```typescript
// src/__tests__/fixtures/installment-fixtures.ts
// Source: Based on CONTEXT.md constraints + actual function signatures

import type { Currency } from '@/generated/prisma/client/client'

/** Base params shared by both generator and preview */
interface SharedInstallmentParams {
  totalInstallments: number
  regularInstallmentAmount: number
  firstInstallmentAmount?: number
  firstInstallmentMonth: string  // "YYYY-MM"
  collectionDay: number
}

/** Extension for generator (adds saleId + currency) */
interface GeneratorParams extends SharedInstallmentParams {
  saleId: string
  currency: Currency
}

// Helper to create generator params from shared params
export function toGeneratorParams(
  shared: SharedInstallmentParams,
  saleId = 'test-sale',
  currency: Currency = 'USD'
): GeneratorParams {
  return { ...shared, saleId, currency }
}

// ---- Named Scenarios ----

export const STANDARD_60_CUOTAS: SharedInstallmentParams = {
  totalInstallments: 60,
  regularInstallmentAmount: 250,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}

export const VARIABLE_FIRST_INSTALLMENT: SharedInstallmentParams = {
  totalInstallments: 12,
  regularInstallmentAmount: 250,
  firstInstallmentAmount: 500,
  firstInstallmentMonth: '2025-03',
  collectionDay: 15,
}

export const DAY_31_CLAMPING: SharedInstallmentParams = {
  totalInstallments: 12,
  regularInstallmentAmount: 200,
  firstInstallmentMonth: '2025-01',  // Jan(31), Feb(28), Mar(31), Apr(30)...
  collectionDay: 31,
}

export const LEAP_YEAR_FEB: SharedInstallmentParams = {
  totalInstallments: 3,
  regularInstallmentAmount: 300,
  firstInstallmentMonth: '2024-01',  // 2024 is leap year, Feb has 29 days
  collectionDay: 31,
}

export const NON_LEAP_YEAR_FEB: SharedInstallmentParams = {
  totalInstallments: 3,
  regularInstallmentAmount: 300,
  firstInstallmentMonth: '2025-01',  // 2025 is not leap year, Feb has 28 days
  collectionDay: 31,
}

export const YEAR_ROLLOVER: SharedInstallmentParams = {
  totalInstallments: 6,
  regularInstallmentAmount: 500,
  firstInstallmentMonth: '2025-10',  // Oct -> Nov -> Dec -> Jan 2026 -> Feb -> Mar
  collectionDay: 15,
}

export const CONTADO_SALE: SharedInstallmentParams = {
  totalInstallments: 0,
  regularInstallmentAmount: 0,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}

export const ARS_CURRENCY: SharedInstallmentParams = {
  totalInstallments: 6,
  regularInstallmentAmount: 50000,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}
```

### Recalculator Mock Installment Factory

```typescript
// Helper to create mock installment records for recalculator tests
// Source: Analysis of Prisma Installment model schema

function createMockInstallment(overrides: {
  id: string
  installmentNumber: number
  amount: number
  originalAmount?: number | null
  status?: string
}) {
  return {
    id: overrides.id,
    saleId: 'test-sale',
    installmentNumber: overrides.installmentNumber,
    amount: overrides.amount,               // Number() in recalculator works fine
    originalAmount: overrides.originalAmount ?? null,
    currency: 'USD',
    dueDate: new Date('2025-06-10'),
    monthLabel: 'JUNIO 2025',
    status: overrides.status ?? 'PENDIENTE',
    paidAmount: 0,
    paidInCurrency: null,
    paidDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
```

### Transaction Verification Pattern

```typescript
// Source: Analysis of recalculateInstallments() which builds array of update ops and passes to $transaction
// The function does: await prisma.$transaction(updateOperations)
// where updateOperations is an array of prisma.installment.update() calls

// In the mock, each prisma.installment.update() call returns a pending Promise-like mock
// $transaction receives the array of these mocked calls

it('executes all updates in a single transaction', async () => {
  const installments = [
    createMockInstallment({ id: 'i1', installmentNumber: 1, amount: 250 }),
    createMockInstallment({ id: 'i2', installmentNumber: 2, amount: 250 }),
    createMockInstallment({ id: 'i3', installmentNumber: 3, amount: 250 }),
  ]
  prismaMock.installment.findMany.mockResolvedValue(installments)
  prismaMock.$transaction.mockImplementation((ops) => Promise.resolve(ops))

  await recalculateInstallments('sale-1', 300)

  // Verify $transaction was called exactly once with an array of 3 operations
  expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  const transactionArg = prismaMock.$transaction.mock.calls[0][0]
  expect(transactionArg).toHaveLength(3)
})
```

## State of the Art

| Area | Current Approach in Codebase | Impact on Testing |
|------|------------------------------|-------------------|
| Prisma version | 7.4.1 with driver adapter (PrismaPg) | Decimal fields typed as `runtime.Decimal`, mocks can use plain numbers |
| Vitest version | 4.0.18 | `vi.mock()` hoisting works, `test.each` available for parameterized tests |
| vitest-mock-extended | 3.1.0 | `mockDeep<PrismaClient>()` provides full type coverage |
| Date handling | Native JS Date (no date-fns for installment logic) | Tests use native Date constructors, no library needed |
| Financial rounding | `Math.round(val * 100) / 100` in recalculator | Per-installment rounding, not cumulative -- assert individually |

## Key Source Code Analysis

### generateInstallments() -- Pure, Synchronous

- **File:** `src/lib/installment-generator.ts`
- **Params:** `{ saleId, totalInstallments, regularInstallmentAmount, firstInstallmentAmount?, firstInstallmentMonth, collectionDay, currency }`
- **Returns:** `InstallmentData[]` with `{ saleId, installmentNumber, amount, currency, dueDate, monthLabel }`
- **Date logic:** `new Date(baseYear, targetMonth + 1, 0).getDate()` for days-in-month, `Math.min(collectionDay, daysInMonth)` for clamping
- **Month label:** `MONTH_NAMES[dueDate.getMonth()] + " " + dueDate.getFullYear()`
- **Zero installments:** Loop `for (let i = 1; i <= 0)` returns empty array naturally

### calculateInstallmentPreview() -- Pure, Synchronous, Client-Safe

- **File:** `src/lib/sale-helpers.ts`
- **Params:** `{ totalInstallments, firstInstallmentAmount?, regularInstallmentAmount, firstInstallmentMonth, collectionDay }`
- **Returns:** `Array<{ number, amount, dueDate, monthLabel }>`
- **Date logic:** IDENTICAL to generator
- **Month label:** Uses `getMonthLabel(dueDate)` which resolves to same `MONTH_NAMES[m] + " " + y`
- **Field differences from generator:** `number` instead of `installmentNumber`, no `saleId`, no `currency`

### recalculateInstallments() -- Async, Prisma-Dependent

- **File:** `src/lib/installment-recalculator.ts`
- **Params:** `(saleId: string, paidExtraChargeAmount: number)`
- **Returns:** `Promise<void>`
- **Imports:** `prisma` from `@/lib/prisma` -- must be mocked
- **Steps:**
  1. Fetch unpaid installments (status in PENDIENTE, VENCIDA, PARCIAL)
  2. Calculate `reductionPerInstallment = paidAmount / unpaidCount`
  3. For each: `newAmount = Math.max(currentAmount - reduction, 0)`, rounded to 2 decimals
  4. Sets `originalAmount` only if currently null (first recalculation preserves original)
  5. Wraps all updates in `prisma.$transaction()`
- **Key detail:** `originalAmount: installment.originalAmount === null ? currentAmount : undefined` -- the `undefined` is what makes the second-refuerzo guard work (Prisma ignores undefined fields)

## Open Questions

1. **Prisma Decimal in mock vs Number() conversion**
   - What we know: The recalculator does `Number(installment.amount)` on Prisma Decimal. In mocks, passing plain numbers works because `Number(250)` = 250.
   - What's unclear: If someone passes a Prisma Decimal object to `Number()`, it returns NaN unless Decimal has a `valueOf()` method. Prisma's runtime Decimal does have this.
   - Recommendation: Use plain numbers in mocks. This is a unit test of the logic, not the Prisma runtime. Document as a known simplification.

2. **Month label exact string format**
   - What we know: Both functions produce "ENERO 2025" format (uppercase Spanish month + space + 4-digit year). The `MONTH_NAMES` array is the canonical source.
   - What's unclear: Nothing -- verified by reading both source files.
   - Recommendation: Test month label strings directly as string equality.

## Sources

### Primary (HIGH confidence)
- `src/lib/installment-generator.ts` -- Full source code read, 81 lines
- `src/lib/installment-recalculator.ts` -- Full source code read, 53 lines
- `src/lib/sale-helpers.ts` -- Full source code read, 91 lines
- `src/__tests__/helpers/prisma.ts` -- Phase 1 Prisma mock helper
- `src/__tests__/helpers/money.ts` -- Phase 1 expectMoney helper
- `vitest.config.ts` -- Vitest configuration
- `prisma/schema.prisma` -- Installment model, Decimal fields confirmed
- `src/generated/prisma/client/models/Installment.ts` -- amount: runtime.Decimal, originalAmount: runtime.Decimal | null

### Secondary (MEDIUM confidence)
- Vitest documentation on `vi.mock()` hoisting behavior
- Prisma documentation on Decimal type handling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already installed and verified in Phase 1
- Architecture: HIGH -- source code fully analyzed, pure functions with no hidden dependencies
- Pitfalls: HIGH -- identified from direct code analysis (Decimal conversion, undefined vs null, rounding)
- Parity analysis: HIGH -- line-by-line comparison of generator vs preview confirms identical date math

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable -- no library changes expected)
