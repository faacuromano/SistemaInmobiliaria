# Project Research Summary

**Project:** Sistema Inmobiliaria — QA, Testing Infrastructure & Lot Visualization
**Domain:** Real estate ERP — pre-delivery quality hardening
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

Sistema Inmobiliaria is a feature-complete real estate ERP built on Next.js 15, Prisma, and PostgreSQL. The codebase has never had a test framework installed — the only QA is a manual smoke checklist in `TESTING.md`. The immediate goal is to build a testing infrastructure and get the application into a deliverable, professionally hardened state before client handoff. Research shows the codebase has a clean natural split between pure utility functions (zero dependencies, immediate testability) and framework-entangled server actions (require mocking auth, Prisma, and cache invalidation simultaneously), which directly informs the recommended phase order.

The recommended approach is Vitest as the test runner (Vite-native, Jest-compatible API, no transform configuration needed), with `jest-mock-extended` for type-safe Prisma mocking. Testing should be introduced in three layers: pure function unit tests first (no mocking at all), then mocked-Prisma unit tests for model-layer functions, then integration tests for server actions. E2E testing with Playwright is explicitly deferred — it is expensive to maintain and the existing manual smoke checklist already covers end-to-end flows adequately for a single-client handoff. The lot visualization work (manzana grouping, detail panel) is already built and needs only polish, not new architecture.

The dominant risks fall into two categories. First, financial logic risks: floating-point equality failures in money tests, duplicate algorithm divergence between `calculateInstallmentPreview` and `generateInstallments`, and the `originalAmount` corruption on a second refuerzo recalculation — all three are high-severity and must be caught by tests before delivery. Second, testing infrastructure risks: every server action test will fail silently if `requirePermission` is not mocked first, and Prisma's `Decimal` type serialization produces `NaN` or `[object Object]` in the UI if the action layer does not serialize correctly. Setting up proper test helpers for both concerns before writing any business logic tests will prevent rework.

---

## Key Findings

### Recommended Stack

The project already has a mature production stack (Next.js 15, Prisma, Auth.js v5, shadcn/ui). What needs to be added is purely the testing layer. Research confirms Vitest is the correct choice over Jest for this codebase: Next.js 15 uses Vite internals, Tailwind CSS 4 is Vite-based, and Jest has documented incompatibilities with Vite plugin configuration. Vitest provides an identical Jest API with zero transform configuration.

**Core technologies:**
- `vitest ^3.0`: Test runner — Vite-native, Jest-compatible API, no transform config needed
- `@testing-library/react ^16`: Component tests for client components — well-established, framework-agnostic
- `jsdom ^26`: Browser environment simulation — required by Vitest for React component tests
- `jest-mock-extended ^3`: Type-safe deep mocks of PrismaClient — Prisma's own recommendation
- `@vitest/coverage-v8 ^3.0`: Code coverage reporting — native V8 provider, no instrumentation overhead
- `@playwright/test ^1.50`: E2E tests — deferred to post-delivery; not needed for handoff

### Expected Features

Research identified features in three tiers based on delivery criticality.

**Must have (table stakes — P1):**
- Unit tests for `generateInstallments()` and `calculateInstallmentPreview()` with parity assertions — highest divergence risk
- Unit tests for `recalculateInstallments()` with Prisma mock — covers refuerzo corruption edge case
- Unit tests for `hasPermission()` RBAC matrix — 4 roles x 16 permissions including negative assertions
- Build/lint/typecheck gates clean (`tsc --noEmit`, `eslint`, `next build`)
- Manual smoke test run against seed data with all 13 TESTING.md sections signed off
- Lot grid: block (manzana) grouping and detail panel polish (already built, needs refinement)

**Should have (differentiators — P2):**
- Automated `npm test` script as a living safety net and professional delivery signal
- View toggle persistence via localStorage (grid vs list preference)
- Lot grid print view (`@media print` CSS only) for client meetings
- Integration tests for `sale.actions.ts` and `payment.actions.ts` (mocked auth + Prisma)

**Defer (v2+ or post-delivery):**
- E2E Playwright tests — brittle, slow, expensive to maintain for a single-client handoff
- Geographic/satellite map — wrong mental model; manzana grid solves the actual need
- Real-time WebSocket updates — `revalidatePath` is sufficient for concurrent user count
- 100% code coverage requirement — drives testing of implementation details, not risk

### Architecture Approach

The testing infrastructure maps cleanly onto the existing four-layer architecture. The test directory structure mirrors the source directory: `__tests__/unit/lib/` for pure functions (zero mocking), `__tests__/unit/models/` for Prisma-backed functions (mocked Prisma), and `__tests__/integration/actions/` for server actions (mocked auth + Prisma + cache). The lot visualization component tree follows a pure-display pattern: `LotsSection` owns all state, `LotsGrid` and `LotDetailPanel` are pure display components that receive data via props — this makes them straightforwardly testable with `@testing-library/react`.

**Major components:**
1. `__tests__/unit/lib/` — Pure function tests (installment-generator, sale-helpers, rbac, exchange-rate, format)
2. `__tests__/unit/schemas/` — Zod schema validation tests (sale.schema, person.schema)
3. `__tests__/integration/actions/` — Server action tests with mocked auth + Prisma + next/cache
4. `LotsSection` (orchestrator) + `LotsGrid` + `LotDetailPanel` (pure display) — component test targets
5. `vitest.setup.ts` + shared test helpers — auth mocking, money assertion helpers

### Critical Pitfalls

1. **Floating-point equality in money tests** — Never use `toBe()` on calculated amounts. Use `toBeCloseTo(n, 2)` universally, or create a `expectMoney()` helper. Affects every financial test. Set this up before writing any assertions.

2. **`requirePermission` blocks all action tests without session mocking** — Every server action calls `requirePermission()` which calls `auth()` which throws a redirect. Create a `mockAuthenticatedUser(role)` shared helper and mock it as the FIRST thing in every action test file.

3. **Duplicate algorithm divergence between preview and generator** — `calculateInstallmentPreview` and `generateInstallments` implement identical month-clamping logic independently. Write a parity test that feeds the same inputs to both and asserts identical outputs. This is the single highest-risk bug for client delivery.

4. **`originalAmount` corruption on second refuerzo** — `recalculateInstallments()` must NOT overwrite `originalAmount` on the second call. Test with a two-step sequence: apply first refuerzo, verify `originalAmount` set; apply second refuerzo, verify `originalAmount` not overwritten. CONCERNS.md explicitly flags this as a known risk.

5. **`recalculateInstallments` runs outside the transaction** — `payment.actions.ts` deliberately runs recalculation after closing the Prisma transaction. Tests that assume atomicity model the system incorrectly. Write a specific test for the partial-failure case (payment recorded, recalculation throws).

---

## Implications for Roadmap

Based on combined research, a three-phase structure is recommended. The ordering is driven by the dependency graph: infrastructure must exist before tests, pure function tests are free of mocking complexity and should come first to build confidence, and delivery gates (build, lint, smoke) must be validated last when everything else is in place.

### Phase 1: Testing Infrastructure Setup

**Rationale:** Nothing else can be built until the test runner is installed and configured. The shared helpers (auth mock, money assertion helper) prevent rework across all subsequent phases if established first.
**Delivers:** Working `npm test` command with zero tests failing; Vitest config with jsdom environment; `vitest.setup.ts` with `@testing-library/jest-dom`; shared `mockAuthenticatedUser()` and `expectMoney()` helpers.
**Addresses:** FEATURES.md — automated `npm test` script; STACK.md — Vitest installation.
**Avoids:** PITFALLS #1 (floating-point) and #5 (auth mocking) — both are infrastructure concerns that contaminate every test if not addressed upfront.

### Phase 2: Pure Function Unit Tests

**Rationale:** Pure functions have zero dependencies — no mocking, no setup, maximum ROI, maximum coverage confidence. Tackling these first proves the test infrastructure works and catches the highest-risk business logic bugs before touching framework integration.
**Delivers:** Test suites for `installment-generator.ts`, `sale-helpers.ts` (with parity assertions), `rbac.ts` (full 4x16 matrix including negative assertions), `exchange-rate.ts` (mocked fetch), `format.ts`.
**Uses:** STACK.md — Vitest + pure TypeScript (no React testing library needed here).
**Implements:** ARCHITECTURE.md `__tests__/unit/lib/` layer.
**Avoids:** PITFALLS #3 (parity divergence), #4 (date edge cases), #8 (permission matrix), #9 (zero-rate fallback), #10 (preview/generator parity).

### Phase 3: Mocked Integration Tests

**Rationale:** Server action tests require all three mocks (auth, Prisma, next/cache) to be in place. By phase 3 the infrastructure helpers from Phase 1 make this straightforward. These tests cover the highest-severity financial flows that cannot be verified by pure function tests.
**Delivers:** Test suites for `installment-recalculator.ts` (Prisma mock), `sale.actions.ts`, `payment.actions.ts` — including the two-step refuerzo sequence and partial-failure case.
**Uses:** STACK.md — `jest-mock-extended` Prisma mock, shared auth helpers from Phase 1.
**Implements:** ARCHITECTURE.md `__tests__/unit/models/` and `__tests__/integration/actions/` layers.
**Avoids:** PITFALLS #2 (mock vs real DB — acknowledged gap), #3 (transaction boundary), #6 (Decimal serialization), #7 (double recalculation).

### Phase 4: Delivery Gates and Lot Grid Polish

**Rationale:** Final gate before handoff. Build, lint, and typecheck must pass cleanly. Smoke test run formalizes QA sign-off. Lot grid polish is low-complexity, already-built UI work that belongs at the end where UI state is stable.
**Delivers:** Clean `tsc --noEmit`, `eslint`, and `next build` runs; completed TESTING.md smoke sign-off; lot grid manzana grouping refinements; detail panel polish; optional localStorage view persistence.
**Addresses:** FEATURES.md — all P1 delivery gates and lot visualization items.
**Avoids:** PITFALLS #2 (mock vs real DB gap acknowledged in smoke test) — the smoke test on real data is the compensating control for Prisma behavior that mocks cannot verify.

### Phase Ordering Rationale

- Infrastructure before tests (Phase 1 → 2/3): shared helpers prevent rework if set up first
- Pure functions before integration (Phase 2 → 3): establishes test confidence with zero mocking complexity; any Vitest configuration mistakes surface cheaply here
- Tests before delivery gates (Phases 2/3 → 4): build and smoke test only have value when the code under test is already verified
- Lot grid polish last (Phase 4): UI polish on top of stable, tested business logic

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** The partial-failure recovery path for `recalculateInstallments` after transaction close is undocumented behavior — needs code archaeology in `payment.actions.ts` before writing the test.
- **Phase 3:** Prisma `Decimal` serialization behavior in mocked vs real environments — `@electric-sql/pglite` is already in `node_modules` and could replace mocked Prisma for critical financial flows in a future iteration.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Vitest installation and configuration is fully documented with official examples; no additional research needed.
- **Phase 2:** Pure function testing patterns are universal — no domain-specific research required.
- **Phase 4:** Build/lint/typecheck gates are standard Next.js commands; lot grid components are already built.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vitest is the documented choice for Vite-based Next.js; all version numbers from official releases |
| Features | MEDIUM-HIGH | Feature list derived from direct codebase analysis of existing files; priorities are judgement calls |
| Architecture | HIGH | Test structure derived from actual codebase shape; component responsibilities directly read from source files |
| Pitfalls | HIGH | All pitfalls grounded in specific file:line references in the codebase, not hypothetical risks |

**Overall confidence:** HIGH

### Gaps to Address

- **Real DB vs mock gap:** Mocked Prisma tests cannot catch actual SQL behavior bugs (Decimal serialization, race conditions). The `@electric-sql/pglite` package is already installed and could provide an in-process test database. Evaluate during Phase 3 planning whether the investment is worthwhile for delivery timeline.
- **Smoke test scope:** The manual TESTING.md smoke checklist has 13 sections but no seed data script exists yet. Confirm whether seed data needs to be created as part of Phase 4 setup or already exists in staging.
- **Second refuerzo recovery path:** The behavior when `recalculateInstallments` throws after a payment is committed is undocumented. This path needs to be read in `payment.actions.ts` lines 290-310 before writing the test in Phase 3.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `src/lib/installment-generator.ts`, `installment-recalculator.ts`, `sale-helpers.ts`, `rbac.ts`, `payment.actions.ts`, `sale.actions.ts`
- Official Vitest documentation — configuration, jsdom environment, coverage providers
- Prisma official testing guide — `jest-mock-extended` recommendation for unit testing
- Next.js 15 documentation — server component testability limitations, recommended test runners

### Secondary (MEDIUM confidence)
- Community consensus on Vitest vs Jest for Vite-based projects — multiple sources agree Vitest is the correct choice
- `TESTING.md` smoke checklist — existing 13-section manual QA baseline

### Tertiary (LOW confidence)
- `@electric-sql/pglite` as in-process test DB — found in `node_modules` but untested in this codebase; would need a spike to validate

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
