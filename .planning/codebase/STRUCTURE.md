# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
sistema-inmobiliaria/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Public auth pages
│   │   │   └── login/
│   │   ├── (dashboard)/          # Protected app routes
│   │   │   ├── auditoria/        # Audit log viewer
│   │   │   ├── caja/             # Cash movements ledger
│   │   │   ├── cobranza/         # Collections/payment management
│   │   │   ├── configuracion/    # System settings
│   │   │   ├── dashboard/        # Home/KPI dashboard
│   │   │   ├── desarrollos/      # Real estate developments
│   │   │   ├── estadisticas/     # Reports & analytics
│   │   │   ├── firmas/           # Signing slot scheduling
│   │   │   ├── mensajes/         # Internal messaging
│   │   │   ├── personas/         # Customers & suppliers
│   │   │   └── ventas/           # Sales management
│   │   └── api/                  # API routes
│   │       ├── auth/[...nextauth]/
│   │       ├── cron/notify-upcoming/
│   │       └── health/
│   │
│   ├── server/                   # Backend layer
│   │   ├── actions/              # 23 Server Actions (.actions.ts)
│   │   │   ├── auth.actions.ts
│   │   │   ├── cash-movement.actions.ts
│   │   │   ├── development.actions.ts
│   │   │   ├── exchange-rate.actions.ts
│   │   │   ├── extra-charge.actions.ts
│   │   │   ├── lot.actions.ts
│   │   │   ├── payment.actions.ts
│   │   │   ├── person.actions.ts
│   │   │   ├── role-permission.actions.ts
│   │   │   ├── sale.actions.ts
│   │   │   ├── signing.actions.ts
│   │   │   ├── user.actions.ts
│   │   │   └── ... (19 more)
│   │   │
│   │   ├── models/               # 19 Data Access Layer files (.model.ts)
│   │   │   ├── cash-balance.model.ts
│   │   │   ├── cash-movement.model.ts
│   │   │   ├── development.model.ts
│   │   │   ├── exchange-rate.model.ts
│   │   │   ├── installment.model.ts
│   │   │   ├── lot.model.ts
│   │   │   ├── payment-receipt.model.ts
│   │   │   ├── person.model.ts
│   │   │   ├── role-permission.model.ts
│   │   │   ├── sale.model.ts
│   │   │   ├── user.model.ts
│   │   │   └── ... (8 more)
│   │   │
│   │   └── controllers/          # Minimal; mostly unused (legacy structure)
│   │
│   ├── lib/                      # Shared utilities & config
│   │   ├── auth.ts               # Next-Auth exports (handlers, auth)
│   │   ├── auth.config.ts        # Auth config object
│   │   ├── auth-guard.ts         # requireAuth(), requirePermission()
│   │   ├── rbac.ts               # Permission types & DB checks
│   │   ├── installment-generator.ts   # Generate payment schedules
│   │   ├── installment-recalculator.ts# Recalculate on extra charge
│   │   ├── sale-helpers.ts       # Client-safe sale calculations
│   │   ├── exchange-rate.ts      # Fetch dolarapi.com rates
│   │   ├── format.ts             # formatCurrency(), formatDate()
│   │   ├── constants.ts          # Enums, labels, defaults
│   │   ├── email.ts              # Email utilities (Nodemailer config)
│   │   ├── email-templates.ts    # Email HTML templates
│   │   ├── navigation.ts         # Route structure constants
│   │   ├── utils.ts              # Generic helpers (merge, pick, etc.)
│   │   └── prisma.ts             # Prisma singleton export
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (20+ primitives)
│   │   │
│   │   └── shared/               # Domain-specific components
│   │       ├── page-header.tsx
│   │       ├── status-badge.tsx
│   │       ├── layout.tsx
│   │       ├── sidebar.tsx
│   │       └── ... (feature-specific components)
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-form-state.ts     # Wrap useFormState
│   │   ├── use-toast.ts          # Toast notifications (Sonner)
│   │   └── ... (other hooks)
│   │
│   ├── providers/                # Context providers
│   │   ├── theme-provider.tsx    # next-themes (dark mode)
│   │   └── toast-provider.tsx    # Sonner Toaster
│   │
│   ├── schemas/                  # Zod validation schemas
│   │   ├── auth.schema.ts        # Login validation
│   │   ├── sale.schema.ts        # Sale creation validation
│   │   ├── person.schema.ts      # Person/customer validation
│   │   └── ... (domain schemas)
│   │
│   ├── types/                    # TypeScript definitions
│   │   ├── actions.ts            # ActionResult<T> generic type
│   │   ├── enums.ts              # Exported Prisma enums (Role, SaleStatus, etc.)
│   │   ├── next-auth.d.ts        # Session type augmentation
│   │   └── shared/               # Shared type definitions
│   │
│   ├── styles/
│   │   ├── globals.css           # Global Tailwind + custom CSS
│   │   └── variables.css         # CSS custom properties
│   │
│   └── generated/
│       └── prisma/
│           └── client/           # @prisma/client auto-generated code
│
├── prisma/
│   ├── schema.prisma             # Prisma ORM schema (19 models, enums)
│   └── seed.ts                   # Database seeding script
│
├── public/                       # Static assets
│
├── docs/                         # Project documentation
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration with @ alias
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
├── eslint.config.ts              # ESLint configuration
│
└── .planning/codebase/           # GSD planning documents (this file)
```

## Directory Purposes

**src/app/(auth):**
- Purpose: Public authentication pages (login)
- Contains: Login page with credentials form
- Key files: `login/page.tsx`
- Access: Unauthenticated users only (redirects to /dashboard if logged in)

**src/app/(dashboard):**
- Purpose: Protected application routes for authenticated users
- Contains: 12 feature modules (dashboard, desarrollos, lotes, personas, ventas, caja, cobranza, firmas, configuracion, auditoria, estadisticas, mensajes)
- Access: Requires valid session + role-based permission

**src/app/api:**
- Purpose: API routes and serverless functions
- Contains: Auth handler, health check, cron notifications
- Key files:
  - `auth/[...nextauth]/route.ts` - Auth provider routes
  - `cron/notify-upcoming/route.ts` - Scheduled notification job
  - `health/route.ts` - Deployment health verification

**src/server/actions:**
- Purpose: Server-side business logic as Next.js Server Actions
- Pattern: Each file exports 3-5 functions prefixed "use server"
- Examples:
  - `sale.actions.ts` - createSale(), getSales(), getSaleById(), updateSaleStatus()
  - `payment.actions.ts` - payInstallment(), payExtraCharge()
  - `user.actions.ts` - getUsers(), createUser(), updateUser(), toggleUserActive()
- All functions perform permission checks via `requirePermission()`

**src/server/models:**
- Purpose: Data Access Layer wrapping Prisma queries
- Pattern: Each model exports object with methods: findAll(), findById(), create(), update(), etc.
- Examples:
  - `sale.model.ts` - saleModel.findAll(params), saleModel.create(data)
  - `user.model.ts` - userModel.findByEmail(), userModel.findAllSellers()
- Used exclusively by server actions, never by client components

**src/lib:**
- Purpose: Shared utilities and configuration
- Core categories:
  - **Auth:** auth.ts, auth.config.ts, auth-guard.ts, rbac.ts
  - **Business Logic:** installment-generator.ts, installment-recalculator.ts, sale-helpers.ts, exchange-rate.ts
  - **Utils:** format.ts, constants.ts, navigation.ts, utils.ts, prisma.ts
  - **Communications:** email.ts, email-templates.ts

**src/components:**
- Purpose: React UI components
- Structure:
  - `ui/` - Unstyled shadcn/ui primitives (Button, Card, Dialog, Form, Input, Table, etc.)
  - `shared/` - Domain-aware layout components (PageHeader, StatusBadge, Sidebar, Layout)
  - Feature folders: Under `app/(dashboard)/*/`, `_components/` folders contain form-specific components

**src/schemas:**
- Purpose: Zod validation schemas
- Pattern: One schema per domain entity
- Examples:
  - `auth.schema.ts` - loginSchema (email, password)
  - `sale.schema.ts` - saleCreateSchema (personId, lotId, totalPrice, etc.)
  - `person.schema.ts` - personCreateSchema

**src/types:**
- Purpose: TypeScript type definitions
- Key files:
  - `actions.ts` - ActionResult<T> = { success: true; data?: T } | { success: false; error: string }
  - `enums.ts` - Re-exported Prisma enums (Role, SaleStatus, LotStatus, etc.)
  - `next-auth.d.ts` - Session type augmentation with user.role
  - `shared/` - Shared domain types

## Key File Locations

**Entry Points:**

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | Main dashboard with KPIs |
| `src/app/(auth)/login/page.tsx` | Login form |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth handler |

**Configuration:**

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | ORM schema (19 models, enums) |
| `src/lib/auth.ts` | Next-Auth setup + handlers export |
| `src/lib/auth.config.ts` | Auth callbacks, callbacks & pages config |
| `src/lib/constants.ts` | Status labels, enums, defaults |

**Core Logic:**

| File | Purpose |
|------|---------|
| `src/lib/installment-generator.ts` | Auto-generate payment schedules |
| `src/lib/installment-recalculator.ts` | Recalculate on extra charge paid |
| `src/lib/sale-helpers.ts` | Client-safe calculations for forms |
| `src/lib/exchange-rate.ts` | Fetch USD/ARS from dolarapi.com |

**Testing:**

| File | Purpose |
|------|---------|
| `prisma/seed.ts` | Database seeding for development |

## Naming Conventions

**Files:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| `*.actions.ts` | `sale.actions.ts` | Server Actions (exported functions marked "use server") |
| `*.model.ts` | `sale.model.ts` | Data Access Layer (Prisma wrappers) |
| `*.schema.ts` | `sale.schema.ts` | Zod validation schemas |
| `*.tsx` | `page.tsx`, `form.tsx` | React components |
| `*-provider.tsx` | `theme-provider.tsx` | Context providers |
| `*.config.ts` | `auth.config.ts` | Configuration objects |

**Directories:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| `(route-group)` | `(dashboard)`, `(auth)` | Nextjs route groups (group without URL segment) |
| `[dynamic]` | `[id]`, `[slug]` | Dynamic route parameters |
| `_components` | `ventas/_components/sale-form.tsx` | Feature-local components (private to parent route) |
| `_partials` | Not currently used | Reserved for sub-component patterns |

**Functions & Variables:**

| Convention | Example |
|-----------|---------|
| camelCase | `calculateInstallmentPreview()`, `requirePermission()` |
| UPPERCASE constants | `MONTH_NAMES`, `ALL_PERMISSIONS`, `SALE_STATUS_LABELS` |
| Prefix for boolean | `isActive`, `isSeller`, `hasError` |
| Prefix for action hooks | `use*` (React hooks only) |

**Types:**

| Convention | Example |
|-----------|---------|
| PascalCase | `type ActionResult<T>`, `interface FindAllParams` |
| Enum names | `enum Role { SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA }` |

## Where to Add New Code

**New Feature (e.g., new domain entity like "Promoter"):**

1. **Database Model**
   - Edit `prisma/schema.prisma` - add model Promoter with fields & relationships
   - Run `npx prisma migrate dev` to generate migration
   - Update `src/generated/prisma/client/` automatically

2. **Data Access**
   - Create `src/server/models/promoter.model.ts` with methods:
     ```typescript
     export const promoterModel = {
       async findAll(params?: FindAllParams) { ... },
       async findById(id: string) { ... },
       async create(data: Prisma.PromoterCreateInput) { ... },
       async update(id: string, data: Partial<Promoter>) { ... },
     };
     ```

3. **Business Logic**
   - Create `src/server/actions/promoter.actions.ts` exporting:
     ```typescript
     "use server";
     export async function getPromoters() { ... }
     export async function createPromoter(_prevState, formData) { ... }
     ```
   - Each action starts with `await requirePermission("promoters:manage")`

4. **Validation**
   - Create `src/schemas/promoter.schema.ts`:
     ```typescript
     export const promoterCreateSchema = z.object({
       name: z.string().min(1),
       email: z.string().email(),
       // ...
     });
     ```

5. **UI**
   - Create route folder `src/app/(dashboard)/promotores/`
     - `page.tsx` - List view, calls getPromoters()
     - `nuevo/page.tsx` - Create view with PromoterForm
     - `[id]/page.tsx` - Detail view
     - `_components/promoter-form.tsx` - Form component with useFormState + createPromoter

6. **Navigation**
   - Update `src/lib/navigation.ts` to include promoter routes
   - Update sidebar in `src/components/shared/sidebar.tsx`

**New Server Action (e.g., approve payment):**

1. In `src/server/actions/payment.actions.ts`, add:
   ```typescript
   export async function approvePayment(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
     const session = await requirePermission("cash:manage");
     const paymentId = parseFormString(formData, "paymentId");

     if (!paymentId) return { success: false, error: "Payment ID required" };

     const payment = await paymentModel.findById(paymentId);
     if (!payment) return { success: false, error: "Payment not found" };

     const updated = await paymentModel.updateStatus(paymentId, "APROBADO");
     revalidatePath("/dashboard/caja");
     return { success: true, data: updated };
   }
   ```

2. In component, use useFormState:
   ```typescript
   const [state, formAction] = useFormState(approvePayment, initialState);
   ```

**New Client Component (e.g., dashboard card):**

1. Create `src/components/shared/revenue-card.tsx`:
   ```typescript
   "use client";
   import { Card } from "@/components/ui/card";

   export function RevenueCard({ value }: { value: number }) {
     return <Card>...</Card>;
   }
   ```

2. Import in page: `import { RevenueCard } from "@/components/shared/revenue-card"`

**Utilities:**

**Shared helpers:**
- String manipulation, number formatting → `src/lib/utils.ts`
- Date/currency formatting → `src/lib/format.ts`
- Status labels, enums → `src/lib/constants.ts`

**Feature-specific helpers:**
- Keep in domain file, e.g., sale-specific logic in `src/lib/sale-helpers.ts`

## Special Directories

**src/generated:**
- Purpose: Auto-generated code from Prisma and other tools
- Generated: Yes (by `prisma generate`)
- Committed: Yes (to git, for IDE type hints in CI)
- Do NOT edit manually

**src/app/api/cron:**
- Purpose: Scheduled jobs (serverless functions)
- Current: notify-upcoming signings cron
- Generated: No
- Committed: Yes

**.planning/codebase:**
- Purpose: GSD documentation (this directory)
- Generated: No (created manually by agents)
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md

**prisma/**
- Purpose: ORM configuration and migrations
- Generated: migrations/ auto-generated
- Committed: Yes (schema + migrations)

---

*Structure analysis: 2026-02-25*
