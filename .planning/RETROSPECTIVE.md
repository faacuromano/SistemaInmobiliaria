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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 4 | Initial milestone — established testing patterns and delivery gates |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 51 | Scoped (lib, server, schemas) | 1 (Radix Collapsible via shadcn) |

### Top Lessons (Verified Across Milestones)

1. (Awaiting second milestone for cross-validation)
