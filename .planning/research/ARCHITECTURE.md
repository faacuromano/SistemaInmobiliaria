# Architecture Research

**Domain:** Real estate ERP — Testing infrastructure and lot visualization architecture
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│ Presentation Layer (App Router + Components)         │
│   Pages (async RSC) → _components/ (client/server)  │
├─────────────────────────────────────────────────────┤
│ Server Actions Layer                                 │
│   requirePermission → Zod validation → model call   │
├─────────────────────────────────────────────────────┤
│ Data Access Layer (Models)                           │
│   Prisma wrappers with .include() patterns          │
├─────────────────────────────────────────────────────┤
│ PostgreSQL                                           │
└─────────────────────────────────────────────────────┘

  ║ TEST INFRASTRUCTURE (parallel concern)
  ║
  ║  __tests__/unit/lib/     → Pure functions (zero mocking)
  ║  __tests__/unit/models/  → Mocked Prisma
  ║  __tests__/integration/  → Server actions (mocked auth + Prisma)
```

---

## Component Responsibilities

| Layer | Component | Responsibility | Testable? |
|-------|-----------|---------------|-----------|
| Lib | `installment-generator.ts` | Generate installment plans | YES — pure function |
| Lib | `installment-recalculator.ts` | Recalculate after refuerzo | YES — mock Prisma |
| Lib | `sale-helpers.ts` | Client-side installment preview | YES — pure function |
| Lib | `rbac.ts` | Permission checks | YES — pure function |
| Lib | `exchange-rate.ts` | Fetch daily blue dollar rate | YES — mock fetch |
| Actions | `sale.actions.ts` | Create/update sales | PARTIAL — mock auth + Prisma |
| Actions | `payment.actions.ts` | Process payments | PARTIAL — mock auth + Prisma |
| UI | `LotsSection` | Orchestrator: view toggle, filters, state | Component test |
| UI | `LotsGrid` | Pure display: lot cards grouped by manzana | Component test |
| UI | `LotDetailPanel` | Pure display: lot details on click | Component test |

---

## Recommended Test Structure

```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── installment-generator.test.ts    # Pure, zero mocking
│   │   ├── installment-recalculator.test.ts # Mocked Prisma
│   │   ├── sale-helpers.test.ts             # Pure, parity with generator
│   │   ├── rbac.test.ts                     # Pure, 4 roles × 16 perms
│   │   ├── exchange-rate.test.ts            # Mocked fetch
│   │   └── format.test.ts                   # Pure formatting utils
│   └── schemas/
│       ├── sale.schema.test.ts              # Zod validation tests
│       └── person.schema.test.ts
├── integration/
│   └── actions/
│       ├── sale.actions.test.ts             # Mocked auth + Prisma
│       └── payment.actions.test.ts
└── setup/
    └── vitest.setup.ts                      # Global test config
```

---

## Architectural Patterns for Testing

### 1. Pure Utility Testing (Zero Dependencies)

```typescript
// __tests__/unit/lib/installment-generator.test.ts
import { generateInstallments } from '@/lib/installment-generator'

describe('generateInstallments', () => {
  it('clamps collectionDay 31 to Feb 28', () => {
    const result = generateInstallments({
      totalInstallments: 3,
      installmentAmount: 1000,
      startDate: new Date('2026-01-15'),
      collectionDay: 31,
    })
    expect(result[1].dueDate.getDate()).toBe(28) // Feb
  })
})
```

### 2. Server Action Testing (3 Mocks Required)

Every server action requires mocking:
1. `requirePermission` (from `@/lib/auth-guard`)
2. `prisma` (from `@/lib/prisma`)
3. `revalidatePath` (from `next/cache`)

```typescript
vi.mock('@/lib/auth-guard', () => ({
  requirePermission: vi.fn().mockResolvedValue({ id: 'test-user', role: 'SUPER_ADMIN' }),
}))
vi.mock('@/lib/prisma', () => ({ prisma: mockDeep<PrismaClient>() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

### 3. Lot Visualization Component Pattern

```
LotsSection (orchestrator — owns state)
  ├── LotFilters (emits filter changes)
  ├── LotsGrid (pure display — receives lots, grouping, handlers)
  │     └── Lot cards (color-coded by status)
  └── LotDetailPanel (pure display — receives selected lot)
        └── Mobile: Sheet wrapper
        └── Desktop: Side panel
```

**Data flow:** RSC page fetches lots → LotsSection manages view state → LotsGrid renders manzana groups → Click triggers LotDetailPanel

---

## Data Flows

### Unit Testing Flow
```
Test file → import pure function → call with test data → assert output
(No framework, no mocking, no setup)
```

### Integration Testing Flow
```
Test file → vi.mock(auth-guard, prisma, next/cache)
          → import action
          → call action with test input
          → assert prisma method was called correctly
          → assert returned ActionResult
```

### Lot Visualization Flow
```
Page (RSC) → fetch lots from DB
           → pass to LotsSection (client)
           → LotsSection groups by manzana
           → LotsGrid renders grouped cards
           → Click → LotDetailPanel shows details
```

---

## Anti-Patterns to Avoid

1. **Testing via HTTP instead of direct function calls** — Server actions are functions, call them directly with mocked dependencies
2. **Putting state inside LotsGrid** — Keep it pure display; LotsSection owns all state
3. **Global Prisma mock** — Use per-test mock setup to avoid test pollution
4. **Floating-point equality** — Use `toBeCloseTo(n, 2)` for money assertions, not `toBe()`

---

## Build Order for Testing Infrastructure

1. Install Vitest + deps + create config (no tests yet)
2. Add `npm test` script to package.json
3. Unit tests for pure functions (installment-generator, sale-helpers, rbac)
4. Unit tests for mocked functions (installment-recalculator, exchange-rate)
5. Integration tests for server actions (sale, payment)
6. Component tests for lot visualization (LotsSection, LotsGrid)

---

## Integration Points

| External System | Testing Strategy |
|----------------|-----------------|
| PostgreSQL | Mock Prisma client (unit) |
| Auth.js | Mock `auth()` and `requirePermission()` |
| dolarapi.com | Always mock — external rate API |
| Nodemailer | Always mock — email sending |

---

*Architecture research for: Real estate ERP testing infrastructure*
*Researched: 2026-02-26*
