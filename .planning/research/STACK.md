# Stack Research

**Domain:** Real estate ERP — Testing & QA stack for Next.js 15 + Prisma
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH

---

## Context

Sistema Inmobiliaria is feature-complete with no test framework installed. The only QA is a manual `TESTING.md` smoke checklist. The codebase has a natural split:
- **Pure utility functions** (`installment-generator.ts`, `installment-recalculator.ts`, `sale-helpers.ts`, `rbac.ts`) — zero framework dependencies, highest ROI for testing
- **Server actions** — all call `requirePermission()` → `auth()` → Prisma, making them framework-entangled

---

## Recommended Testing Stack

| Layer | Tool | Version | Purpose | Confidence |
|-------|------|---------|---------|------------|
| Unit/Integration | vitest | ^3.0 | Fast test runner for pure functions, schemas, mocked models | HIGH |
| Component tests | @testing-library/react | ^16 | Client component rendering tests | HIGH |
| Browser environment | jsdom | ^26 | Simulates DOM for Vitest | HIGH |
| Prisma mocking | jest-mock-extended | ^3 | Type-safe deep mocks of PrismaClient | HIGH |
| Coverage | @vitest/coverage-v8 | ^3.0 | Code coverage reporting | HIGH |
| E2E (future) | @playwright/test | ^1.50 | Full browser tests for server actions, auth flows | MEDIUM |

### Install Commands

```bash
# Unit testing layer
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths jest-mock-extended @vitest/coverage-v8

# E2E layer (defer to post-delivery)
npm install -D @playwright/test
npx playwright install chromium
```

---

## Key Findings

### 1. Vitest over Jest
Jest has documented incompatibilities with Vite's plugin system. Next.js recommends both, but Vitest is Vite-native, requires no transform configuration, and has an identical Jest API. The project uses Tailwind CSS 4 (Vite-based) which aligns with Vitest.

### 2. Async Server Components Cannot Be Unit-Tested
Neither Vitest nor Jest supports `async` Server Components (confirmed in Next.js docs). Server action testing requires mocking `requirePermission`, `auth()`, and `prisma` — or full E2E with Playwright.

### 3. Pure Functions First (Zero Mocking)
The highest ROI tests are the pure utility functions:
- `generateInstallments()` — installment plan generation
- `calculateInstallmentPreview()` — client-side preview
- `hasPermission()` / `assertPermission()` — RBAC checks
- `recalculateInstallments()` — refuerzo recalculation (needs Prisma mock)

### 4. Prisma Mocking Strategy
Prisma's official recommendation: use `jest-mock-extended` with the singleton pattern — mock the `prisma` module export. Works cleanly with Vitest's `vi.mock()`.

---

## What NOT to Use

| Tool | Why Not |
|------|---------|
| Jest | Vite plugin incompatibilities; Vitest is the drop-in replacement |
| Cypress Component Testing | Explicitly unsupported for async Server Components |
| Direct server action unit testing | Requires mocking `next/headers`, `auth-guard.ts`, and `prisma` simultaneously — fragile |
| Docker-based test DB in CI | Out of scope for single-client handoff; adds unnecessary complexity |

---

## Vitest Configuration Pattern

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/server/**'],
    },
  },
})
```

---

*Stack research for: Real estate ERP testing infrastructure*
*Researched: 2026-02-26*
