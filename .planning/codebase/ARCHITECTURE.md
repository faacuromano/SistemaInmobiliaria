# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Next.js App Router + Server Actions (N-tier layered architecture)

**Key Characteristics:**
- Monolithic full-stack application with server-side business logic
- Server Actions for all mutations (no traditional API routes except auth/cron)
- Thick server layer (models → actions) with thin client components
- Role-Based Access Control (RBAC) with permission-based authorization
- Dual-currency tracking (USD/ARS) with daily exchange rates fetched from external API
- Installment auto-generation and recalculation for real estate financing workflows

## Layers

**Presentation Layer (Client):**
- Purpose: Render UI components and capture user input; minimal business logic
- Location: `src/app/(dashboard)/*` pages and `src/components/`
- Contains: Next.js page components, shadcn/ui components, React forms with react-hook-form
- Depends on: Server Actions, shared utilities, types
- Used by: End users via browser

**Server Action Layer (Business Logic):**
- Purpose: Execute all business operations as transactional server actions; enforce permissions
- Location: `src/server/actions/*.actions.ts` (23+ action files)
- Contains: "use server" functions that handle domain workflows (sale creation, payment processing, installment generation)
- Depends on: Models (data access), auth-guard, Prisma ORM, utility functions
- Used by: Client forms via POST submissions, API routes, admin scripts

**Data Access Layer (Models):**
- Purpose: Encapsulate Prisma queries and provide clean DAL interface
- Location: `src/server/models/*.model.ts` (19 model files)
- Contains: Prisma wrappers that construct queries with type safety
- Depends on: Prisma client, enums, types
- Used by: Server Actions exclusively

**Support Layers:**

**Auth & RBAC:**
- Location: `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/auth-guard.ts`, `src/lib/rbac.ts`
- Purpose: Next-Auth v5 integration, credential provider, session management, permission checks
- Key exports: `requireAuth()`, `requirePermission(permission)`, `checkPermissionDb(role, permission)`

**Utilities & Helpers:**
- Location: `src/lib/*.ts`
- Core files:
  - `installment-generator.ts` - Generate installment schedules for sales
  - `installment-recalculator.ts` - Recalculate installments when extra charges are paid
  - `sale-helpers.ts` - Client-safe sale preview calculations
  - `exchange-rate.ts` - Fetch daily USD/ARS rates from dolarapi.com
  - `format.ts` - Number/date formatting utilities
  - `constants.ts` - Enums and labels (SALE_STATUS_LABELS, SIGNING_STATUS_LABELS)

**Persistence:**
- Database: PostgreSQL via Prisma ORM
- Schema location: `prisma/schema.prisma`
- Client generation: `src/generated/prisma/client/`
- Key entities: User, Development, Lot, Sale, Installment, ExtraCharge, CashMovement, ExchangeRate, PaymentReceipt, SigningSlot, Person, Message, Notification, AuditLog

## Data Flow

**1. Sale Creation (Normal Flow):**

```
User fills SaleForm (client)
  ↓ [React Hook Form validation]
  ↓ form.action = createSale() [server action]
  → requirePermission("sales:manage")
  → saleCreateSchema validation (Zod)
  → saleModel.create(data) [insert Sale to DB]
  → generateInstallments() [calculate payment schedule]
  → prisma.installment.createMany() [bulk insert]
  → saleModel.updateStatus("ACTIVA")
  → lotModel.updateStatus("VENDIDO")
  → revalidatePath("/dashboard/ventas")
  ↓ [UI reloads with success toast]
  ✓ Sale with N installments now in database
```

**2. Payment Collection (Critical Flow):**

```
Cobranza selects Installment in UI
  ↓ payInstallment(formData) [server action]
  → requirePermission("cash:manage")
  → Parse amount, currency, date
  → fetchExchangeRate(date) [get USD/ARS for that day]
  → Create CashMovement (type: CUOTA, installmentId, exchangeRateId)
  → installment.status = "PAGADA" (or "PARCIAL" if partial)
  → revalidatePath() [revalidate caja, ventas, estadísticas]
  ↓ [Movement appears in Caja, Estadísticas updates]
  ✓ Payment recorded with historical exchange rate
```

**3. Extra Charge + Installment Recalculation:**

```
Admin creates ExtraCharge (refuerzo) for Sale
  ↓ createExtraCharge() [server action]
  → ExtraCharge inserted with amount, dueDate, saleId
  → When paid → CashMovement(type: REFUERZO, extraChargeId, exchangeRateId)
  ↓ [Trigger installment recalculation?]
  → recalculateInstallments(saleId) called manually or by action
  → Fetch unpaid installments
  → New total = (remaining balance) / (count of pending installments)
  → Update each pending installment.amount + .originalAmount
  ✓ Remaining payments now spread equally
```

**4. Provider Transaction (Permuta/Cesión):**

```
Admin selects Provider in PersonForm
  → Seller: creates Person(type: PROVEEDOR)
  ↓ createSale(totalPrice: 0, status: CESION)
  → No installments created (totalInstallments = 0)
  → CashMovement NOT created (no cash involved)
  → Lot.status = "PERMUTA"
  → Notes field documents the property/service exchanged
  ✓ Transaction recorded for audit, no cash movement
```

**State Management:**
- No Redux/Zustand at application level
- Prisma Session used for N+1 query batching in complex operations
- Zod schemas define and validate data contracts
- React Hook Form manages form state client-side (components/*/forms)
- RevalidatePath triggers ISR (Incremental Static Regeneration) for dashboard snapshots

## Key Abstractions

**Sale (aggregated entity):**
- Purpose: Central concept unifying lot assignment, customer, pricing, payment schedule
- Examples: `src/server/models/sale.model.ts`, `src/server/actions/sale.actions.ts`
- Pattern: Contains lot (1:1), person (1:1), multiple installments (1:N), multiple extra charges (1:N)
- Key methods: create, updateStatus, getSaleById (with full context)

**CashMovement (unified transaction ledger):**
- Purpose: Record all money movements (14 types: CUOTA, REFUERZO, COMISION, SUELDO, etc.)
- Examples: `src/server/models/cash-movement.model.ts`, `src/server/actions/cash-movement.actions`
- Pattern: Single movement table with typed enum + flexible associations (installmentId OR extraChargeId OR userId)
- Trazability: Always includes createdById (User), exchangeRateId (for ARS/USD conversion)

**Installment (payment schedule):**
- Purpose: Represent monthly payment obligations
- Examples: `src/server/models/installment.model.ts`, `src/lib/installment-generator.ts`
- Pattern: Auto-generated when Sale created; can be recalculated when ExtraCharge paid
- Status lifecycle: PENDIENTE → PARCIAL → PAGADA / VENCIDA (computed on read)

**ExchangeRate (daily snapshot):**
- Purpose: Capture USD/ARS exchange rates daily for historical audit trail
- Examples: `src/server/models/exchange-rate.model.ts`, `src/lib/exchange-rate.ts`
- Pattern: One entry per day; fetched from dolarapi.com on-demand
- Trazability: Every CashMovement stamped with exchangeRateId for reproducible conversion

**User with embedded Seller:**
- Purpose: Unified user model with optional seller capabilities
- Examples: `src/server/models/user.model.ts`
- Pattern: isSeller boolean + commissionRate on User; not separate table
- RBAC: Role enum (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA) + permission checks via DB

**SigningSlot (appointment scheduling):**
- Purpose: Manage notary appointment scheduling for deed closings
- Examples: `src/server/models/signing.model.ts`, `src/server/actions/signing.actions.ts`
- Pattern: Calendar-based with user assignments (createdById, sellerId)

## Entry Points

**Web Application:**
- Location: `src/app/(dashboard)/dashboard/page.tsx`
- Triggers: User navigates to /dashboard after login
- Responsibilities:
  - Query KPIs (active sales count, overdue count, monthly income, available lots, etc.)
  - Render 6 summary cards with real-time counts
  - Display recent sales, overdue installments, upcoming signings

**Authentication:**
- Location: `src/app/api/auth/[...nextauth]/route.ts`
- Triggers: User submits login form or accesses protected route
- Responsibilities:
  - Route to Next-Auth handlers
  - Delegate to Credentials provider in `src/lib/auth.ts`
  - Validate email + password, return session

**Cron Jobs:**
- Location: `src/app/api/cron/notify-upcoming/` (structure exists)
- Triggers: External scheduler (e.g., Vercel Cron, GitHub Actions)
- Responsibilities: Fetch upcoming signings, send notifications to users

**API Health Check:**
- Location: `src/app/api/health/`
- Triggers: Monitoring/deployment verification
- Responsibilities: Return database connectivity status

## Error Handling

**Strategy:** Try-catch with user-friendly error messages + audit logging

**Patterns:**

**Server Actions:**
```typescript
// Pattern from payment.actions.ts
export async function payInstallment(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  // Parse + validate inputs
  if (!installmentId) return { success: false, error: "ID de cuota requerido" };

  // Fetch context
  const installment = await prisma.installment.findUnique(...);
  if (!installment) return { success: false, error: "Cuota no encontrada" };

  // Business logic with try-catch for DB errors
  try {
    const result = await prisma.$transaction([...]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Error procesando pago" };
  }
}
```

**Permission Denial:**
```typescript
// Pattern from auth-guard.ts
export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  const allowed = await checkPermissionDb(session.user.role as Role, permission);
  if (!allowed) throw new Error(`Permiso denegado: se requiere ${permission}`);
  return session;
}
```

**Validation:**
```typescript
// Zod schemas in src/schemas/*.schema.ts
const saleCreateSchema = z.object({
  personId: z.string(),
  lotId: z.string(),
  totalPrice: z.number().min(0),
  // ...
});

// In action
const parsed = saleCreateSchema.safeParse(data);
if (!parsed.success) return { success: false, error: parsed.error.message };
```

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.log()` in development; audit_log table for critical mutations
- AuditLog model tracks createdById, operationType, entityId, timestamp

**Validation:**
- Approach: Zod schemas at action boundary (input validation)
- All form data parsed through schema before business logic execution
- Database constraints as secondary safeguard (NOT NULL, UNIQUE, FOREIGN KEY)

**Authentication:**
- Approach: Next-Auth v5 with Credentials provider
- Session checked at every server action via `requireAuth()`
- Protected routes via `(auth)` and `(dashboard)` route groups

**Authorization (RBAC):**
- Approach: Permission-based via `checkPermissionDb(role, permission)`
- Permissions dynamically loaded from RolePermission table
- DEFAULT_ROLE_PERMISSIONS hardcoded as seed fallback
- Example: COBRANZA role has [dashboard:view, persons:view, sales:view, cash:manage]

**Notification:**
- Approach: In-memory Message model + Notification records
- Pattern: createMessage() → parseNotificationTrigger() → emit Toast (client)
- Future: Integration with Nodemailer for email (configured but not wired)

**Audit Trail:**
- Approach: createdById field on all critical entities (Sale, ExtraCharge, Person, SigningSlot, CashMovement)
- Every mutation stamped with session.user.id
- AuditLog table (empty in MVP) reserved for detailed operation tracking

---

*Architecture analysis: 2026-02-25*
