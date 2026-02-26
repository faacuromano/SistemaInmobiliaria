# Feature Research

**Domain:** Real estate ERP — QA, testing coverage, and lot visualization
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH

---

## Context

Sistema Inmobiliaria is feature-complete and approaching client delivery. No test framework is installed — only a manual TESTING.md smoke checklist exists. The lots grid (manzana grouping, detail panel, mobile sheet) is already built and needs polish.

---

## Feature Landscape

### Table Stakes (Must Have for Delivery)

| Feature | Complexity | Notes |
|---------|------------|-------|
| Unit tests for financial calculation logic | MEDIUM | `installment-generator.ts` is pure — start here |
| Unit tests for installment recalculation | MEDIUM | Requires Prisma mock; covers refuerzo edge cases |
| Unit tests for RBAC permission matrix | LOW | `hasPermission()` is pure, 4 roles × 16 permissions |
| Parity test: generator vs preview | LOW | Both implement same algorithm independently — divergence risk |
| TypeScript: `tsc --noEmit` clean | LOW | Must pass before delivery |
| ESLint: `npm run lint` clean | LOW | Code quality signal for handoff |
| Build: `npm run build` clean | LOW | If build fails, nothing else matters |
| Smoke test: all 13 TESTING.md sections signed off | LOW | Formal run on seed data |
| Color-coded lot status grid | LOW | Already built: 7 statuses with distinct colors |
| Block (manzana) grouping in lot grid | MEDIUM | Already built in LotsGrid non-compact mode |
| Lot detail panel (buyer, price, area, tags) | MEDIUM | LotDetailPanel + mobile Sheet already built |
| Status count summary bar | LOW | Already in LotsSection |
| Decimal precision in payment flows | MEDIUM | `Math.round(... * 100) / 100` pattern needs edge case tests |
| Installment date edge cases (collectionDay=31) | LOW | Feb clamping, leap year, year rollover |

### Differentiators (Add Polish)

| Feature | Complexity | Notes |
|---------|------------|-------|
| Automated `npm test` script | MEDIUM | Living safety net; professional delivery signal |
| Second refuerzo recalculation test | MEDIUM | Highest-risk logic; `originalAmount` preservation |
| View toggle persistence (localStorage) | LOW | Remembers user's preferred grid view |
| Lot grid print view (`@media print`) | LOW | CSS only — print availability for client meetings |
| Quick sale from lot detail panel | MEDIUM | "Nueva Venta" for DISPONIBLE lots |

### Anti-Features (Do NOT Build)

| Feature | Why Problematic | Alternative |
|---------|-----------------|-------------|
| Geographic/satellite map | Heavy library, geocoding, wrong mental model | Manzana grid solves the real need |
| E2E browser tests (Playwright) for delivery | Slow, brittle, expensive to maintain | Unit tests + manual smoke checklist |
| 100% code coverage requirement | Drives testing implementation details | Cover 3 risk areas: financials, state transitions, permissions |
| Real-time WebSocket updates | Socket server complexity for low concurrent users | `revalidatePath` on mutations |
| Automated email testing in unit suite | Visual integration concern | Manual test in staging |

---

## Feature Dependencies

```
[Build passes] → required for → [All delivery gates]
[TypeScript compiles] → required for → [Build passes]

[Unit tests: installment-generator (pure)] → no deps
  └── reveals divergence with → [calculateInstallmentPreview]

[Unit tests: hasPermission (pure)] → no deps
  └── required for → [RBAC confidence]

[Unit tests: recalculateInstallments] → requires Prisma mock
  └── required for → [Refuerzo confidence]

[Smoke test completion] → requires running app + seed data
[Lot grid polish] → already built, polish only
```

---

## Specific Testing Areas by Risk Level

### Critical Risk (Must Test Before Delivery)

1. **`generateInstallments()` + `calculateInstallmentPreview()`** — duplicate algorithm, divergence risk. Edge cases: collectionDay 31→Feb, year wraparound, variable first amount, zero installments (contado)
2. **`recalculateInstallments()`** — first refuerzo, second refuerzo (originalAmount preservation), reduction > amount clamp
3. **`hasPermission()` matrix** — SUPER_ADMIN wildcard, COBRANZA restrictions, permission denied assertions

### Moderate Risk (Address Before or Shortly After Delivery)

4. Payment overpayment guard — decimal arithmetic edge cases
5. Lot status transition on cancellation — all sale types must revert to DISPONIBLE
6. Import null-DNI duplicates — bypass uniqueness check

### Lower Risk (Manual Smoke Test Sufficient)

Dashboard KPIs, signing calendar, email templates, statistics filters

---

## Prioritization Matrix

| Feature | User Value | Cost | Priority |
|---------|------------|------|----------|
| Unit tests: installment-generator (pure) | HIGH | LOW | P1 |
| Unit tests: calculateInstallmentPreview (pure) | HIGH | LOW | P1 |
| Unit tests: hasPermission / RBAC (pure) | HIGH | LOW | P1 |
| Unit tests: installment-recalculator (mocked) | HIGH | MEDIUM | P1 |
| Build/lint/typecheck gates | HIGH | LOW | P1 |
| Smoke test run + sign-off | HIGH | LOW | P1 |
| Lot grid: block grouping polish | HIGH | LOW | P1 |
| Lot grid: detail panel polish | HIGH | LOW | P1 |
| View mode persistence (localStorage) | MEDIUM | LOW | P2 |
| Lot grid: print view (CSS) | MEDIUM | LOW | P2 |
| Integration tests: payment flows | HIGH | HIGH | P2 |

---

*Feature research for: Real estate ERP — QA, testing, lot visualization*
*Researched: 2026-02-26*
