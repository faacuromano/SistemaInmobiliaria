# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Delivery Hardening

**Shipped:** 2026-02-26
**Phases:** 4 | **Plans:** 9 | **Sessions:** 1

### What Was Built
- Vitest test infrastructure with reusable auth mock, Prisma mock, and financial precision helpers
- 51 tests covering installment generation edge cases, preview/generator parity, recalculation guards, and server action flows
- Clean delivery gates: tsc, lint, and build all pass with zero errors
- Lot grid redesign: manzana-grouped collapsible sections, white cards with status-colored left borders, localStorage view persistence
- Lot detail panel with full sale fields, mobile bottom Sheet drawer, and @media print view

### What Worked
- Wave-based parallel execution: Plans 04-01 and 04-02 ran simultaneously with zero file conflicts
- Research-before-planning pattern: researcher agents enumerated exact tsc/lint errors, so planners wrote precise fix lists
- `expectMoney` helper paid for itself immediately — caught IEEE 754 issues in installment tests
- One describe block per requirement ID gave instant traceability from test failures to requirements

### What Was Inefficient
- ROADMAP.md progress table fell out of sync with actual execution (phases 3-4 still showed "Not started" despite being complete)
- Phase 3 SUMMARY.md files had no one_liner field, making automated accomplishment extraction fail
- v1 requirements were initially written generically ("Full test coverage") and had to be decomposed into specific TEST/FIN/ACT IDs during roadmap creation

### Patterns Established
- File-level `eslint-disable @typescript-eslint/no-explicit-any` for test files with extensive Prisma mocks
- `Number()` wrappers when passing Prisma Decimal values to expectMoney
- `vi.mock` at module level before imports for Prisma-dependent test modules
- `mockClear()` in `beforeEach` for module-level mocks to prevent cross-test pollution
- `$transaction` mock using `mockImplementation((cb) => cb(prismaMock))` for transactional server action tests

### Key Lessons
1. Decompose requirements into testable IDs early — vague requirements like "full test coverage" delay planning
2. Financial assertion helpers (expectMoney) should be created in Phase 1, not deferred — every later phase benefits
3. Integration tests with mocked Prisma are fast but diverge from real Decimal behavior — consider pglite for critical paths in future milestones
4. Delivery gates (tsc/lint/build) should be run continuously, not deferred to a final phase — accumulated errors are harder to fix

### Cost Observations
- Model mix: ~70% opus (executor agents), ~30% sonnet (plan checkers, verifiers)
- Sessions: 1 (entire milestone completed in single session)
- Notable: 9 plans completed in ~24 minutes total execution time (2.7min average per plan)

---

## Milestone: v1.1 — Bug Fixes & UX Polish

**Shipped:** 2026-02-26
**Phases:** 3 | **Plans:** 4 | **Sessions:** 1

### What Was Built
- Dialog spacing fixes for lot and message forms, status-reset bug fix using hidden input pattern
- Estadisticas overhaul: filterable monthly movements table, color-coded type badges, proportional PARCIAL collection rate, help tooltips
- Google Maps URL field on developments (full stack: Prisma → Zod → form → detail page with external link)
- Person detail page redesign: unified contact card, month-grouped payment history with sticky headers, professional table design
- Bulk lot editing: checkbox selection in lots table, floating actions bar with tag assignment dialog and status dropdown, server-side safety guards (200-lot limit, sales guard)

### What Worked
- Parallel Wave 1 execution: Plans 07-01 and 07-02 ran simultaneously with zero file conflicts (completely independent subsystems)
- Small focused plans: 2 tasks per plan kept execution fast and review simple
- Safety guards as first-class design: bulk operations validated at server level (sales guard, lot limit) rather than relying on UI-only checks
- Reusing existing DataTable component: added `rowClassName` prop for bulk selection highlighting without duplicating the table

### What Was Inefficient
- ROADMAP.md progress table again fell out of sync — phases 6 and 7 showed "Not started" and "0/?" despite being complete on disk
- Summary one_liner field still not populated by executor agents, making automated accomplishment extraction fail (same issue as v1.0)
- Phase 6 plans field showed "TBD" in roadmap even after planning was complete

### Patterns Established
- Hidden input pattern for disabled Radix Select — always submit value via hidden input, not relying on disabled Select name attribute
- Dialog body padding: wrap form fields in `div.space-y-4.px-5.py-4`, keep DialogFooter outside
- Per-type-per-month Map aggregation on server side for statistics data
- Color-coded badges using semantic Tailwind: income=green/blue, expense=red/orange
- Bulk operations pattern: Dialog for actions needing confirmation (tags), DropdownMenu for instant actions (status)
- Header checkbox as absolute overlay when DataTable Column.label only accepts strings

### Key Lessons
1. ROADMAP.md progress table sync remains a persistent issue — the `roadmap update-plan-progress` tool doesn't fully update all fields
2. Summary extraction (one_liner) needs to be part of the executor's SUMMARY template, not optional
3. Small polish milestones (3 phases, 4 plans) can ship in a single session — ideal for user-reported bug batches
4. Safety guards in bulk operations should always be server-side — UI can skip states, but server actions are the last line of defense

### Cost Observations
- Model mix: ~70% opus (executor agents), ~30% sonnet (plan checkers, verifiers)
- Sessions: 1 (entire milestone completed in single session)
- Notable: 4 plans completed in ~13 minutes total execution time (3.25min average per plan)

---

## Milestone: v1.2 — Integracion Firma-Venta

**Shipped:** 2026-03-16
**Phases:** 3 | **Plans:** 5 | **Sessions:** 1

### What Was Built
- SigningSlot↔Sale FK relationship with nullable saleId, reciprocal includes, and Zod validation
- Payment signing gate in payment.service.ts blocking installment/refuerzo payments until firma COMPLETADA
- Atomic signing completion service with auto-commission CashMovement and idempotency protection
- FirmaManagementDialog with 4 modes (view/unlink/link/create) and auto-fill from sale data
- Firma badge column in sales table with status-colored badges
- CurrencyEquivalence component with live ARS/USD conversion and green/amber coverage check in payment dialogs

### What Worked
- UI-SPEC workflow: generated design contract before planning, caught typography issues (4 weights → 2) before execution
- Research agent discovered critical Radix tooltip pitfall (disabled elements suppress pointer events) — span wrapper pattern applied preemptively
- 3-phase layered approach (schema → service → UI) gave clean dependency chain with zero cross-wave conflicts
- Phase 10 had comprehensive CONTEXT.md from discuss-phase — planner had zero ambiguity on locked decisions

### What Was Inefficient
- ROADMAP.md progress table still out of sync — phases 8-9 showed "Not started" and "0/1" after completion
- Summary one_liner field still not populated (persistent issue from v1.0/v1.1)
- UI-SPEC revision loop required 2 rounds — initial spec had 4 font weights, checker caught it

### Patterns Established
- Service-layer gate pattern: validate business rules BEFORE entering $transaction block
- Exempt-status allow-list with `as const` for compile-time safety
- Idempotency via findFirst check before creation in atomic transactions
- Disabled button tooltip: wrap in `<span tabIndex={0}>` for Radix hover/focus events
- CurrencyEquivalence: reusable component for cross-currency feedback in payment forms
- FirmaManagementDialog: multi-mode dialog pattern (view/unlink/link/create in single component)

### Key Lessons
1. UI-SPEC verification catches design issues (excess font weights, missing focal points) that would become tech debt during execution
2. Research before UI planning is valuable — discovered Radix tooltip limitation that would have been a mid-execution blocker
3. Service layer with gate pattern (check → fail fast → proceed) is cleaner than embedding business rules in the transaction
4. Commission idempotency is essential — signing completion can be triggered multiple times in production

### Cost Observations
- Model mix: ~65% opus (executor + researcher agents), ~25% sonnet (plan checkers, verifiers, UI checker), ~10% UI researcher
- Sessions: 1 (entire milestone completed in single session)
- Notable: 5 plans completed in ~13 minutes total execution time (2.6min average per plan)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 4 | Initial milestone — established testing patterns and delivery gates |
| v1.1 | 1 | 3 | Polish milestone — bug fixes, UX improvements, new features |
| v1.2 | 1 | 3 | Feature milestone — firma-venta integration, UI-SPEC workflow introduced |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 51 | Scoped (lib, server, schemas) | 1 (Radix Collapsible via shadcn) |
| v1.1 | 51 | Unchanged | 0 (no new deps) |
| v1.2 | 51 | Unchanged | 0 (no new deps — all shadcn components pre-installed) |

### Top Lessons (Verified Across Milestones)

1. ROADMAP.md progress table sync is a persistent issue (3/3 milestones) — needs automation fix or manual post-execution step
2. Summary one_liner field is consistently empty (3/3 milestones) — executor template should make it required
3. Single-session milestones are achievable for 3-4 phase scopes — parallel wave execution is key enabler
4. UI-SPEC verification loop catches design inconsistencies early — introduced in v1.2, proved valuable immediately
