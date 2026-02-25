# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `LoginForm.tsx`, `DataTable.tsx`)
- Models (data access): kebab-case suffix `.model.ts` (e.g., `user.model.ts`, `sale.model.ts`)
- Actions (server actions): kebab-case suffix `.actions.ts` (e.g., `auth.actions.ts`, `person.actions.ts`)
- Schemas (validation): kebab-case suffix `.schema.ts` (e.g., `person.schema.ts`, `sale.schema.ts`)
- Page components: `page.tsx` for main routes, `layout.tsx` for layouts
- Internal components: underscore prefix `_components/` directory with PascalCase filenames
- Utility files: kebab-case (e.g., `auth-guard.ts`, `installment-generator.ts`)

**Functions:**
- Async data fetchers: `get*` prefix (e.g., `getPersons()`, `getSaleById()`, `getTodayExchangeRate()`)
- Server actions: `*Action` suffix (e.g., `loginAction()`, `createPerson()`, `updateDevelopment()`)
- Model methods: camelCase without prefix (e.g., `findAll()`, `findById()`, `create()`, `update()`)
- Helper functions: camelCase descriptive names (e.g., `generateInstallments()`, `overdueStatus()`)
- Permission checks: `*Permission` pattern (e.g., `requirePermission()`, `checkPermissionDb()`)
- React components: PascalCase (e.g., `LoginForm`, `DataTable`, `PageHeader`)
- Hooks and custom functions in components: `use*` for hooks (though hooks dir is empty; custom hooks are in-component)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `DEVELOPMENT_STATUS_LABELS`, `DEVELOPMENT_TYPE_LABELS`)
- State/data: camelCase (e.g., `isEditing`, `isPending`, `defaultValues`)
- Form data: camelCase (e.g., `formData.get("firstName")`)
- Objects/records: camelCase (e.g., `personCreateSchema`, `actionResult`)
- Boolean prefixes: `is*`, `has*`, `can*` (e.g., `isActive`, `hasLotsWithSales`, `canDelete`)

**Types:**
- TypeScript types: PascalCase with explicit `Type` or `Input`/`Output` suffix (e.g., `LoginInput`, `ActionResult`, `PersonCreateInput`, `PersonUpdateInput`)
- Enum-like objects: PascalCase matching Prisma enums (e.g., `DevelopmentStatus`, `PersonType`, `SaleStatus`)
- Interface naming: Prefix with `I` or just PascalCase without suffix (observed: mostly just PascalCase like `FindAllParams`)
- Props interfaces: `Props` suffix (e.g., `DevelopmentFormProps` would be used; observed as inline interfaces)

## Code Style

**Formatting:**
- TypeScript compiler: `strict: true` in `tsconfig.json`
- Target: ES2022
- Indentation: 2 spaces (inferred from code samples)
- Line length: No explicit config, but under 100 chars observed in most code
- Module system: ES modules (`type: "module"` in package.json)

**Linting:**
- ESLint: v9 with flat config (`eslint.config.mjs`)
- Config extends: `next/core-web-vitals` and `next/typescript`
- No custom rule overrides detected; uses Next.js defaults
- Prettier config: Not explicitly configured (relies on Next.js defaults)

**Code organization:**
- Imports grouped by source: React/Next → third-party → local aliases → relative
- One export per file (typical pattern observed)
- Export style: Named exports for models/actions (e.g., `export const userModel = { ... }`)
- Component files: Default export for React components (e.g., `export function LoginForm() {}`)

## Import Organization

**Order:**
1. React/Next.js imports (`react`, `next/*`)
2. Third-party packages (`zod`, `@hookform/*`, `date-fns`)
3. Type imports (using `import type` for TS-only)
4. Alias imports (`@/schemas`, `@/lib`, `@/components`, `@/server`)
5. Relative imports (rarely used, prefer aliases)

**Path Aliases:**
- `@/*` → `./src/*` (configured in tsconfig.json)
- All imports use `@/` prefix consistently
- Common aliases used:
  - `@/schemas/` - Zod validation schemas
  - `@/lib/` - Utility functions and helpers
  - `@/components/` - React components
  - `@/server/` - Server-only code (actions, models, controllers)
  - `@/types/` - TypeScript type definitions
  - `@/generated/` - Generated Prisma client types

## Error Handling

**Patterns:**
- Server actions return `ActionResult<T>` type:
  ```typescript
  export type ActionResult<T = void> =
    | { success: true; data?: T }
    | { success: false; error: string };
  ```
- Validation: Use `schema.safeParse()` and return first error message
- Prisma errors: Catch `Prisma.PrismaClientKnownRequestError` for constraint violations
  - Example: Check `error.code === "P2002"` for unique constraint, extract field from `error.meta?.target`
- Auth errors: Catch `AuthError` from next-auth separately
- Throw unhandled errors: `throw error` for unexpected exceptions
- Client feedback: Use `toast` from `sonner` for success/error messages
- Form state: Track with `useActionState` hook for async form submission

**Example pattern:**
```typescript
export async function createPerson(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("persons:manage");

  const parsed = personCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await personModel.create({...});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: `Ya existe una persona...` };
    }
    throw error;
  }

  revalidatePath("/personas");
  return { success: true };
}
```

## Logging

**Framework:** `console.*` methods (no logger framework detected)

**Patterns:**
- Not extensively used in codebase; minimal logging observed
- Auth errors logged as user-friendly messages
- Server-side validation errors return user messages via ActionResult
- No structured logging or log aggregation detected

**Guidelines:**
- Use `console.error()` only for unexpected exceptions (then thrown)
- Validation errors: Return user-friendly messages, don't log
- Database errors: Handle gracefully with context-specific messages

## Comments

**When to Comment:**
- TypeScript strict mode and self-documenting code reduce comment need
- Comments observed only in complex calculations (e.g., installment recalculation)
- Inline comments rare; code structure preferred

**JSDoc/TSDoc:**
- Not extensively used
- Type signatures via TypeScript handle most documentation
- Minimal JSDoc comments observed in codebase

## Function Design

**Size:**
- Action functions: 50-150 lines (includes validation, error handling, revalidation)
- Model methods: 5-20 lines (delegated to Prisma)
- Component functions: Variable, but keep business logic extracted to actions/models

**Parameters:**
- Model methods: Use typed interfaces for complex params (e.g., `FindAllParams` interface)
- Actions: Accept `FormData` from form submission
- Server actions: Always receive `_prevState: ActionResult` and `formData: FormData`
- Functions use destructuring for named parameters

**Return Values:**
- Server actions: Always return `ActionResult<T>`
- Models/queries: Return Prisma query results directly
- Components: Return `React.ReactNode` or JSX

## Module Design

**Exports:**
- Models: `export const modelName = { method1, method2, ... }`
- Actions: `export async function actionName(...)`
- Schemas: `export const schemaName = z.object(...)` and `export type InputType = z.infer<typeof schemaName>`
- Components: `export function ComponentName(...)`
- Utilities: Mix of `export const` and `export function`

**Barrel Files:**
- Not used; each file imports directly from its source
- No `index.ts` files to re-export multiple items

**Organization in server/actions:**
- One file per domain entity (person.actions.ts, sale.actions.ts, etc.)
- Contains all async actions for that entity (get, create, update, toggle, etc.)

## Validation

**Framework:** Zod v3.25

**Pattern:**
- Define schema in `schemas/*.schema.ts` files
- Use `z.object()` to define shapes
- Custom refinements for complex validation (e.g., DNI/CUIT regex)
- Export inferred type: `export type PersonCreateInput = z.infer<typeof personCreateSchema>`
- Parse with `schema.safeParse(data)` to get `success` boolean
- First error message: `parsed.error.errors[0].message`

**Example:**
```typescript
export const personCreateSchema = z.object({
  type: z.nativeEnum(PersonType),
  firstName: z.string().min(1, "El nombre es requerido").max(100),
  dni: z.string().optional().or(z.literal(""))
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos").optional()),
});
```

## Authorization

**Pattern:** Permission-based guard

- Function: `await requirePermission("permission:scope")`
- Returns `session` if allowed, throws `Error` if denied
- Permissions checked at action function level
- Format: `entity:action` (e.g., `persons:view`, `sales:manage`, `cash:view`)
- Database-backed: `checkPermissionDb(role, permission)` checks role-permission matrix

---

*Convention analysis: 2026-02-25*
