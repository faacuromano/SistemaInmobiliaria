# Phase 2: Financial Logic Tests - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Unit tests for three pure financial functions: `generateInstallments()`, `calculateInstallmentPreview()`, and `recalculateInstallments()`. Covers all edge cases specified in FIN-01 through FIN-09 including date clamping, year rollover, preview/generator parity, and the second-refuerzo guard. No production code changes unless a parity divergence is discovered.

</domain>

<decisions>
## Implementation Decisions

### Test Data Design
- Use realistic business amounts (e.g., $15,000 USD total, 60 cuotas de $250, collection day 10) — tests reflect real usage and catch real rounding issues
- Create a shared fixtures file (e.g., `test-data.ts` or `fixtures.ts`) with named scenarios (`STANDARD_60_CUOTAS`, `CONTADO_SALE`, etc.) — DRY across generator/preview/recalculator tests
- Pin dates to specific years for deterministic tests: 2024 for leap year, 2025 for non-leap year
- USD as primary currency throughout tests, with one ARS scenario to verify currency passthrough works

### Parity Test Strategy (FIN-05)
- Compare field-by-field on shared fields: amount, dueDate, monthLabel for each installment index. Map `number` (preview) to `installmentNumber` (generator). Ignore generator-only fields (saleId, currency)
- Run parity check against multiple scenarios (standard 60 cuotas, variable first installment, year rollover, day-31 clamping) — catches divergence across edge cases
- Interpret "byte-for-byte identical" as "identical financial results" — same amounts, same due dates, same month labels. Not literal JSON string comparison
- If a parity divergence is found, fix it in source code — the test should pass, not document a known bug

### Recalculator Isolation (FIN-06/07/08)
- Mock Prisma using the shared prisma mock from Phase 1 — stub findMany/update/$transaction. Test the function as-is without refactoring production code
- For second-refuerzo guard (FIN-07): use two-call sequence. First call: findMany returns installments with originalAmount=null, verify update sets originalAmount. Second call: findMany returns installments with originalAmount already set, verify update does NOT touch originalAmount
- Verify $transaction was called with all update operations — ensures atomicity guarantee is maintained if someone refactors
- For FIN-08 (reduction > amount): test multiple boundary scenarios — reduction exactly equals amount (result=0), reduction exceeds amount (clamped to 0), reduction barely below amount (small positive result)

### Claude's Discretion
- Test file organization (single file vs split by function)
- Exact fixture values beyond the realistic/pinned-date constraints
- describe/it block structure and naming conventions
- Whether to use `test.each` for parameterized scenarios

</decisions>

<specifics>
## Specific Ideas

- All monetary assertions must use `expectMoney` helper from Phase 1 — no raw `toBe()` on calculated amounts (per FIN-09)
- The shared prisma mock from Phase 1 (`createMockPrismaClient`) should be reused for recalculator tests
- Named scenarios in fixtures should map clearly to requirements (e.g., fixture for FIN-01 should explicitly test day-31 clamping in short months)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-financial-logic-tests*
*Context gathered: 2026-02-26*
