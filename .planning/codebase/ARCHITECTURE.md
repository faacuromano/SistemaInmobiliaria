# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Layered Server-Driven Architecture with Next.js 15 App Router

**Key Characteristics:**
- **Server-First**: Heavy use of Server Components and Server Actions; minimal client-side state management
- **Modular Layers**: Clear separation between routes (App Router), server actions, models, and UI components
- **Type-Safe**: Full TypeScript coverage with Prisma-generated types and Zod validation schemas
- **RBAC Integrated**: Permission checks (`requirePermission`) baked into server actions and API routes
- **Domain-Driven**: Organization reflects real estate domain (sales, lots, persons, cash movements, signings)

## Layers

**Presentation Layer (App Router + Components):**
- Purpose: Server-rendered pages with shadcn/ui components; minimal interactivity
- Location: `src/app/(auth)`, `src/app/(dashboard)/[feature]`
- Contains: Page components (async), feature-specific components in `_components/`, layout wrappers
- Depends on: Server Actions, Models (via server-side queries), auth-guard, types
- Used by: End users via Next.js routing

**API Layer (Route Handlers):**
- Purpose: Webhook endpoints, cron jobs, health checks
- Location: `src/app/api/auth/[...nextauth]`, `src/app/api/cron/notify-upcoming`, `src/app/api/health`
- Contains: GET/POST handlers with bearer token auth (CRON_SECRET)
- Depends on: Models, services, notificationModel, sendEmail
- Used by: External cron services, NextAuth, monitoring systems

**Server Actions Layer:**
- Purpose: Encapsulates all business logic mutations and queries; bridges client components to database
- Location: `src/server/actions/*.actions.ts` (21 files: user, sale, person, cash-movement, etc.)
- Contains: Async functions exported with `"use server"` directive; each action wraps requirePermission check
- Pattern: FormData parsing → Zod validation → model method call → revalidatePath → ActionResult
- Depends on: Models, schemas, auth-guard, lib utilities, audit-log.actions
- Used by: Client/Server components via form submissions or direct calls

**Data Access Layer (Models):**
- Purpose: Prisma wrapper functions; isolates database queries and business-specific includes
- Location: `src/server/models/*.model.ts` (19 files: person, sale, lot, installment, etc.)
- Contains: Object exports with methods: `findAll`, `findById`, `create`, `update`, `toggleActive`
- Pattern: Each model wraps Prisma client; handles `.include()` and `.select()` for related data
- Example: `personModel.findById()` includes sales with installments, extraCharges, and cashMovements
- Depends on: `prisma` singleton, Prisma type definitions
- Used by: Server actions and cron routes

**Business Logic Layer (Utilities in lib/):**
- Purpose: Domain logic, calculations, transformations not tied to database
- Location: `src/lib/*.ts` (16 files: installment-generator, exchange-rate, email, auth, rbac, etc.)
- Key functions:
  - `generateInstallments()`: Computes installment due dates and amounts from sale terms
  - `recalculateInstallments()`: Adjusts remaining installments after refuerzo payment
  - `checkPermissionDb()`: Queries role permissions, falls back to hardcoded defaults
  - `sendEmail()`: SMTP integration with email templates
- Depends on: prisma (for permission queries), external APIs (dolarapi for exchange rates)
- Used by: Server actions, API routes, models

**Schema Validation:**
- Purpose: Zod schemas for runtime input validation
- Location: `src/schemas/*.schema.ts` (10 files: sale, person, user, auth, etc.)
- Pattern: One schema per domain model; used in server actions before database operations
- Example: `saleCreateSchema` validates lotId, personId, totalPrice, currency, etc.
- Depends on: Zod library, enums from `types/enums.ts`
- Used by: Server actions

**Shared Utilities:**
- Purpose: Cross-cutting concerns (formatting, constants, navigation, types)
- Location: `src/lib/` (utils.ts, constants.ts, format.ts, navigation.ts) and `src/types/`
- Contains: Date formatting, currency formatting, navigation menu structure, domain enums, action result types
- Used by: Components, models, actions, all layers

## Data Flow

**Read Flow (Page Load):**

1. User navigates to `/dashboard/ventas`
2. Next.js renders Server Component `src/app/(dashboard)/ventas/page.tsx`
3. Page calls `getSales()` server action via direct function call
4. `getSales()` checks `requirePermission("sales:view")` → queries `saleModel.findAll()`
5. `saleModel.findAll()` executes Prisma query with includes (lot, development, person, seller, installment counts)
6. Results returned to page, serialized as JSON, sent to client
7. Page renders `<SalesTable>` with client component wrappers for interactivity

**Write Flow (Create Sale):**

1. User fills form in `SaleFormDialog` (client component wrapping server action)
2. Form calls `createSale(formData)` server action
3. Server action:
   - Parses FormData → extracts fields
   - Validates via `saleCreateSchema.safeParse()`
   - Checks `requirePermission("sales:manage")`
   - Validates lot availability and relationship
   - Calls `generateInstallments()` to compute installment schedule
   - Opens Prisma transaction: creates Sale, Installments, updates Lot.status, updates cashBalance
   - Logs action via `logAction()`
   - Returns `{ success: true }` or `{ success: false, error: "..." }`
4. Client-side form catches result, shows toast, closes dialog
5. `revalidatePath("/dashboard/ventas")` invalidates next.js cache
6. Page re-renders with fresh data on next navigation

**Cron Job Flow (Notify Upcoming):**

1. External cron service calls GET `/api/cron/notify-upcoming` with `Authorization: Bearer {CRON_SECRET}`
2. Route handler validates bearer token
3. Runs three notification flows in parallel:
   - Find upcoming extra charges (cuotas de refuerzo) due within 3 days via `cronModel.findUpcomingExtraCharges()`
   - Find overdue installments via `cronModel.findOverdueInstallments()`
   - Find upcoming signings via `cronModel.findUpcomingSignings()`
4. For each item:
   - Create notification via `notificationModel.createForAllUsers()`
   - Send email via `sendEmail()` if person/seller has email
   - Mark as notified to prevent duplicates
5. Returns JSON with counters and details

**State Management:**

- **Minimal**: No Redux, Zustand, or Context providers for business state
- **Cache**: Next.js cache revalidation via `revalidatePath()` after mutations
- **Session**: Stored in JWT token via Auth.js v5, accessible via `auth()` function
- **UI State**: Form state managed locally in client components using React hooks
- **Database State**: Single source of truth via PostgreSQL + Prisma

## Key Abstractions

**Server Action Pattern:**
- Purpose: Encapsulate mutations and complex queries with built-in security
- Examples: `createSale()`, `updateUser()`, `createCashMovement()`
- Pattern: `async (prevState, formData) => Promise<ActionResult>`
- Security: Every action calls `requirePermission()` at the top

**Model Objects:**
- Purpose: Reusable database queries with business-specific includes
- Pattern: Export named object with async methods
- Example: `personModel.findById()` includes all related sales, installments, cashMovements
- Benefit: Avoids duplicating `.include()` logic across multiple actions

**Zod Schemas:**
- Purpose: Runtime validation before database operations
- Pattern: Schema mirrors form fields; used in server actions before persist
- Example: `saleCreateSchema` validates required fields, numeric ranges, enum values
- Benefit: Type-safe and provides clear error messages

**Permission Abstraction:**
- Purpose: Role-based access control at the action level
- Pattern: `requirePermission(permission: Permission)` function
- How it works:
  1. Extracts user role from JWT session
  2. Calls `checkPermissionDb(role, permission)` to query database
  3. Falls back to hardcoded defaults if no DB records
  4. Throws error if permission denied
- Permission types: "dashboard:view", "sales:view", "sales:manage", "cash:view", "cash:manage", etc.
- Roles map to permissions via `DEFAULT_ROLE_PERMISSIONS` in `rbac.ts`:
  - SUPER_ADMIN: `["*"]` (all permissions)
  - ADMINISTRACION: Most view + manage except cash
  - FINANZAS: Cash + sales view + persons
  - COBRANZA: Sales + persons + cash view (no manage)

**Email Template Abstraction:**
- Purpose: Reusable HTML email generators
- Location: `src/lib/email-templates.ts`
- Examples: `upcomingChargeEmailHtml()`, `overdueInstallmentEmailHtml()`, `upcomingSigningEmailHtml()`
- Pattern: Functions return HTML strings with interpolated values
- Used by: Cron route, potentially future notification actions

**Installment Calculation:**
- Purpose: Core business logic for payment plans
- Functions:
  - `generateInstallments()`: Creates installment schedule from sale parameters
    - Takes: saleId, totalInstallments, regularInstallmentAmount, firstInstallmentAmount, firstInstallmentMonth, collectionDay, currency
    - Returns: Array of InstallmentData with dueDate, amount, monthLabel
    - Logic: Handles variable collection days, respects month boundaries (31st → 28th in Feb)
  - `recalculateInstallments()`: Adjusts remaining installments after refuerzo payment
    - Takes: existing sale with installments, paid refuerzo amount
    - Returns: Recalculated amounts, stores original amounts in `originalAmount` field

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (RootLayout)
- Triggers: Browser request to any `/` path
- Responsibilities: Global HTML structure, language set to Spanish, CSS imports

**Dashboard:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Browser request to `/dashboard/*` routes (protected by middleware)
- Responsibilities: Auth check via `requireAuth()`, render Sidebar + MobileSidebar + content area

**Authentication:**
- Location: `src/app/(auth)/login/page.tsx` and `src/app/api/auth/[...nextauth]/route.ts`
- Triggers: Unauthenticated request, or POST to sign-in endpoint
- Responsibilities: Credentials provider validation, JWT token creation, session management

**Health Check:**
- Location: `src/app/api/health/route.ts`
- Triggers: GET request from monitoring systems
- Responsibilities: Return 200 OK or health status

**Cron Handler:**
- Location: `src/app/api/cron/notify-upcoming/route.ts`
- Triggers: External cron service call with CRON_SECRET
- Responsibilities: Query upcoming charges/signings, create notifications, send emails

## Error Handling

**Strategy:** Layered error propagation with user-friendly messages

**Patterns:**

1. **Validation Errors (Client-Facing):**
   - Caught in server actions via `safeParse()`
   - Returned as `{ success: false, error: "field was invalid" }`
   - Displayed in toast notifications to user

2. **Permission Errors (Security):**
   - Thrown from `requirePermission()` as Error
   - Caught by Next.js error boundary
   - Results in 403-like response or error page

3. **Database Errors (Operations):**
   - Prisma.PrismaClientKnownRequestError caught (e.g., P2002 duplicate key)
   - Converted to user-friendly message in server action catch block
   - Example: `"Ya existe un usuario con ese email"` for duplicate email

4. **Async/Await Errors:**
   - Unhandled errors in server actions propagate to global error.tsx
   - Email failures in cron jobs are caught individually; one email error doesn't fail the whole cron job

5. **API Route Errors:**
   - Bearer token validation failures return 401 Unauthorized
   - Database/processing errors logged to console, return 200 with error counts in response body

## Cross-Cutting Concerns

**Logging:**
- Audit log for sensitive operations via `logAction()` in every write action
- Stored in AuditLog table with: entityType, entityId, action, previousData, newData, userId, timestamp
- Console.error for cron errors, service failures

**Validation:**
- Zod schemas applied in server actions before database operations
- Type-safe via TypeScript + Prisma generated types
- Enum validation for domain values (SaleStatus, LotStatus, Role, etc.)

**Authentication:**
- Auth.js v5 with Credentials provider
- Session stored as JWT in httpOnly cookie
- Middleware (`src/middleware.ts`) applies to all routes except `/api/auth`, `/api/health`, `/api/cron`, static assets
- `requireAuth()` and `requirePermission()` guards on server components and actions

**Authorization:**
- Role-based permissions checked via `checkPermissionDb(role, permission)`
- Fallback to hardcoded defaults if database has no records
- Permission matrix in RBAC.ts shows who can do what

**Caching:**
- Next.js built-in caching: `revalidatePath()` after mutations to invalidate stale data
- Static generation not used (all routes are dynamic)
- Prisma client connection pooling via PrismaPg adapter

**Currency Handling:**
- Dual currency support (USD/ARS) via Currency enum
- ExchangeRate fetched daily from dolarapi.com API
- Stored in database with officialBuy, officialSell, blueBuy, blueSell rates
- Formatted for display via `formatCurrency()` utility

---

*Architecture analysis: 2026-02-26*
