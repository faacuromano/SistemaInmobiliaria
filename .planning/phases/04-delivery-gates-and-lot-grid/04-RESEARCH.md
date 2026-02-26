# Phase 4: Delivery Gates and Lot Grid - Research

**Researched:** 2026-02-26
**Domain:** Build quality gates (TypeScript, ESLint, Next.js build) + UI component redesign (lot grid visualization)
**Confidence:** HIGH

## Summary

Phase 4 has two distinct workstreams. The first — delivery gates — requires fixing existing type errors and lint violations so that `tsc --noEmit`, `npm run lint`, and `npm run build` all pass clean. Investigation reveals 6 TypeScript errors in one test file (all the same pattern: `expectMoney` receiving a Prisma `Decimal | undefined` union instead of `number`), 41 ESLint errors (almost all `@typescript-eslint/no-explicit-any` in test mocks and one in production code), and 6 ESLint warnings (unused variables/imports in production components and one stale disable directive). The build compiles successfully but fails on the lint check that Next.js runs during build.

The second workstream — lot grid redesign — is largely already scaffolded. The existing `lots-grid.tsx`, `lots-section.tsx`, and `lot-detail-panel.tsx` already implement manzana grouping, color-coded status cards, a desktop side panel, and a mobile Sheet drawer. What remains is: adding collapsible manzana sections, switching from full-background card coloring to the user's preferred white-card + left-border-accent design, persisting view mode in localStorage, and adding `@media print` CSS for a flat client-meeting printout.

**Primary recommendation:** Fix gates first (smallest scope, highest blast radius since build currently fails), then refine the existing lot grid components toward the CONTEXT.md design spec.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Each card shows: lot number (prominent), color-coded status badge, buyer name if sold
- Status colors: DISPONIBLE=green, VENDIDO=blue, CONTADO=yellow, PERMUTA=purple, RESERVADO=gray
- Color applied as left border accent (4px) + small status badge — white card, professional look
- Compact grid (~120px wide cards) for dense scanning — fits developments with 50+ lots
- Section headers labeled "Manzana A" / "Manzana 1", ordered alphabetically/numerically
- Sections are collapsible (click header to expand/collapse)
- Lots with no manzana assigned go in a "Sin Manzana" group at the bottom
- Desktop: right-side slide-out panel (doesn't navigate away from grid)
- Mobile: bottom Sheet drawer (per GRID-04 requirement)
- Fields shown: lot number, area (m2), status, manzana, tags. If sold: buyer name, price, currency, sale date, link to /ventas/{id}
- Print view: handled by @media print CSS — hides controls, renders lots flat for client meetings (per GRID-06)

### Claude's Discretion
- Print view layout details (one manzana per page vs continuous, header/footer content)
- How to fix any tsc/lint/build errors discovered during GATE-01..03
- Exact card hover/focus states and transitions
- Grid/list toggle UI placement and icon choice
- Collapsible section animation (if any)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GATE-01 | `tsc --noEmit` passes with zero type errors | 6 errors found in `installment-recalculator.test.ts` — all `expectMoney` calls receiving Prisma `Decimal \| undefined` union. Fix: cast `as number` or narrow with type assertion. See "Current Gate Errors" section. |
| GATE-02 | `npm run lint` passes with zero warnings or errors | 41 errors (mostly `no-explicit-any` in test mocks) + 6 warnings (unused vars/imports). Fix: replace `as any` with proper Prisma types or targeted `// eslint-disable-next-line`, remove unused variables. See "Current Gate Errors" section. |
| GATE-03 | `npm run build` completes successfully | Build compilation succeeds (`Compiled successfully in 5.9s`) but fails on lint check. GATE-02 fixes will resolve GATE-03. |
| GRID-01 | Lots grouped by manzana with labeled section headers | Already implemented in `lots-grid.tsx` — groups by `lot.block`, labels "Manzana X", "Sin Manzana" last. Need to add collapsible behavior. |
| GRID-02 | Lot cards color-coded by status | Already implemented with full-background coloring. Need to redesign to white card + 4px left border accent per CONTEXT.md decision. |
| GRID-03 | Clicking a lot opens detail panel with buyer, price, area, tags, sale link | Already implemented in `lot-detail-panel.tsx`. Need to add: sale date, currency. Link to `/ventas/{saleId}` already present. |
| GRID-04 | Mobile: lot detail opens as Sheet drawer | Already implemented in `lots-section.tsx` — Sheet with `isMobile` state from matchMedia. Verify bottom vs right side per CONTEXT.md. |
| GRID-05 | View mode persists across navigation via localStorage | Not yet implemented. Currently `viewMode` state defaults to `"map"` on mount. Need localStorage read on mount + write on change. |
| GRID-06 | Print view via `@media print` hides controls, renders lots flat | Not yet implemented for lot grid. Existing print pattern found in `receipt-view-dialog.tsx`. Apply similar `@media print` approach. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App Router, build system, lint runner | Already installed, `npm run build` runs ESLint during build |
| TypeScript | 5.7.x | Type checking via `tsc --noEmit` | Already configured with `strict: true` |
| ESLint | 9.x | Lint via `next lint` (FlatCompat config) | Already configured with `next/core-web-vitals` + `next/typescript` |
| Tailwind CSS | 4.x | Utility-first styling, `@media print` via `print:` prefix | Already installed, used throughout |
| shadcn/ui | new-york style | UI primitives (Sheet, Badge, Card, Collapsible) | Already used for Sheet, Badge, Card. Collapsible component not yet installed. |
| Radix UI | 1.4.3 | Underlying primitives for shadcn/ui (Dialog/Sheet, Collapsible) | Already installed as `radix-ui` monorepo package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.500.x | Icons (ChevronDown for collapsible, Grid, List, etc.) | Already used throughout — ChevronDown for collapsible toggle |
| clsx + tailwind-merge | 2.x / 3.x | `cn()` utility for conditional classes | Already used via `@/lib/utils` |
| zustand | 5.x | State management | NOT needed for this phase — localStorage + useState sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Collapsible | Plain `<details>/<summary>` HTML | Native HTML works but lacks animation control and consistent styling with rest of UI. shadcn Collapsible integrates with Radix and supports controlled open state. |
| localStorage direct | zustand with persist middleware | Overkill for a single view-mode preference. Direct `localStorage.getItem/setItem` is simpler. |
| Inline `<style>` for print CSS | Global CSS in `globals.css` | Inline style tag is already the project pattern (see `receipt-view-dialog.tsx`). For lot grid, Tailwind's `print:` prefix classes are cleaner since we control the markup directly. |

**Installation:**
```bash
npx shadcn@latest add collapsible
```

This will create `src/components/ui/collapsible.tsx` using the existing `radix-ui` package.

## Architecture Patterns

### Recommended Project Structure
No new directories needed. All changes are to existing files:
```
src/app/(dashboard)/desarrollos/[slug]/_components/
├── lots-section.tsx          # MODIFY: localStorage persistence, view toggle
├── lots-grid.tsx             # MODIFY: white card design, collapsible sections, print CSS
├── lot-detail-panel.tsx      # MODIFY: add sale date, currency fields
├── lots-table.tsx            # NO CHANGE
├── lot-filters.tsx           # NO CHANGE
src/components/ui/
├── collapsible.tsx           # NEW: shadcn component (auto-generated)
src/__tests__/                # MODIFY: fix lint/type errors in test files
```

### Pattern 1: localStorage View Persistence
**What:** Read view mode from localStorage on mount, write on change.
**When to use:** GRID-05 requirement.
**Example:**
```typescript
const STORAGE_KEY = "lot-view-mode";

// In LotsSection component:
const [viewMode, setViewMode] = useState<ViewMode>(() => {
  // Cannot read localStorage during SSR
  if (typeof window === "undefined") return "map";
  return (localStorage.getItem(STORAGE_KEY) as ViewMode) || "map";
});

// On change:
function handleViewChange(mode: ViewMode) {
  setViewMode(mode);
  localStorage.setItem(STORAGE_KEY, mode);
}
```

Note: Since LotsSection is already a `"use client"` component, `typeof window` check is only needed for the initial state function (which runs during hydration). An alternative is to use `useEffect` to read from localStorage on mount to avoid hydration mismatch warnings.

### Pattern 2: Collapsible Manzana Sections
**What:** Wrap each manzana group in a Radix Collapsible with animated open/close.
**When to use:** GRID-01 decision for collapsible sections.
**Example:**
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// Inside LotsGrid map over groupedByBlock:
<Collapsible defaultOpen>
  <CollapsibleTrigger className="flex w-full items-center gap-2 group">
    <h3 className="text-sm font-semibold">{group.label}</h3>
    <span className="text-xs text-muted-foreground">({group.lots.length} lotes)</span>
    <div className="h-px flex-1 bg-border" />
    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="grid ...">
      {/* lot cards */}
    </div>
  </CollapsibleContent>
</Collapsible>
```

### Pattern 3: White Card with Left Border Accent
**What:** Replace full-background colored cards with white cards + 4px left border.
**When to use:** GRID-02 per CONTEXT.md decision.
**Example:**
```typescript
const STATUS_BORDER_COLORS: Record<LotStatus, string> = {
  DISPONIBLE: "border-l-emerald-500",
  VENDIDO: "border-l-blue-500",
  CONTADO: "border-l-amber-500",
  PERMUTA: "border-l-violet-500",
  RESERVADO: "border-l-gray-400",
  ESCRITURADO: "border-l-sky-500",
  CESION: "border-l-rose-500",
};

// Card element:
<button
  className={cn(
    "relative flex flex-col rounded-lg border border-l-4 bg-card p-3 text-left",
    "transition-all duration-150 cursor-pointer hover:shadow-md",
    STATUS_BORDER_COLORS[lot.status],
    isSelected && "ring-2 ring-primary ring-offset-1 shadow-md"
  )}
>
```

### Pattern 4: Print View with Tailwind print: Prefix
**What:** Use Tailwind's `print:` variant to hide interactive elements and flatten grid for printing.
**When to use:** GRID-06 requirement.
**Example:**
```typescript
// Hide controls during print
<div className="print:hidden">
  {/* view toggle, filters, buttons */}
</div>

// Force all manzana sections open during print
<div className="print:block">
  {/* lot grid — always visible when printing */}
</div>

// Global print styles in globals.css or inline:
// @media print { ... } to reset backgrounds, remove shadows, ensure flat layout
```

Note: The existing receipt print pattern uses inline `<style>` with `@media print`. For the lot grid, Tailwind `print:` classes are cleaner since we control all the markup.

### Anti-Patterns to Avoid
- **Don't use `useEffect` to initialize state from localStorage if it causes flicker:** Use state initializer function or accept default on SSR and update in useEffect to avoid hydration mismatch.
- **Don't add `as any` to fix type errors:** The current codebase has 41 `as any` casts in tests that need fixing, not adding more. Use proper types or targeted `// eslint-disable-next-line` only when truly necessary.
- **Don't collapse all sections by default:** Collapsible sections should `defaultOpen` so the user sees all lots initially.
- **Don't add animation dependencies:** Collapsible open/close can use CSS `grid-template-rows` transition or Radix built-in animation. No need for framer-motion or other animation libraries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sections | Custom expand/collapse with `display:none` toggle | shadcn/ui `Collapsible` (Radix primitive) | Handles focus management, keyboard nav, aria attributes, animation hooks |
| Print stylesheet | Complex global CSS overrides | Tailwind `print:` variant + small `@media print` block | Project already uses Tailwind variants; `print:hidden` is one class |
| Mobile detection for Sheet | Custom resize observer | Existing `matchMedia` pattern in `lots-section.tsx` | Already implemented correctly with event listener cleanup |
| View mode persistence | Custom hook with sync across tabs | Simple `localStorage.getItem/setItem` | Single-tab use case, no cross-tab sync needed |

**Key insight:** The lot grid components are 80% implemented. This phase is refinement, not greenfield. The risk is over-engineering what should be focused adjustments.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with localStorage
**What goes wrong:** Reading `localStorage` in the initial `useState` call works on the client but returns a different value than the server-rendered HTML (server has no localStorage), causing React hydration warnings.
**Why it happens:** Next.js server-renders the component first; `localStorage` only exists in the browser.
**How to avoid:** Either: (a) use a consistent default value in `useState` and update from localStorage in `useEffect` (causes a brief flash of default view), or (b) accept that since LotsSection is a client component rendered inside a server page, the hydration of the view mode toggle is acceptable with the initializer function approach since the outer layout is stable.
**Warning signs:** Console warning "Text content does not match server-rendered HTML" or "Hydration failed."

### Pitfall 2: ESLint `no-explicit-any` in Mock Typing
**What goes wrong:** Test files use `as any` extensively for Prisma mock return values. Replacing all `as any` with proper types requires importing deep Prisma generated types.
**Why it happens:** Prisma's generated types are complex (nested relations, Decimal fields). Mock objects intentionally only have the subset of fields the code under test uses.
**How to avoid:** Two strategies: (1) Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for mock setup lines where full typing would be excessive, or (2) Use `satisfies Partial<PrismaType>` with an explicit cast. For test files, the disable-next-line approach is more practical and commonly accepted.
**Warning signs:** N/A — this is a judgment call between type safety in tests vs. pragmatic lint passing.

### Pitfall 3: Tailwind print: Classes Not Applying
**What goes wrong:** `print:hidden` or `print:block` classes don't work because Tailwind purge/JIT doesn't recognize them.
**Why it happens:** Tailwind v4 uses `@import "tailwindcss"` and scans source files automatically. The `print:` variant should work out of the box, but if a custom variant configuration interferes, classes may be stripped.
**How to avoid:** Test with `Ctrl+P` (print preview) during development. The project already uses `print:hidden` in `receipt-view-dialog.tsx`, confirming the variant works.
**Warning signs:** Print preview shows the same layout as screen view.

### Pitfall 4: Collapsible Interfering with Print
**What goes wrong:** Collapsed manzana sections are hidden during print, so the printout shows only open sections.
**Why it happens:** Radix Collapsible uses `display:none` or `height:0` for closed content.
**How to avoid:** Add `print:block print:h-auto print:overflow-visible` to CollapsibleContent or add a `@media print` rule that forces all collapsible content visible.
**Warning signs:** Print preview missing some manzana groups.

### Pitfall 5: CONTEXT.md Status Colors Differ from Current Implementation
**What goes wrong:** The CONTEXT.md specifies RESERVADO=gray, but the current implementation uses orange for RESERVADO. If not carefully mapped, colors may not match user expectations.
**Why it happens:** CONTEXT.md was written by the user; current code was written earlier with different color choices.
**How to avoid:** Use CONTEXT.md as source of truth for the redesigned cards: DISPONIBLE=green, VENDIDO=blue, CONTADO=yellow, PERMUTA=purple, RESERVADO=gray. Map remaining statuses (ESCRITURADO, CESION) at Claude's discretion.
**Warning signs:** User feedback about incorrect status colors.

## Code Examples

### Current Gate Errors — TypeScript

All 6 `tsc` errors are in `src/__tests__/unit/lib/installment-recalculator.test.ts` with this pattern:

```typescript
// ERROR: Argument of type 'string | number | Decimal | ... | undefined' is not assignable to parameter of type 'number'
expectMoney(callArgs.data.amount, 150)
expectMoney(callArgs.data.originalAmount, 250)
```

**Fix:** Cast the Prisma update input value to `number`:
```typescript
expectMoney(Number(callArgs.data.amount), 150)
expectMoney(Number(callArgs.data.originalAmount), 250)
```

Or use type assertion:
```typescript
expectMoney(callArgs.data.amount as number, 150)
```

### Current Gate Errors — ESLint

**41 Errors** — `@typescript-eslint/no-explicit-any`:
- `payment-actions.test.ts`: 21 instances — `as any` on mock return values and `$transaction` callback typing
- `sale-actions.test.ts`: 9 instances — same pattern
- `installment-recalculator.test.ts`: 10 instances — same pattern
- `caja/page.tsx`: 1 instance — `initialBalances as any`

**6 Warnings** — `@typescript-eslint/no-unused-vars` + stale directive:
- `message-list.tsx`: `isPending` assigned but never used
- `pay-installment-dialog.tsx`: `isPartial` assigned but never used
- `receipts-section.tsx`: `canManage` defined but never used
- `notification-bell.tsx`: `Check` imported but never used
- `email.ts`: stale `eslint-disable-next-line` directive (nodemailer is now using dynamic `import()` instead of `require()`)
- `installment-preview-parity.test.ts`: `label` defined but never used

**Fix strategies:**
1. For test `as any`: Add file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` at top of each test file (pragmatic, standard practice for test files with extensive mocking)
2. For production `as any` (1 instance in `caja/page.tsx`): Replace with proper type or create a type-safe adapter
3. For unused variables: prefix with `_` (e.g., `_isPending`, `_canManage`) or remove if truly unused
4. For unused import (`Check`): remove from import statement
5. For stale directive: remove the `// eslint-disable-next-line` comment

### localStorage Persistence Pattern (Safe for SSR)

```typescript
const STORAGE_KEY = "lots-view-mode";

function LotsSection(props) {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored && ["grid", "table", "map"].includes(stored)) {
      setViewMode(stored);
    }
    setMounted(true);
  }, []);

  function handleViewChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  // ...
}
```

### Print CSS for Lot Grid

```css
@media print {
  /* Force all collapsible sections open */
  [data-state="closed"] > [data-slot="collapsible-content"] {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Remove card hover effects and shadows */
  .lot-card {
    break-inside: avoid;
    box-shadow: none !important;
  }

  /* Optionally break before each manzana for cleaner pages */
  .manzana-group:not(:first-child) {
    break-before: page;
  }
}
```

Or more simply with Tailwind:
```tsx
{/* Wrapper for print — hides everything interactive */}
<div className="print:hidden">
  {/* view toggle, filters, add lot button */}
</div>

{/* Grid content uses print: overrides */}
<div className="print:!block">
  {/* CollapsibleContent: add print:!block print:!h-auto */}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next lint` standalone | `next lint` deprecated in Next.js 16; ESLint CLI recommended | Next.js 15.5+ | Lint still works via `npm run lint` but shows deprecation warning. No action needed for v1 delivery — `next lint` still functional in 15.5.12. |
| `@radix-ui/react-collapsible` separate package | `radix-ui` monorepo package | 2025 | Already installed as `radix-ui@1.4.3` — shadcn CLI will scaffold the component using the unified package. |
| Tailwind v3 `@apply` with `tailwind.config.js` | Tailwind v4 with CSS-first config | 2025 | Project already on v4. `print:` variant works natively without extra config. |

**Deprecated/outdated:**
- `next lint` CLI: deprecated in Next.js 16, but still works in 15.x. No need to migrate for this delivery.

## Open Questions

1. **Sale date and currency in detail panel**
   - What we know: CONTEXT.md says detail panel should show sale date and currency. Current `LotRow` type does not include `saleDate` or `currency` from the sale.
   - What's unclear: Whether to extend `LotRow` to include these fields, or fetch them separately.
   - Recommendation: Extend the `LotRow` type and the serialization in `page.tsx` to include `sale.saleDate` and `sale.currency`. The data is already fetched by `findBySlug` since it includes `sale: { include: { person: true } }` — the sale object has these fields, they just aren't passed through. Minimal change: add to the `lots.map()` in the page component.

2. **Compact grid vs map mode consolidation**
   - What we know: Currently there are 3 view modes (map/grid/table). Map mode has manzana grouping + large cards + detail panel. Grid mode is compact with no grouping. CONTEXT.md spec describes a single "compact grid (~120px wide cards)" with manzana grouping.
   - What's unclear: Whether to keep 3 modes or consolidate map+grid into a single improved grid mode.
   - Recommendation: Consolidate the "map" mode to match the CONTEXT.md compact design. Keep "grid" mode as-is or remove it if redundant. The user's spec clearly wants compact cards WITH manzana grouping, which is currently split across two modes.

3. **Seed data for post-delivery smoke test**
   - What we know: STATE.md blocker mentions "Confirm whether seed data exists for smoke test run or needs to be created."
   - What's unclear: Whether `prisma/seed.ts` creates developments with lots in various statuses.
   - Recommendation: Out of scope for this phase's code changes, but worth checking during verification.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** — Direct reading of all relevant source files:
  - `src/app/(dashboard)/desarrollos/[slug]/_components/lots-grid.tsx` — current lot grid implementation
  - `src/app/(dashboard)/desarrollos/[slug]/_components/lots-section.tsx` — view mode toggle, mobile Sheet
  - `src/app/(dashboard)/desarrollos/[slug]/_components/lot-detail-panel.tsx` — detail panel fields
  - `src/app/(dashboard)/desarrollos/[slug]/page.tsx` — data serialization from server to client
  - `src/server/models/development.model.ts` — Prisma query shape for lot data
  - `src/app/(dashboard)/ventas/[id]/_components/receipt-view-dialog.tsx` — existing print pattern
  - `src/components/ui/sheet.tsx` — Sheet component with side prop
  - `components.json` — shadcn config (new-york style, radix-ui based)

- **Build tool output** — Direct execution of `tsc --noEmit`, `npm run lint`, `npm run build`:
  - 6 tsc errors in `installment-recalculator.test.ts`
  - 41 lint errors + 6 warnings across 10 files
  - Build compiles but fails on lint step

### Secondary (MEDIUM confidence)
- **Tailwind v4 `print:` variant** — Confirmed working in project by existence of `print:hidden` usage in `receipt-view-dialog.tsx`
- **shadcn/ui Collapsible** — Standard component in shadcn/ui library; uses Radix Collapsible primitive which is included in the installed `radix-ui@1.4.3` package

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; only new component is shadcn Collapsible (standard addition)
- Architecture: HIGH — existing components need refinement, not replacement; patterns are established in codebase
- Pitfalls: HIGH — gate errors fully enumerated by running actual commands; UI pitfalls are standard React/Next.js patterns

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable — existing codebase, no external dependency changes expected)
