# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
sistemaInmobiliaria/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/               # Public login page
│   │   ├── (dashboard)/             # Protected routes (layout guards with requireAuth)
│   │   │   ├── auditoria/           # Audit log viewer
│   │   │   ├── caja/                # Cash management (cash movements, balance)
│   │   │   ├── cobranza/            # Collections (payment tracking, overdue management)
│   │   │   ├── configuracion/       # System config (users, roles, permissions, import)
│   │   │   ├── dashboard/           # KPI dashboard (active sales, overdue count, monthly income)
│   │   │   ├── desarrollos/         # Development listings, details, editing
│   │   │   ├── estadisticas/        # Analytics and reports
│   │   │   ├── firmas/              # Signing slots calendar and management
│   │   │   ├── mensajes/            # Internal messaging
│   │   │   ├── personas/            # Clients/suppliers directory with ficha (profile)
│   │   │   ├── ventas/              # Sales CRUD with installment plan generation
│   │   │   ├── layout.tsx           # Dashboard wrapper with sidebar, auth guard
│   │   │   ├── error.tsx            # Error boundary for dashboard routes
│   │   │   └── loading.tsx          # Loading skeleton
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth v5 routes
│   │   │   ├── cron/notify-upcoming/ # Daily cron for notifications + emails
│   │   │   └── health/              # Health check endpoint
│   │   ├── layout.tsx               # Root layout (html, body, globals.css)
│   │   ├── page.tsx                 # Redirect to /dashboard
│   │   ├── globals.css              # Tailwind directives + custom styles
│   │   └── [feature]/               # Dynamic route pattern
│   │       ├── page.tsx             # List/index page
│   │       ├── nuevo/               # Create form page
│   │       ├── [id]/                # Detail page
│   │       ├── [id]/editar/         # Edit form page
│   │       └── _components/         # Feature-specific components
│   │
│   ├── server/                      # Server-side only code
│   │   ├── actions/                 # Server Actions ("use server")
│   │   │   ├── *.actions.ts         # 21 files: one per domain model
│   │   │   │   - auth.actions.ts
│   │   │   │   - user.actions.ts
│   │   │   │   - person.actions.ts
│   │   │   │   - sale.actions.ts
│   │   │   │   - lot.actions.ts
│   │   │   │   - cash-movement.actions.ts
│   │   │   │   - extra-charge.actions.ts
│   │   │   │   - installment.actions.ts
│   │   │   │   - signing.actions.ts
│   │   │   │   - exchange-rate.actions.ts
│   │   │   │   - development.actions.ts
│   │   │   │   - audit-log.actions.ts
│   │   │   │   - import.actions.ts
│   │   │   │   - notification.actions.ts
│   │   │   │   - message.actions.ts
│   │   │   │   - and 6 more...
│   │   │   └── Pattern: validate(Zod) → requirePermission → model.method → logAction → revalidatePath
│   │   │
│   │   ├── models/                  # Data access layer (Prisma wrappers)
│   │   │   ├── *.model.ts           # 19 files: one per domain model
│   │   │   │   - person.model.ts    # findAll, findById, create, update, toggleActive, findForCollection
│   │   │   │   - sale.model.ts      # findAll, findById, create, updateStatus, findActiveSaleForLot
│   │   │   │   - lot.model.ts
│   │   │   │   - installment.model.ts
│   │   │   │   - extra-charge.model.ts
│   │   │   │   - cash-movement.model.ts
│   │   │   │   - signing.model.ts
│   │   │   │   - user.model.ts
│   │   │   │   - cron.model.ts      # Special: findUpcomingExtraCharges, findOverdueInstallments
│   │   │   │   └── and 10 more...
│   │   │   └── Pattern: Export object with async methods, use Prisma with specific includes
│   │   │
│   │   ├── services/                # Business logic services (currently sparse)
│   │   │   └── [Mostly logic is in lib/ utilities]
│   │   │
│   │   └── controllers/             # Request handlers (currently empty, future use)
│   │
│   ├── lib/                         # Shared utilities and configuration
│   │   ├── auth.ts                  # NextAuth setup with Credentials provider
│   │   ├── auth.config.ts           # Auth callbacks (jwt, session, authorized)
│   │   ├── auth-guard.ts            # requireAuth(), requirePermission() functions
│   │   ├── rbac.ts                  # Role-based access control, permissions matrix
│   │   ├── prisma.ts                # Prisma client singleton with PrismaPg adapter
│   │   ├── constants.ts             # Domain enum labels and color mappings
│   │   ├── format.ts                # Date, currency, installment formatting
│   │   ├── utils.ts                 # Utility helpers (cn for className merging)
│   │   ├── navigation.ts            # Sidebar menu structure
│   │   ├── exchange-rate.ts         # Currency API integration (dolarapi.com)
│   │   ├── email.ts                 # SMTP configuration and sendEmail function
│   │   ├── email-templates.ts       # HTML email generators for notifications
│   │   ├── installment-generator.ts # generateInstallments function
│   │   ├── installment-recalculator.ts # recalculateInstallments function
│   │   ├── sale-helpers.ts          # Sale-specific helpers (MONTH_NAMES, calculations)
│   │   └── business-hours.ts        # Business hours configuration for signing calendar
│   │
│   ├── schemas/                     # Zod validation schemas
│   │   ├── *.schema.ts              # 10 files: one per form/action
│   │   │   - auth.schema.ts
│   │   │   - user.schema.ts
│   │   │   - person.schema.ts
│   │   │   - sale.schema.ts
│   │   │   - lot.schema.ts
│   │   │   - cash-movement.schema.ts
│   │   │   - extra-charge.schema.ts
│   │   │   - development.schema.ts
│   │   │   - exchange-rate.schema.ts
│   │   │   └── business-hours.schema.ts
│   │   └── Pattern: Export named schema with string parsing, coercion, min/max validations
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── enums.ts                 # Client-safe enum objects (DevelopmentStatus, Role, etc.)
│   │   ├── actions.ts               # ActionResult<T> type
│   │   ├── next-auth.d.ts           # Augmented Session type with user.role
│   │   └── shared/                  # (Empty for now, for future type exports)
│   │
│   ├── components/                  # React components
│   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── 15+ more UI components
│   │   │
│   │   └── shared/                  # Reusable components across features
│   │       ├── sidebar.tsx          # Main navigation sidebar (role-aware)
│   │       ├── mobile-sidebar.tsx   # Mobile drawer wrapper for sidebar
│   │       ├── page-header.tsx      # Standardized page title + description
│   │       ├── search-input.tsx     # Search box for filtering tables
│   │       ├── data-table.tsx       # Reusable table component
│   │       ├── status-badge.tsx     # Status display with color mapping
│   │       ├── notification-bell.tsx # Real-time notification indicator
│   │       ├── confirm-dialog.tsx   # Delete/action confirmation modal
│   │       ├── empty-state.tsx      # No data placeholder
│   │       └── header-info.tsx      # KPI card component
│   │
│   ├── hooks/                       # Custom React hooks
│   │   └── [Specific feature hooks - details in codebase]
│   │
│   ├── providers/                   # Context providers
│   │   └── [Session provider, theme provider - details in codebase]
│   │
│   ├── styles/                      # Global styles
│   │   └── globals.css              # Tailwind config, custom utility classes
│   │
│   ├── generated/                   # Auto-generated (DO NOT EDIT)
│   │   └── prisma/client/           # Prisma client types and models
│   │       ├── client.d.ts          # Type definitions for all models
│   │       └── models/              # Individual model type files
│   │
│   └── middleware.ts                # NextAuth middleware for route protection
│
├── prisma/
│   ├── schema.prisma                # Prisma data model (19 models, enums)
│   └── migrations/                  # Database migration files
│
├── public/                          # Static assets
│   ├── favicon.ico
│   └── [other static files]
│
├── docs/                            # Documentation
│   └── [Architecture, setup, API docs]
│
├── next.config.ts                   # Next.js configuration (security headers, standalone output)
├── tsconfig.json                    # TypeScript compiler options (@ alias, ES2022 target)
├── postcss.config.mjs               # PostCSS for Tailwind
├── eslint.config.mjs                # ESLint configuration
├── package.json                     # Dependencies
├── docker-compose.yml               # PostgreSQL + pgAdmin for local dev
├── Dockerfile                       # Container image for production
├── CLAUDE.md                        # Project instructions and domain context
└── TESTING.md                       # Test strategy and examples
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router pages and layouts
- Public routes: `(auth)/login`
- Protected routes: Everything under `(dashboard)` (guarded by middleware + requireAuth)
- API routes: `/api/auth`, `/api/cron`, `/api/health`

**src/server/actions:**
- Purpose: Server Actions executed from client/server forms
- Execution context: Server-only (secure, can access secrets)
- Pattern: Each file exports functions that take FormData, return ActionResult
- Security: Every action calls `requirePermission()` at the start
- Side effects: Database mutations, email sending, audit logging, cache revalidation

**src/server/models:**
- Purpose: Data access layer abstracting Prisma queries
- Benefit: Reusable query patterns, specific `include/select` for each query type
- Usage: Called from server actions and cron routes
- Example: `personModel.findById(id)` includes all related sales, installments, cashMovements

**src/lib:**
- Purpose: Shared, non-domain-specific utilities
- Categories:
  - Auth: `auth.ts`, `auth.config.ts`, `auth-guard.ts`, `rbac.ts`
  - Database: `prisma.ts`
  - UI: `constants.ts`, `format.ts`, `utils.ts`, `navigation.ts`
  - Domain logic: `installment-generator.ts`, `installment-recalculator.ts`, `sale-helpers.ts`
  - Integrations: `email.ts`, `email-templates.ts`, `exchange-rate.ts`, `business-hours.ts`

**src/schemas:**
- Purpose: Zod schemas for input validation
- When applied: In server actions via `.safeParse()` before database operations
- Benefit: Type-safe validation, clear error messages, enumeration of valid values

**src/types:**
- Purpose: Central type definitions
- Key exports:
  - `enums.ts`: Domain enum objects (DevelopmentStatus, SaleStatus, Role, etc.)
  - `actions.ts`: ActionResult<T> union type for server action responses
  - `next-auth.d.ts`: Augmented types for Auth.js session

**src/components/ui:**
- Purpose: Unstyled shadcn/ui component library
- Pre-built: button, card, dialog, form, input, select, table, dropdown, etc.
- Usage: Imported and combined in feature-specific components

**src/components/shared:**
- Purpose: Cross-feature reusable components
- Examples:
  - `sidebar.tsx`: Role-aware navigation menu
  - `data-table.tsx`: Generic table with sorting/filtering
  - `page-header.tsx`: Standardized page title component
  - `status-badge.tsx`: Colored status display
  - `notification-bell.tsx`: Bell icon with unread count

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML layout, language="es", globals.css import
- `src/app/(dashboard)/layout.tsx`: Dashboard wrapper with sidebar, auth check
- `src/app/(auth)/login/page.tsx`: Login form with nextauth signIn action
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth v5 route handler
- `src/middleware.ts`: Auth middleware protecting dashboard routes

**Configuration:**
- `tsconfig.json`: TypeScript paths alias `@/*` → `src/*`, target ES2022
- `next.config.ts`: Security headers (X-Frame-Options: DENY, HSTS, etc.), standalone output
- `prisma/schema.prisma`: 19 domain models with enums and relationships

**Core Logic:**
- `src/lib/auth.ts`: NextAuth initialization with Credentials provider
- `src/lib/rbac.ts`: Role-based permission matrix (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA)
- `src/lib/installment-generator.ts`: Core algorithm for sale payment schedules
- `src/server/actions/sale.actions.ts`: Sale CRUD with installment auto-generation
- `src/server/models/person.model.ts`: Person queries with all related data

**Testing:**
- `TESTING.md`: Test strategy (unit, integration, e2e patterns)
- `__tests__/`, `*.test.ts`, `*.spec.ts`: Test files (follow codebase pattern TBD)

## Naming Conventions

**Files:**
- Page files: `page.tsx` (index route), `layout.tsx` (layout wrapper), `error.tsx` (error boundary)
- Components: `kebab-case.tsx` (e.g., `sidebar.tsx`, `page-header.tsx`, `mobile-sidebar.tsx`)
- Actions: `*actions.ts` (e.g., `user.actions.ts`, `sale.actions.ts`)
- Models: `*model.ts` (e.g., `person.model.ts`, `sale.model.ts`)
- Schemas: `*schema.ts` (e.g., `user.schema.ts`, `sale.schema.ts`)
- Utilities: `*utils.ts` or specific name (e.g., `installment-generator.ts`, `email-templates.ts`)

**Directories:**
- Feature routes: `[feature-name]` in `src/app/(dashboard)/` (e.g., `ventas`, `personas`, `desarrollos`)
- Server code: `src/server/[layer]` (actions, models, services, controllers)
- Components by scope: `src/components/[scope]` (ui, shared, specific features in `_components`)

**Functions & Variables:**
- Server actions: camelCase, start with verb (e.g., `createSale()`, `updateUser()`, `getSaleById()`)
- Model methods: camelCase, query methods (e.g., `findAll()`, `findById()`, `findForCollection()`)
- Utility functions: camelCase, descriptive (e.g., `generateInstallments()`, `formatCurrency()`)
- Constants: UPPER_SNAKE_CASE (e.g., `MONTH_NAMES`, `DAYS_AHEAD`)
- React components: PascalCase (e.g., `Sidebar`, `DataTable`, `PageHeader`)

**Domain Models:**
- Use singular names in code (Person, Sale, Lot, User) matching Prisma model names
- Enum values: UPPER_SNAKE_CASE (e.g., SUPER_ADMIN, ADMINISTRACION, COBRANZA)

## Where to Add New Code

**New Feature (e.g., Inventory Management):**
1. Create folder: `src/app/(dashboard)/inventario/`
2. Create files:
   - `page.tsx` - List page with `requireAuth()` + `getInventories()` action call
   - `nuevo/page.tsx` - Form page for creating new inventory
   - `[id]/page.tsx` - Detail view
   - `[id]/editar/page.tsx` - Edit form
   - `_components/inventory-form.tsx` - Shared form component
   - `_components/inventory-table.tsx` - Table display
   - `_components/inventory-filters.tsx` - Filter controls
3. Add server action: `src/server/actions/inventory.actions.ts`
   - Export: `getInventories()`, `getInventoryById()`, `createInventory()`, `updateInventory()`, `deleteInventory()`
   - Each action calls `requirePermission("inventory:view"` or `"inventory:manage")`
4. Add model: `src/server/models/inventory.model.ts`
   - Export object with `findAll()`, `findById()`, `create()`, `update()`, `delete()` methods
5. Add schema: `src/schemas/inventory.schema.ts`
   - Define Zod schema for create/update validation
6. Add to Prisma schema: `prisma/schema.prisma`
   - Define Inventory model with fields and relationships
7. Add types: `src/types/enums.ts`
   - Add InventoryStatus enum if needed
8. Add constants: `src/lib/constants.ts`
   - Add labels and colors for new enums

**New Component/Module (Reusable):**
- Shared: `src/components/shared/[component-name].tsx`
- Feature-specific: `src/app/(dashboard)/[feature]/_components/[component-name].tsx`
- UI primitive: `src/components/ui/[component-name].tsx` (if using shadcn/ui)

**New Utility Function:**
- Domain logic: `src/lib/[domain]-[operation].ts` (e.g., `installment-recalculator.ts`)
- Formatting: `src/lib/format.ts` (add function to existing file)
- Constants/lookups: `src/lib/constants.ts` (add to existing file)

**New API Route/Endpoint:**
- Location: `src/app/api/[namespace]/[route]/route.ts`
- Examples:
  - `src/app/api/cron/[job-name]/route.ts` - Scheduled jobs
  - `src/app/api/webhooks/[provider]/route.ts` - External integrations
  - `src/app/api/export/[format]/route.ts` - Data export endpoints

**Database Migrations:**
- Run: `npx prisma migrate dev --name [descriptive-name]`
- Generated files stored in: `prisma/migrations/`
- Never edit migration files manually

## Special Directories

**src/generated/prisma/client:**
- Purpose: Auto-generated Prisma client types (DO NOT EDIT)
- Generated by: `npx prisma generate` (runs after schema.prisma changes)
- Committed: YES (includes in version control)
- Contains: TypeScript type definitions for all models, enums, client interface

**prisma/migrations:**
- Purpose: Database schema version history
- Generated by: `npx prisma migrate dev` when schema.prisma changes
- Committed: YES (ensures team sync on schema)
- Contains: SQL migration files numbered by timestamp

**public/**
- Purpose: Static assets (favicon, images, fonts)
- Served at: Root URL path
- Committed: YES (usually small files)

**.next/**
- Purpose: Next.js build output (generated after `npm run build`)
- Committed: NO (.gitignore)
- Contains: Compiled pages, compiled client JavaScript, server assets

**node_modules/**
- Purpose: Third-party dependencies
- Committed: NO (.gitignore)
- Regenerated: `npm install` from package-lock.json

---

*Structure analysis: 2026-02-26*
