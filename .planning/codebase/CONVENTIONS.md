# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- Server actions: kebab-case with `.actions.ts` suffix → `sale.actions.ts`, `payment.actions.ts`
- Models/data access: kebab-case with `.model.ts` suffix → `sale.model.ts`, `person.model.ts`
- Schemas: kebab-case with `.schema.ts` suffix → `auth.schema.ts`, `sale.schema.ts`
- Components: PascalCase with optional functional grouping → `SaleForm.tsx`, `PayInstallmentDialog.tsx`
- Component collections in `_components/`: grouped by feature with descriptive names
- Pages: directory structure mirrors URL routes using `[slug]` and `[id]` for dynamic segments
- Utility functions: kebab-case → `installment-generator.ts`, `exchange-rate.ts`
- React hooks: camelCase, no prefix convention (not using `useXxx` prefix for custom hooks uniformly)

**Functions:**
- Action functions: camelCase starting with verb → `loginAction()`, `createSale()`, `payInstallment()`
- Model methods: camelCase, object-based exports → `saleModel.findAll()`, `personModel.findById()`
- Utility functions: camelCase, self-documenting names → `generateInstallments()`, `formatCurrency()`
- Helper functions: prefixed with context where needed → `getTodayString()`, `parseFormAmount()`
- RBAC check functions: explicit and clear → `hasPermission()`, `checkPermissionDb()`, `requirePermission()`

**Variables:**
- Local constants: UPPER_SNAKE_CASE for enum-like collections → `CREATION_STATUSES`, `MONTH_NAMES`
- Database records: singular nouns → `sale`, `person`, `installment`, `cashMovement`
- Collections: plural or descriptive context → `sales`, `persons`, `permissions`, `dbPermissions`
- React state: camelCase, boolean `is*` prefix → `isPending`, `isLoading`, `isOpen`
- Form state: matches schema fields → `firstName`, `totalPrice`, `firstInstallmentMonth`
- Decimals/BigInt handling: explicitly cast to `Number()` for serialization → `Number(installment.amount)`

**Types:**
- Type definitions: PascalCase → `ActionResult`, `SaleCreateInput`, `FindAllParams`
- Enums (client-safe): PascalCase exported from `/src/types/enums.ts` → `SaleStatus`, `PersonType`, `Role`
- Type unions: PascalCase with clear naming → `Permission`, `DevelopmentStatus`, `MovementType`
- Prisma model types: imported from `@/generated/prisma/client/client` → `SaleStatus`, `LotStatus`
- Interface props: `Props` suffix or descriptive name → `Props`, `FindAllParams`, `GenerateInstallmentsParams`

## Code Style

**Formatting:**
- ESLint + Next.js rules (`next/core-web-vitals`, `next/typescript`) configured in `eslint.config.mjs`
- No explicit Prettier config — relies on ESLint defaults
- Indentation: 2 spaces (inferred from codebase)
- Line width: no hard limit enforced, but keep functions readable (60-80 lines max)
- Trailing commas: used in objects/arrays for better diffs

**Linting:**
- Tool: ESLint 9 with Next.js preset
- Config file: `eslint.config.mjs` (flat config format)
- Key rules: enforced by Next.js preset (no React.FC, prefer `React.ReactNode`, etc.)
- Run: `npm run lint`
- No explicit pre-commit hooks configured, but Next.js build validates on deployment

## Import Organization

**Order:**
1. React and framework imports (`react`, `next/*`, `next-auth`)
2. Third-party libraries (`zod`, `date-fns`, `react-hook-form`, `sonner`, etc.)
3. Internal absolute imports using `@/*` path aliases
4. Grouped by subsystem: `@/lib/`, `@/schemas/`, `@/server/`, `@/types/`, `@/components/`

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- No other aliases; all imports use the `@/` prefix
- Example: `import { prisma } from "@/lib/prisma"` not `../../../lib/prisma`

**Barrel Files:**
- Not consistently used; most imports directly reference source files
- Components import UI primitives from `@/components/ui/button`, etc.
- Models are typically single imports: `import { saleModel } from "@/server/models/sale.model"`

## Error Handling

**Patterns:**
- Server actions return `ActionResult<T>` union type → `{ success: true; data?: T } | { success: false; error: string }`
- Form parsing uses safe/guard pattern: check nulls, parse types, validate before using
- Validation errors: Zod schema `.safeParse()` returns error messages to client
- Auth errors: `AuthError` from `next-auth` caught explicitly, generic fallback to "Credenciales inválidas"
- Database errors: wrapped in try-catch, logged with `console.error()`, return safe error message to client
- Permission denied: throws `Error` with message, caught by middleware redirect to login
- Transaction errors: wrapped in `prisma.$transaction()`, atomic rollback on any failure
- Audit logging: gracefully degrades if logging fails — never breaks main operation (try-catch-log pattern)
- Email failures: logged but don't break request flow, warnings logged for missing SMTP config

**Error Messages:**
- Client-facing: Spanish language, user-friendly descriptions
- Technical: logged to console with context prefix like `[cron]`, `[email]`, `[audit]`
- Never leak sensitive information in error messages

## Logging

**Framework:** Native `console` object (no external logger library)

**Patterns:**
- **Info/Success**: `console.log()` with context prefix → `console.log("[email] Email sent to...")`
- **Warnings**: `console.warn()` for non-critical issues → missing SMTP config, missing audit userId
- **Errors**: `console.error()` with context and error details → `console.error("[cron] Failed to query...", error)`
- Context prefixes: `[email]`, `[cron]`, `[audit]`, `[Dashboard error:]` for easy filtering
- No structured logging — simple string messages, error objects logged as second parameter

**When to Log:**
- Async operations completion: email sent, cron job executed, audit log created
- External API calls: dolarapi rates fetched, SMTP connection attempted
- Error conditions: validation failures, database errors, permission denials
- Warnings: non-standard conditions like missing environment config

## Comments

**When to Comment:**
- Complex business logic: like overdue status computation or installment recalculation
- Non-obvious algorithm steps: like date arithmetic with month overflow in `generateInstallments()`
- Implementation decisions: why Decimal types are converted to Number for serialization
- Temporary workarounds: mark with TODO/FIXME if intentional technical debt
- Not needed: self-documenting code, straightforward CRUD operations, type signatures

**JSDoc/TSDoc:**
- Used selectively on public functions and complex utilities
- Documented in `installment-generator.ts`: shows parameter object structure and behavior
- Not universally applied; most functions lack JSDoc comments
- When present, follows standard format with `@param`, `@returns`, description

## Function Design

**Size:**
- Keep functions focused on single responsibility (CRUD, validation, business logic separation)
- Most server actions 50-150 lines; complex ones like `payInstallment()` split into helper functions
- Helper functions within actions: `parseFormAmount()`, `parseFormString()`, `parseFormDate()` for input handling

**Parameters:**
- Prefer objects over positional args for complex operations → `GenerateInstallmentsParams` object
- Server actions: first param `_prevState`, second param `FormData`
- Optional params grouped in interfaces → `FindAllParams` with optional `search`, `status`, `developmentId`
- Use `undefined` over `null` for optional values in function interfaces

**Return Values:**
- Server actions: always return `ActionResult` type for consistency
- Models: return Prisma query results or null
- Business logic: return computed values (Decimal, arrays, objects)
- Guards/checkers: return boolean or throw Error
- Never mix `null` and `undefined` — standardize to the codebase pattern (mixing occurs in schema transforms)

## Module Design

**Exports:**
- Server actions: named exports of async functions → `export async function getSales()`
- Models: single default-like export using object literal → `export const saleModel = { async findAll() {...} }`
- Schemas: named exports of Zod schemas and inferred types → `export const saleCreateSchema = z.object(...)`
- Constants: named exports of Maps/Records → `export const SALE_STATUS_LABELS: Record<...> = {...}`
- Types: re-export from Prisma generated client or define as named exports

**Barrel Files:**
- Not used for models or actions; each file imported directly
- Component barrel files implicit via `_components/` directory organization

## Server Action Patterns

**Core Structure:**
1. `"use server"` directive at file top
2. Import guards/auth → `requirePermission()`
3. Type definition for return type → `ActionResult`
4. Main exported async action function with signature `(_prevState: ActionResult, formData: FormData)`
5. Input parsing: extract and type-check FormData values
6. Validation: Zod `safeParse()` with error return
7. Permission check: call `requirePermission("resource:action")` before mutation
8. Business logic: transaction-wrapped mutations or external calls
9. Side effects: `revalidatePath()`, `logAction()` after success
10. Error handling: try-catch with ActionResult error return

**Example Flow:**
```typescript
export async function payInstallment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  // Parse inputs
  const installmentId = parseFormString(formData, "installmentId");
  // Validate
  if (!installmentId) return { success: false, error: "..." };

  try {
    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      // mutations
    });
    // Side effects
    await logAction("Installment", installmentId, "PAYMENT");
    revalidatePath("/dashboard/ventas");
    return { success: true };
  } catch (error) {
    console.error("Payment failed:", error);
    return { success: false, error: "Error procesando pago" };
  }
}
```

## Form Handling (Client Components)

**Pattern:**
- Use `react-hook-form` with Zod resolver
- Use `useActionState` hook to call server action
- Form submission triggers async action with FormData
- State updates trigger toast notifications (via `sonner`)
- On success, navigate with `useRouter().push()` or `revalidatePath()`

**Example:**
```typescript
const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
  (_prev, formData) => createSale({ success: false, error: "" }, formData),
  null
);

const form = useForm<SaleCreateInput>({
  resolver: zodResolver(saleCreateSchema),
  defaultValues: {...}
});

useEffect(() => {
  if (state?.success) {
    toast.success("Venta creada");
    router.push("/dashboard/ventas");
  }
  if (state?.error) {
    toast.error(state.error);
  }
}, [state]);
```

---

*Convention analysis: 2026-02-26*
