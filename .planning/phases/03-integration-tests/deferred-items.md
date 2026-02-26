# Deferred Items - Phase 03

## Out-of-Scope Failures

### 1. sale-actions.test.ts contado sale test failure (Plan 03-01)
- **File:** `src/__tests__/integration/sale-actions.test.ts`
- **Test:** "creates contado sale with zero installments and lot status CONTADO"
- **Issue:** `generateInstallments` mock is being called when it shouldn't be for a contado sale
- **Discovered during:** Plan 03-02 full suite run
- **Scope:** Plan 03-01 (sale-actions tests) -- not related to payment-actions
