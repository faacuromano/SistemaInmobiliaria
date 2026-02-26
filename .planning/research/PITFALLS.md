# Pitfalls Research

**Domain:** Real estate ERP — Testing financial/ERP applications
**Researched:** 2026-02-26
**Confidence:** HIGH (grounded in direct codebase analysis)

---

## Critical Pitfalls

### 1. Floating-Point Equality in Money Tests

**Risk:** HIGH | **Phase:** Testing setup

Using `toBe()` on calculated money amounts fails due to IEEE 754 floating-point arithmetic. The codebase already uses `Math.round(... * 100) / 100` in `sale.actions.ts` line 180 and `installment-recalculator.ts` line 47.

**Warning signs:** Tests pass locally but fail in CI, or pass with one input but fail with another.

**Prevention:**
- Use `toBeCloseTo(n, 2)` for all money assertions
- Create a `expectMoney(received, expected)` helper that wraps this pattern
- Never use `toBe()` or `toEqual()` for calculated monetary values

---

### 2. Mocking Prisma Instead of Testing Real Queries

**Risk:** HIGH | **Phase:** Testing strategy

The most common mistake. All known bugs (Decimal serialization, exchange rate race condition, `originalAmount` preservation) are invisible to mock-based tests because mocks don't execute actual SQL.

**Warning signs:** All mock tests pass but production has data integrity bugs.

**Prevention:**
- Use mocked Prisma for unit tests (verify logic flow)
- Acknowledge that mocked tests verify _your code's behavior_, not _Prisma's behavior_
- For critical financial flows, consider integration tests with a real test DB in a future phase
- The `@electric-sql/pglite` package is already in `node_modules` and can serve as in-process test DB

---

### 3. `recalculateInstallments` Runs OUTSIDE the Transaction

**Risk:** HIGH | **Phase:** Payment flow testing

`payment.actions.ts` line 299 deliberately runs recalculation AFTER closing the Prisma transaction. Tests that expect atomicity will incorrectly model the system.

**Warning signs:** Tests assume payment + recalculation are atomic; partial-failure state (payment recorded, recalculation failed) is never tested.

**Prevention:**
- Write a specific test for the partial-failure case
- Document that this is intentional design (not a bug)
- Test the recovery path: what happens if recalculation throws after payment is committed?

---

### 4. Installment Date Edge Cases Never Tested

**Risk:** HIGH | **Phase:** Pure function testing

`collectionDay=31` in January/February/December is the exact boundary condition flagged in CONCERNS.md. The `Math.min(collectionDay, daysInMonth)` clamping logic exists but has zero test coverage.

**Warning signs:** Client reports incorrect due dates in February or short months.

**Prevention:**
- Test matrix: collectionDay 28/29/30/31 × months Jan/Feb/Mar/Apr/Jun/Nov/Dec
- Test leap year February (29 vs 28)
- Test year rollover: December → January of next year

---

### 5. `requirePermission` Blocks ALL Action Tests Without Session Mocking

**Risk:** HIGH | **Phase:** Testing infrastructure

Every server action calls `requirePermission()` which calls `auth()` from Auth.js. Without mocking this, every test throws a redirect error before reaching any business logic.

**Warning signs:** First test ever written for a server action fails with "NEXT_REDIRECT" error.

**Prevention:**
- Mock `requirePermission` as the FIRST thing in every action test file
- Create a shared test helper: `mockAuthenticatedUser(role)` that sets up both `auth()` and `requirePermission()`
- Test with each of the 4 roles to verify permission boundaries

---

### 6. Decimal Serialization Bug Has No Test Guard

**Risk:** MEDIUM | **Phase:** Type safety testing

The scattered `Number()` conversions in `sale.actions.ts` (lines 40-63) are workarounds for Prisma's `Decimal` type returning objects instead of numbers. No test verifies this type contract.

**Warning signs:** UI shows `[object Object]` or `NaN` for monetary values.

**Prevention:**
- Write a test that verifies: raw Prisma returns Decimal object → action layer serializes to number
- Assert that all monetary fields in action responses are `typeof number`, not `typeof object`

---

### 7. Only Happy-Path Tested for Installment Recalculation

**Risk:** HIGH | **Phase:** Recalculation testing

CONCERNS.md explicitly warns: "second refuerzo payment may corrupt data." The `originalAmount` preservation logic in `installment-recalculator.ts` line 44-45 must be tested across TWO sequential recalculations.

**Warning signs:** First refuerzo works, second refuerzo silently overwrites originalAmount.

**Prevention:**
- Test sequence: create installments → first refuerzo → verify originalAmount set → second refuerzo → verify originalAmount NOT overwritten
- Edge case: reduction amount > remaining installment amount → verify `Math.max(..., 0)` clamp

---

### 8. Permission Boundary Tests Skipped as "Boilerplate"

**Risk:** MEDIUM | **Phase:** RBAC testing

COBRANZA role lacks `cash:manage` (rbac.ts line 66) but no test verifies this. The full 4-role × 16-permission matrix needs NEGATIVE assertions, not just SUPER_ADMIN happy paths.

**Warning signs:** Permissive behavior discovered in production — a role can do something it shouldn't.

**Prevention:**
- Test the full permission matrix: each role × each permission
- Include negative assertions: `expect(hasPermission('COBRANZA', 'cash:manage')).toBe(false)`
- SUPER_ADMIN wildcard `["*"]` must be tested separately

---

### 9. `convertCurrency` Zero-Rate Silent Fallback

**Risk:** MEDIUM | **Phase:** Exchange rate testing

`exchange-rate.ts` line 65 returns `0` when rate is 0. An ARS payment with a missing exchange rate records `usdIncome = 0` instead of failing.

**Warning signs:** Cash movement shows $0 USD income for a valid ARS payment.

**Prevention:**
- Test: what happens when exchange rate is 0, null, or undefined?
- Consider whether this should throw instead of silently returning 0
- Add an assertion or guard in the payment flow

---

### 10. Duplicate Logic Between Client Preview and Server Generator

**Risk:** HIGH | **Phase:** Parity testing

`calculateInstallmentPreview` (in `sale-helpers.ts`) and `generateInstallments` (in `installment-generator.ts`) implement the same month-clamping algorithm independently. If they diverge, the UI preview shows different amounts than what gets saved.

**Warning signs:** Client sees one amount in the sale form, database stores a different amount.

**Prevention:**
- Write a parity test: same inputs → both functions → identical outputs
- Test with edge cases: collectionDay 31, February, year boundaries
- Consider refactoring to share the core calculation (future improvement)

---

## Phase Mapping

| Pitfall | Should Be Addressed In |
|---------|----------------------|
| #1 Floating-point equality | Testing setup (vitest config / helpers) |
| #2 Mock vs real DB | Testing strategy decision |
| #3 Transaction boundary | Payment flow tests |
| #4 Date edge cases | Pure function tests |
| #5 Auth mocking | Testing infrastructure |
| #6 Decimal serialization | Type safety tests |
| #7 Double recalculation | Recalculation tests |
| #8 Permission matrix | RBAC tests |
| #9 Zero-rate fallback | Exchange rate tests |
| #10 Preview/generator parity | Parity tests |

---

*Pitfalls research for: Real estate ERP testing and delivery*
*Researched: 2026-02-26*
