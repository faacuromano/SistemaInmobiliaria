# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

**Runner:**
- Not configured — no test framework (Jest, Vitest, etc.) installed
- Package.json contains no test script
- No jest.config.js, vitest.config.ts, or test runner configuration

**Assertion Library:**
- Not installed — no dependency on chai, vitest, jest, etc.

**Run Commands:**
```bash
# No automated test running configured
# Manual smoke testing via TESTING.md checklist
# Type checking: npx tsc --noEmit
# Linting: npm run lint
```

## Test File Organization

**Location:**
- No co-located test files found in codebase
- No separate `__tests__/` directories
- Testing performed via manual smoke test checklist in `TESTING.md`

**Naming:**
- Not applicable — no test files in project

**Structure:**
- Not applicable — testing is manual and checklist-based

## Manual Testing Approach

**Smoke Test Checklist:**
A comprehensive manual test checklist exists in `/TESTING.md` with 13 major sections:

1. **Authentication & Authorization** (8 tests)
   - Login/logout flows, role-based access control verification
   - Tests COBRANZA, FINANZAS, SUPER_ADMIN role restrictions

2. **Dashboard** (5 tests)
   - KPI card accuracy, recent sales table, upcoming signings display
   - Overdue installments detection, navigation links

3. **Developments (Desarrollos)** (8 tests)
   - CRUD operations, slug auto-generation, lot inventory management
   - Tag management, deletion validation (prevent delete with dependent sales)

4. **Persons (Personas)** (7 tests)
   - Client/Provider type handling, DNI/CUIT uniqueness enforcement
   - Active/inactive toggle, sales history display

5. **Sales (Ventas) - CRITICAL** (12 tests)
   - **5a. Normal Sale (Installments):** lot filtering, installment preview accuracy, lot status transitions
   - **5b. Contado Sale:** zero installments, CONTADO status, lot status change
   - **5c. Cesion (Provider with lot):** price-zero sales, PERMUTA lot status
   - **5d. Cancel Sale:** lot status reversion to DISPONIBLE, prevent re-cancel

6. **Payments (Cobranza) - CRITICAL** (11 tests)
   - **6a. Pay Regular Installment:** person search, amount validation, currency handling, receipt generation
   - Partial vs full payment status tracking
   - **6b. Pay Extra Charge:** refuerzo payment, installment recalculation accuracy
   - **6c. Sale completion:** last installment paid → COMPLETADA status

7. **Cash Management (Caja)** (8 tests)
   - Summary card accuracy, date/type/development filtering
   - Manual movement creation, currency validation, CAMBIO type dual-currency support
   - Balance tab monthly snapshots

8. **Signing Slots (Firmas)** (5 tests)
   - List view display, CRUD operations, status workflow
   - Calendar week view rendering

9. **Statistics (Estadisticas)** (5 tests)
   - Monthly income/expense table, year/development filters
   - Collection rate percentage, YoY comparison metrics

10. **Configuration (Configuracion)** (5 tests)
    - User management, password change, role/permission assignment
    - Seller toggle and commission rate configuration

11. **Notifications & Messages** (5 tests)
    - Notification bell unread count, mark read/all-read operations
    - Internal message send and receipt

12. **Audit Log** (3 tests)
    - Operation log display, entity/date filtering, content search

13. **Infrastructure** (3 tests)
    - `/api/health` endpoint status, TypeScript compilation, build success, app startup

**Quick Regression:**
5 quick tests to run after any change:
- Login works
- Create sale → installments generated
- Pay installment → receipt generated
- Dashboard KPIs update
- Build succeeds

## Test Coverage

**Requirements:** None enforced — no coverage threshold configured

**View Coverage:**
```bash
# No coverage tooling configured
# Manual verification through smoke test checklist
```

## Critical Business Logic Flows (Manual Test Patterns)

**Sale Creation Flow:**
1. Select development → validates lot dropdown filters to DISPONIBLE/RESERVADO
2. Calculate installment amounts (totalPrice - downPayment) / totalInstallments
3. Generate installment records with due dates respecting collectionDay
4. Update lot status to VENDIDO (or CONTADO/PERMUTA for special cases)
5. Verify installment preview matches generated records

**Payment & Installment Recalculation:**
1. Select installment with status PENDIENTE or PARCIAL
2. Accept payment in USD or ARS with exchange rate (manual or fetched)
3. Create CashMovement with usdIncome/arsIncome accordingly
4. Generate PaymentReceipt automatically
5. Update installment status: PAGADA (if fully paid), PARCIAL (if underpaid)
6. **On ExtraCharge full payment**: recalculate remaining installments with new due dates and amounts
7. **On last installment PAGADA**: mark sale as COMPLETADA

**Lot Status Transitions:**
- DISPONIBLE → VENDIDO (normal sale)
- DISPONIBLE → CONTADO (contado sale, zero installments)
- DISPONIBLE → PERMUTA (cesion sale, price=0, provider scenario)
- VENDIDO/CONTADO/PERMUTA → DISPONIBLE (sale cancellation)
- No transition back to RESERVADO in current flows

**Exchange Rate Handling:**
- Dashboard layout fetches today's rate on every load
- Rate source: dolarapi.com API
- If API fails: no rate displayed, manual rate entry required for payments
- Rates cached by date, new fetch if not found for today

## Manual Test Best Practices (from TESTING.md)

**Before Deploying:**
- Run through all 13 test sections
- Check all critical flows (sales, payments, lot status)
- Verify build completes without errors
- Confirm TypeScript compilation has no errors

**After Any Change:**
- Run 5-item quick regression
- Pay special attention to affected modules
- Test role-based access for permission changes
- Verify no unexpected cascade effects on sales/payments

## Cron & Background Jobs (Tested Manually)

**Upcoming Signing Alerts (`/api/cron/notify-upcoming`):**
- Endpoint triggers via external cron service
- Queries signing slots due within 7 days
- Sends notifications and email alerts
- Prevents duplicate notifications via `notificationMessage` uniqueness
- Manual test: trigger endpoint, verify notifications appear

**Automatic Daily Exchange Rate (`/api/cron/notify-upcoming`):**
- Fetches USD/ARS rates from dolarapi.com
- Stores in database if not already cached
- Called on dashboard layout load
- Manual test: verify rates display on dashboard load

**Email Notifications:**
- Sent when signing alerts trigger, payment confirmations
- Logged to console: `[email] Email sent to...`
- Manual test: check sent emails in SMTP logs or test inbox

## Type Safety

**TypeScript Configuration:**
- `strict: true` in `tsconfig.json` — strict null checks enabled
- `noEmit: true` — type checking only, no code generation
- Target: ES2022
- Library includes DOM, DOM iterables, ESNext

**Type Checking Before Deployment:**
```bash
npx tsc --noEmit
```

**Type Patterns:**
- Zod schema inference: `z.infer<typeof schema>` for input types
- Server action return type: `ActionResult<T>` union
- Prisma generated types: imported from `@/generated/prisma/client/client`
- Client-safe enums: defined in `@/types/enums.ts` (mirror Prisma enums without Prisma runtime)

## Property-Based & Edge Case Testing (Manual)

**Decimal Handling:**
- Prisma Decimal fields serialized to `Number()` before client transmission
- Verify no precision loss in calculations (installment amounts, currency conversions)
- Manual test: create sale with 3 decimal places, pay partial, check recalculation

**Date Edge Cases:**
- Collection days > days in month: use last day of month (e.g., day 31 in February)
- Year boundary: installments spanning new year, month overflow handling
- Manual test: create sale with collectionDay=31, first installment in January, verify February uses 28th

**Currency Mixing:**
- CAMBIO type allows both ARS and USD in single movement
- Other types cannot mix currencies (system validates)
- Manual test: create USD payment, attempt ARS in same transaction → error

**Zero-Value Sales:**
- CONTADO sale (totalInstallments=0): no installments generated
- CESION sale (totalPrice=0): provider scenario, PERMUTA lot status
- Manual test: verify no orphaned installments created

**Duplicate Prevention:**
- DNI/CUIT uniqueness on Person creation/edit
- Message uniqueness for signing alerts (via `notificationMessage` field)
- Manual test: attempt duplicate person creation → error shown

## Test Regression Checklist

After any code change, verify:
- [ ] Login still works (credentials, inactive user, wrong password cases)
- [ ] Create sale → installments auto-generated with correct amounts
- [ ] Pay installment → receipt auto-generated
- [ ] Dashboard KPIs (total revenue, pending invoices, etc.) update correctly
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] ESLint passes: `npm run lint`

## Infrastructure Testing

**Health Check Endpoint:**
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected"}
```

**Build Verification:**
```bash
npm run build        # Should complete without errors
npm start            # Should start server successfully
```

**Database Connection:**
- Tested implicitly by any Prisma query
- Cron jobs confirm connection via async operations
- Manual test: verify dashboard loads without database errors

---

*Testing analysis: 2026-02-26*
