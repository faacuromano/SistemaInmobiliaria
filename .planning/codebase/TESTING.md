# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Status:** No automated unit/integration test framework configured

**Framework:**
- Manual smoke testing is primary testing method (documented in `/TESTING.md`)
- No Jest, Vitest, or testing library configured in package.json
- No test scripts in package.json beyond `npm run lint`

**Run Commands:**
```bash
npm run lint              # ESLint only (no test runner)
npm run build             # Type checking and build
npx tsc --noEmit          # TypeScript type validation
```

## Test File Organization

**Location:**
- No test files in `src/` directory (`.test.ts`, `.spec.ts` not used)
- Test configuration: Not applicable (no test framework)

**Manual Testing Approach:**
- Smoke test checklist: `TESTING.md` at project root
- Test scenarios organized by feature area (Authentication, Dashboard, Sales, Payments, etc.)
- Checkbox format for manual verification before deployment

## Smoke Test Checklist

**Documented in:** `/TESTING.md` (162 lines)

**Test Categories:**

### 1. Authentication & Authorization (8 scenarios)
- Login with valid/invalid credentials
- Inactive user rejection
- Redirect behavior without session
- RBAC enforcement for different roles (COBRANZA, FINANZAS, SUPER_ADMIN)
- Logout and session cleanup

**File:** `src/lib/auth-guard.ts`, `src/server/actions/auth.actions.ts`

### 2. Dashboard (5 scenarios)
- KPI cards display and accuracy
- Recent sales table (latest 5)
- Upcoming signings (next 10)
- Overdue installments
- Navigation links to detail pages

**File:** `src/app/(dashboard)/dashboard/page.tsx`

### 3. Developments (8 scenarios)
- List with statistics
- Create, edit, delete operations
- Auto-generated slug validation
- Lot inventory management
- Prevent deletion when lots have active sales

**Files:** `src/server/models/development.model.ts`, `src/server/actions/development.actions.ts`

### 4. Persons (6 scenarios)
- Type filtering (CLIENTE/PROVEEDOR/AMBOS)
- DNI/CUIT uniqueness constraint
- Create, edit, toggle active
- View person sales history

**Files:** `src/server/models/person.model.ts`, `src/server/actions/person.actions.ts`

### 5. Sales (8 scenarios) — CRITICAL FLOW

#### 5a. Normal Sale with Installments
- Development/lot selection filters
- Only DISPONIBLE/RESERVADO lots available
- Installment preview calculation
- Lot status changes to VENDIDO
- Installments auto-generated with correct amounts

#### 5b. Contado (Full Payment)
- Sale with 0 installments
- Lot status becomes CONTADO
- No installment records created

#### 5c. Cesion (Provider with Exchange)
- Sale status CESION, price 0
- Lot status becomes PERMUTA

#### 5d. Sale Cancellation
- Lot reverts to DISPONIBLE
- Cannot re-cancel already cancelled sale

**Files:** `src/server/models/sale.model.ts`, `src/server/actions/sale.actions.ts`

### 6. Payments/Cobranza (11 scenarios) — CRITICAL FLOW

#### 6a. Regular Installment Payment
- Search person by name/contact
- Display person's active sales
- Select installment and amount due
- Currency selection (USD/ARS)
- CashMovement created with correct income type
- Partial payment → PARCIAL status
- Full payment → PAGADA status
- PaymentReceipt auto-generated
- Cannot exceed remaining balance

#### 6b. Extra Charge (Refuerzo) Payment
- Create extra charge on sale
- Pay full amount triggers installment recalculation
- Remaining installments show updated amounts
- `originalAmount` preserved on recalculated installments

#### 6c. Sale Completion
- Final installment paid → sale status becomes COMPLETADA

**Files:** `src/server/models/payment-receipt.model.ts`, `src/server/actions/cash-movement.actions.ts`, `src/lib/installment-recalculator.ts`

### 7. Cash Management (7 scenarios)
- Summary card calculations (income/expense totals)
- Filter by date range
- Filter by movement type (14 types: CUOTA, COMISION, SUELDO, etc.)
- Filter by development
- Manual movement creation (SUELDO, GASTO_OFICINA, etc.)
- Currency validation (ARS+USD mixing blocked except CAMBIO type)
- CAMBIO type allows dual currency

**Files:** `src/server/models/cash-movement.model.ts`, `src/server/actions/cash-movement.actions.ts`

### 8. Signing Slots (5 scenarios)
- List upcoming signings
- Create with date, time, lot info
- Edit details
- Status transitions (PENDIENTE → CONFIRMADA → COMPLETADA → CANCELADA)
- Week view calendar display

**Files:** `src/server/models/signing.model.ts`

### 9. Statistics (5 scenarios)
- Monthly income/expense aggregation
- Year filter
- Development filter
- Collection rate percentage
- YoY comparison (4 metrics)

**Files:** `src/app/(dashboard)/estadisticas/page.tsx`

### 10. Configuration (6 scenarios)
- User list and creation
- Role assignment (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA)
- Password changes
- Active/inactive toggle
- Seller status and commission rate management
- Role-permission matrix display

**Files:** `src/server/models/user.model.ts`, `src/server/actions/user.actions.ts`

### 11. Notifications & Messages (6 scenarios)
- Notification bell with unread count
- Dropdown displays recent notifications
- Mark single/all as read
- Internal messaging between users
- Inbox display for recipients

**Files:** `src/server/models/message.model.ts`, `src/server/models/notification.model.ts`

### 12. Audit Log (3 scenarios)
- Display operations log
- Filter by entity type
- Filter by date range and search

**Files:** `src/server/models/audit-log.model.ts`, `src/server/actions/audit-log.actions.ts`

### 13. Infrastructure (3 scenarios)
- `/api/health` endpoint returns `{"status":"ok","database":"connected"}`
- `npm run build` succeeds without errors
- No TypeScript errors with `npx tsc --noEmit`
- Application loads after `npm start`

## Testing Strategy

**Manual Testing Flow:**
1. Run smoke test checklist before each production deployment
2. Focus on critical flows: Sales → Payments → Installments → Receipt
3. Verify RBAC enforcement for each role
4. Validate currency handling (USD/ARS dual support)
5. Check database constraints (DNI/CUIT uniqueness, lot status transitions)

**Quick Regression (After Any Change):**
```bash
1. Login and verify auth works
2. Create a sale → verify installments generated
3. Pay an installment → verify receipt created
4. Check dashboard KPIs update
5. Run `npm run build` → no errors
```

## Test Data/Fixtures

**Seed Data:**
- Location: `prisma/seed.ts`
- Run with: `npm run db:seed`
- Creates initial users with test credentials for each role

**Test Scenario Preparation:**
- Create development with lots
- Create persons (CLIENTE, PROVEEDOR types)
- Execute sale flow to generate installments
- Use various payment scenarios to test installment state transitions

## Coverage Gaps

**Untested Areas:**
- Unit tests for business logic (installment generation, recalculation)
- Integration tests for database transactions
- Email sending (nodemailer integration exists but untested)
- Cron jobs for notifications (`src/server/models/cron.model.ts`)
- External API integration (dolarapi.com for exchange rates)
- Edge cases in currency conversion and decimal precision

**Files with No Automated Tests:**
- `src/lib/installment-generator.ts` - Critical calculation logic
- `src/lib/installment-recalculator.ts` - Complex refuerzo scenario
- `src/lib/exchange-rate.ts` - Currency conversion logic
- `src/server/models/*.model.ts` - Data access layer
- `src/server/actions/*.actions.ts` - Server actions with validation

## Validation Testing

**Zod Schema Testing:**
- Schemas defined in `src/schemas/*.schema.ts`
- Validation patterns:
  - `safeParse()` for client validation feedback
  - Detailed error messages in Spanish
  - Example: `personCreateSchema` validates DNI (7-8 digits), CUIT (XX-XXXXXXXX-X) format

**Example Validation Scenarios (Manual):**
- Create person with invalid DNI → error message
- Create duplicate DNI → Prisma P2002 constraint error caught
- Submit sale with missing required fields → Zod error from schema
- Pay installment with amount > remaining → blocked by business logic

## Performance Considerations

**Caching:**
- Next.js `revalidatePath()` used after mutations to refresh data
- Example: `revalidatePath("/personas")` after person create/update

**Database Queries:**
- Models use Prisma `include` with specific field selection to minimize data transfer
- Complex queries include related data selectively:
  ```typescript
  include: {
    lots: {
      include: {
        sale: { include: { person: true } },
        tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
      },
      orderBy: { lotNumber: "asc" },
    },
  }
  ```

**Type Safety Testing:**
- `npm run build` ensures TypeScript strict mode compliance
- No `any` types observed in source code
- Zod provides runtime validation layer

---

*Testing analysis: 2026-02-25*
