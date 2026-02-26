# Phase 1: Testing Infrastructure - Research

**Researched:** 2026-02-26
**Domain:** Vitest test framework setup for Next.js 15 + Prisma 7 + TypeScript 5.7
**Confidence:** HIGH

## Summary

This phase sets up the automated testing foundation for a feature-complete Next.js 15 real estate ERP. The codebase has zero test infrastructure today -- no test runner, no test files, no test scripts. The goal is to install Vitest with coverage, create shared test helpers (`mockAuthenticatedUser`, `expectMoney`), and configure `npm test` and `npm run test:coverage` to work correctly.

The project uses `"type": "module"` in `package.json` and TypeScript with `@/*` path aliases mapped to `./src/*`. Vitest is Vite-native and handles ESM natively, so no transform workarounds are needed. The config file can be `vitest.config.ts` since Vitest resolves it through Vite which supports TypeScript config files out of the box. The generated Prisma client lives at `@/generated/prisma/client/client` and uses a `PrismaPg` adapter -- this import will need to be mocked in tests that touch any code importing from `@/lib/prisma`.

**Primary recommendation:** Install Vitest 4.x (current latest) with `@vitest/coverage-v8`, `vitest-mock-extended`, `vite-tsconfig-paths`, and `@vitejs/plugin-react`. Create `vitest.config.ts` at project root. Place shared helpers in `src/__tests__/helpers/`. Add `test` and `test:coverage` scripts to `package.json`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | Vitest installed and configured with jsdom environment, path aliases, and React plugin | Standard Stack section: exact packages, versions, config file pattern verified against Next.js official docs |
| TEST-02 | Shared test helper `mockAuthenticatedUser(role)` mocks `requirePermission` and `auth()` for any of the 4 RBAC roles | Architecture Patterns: auth-guard analysis shows `requirePermission` returns session object with `user.id`, `user.role`; Code Examples section provides implementation |
| TEST-03 | Shared test helper `expectMoney(received, expected)` uses `toBeCloseTo(n, 2)` for financial assertions | Code Examples section provides implementation; Pitfalls section explains why `toBe` fails for money |
| TEST-04 | `npm test` script runs all tests and reports results | Standard Stack: package.json scripts documented |
| TEST-05 | Coverage reporting configured with @vitest/coverage-v8 | Standard Stack: @vitest/coverage-v8 install and config documented; Vitest official docs verified |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test runner and assertion library | Vite-native, ESM-first, Jest-compatible API, zero transform config needed for Next.js 15. Official Next.js docs recommend it alongside Jest. |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage via V8 engine | Vitest's official coverage provider. Since v3.2.0 uses AST-aware remapping for Istanbul-equivalent accuracy at V8 speed. |
| vite-tsconfig-paths | ^6.1.1 | Resolve `@/*` path aliases in tests | Reads `tsconfig.json` paths and maps them in Vite/Vitest resolve chain. Required because this project uses `@/*` -> `./src/*` everywhere. |
| @vitejs/plugin-react | ^5.1.4 | JSX transform for React component tests | Needed if/when component tests are added in later phases. Included now to avoid re-configuring later. |
| jsdom | ^26.0.0 | DOM simulation for Vitest | Required for any test that touches DOM APIs or React rendering. Next.js official docs specify jsdom as the environment. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest-mock-extended | ^3.1.0 | Type-safe deep mocking (mockDeep) | Mocking PrismaClient with nested methods like `prisma.installment.findMany()`. Peer dep: `vitest >=3.0.0` -- compatible with v4. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest has documented Vite plugin incompatibilities; requires babel/swc transform config. Vitest is drop-in with identical API. Project decision: Vitest chosen (see STATE.md). |
| vitest-mock-extended | jest-mock-extended | jest-mock-extended uses `jest.fn()` internally. vitest-mock-extended is the purpose-built fork using `vi.fn()`. Drop-in replacement with correct Vitest types. |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | v8 is faster and now equally accurate (AST remapping since v3.2.0). Istanbul only needed for non-V8 runtimes (Firefox, Bun). |

**Installation:**
```bash
npm install -D vitest @vitejs/plugin-react jsdom @vitest/coverage-v8 vite-tsconfig-paths vitest-mock-extended
```

## Architecture Patterns

### Recommended Project Structure

```
vitest.config.ts                          # Root config file
src/
├── __tests__/
│   ├── helpers/
│   │   ├── auth.ts                       # mockAuthenticatedUser(role)
│   │   ├── money.ts                      # expectMoney(received, expected)
│   │   └── prisma.ts                     # mockDeep<PrismaClient> singleton
│   └── unit/
│       └── lib/
│           └── smoke.test.ts             # Minimal smoke test to verify setup
├── lib/
│   ├── installment-generator.ts          # Target for Phase 2 tests
│   ├── installment-recalculator.ts       # Target for Phase 2 tests
│   ├── sale-helpers.ts                   # Target for Phase 2 tests
│   ├── rbac.ts                           # Target for future tests
│   ├── auth-guard.ts                     # Mocked by mockAuthenticatedUser
│   └── prisma.ts                         # Mocked by prisma helper
└── server/
    └── actions/                          # Target for Phase 3 tests
```

**Why `src/__tests__/` at the top?** Keeps helpers importable via `@/__tests__/helpers/auth` using the existing path alias. Co-located test files (`*.test.ts` next to source) are also fine and will be discovered by the `include` glob, but shared helpers need a central location.

### Pattern 1: Vitest Configuration for This Project

**What:** Root-level `vitest.config.ts` with jsdom, path aliases, React plugin, and coverage.
**When to use:** Always -- this is the single test config for the whole project.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/server/**', 'src/schemas/**'],
      exclude: ['src/generated/**', 'src/**/__tests__/**'],
    },
  },
})
```

**Key decisions:**
- `include` pattern: discovers tests in any `__tests__/` directory under `src/` AND co-located `*.test.ts` files.
- Coverage scoped to `src/lib`, `src/server`, `src/schemas` -- the business logic layers. Excludes generated Prisma client and test files themselves.
- jsdom environment set globally (safe default; can be overridden per-file with `// @vitest-environment node` comments for pure Node tests).

### Pattern 2: Shared Auth Mock Helper

**What:** A helper function `mockAuthenticatedUser(role)` that mocks `@/lib/auth-guard` to simulate an authenticated user with a given RBAC role.
**When to use:** Every test that imports a server action or any code calling `requirePermission()`.

```typescript
// src/__tests__/helpers/auth.ts
import { vi } from 'vitest'
import type { Role } from '@/types/enums'

/**
 * Mocks requirePermission and requireAuth to return a session
 * for the given role. Call at the top of test files that test
 * server actions.
 *
 * IMPORTANT: vi.mock calls are hoisted, so the vi.mock('@/lib/auth-guard', ...)
 * must be in the test file itself. This helper provides the factory function.
 */
export function createAuthMock(role: Role = 'SUPER_ADMIN') {
  const session = {
    user: {
      id: `test-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@test.com`,
      name: `Test ${role}`,
      role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }

  return {
    requirePermission: vi.fn().mockResolvedValue(session),
    requireAuth: vi.fn().mockResolvedValue(session),
  }
}

/**
 * Convenience: call from test file to set up the standard auth mock.
 * Usage in test file:
 *
 *   import { mockAuthenticatedUser } from '@/__tests__/helpers/auth'
 *   vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('SUPER_ADMIN'))
 */
export function mockAuthenticatedUser(role: Role = 'SUPER_ADMIN') {
  return createAuthMock(role)
}
```

### Pattern 3: Shared Money Assertion Helper

**What:** `expectMoney(received, expected)` -- asserts two-decimal financial precision.
**When to use:** Every financial calculation assertion.

```typescript
// src/__tests__/helpers/money.ts
import { expect } from 'vitest'

/**
 * Assert financial amounts match to 2 decimal places.
 * Uses toBeCloseTo(n, 2) instead of toBe() to handle
 * IEEE 754 floating-point imprecision.
 *
 * @example
 *   expectMoney(result.amount, 1500.33)
 */
export function expectMoney(received: number, expected: number): void {
  expect(received).toBeCloseTo(expected, 2)
}
```

### Pattern 4: Prisma Mock Helper

**What:** Singleton deep mock of PrismaClient for tests that need database interaction mocks.
**When to use:** Tests for `installment-recalculator.ts` (Phase 2) and server actions (Phase 3).

```typescript
// src/__tests__/helpers/prisma.ts
import { vi, beforeEach } from 'vitest'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@/generated/prisma/client/client'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Reset all mock state between tests
beforeEach(() => {
  mockReset(prismaMock)
})

/**
 * Use in test files:
 *
 *   import { prismaMock } from '@/__tests__/helpers/prisma'
 *   vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
 */
```

### Anti-Patterns to Avoid

- **Global vi.mock in setup files:** `vi.mock()` calls are hoisted to the top of the file they appear in. Placing them in `setupFiles` applies them to ALL tests, which makes tests harder to reason about and prevents selective mocking. Keep `vi.mock()` in test files; keep helper _factories_ in shared helpers.
- **Importing the real `@/lib/prisma` in tests:** The Prisma singleton creates a real database connection via `PrismaPg` adapter with `process.env.DATABASE_URL`. Always mock this module.
- **Using `toBe()` for money:** IEEE 754 means `0.1 + 0.2 !== 0.3`. Always use `expectMoney()` (wraps `toBeCloseTo(n, 2)`).
- **Mocking `next/headers` for server action tests:** The project's actions don't import `next/headers` directly -- they call `requirePermission()` from `@/lib/auth-guard`. Mock `auth-guard`, not `next/headers`.
- **Testing async Server Components:** Vitest does not support async Server Components (confirmed in Next.js official docs as of Feb 2026). Don't attempt to render them in unit tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep type-safe object mocking | Manual `as unknown as PrismaClient` casts with partial objects | `vitest-mock-extended` `mockDeep<T>()` | Prisma models have deeply nested method chains (e.g., `prisma.installment.findMany()`). Manual mocks miss type errors and don't auto-mock nested methods. |
| Path alias resolution in Vitest | Custom Vite `resolve.alias` config duplicating tsconfig paths | `vite-tsconfig-paths` plugin | Reads `tsconfig.json` directly. One source of truth for `@/*` mapping. |
| Coverage instrumentation | Manual source-map analysis | `@vitest/coverage-v8` | V8 engine coverage with AST remapping. No custom tooling needed. |

**Key insight:** The testing infrastructure phase should produce zero business logic code. Every file created is either configuration or a shared utility. The temptation to "also write a quick test" should be resisted -- that's Phase 2's job.

## Common Pitfalls

### Pitfall 1: Prisma Client Import Resolution

**What goes wrong:** Tests import code that imports `@/generated/prisma/client/client`. The generated Prisma client has side effects (sets `globalThis.__dirname`, imports `@prisma/client/runtime`). Without mocking, test startup crashes with missing `DATABASE_URL` or adapter errors.
**Why it happens:** The Prisma singleton in `@/lib/prisma.ts` eagerly creates a `PrismaPg` adapter with `process.env.DATABASE_URL!`. This runs at import time.
**How to avoid:** Always `vi.mock('@/lib/prisma', ...)` before importing any module that transitively imports prisma. Since `vi.mock()` is hoisted, placing it at the top of the test file is sufficient.
**Warning signs:** `Error: connect ECONNREFUSED` or `TypeError: Cannot read properties of undefined (reading 'DATABASE_URL')` during test runs.

### Pitfall 2: `vi.mock()` Hoisting Confusion

**What goes wrong:** Developer puts `vi.mock()` inside a `beforeEach` or a helper function expecting it to be scoped. But `vi.mock()` is always hoisted to the top of the file -- it runs before any imports.
**Why it happens:** Vitest (like Jest) hoists `vi.mock()` calls via a compile transform. This is by design but counterintuitive.
**How to avoid:** Always place `vi.mock()` at the top level of the test file. Use `vi.doMock()` only when you genuinely need un-hoisted dynamic mocking (rare). Shared helpers should export mock _factories_, not `vi.mock()` calls.
**Warning signs:** "Module was already imported" warnings; mocks not applying; tests passing individually but failing together.

### Pitfall 3: Vitest 4 Breaking Changes from v3

**What goes wrong:** Using configuration patterns from Vitest 3 docs that changed in v4.
**Why it happens:** Most online tutorials and the earlier stack research reference Vitest 3.x.
**How to avoid:** Key v4 changes relevant to this phase:
- `coverage.all` option removed (do not set it).
- `basic` reporter removed (use `default` reporter).
- `vi.fn().getMockName()` now returns `'vi.fn()'` not `'spy'` (affects snapshots if used).
- `vi.restoreAllMocks` only restores manually-created spies; automocks unaffected.
**Warning signs:** Config validation errors on startup; unexpected reporter output.

### Pitfall 4: ESM + Vitest Module Mocking

**What goes wrong:** `vi.mock()` fails to intercept ESM module imports.
**Why it happens:** This project uses `"type": "module"` in package.json. Vitest handles ESM natively via its Vite-based module transform, but certain edge cases (dynamic imports, circular deps) can trip up the mock hoisting.
**How to avoid:** Vitest's ESM mocking works correctly for static imports with `vi.mock()`. This project's import patterns are all static. No special configuration needed. If issues arise, `vi.hoisted()` can explicitly control hoisting scope (available since Vitest 1.x).
**Warning signs:** `vi.mock()` callback not being called; original module executing instead of mock.

### Pitfall 5: Coverage Include Paths Missing Generated Code

**What goes wrong:** Coverage reports include the `src/generated/` directory (generated Prisma client), inflating uncovered line counts.
**Why it happens:** Default coverage includes all files matching `src/**`. Generated code has thousands of lines.
**How to avoid:** Explicitly exclude `src/generated/**` in coverage config. Also exclude `src/**/__tests__/**` (test helpers shouldn't count as "covered").
**Warning signs:** Coverage percentage is extremely low despite good test coverage of business logic.

## Code Examples

### Minimal Smoke Test (Verify Setup Works)

```typescript
// src/__tests__/unit/lib/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('test infrastructure', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves @/ path aliases', async () => {
    // Verify vite-tsconfig-paths resolves the alias
    const { MONTH_NAMES } = await import('@/lib/sale-helpers')
    expect(MONTH_NAMES).toHaveLength(12)
    expect(MONTH_NAMES[0]).toBe('ENERO')
  })
})
```

### Using mockAuthenticatedUser in Action Tests (Phase 3 Preview)

```typescript
// Example: how Phase 3 would use the shared helper
import { describe, it, expect, vi } from 'vitest'
import { mockAuthenticatedUser } from '@/__tests__/helpers/auth'
import { prismaMock } from '@/__tests__/helpers/prisma'

// Hoisted mocks
vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('SUPER_ADMIN'))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Now import the action AFTER mocks are set up (hoisting ensures this)
import { getSales } from '@/server/actions/sale.actions'

describe('getSales', () => {
  it('returns sales list', async () => {
    // Arrange: configure what prisma mock returns
    // prismaMock.sale.findMany.mockResolvedValue([...])

    // Act
    // const result = await getSales()

    // Assert
    // expect(result).toHaveLength(...)
  })
})
```

### Using expectMoney (Phase 2 Preview)

```typescript
// Example: how Phase 2 would use the shared helper
import { describe, it } from 'vitest'
import { expectMoney } from '@/__tests__/helpers/money'
import { generateInstallments } from '@/lib/installment-generator'

describe('generateInstallments', () => {
  it('distributes amount correctly', () => {
    const result = generateInstallments({
      saleId: 'test-sale-id',
      totalInstallments: 3,
      regularInstallmentAmount: 333.33,
      firstInstallmentMonth: '2026-01',
      collectionDay: 15,
      currency: 'USD',
    })

    expectMoney(result[0].amount, 333.33)
    expectMoney(result[1].amount, 333.33)
    expectMoney(result[2].amount, 333.33)
  })
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- `npm test` -- runs Vitest in watch mode (default behavior). Exits with pass/fail on CI (non-TTY).
- `npm run test:run` -- runs once and exits (useful in CI or pre-commit).
- `npm run test:coverage` -- runs once with V8 coverage report.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vitest 3.x with coverage.all option | Vitest 4.x without coverage.all (removed) | Vitest 4.0 (2025) | Do not set `coverage.all` in config |
| jest-mock-extended for Vitest | vitest-mock-extended (native fork) | 2024 | Use `vitest-mock-extended` for proper `vi.fn()` integration |
| V8 coverage with manual source-map remapping | V8 coverage with AST-aware remapping (built-in) | Vitest 3.2.0 | Coverage accuracy now matches Istanbul; no reason to use Istanbul |
| `basic` reporter | `default` reporter with `summary: false` | Vitest 4.0 | `basic` reporter removed |

**Deprecated/outdated:**
- `jest-mock-extended` in Vitest projects: Works but uses `jest.fn()` internally which may cause type conflicts. Use `vitest-mock-extended` instead.
- `coverage.all` config option: Removed in Vitest 4. Coverage now only includes files exercised by tests unless `include` patterns are set.
- `vitest.config.mts` extension recommendation: Some docs suggest `.mts` but `.ts` works identically in an ESM project (`"type": "module"`). Use `.ts` for consistency with the rest of the project configs.

## Open Questions

1. **Prisma 7 + vitest-mock-extended type compatibility**
   - What we know: vitest-mock-extended 3.1.0 has peer dep `vitest >=3.0.0` and works with Vitest 4. Prisma's official testing guide uses `jest-mock-extended` with older Prisma versions.
   - What's unclear: Whether `mockDeep<PrismaClient>()` correctly types all Prisma 7 methods, especially the new `PrismaPg` adapter methods. The adapter is only used in `@/lib/prisma.ts` which gets mocked entirely, so adapter methods are never called in tests.
   - Recommendation: Proceed with `vitest-mock-extended`. If type errors occur with Prisma 7's `PrismaClient`, fall back to a manual mock type (`as unknown as DeepMockProxy<PrismaClient>`).

2. **`next/cache` mock for `revalidatePath`**
   - What we know: Server actions call `revalidatePath()` from `next/cache`. This is a Next.js-internal module.
   - What's unclear: Whether Vitest resolves `next/cache` without Next.js running. Since we `vi.mock('next/cache', ...)` before any imports, the real module is never loaded.
   - Recommendation: A simple `vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))` should suffice. Not needed in Phase 1 (no server action tests), but the pattern should be documented for Phase 3.

## Sources

### Primary (HIGH confidence)
- [Next.js Official: Setting up Vitest](https://nextjs.org/docs/app/guides/testing/vitest) - Configuration pattern, plugin list, async Server Component limitation (updated Feb 24, 2026)
- [Vitest Official: Coverage Guide](https://vitest.dev/guide/coverage.html) - V8 provider setup, AST remapping, install command
- [Vitest Official: Vitest 4.0 Blog Post](https://vitest.dev/blog/vitest-4) - Breaking changes from v3
- npm registry queries (live, Feb 26 2026): vitest 4.0.18, @vitest/coverage-v8 4.0.18, vitest-mock-extended 3.1.0 (peerDep vitest >=3.0.0), vite-tsconfig-paths 6.1.1, @vitejs/plugin-react 5.1.4

### Secondary (MEDIUM confidence)
- [Prisma Official: Unit Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing) - Singleton mock pattern, mockDeep usage. Note: guide uses Jest, not Vitest, and references older Prisma versions. Pattern translates directly.
- [Vitest Official: Mocking Guide](https://vitest.dev/guide/mocking) - `vi.mock()` hoisting, `vi.doMock()`, `vi.hoisted()` usage

### Tertiary (LOW confidence)
- vitest-mock-extended GitHub issues re: Prisma 7 compatibility - No specific issues found, which is a positive signal but not a definitive confirmation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All package versions verified against npm registry. Next.js official docs confirm the pattern. Vitest 4.x is current stable.
- Architecture: HIGH - File structure follows Next.js convention (`__tests__/`). Mock patterns verified against Prisma and Vitest official docs. Codebase analysis confirms `requirePermission` return shape and `prisma` singleton pattern.
- Pitfalls: HIGH - Prisma import side-effect confirmed by reading source. vi.mock hoisting is well-documented Vitest behavior. Vitest 4 breaking changes verified against official blog.

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain; Vitest 4.x is current major)
