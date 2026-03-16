# Project Research Summary

**Project:** Sistema Inmobiliaria -- v1.2 Integracion Firma-Venta
**Domain:** Real estate ERP -- signing-sale lifecycle integration
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone integrates two currently disconnected modules -- Sales and Signings -- to enforce a core Argentine real estate business rule: installment payments cannot be collected until the property signing (escrituracion) is legally completed. This is a pure domain logic milestone requiring zero new dependencies. The existing stack (Next.js 15, Prisma 7, Zod, shadcn/ui) already provides every capability needed: schema migrations via `db push`, transactional side effects via `$transaction`, server-validated business rules in the service layer, and exchange rate infrastructure via dolarapi.com. The work spans 7 features across schema, service, and UI layers, with clear dependency ordering.

The recommended approach is a strict three-phase build: schema and data layer first (FK addition, model updates, test fixture updates), service logic second (payment gating, auto-commission in transactions, exchange rate display prep), and UI integration last (status badges, disabled buttons, signing management from sale detail, rate display). This order is driven by the dependency chain -- every feature depends on the FK existing, and the UI depends on both the data shape changes and service behavior. The most critical architectural decision is how to handle multi-lote sales (multiple Sale records sharing a `groupId` that need one shared signing), which must be resolved before any code is written.

The top risk is deploying payment gating without accounting for existing ACTIVA sales that have no SigningSlot. If the gate checks "does signing exist AND is it COMPLETADA" without a fallback for legacy sales, the client loses the ability to collect any payments on pre-existing sales -- a production-breaking scenario. The mitigation is clear: when no SigningSlot is linked to a sale, allow payment (legacy behavior). Only enforce the gate when a signing IS linked but NOT completed. Secondary risks include duplicate commission creation on double-click/status-toggle (solved by idempotency check) and exchange rate rounding inconsistencies (solved by consistent 2-decimal rounding with tolerance).

## Key Findings

### Recommended Stack

No new dependencies are needed. This is a domain logic milestone, not a technology milestone. Every required capability is already installed and battle-tested in the codebase.

**Core technologies (all existing):**
- **Prisma 7.4.1**: Schema migration via `db push`, `$transaction` for atomic commission creation -- already used in `payment.service.ts` and `sale.service.ts`
- **Next.js 15.5.12**: Server Actions for new endpoints, `revalidatePath` for cache busting across `/firmas` and `/ventas` routes
- **Zod 3.25.76**: Schema extension for `saleId` field on signing, payment gating validation messages
- **Vitest 4.0.18**: Unit tests for commission calculation logic and payment gating guard, with `vitest-mock-extended` for Prisma mocking

**What NOT to add:** No state machine library (5 states with simple transitions), no workflow engine (one if/then in a transaction), no Redis (6 users), no event emitter (must be atomic, not eventually consistent), no migration tool switch (stick with `db push`).

### Expected Features

**Must have (table stakes -- milestone is incomplete without these):**
- **F1: SigningSlot-Sale FK** -- Schema migration adding nullable `saleId` to SigningSlot. Foundation for everything else
- **F2: Signing status display on sales** -- Colored badge (Por fijarse / Fijada / Completada) on sales list and detail
- **F3: Payment gating** -- Block installment/extra-charge payments for ACTIVA sales without COMPLETADA signing. The business rule that motivates the entire milestone
- **F4: Firma exemption** -- CONTADO, CESION, and PERMUTA sales skip the signing gate entirely

**Should have (differentiators):**
- **F5: Manage firma from sale detail** -- Create/view/update signing directly from `/ventas/[id]` without navigating to Firmas
- **F6: Auto-commission on signing completion** -- Atomically create COMISION CashMovement when signing transitions to COMPLETADA
- **F7: Exchange rate equivalence display** -- Show ARS/USD conversion in payment dialog using today's blue dollar rate

**Defer (anti-features for this milestone):**
- Google Calendar sync (requires OAuth, out of scope)
- Automatic signing creation at sale time (signing date is not known yet)
- Commission approval workflow (over-engineered for 6 users)
- Exchange rate lock-in at signing time (business uses payment-date rate)
- Signing document upload (file storage complexity)

### Architecture Approach

The system follows a strict four-layer architecture: Pages (Server Components) -> Server Actions (auth + validation) -> Services (business logic + transactions) -> Models (Prisma wrappers). All business rules must live in the service layer, enforced regardless of entry point (sale detail page vs cobranza page both call the same `payInstallment` service). The new `signing.service.ts` follows the exact same pattern as the existing `payment.service.ts`.

**Major components:**
1. **`signing.service.ts` (NEW)** -- Handles signing completion with auto-commission in a single `$transaction`
2. **`payment.service.ts` (MODIFIED)** -- Adds signing status gate check to `payInstallment` and `payExtraCharge`
3. **`signing.model.ts` (MODIFIED)** -- Adds sale relation to includes, adds `findBySaleId`/`findByGroupId` methods
4. **`sale.model.ts` (MODIFIED)** -- Adds signingSlot to `findById` include for status display

**Key patterns to follow:**
- Service-layer business rule enforcement (not UI or action layer)
- Transaction-scoped side effects (status change + commission in one `$transaction`)
- UI gating as defense in depth (disabled buttons + server-side validation)
- Client-side exchange rate fetch in dialog `useEffect` (avoids stale cached rates)

### Critical Pitfalls

1. **Payment gating breaks existing sales (#2, CRITICAL)** -- Existing ACTIVA sales have no SigningSlot. If the gate requires COMPLETADA signing, all collections stop. Prevention: when `sale.signingSlot === null`, allow payment (legacy behavior). Only enforce when a signing IS linked but NOT completed.

2. **Multi-lote FK ambiguity (#5, CRITICAL)** -- Multi-lote sales share a `groupId` but each is a separate Sale record. A `saleId` FK on SigningSlot points to only one sale, leaving others without a signing. Prevention: payment gating must check by `groupId` when present (`findFirst where sale.groupId = X AND status = COMPLETADA`). Alternatively, use `saleId` on SigningSlot but resolve group membership in the query.

3. **Duplicate commission on double-click/status-toggle (#3, CRITICAL)** -- Clicking "Completar Firma" twice or toggling COMPLETADA -> REPROGRAMADA -> COMPLETADA creates duplicate COMISION CashMovements. Prevention: idempotency check (`findFirst where saleId = X AND type = COMISION`) before creation, inside the transaction.

4. **Partial state on signing completion (#6, CRITICAL)** -- If signing status update succeeds but commission creation fails (outside a transaction), the signing shows COMPLETADA with no commission. Prevention: wrap ALL side effects in a single `$transaction`. Follow the existing `payInstallment` pattern.

5. **Exchange rate rounding errors (#4, MODERATE)** -- `convertCurrency()` does raw multiplication without rounding. With ARS rates above 1000, small amounts produce imprecise conversions. Prevention: round to 2 decimals in `convertCurrency`, use tolerance in validation (`Math.abs(paid - expected) < 0.01`), display as approximation ("~ ARS ...").

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema Migration and Data Layer

**Rationale:** Every feature depends on the SigningSlot-Sale FK existing. Model updates and test fixture changes must happen before any logic changes, otherwise existing tests break and new code cannot compile against the correct types.
**Delivers:** Prisma schema with `saleId` FK on SigningSlot, updated models with relation includes, updated Zod schemas, updated test fixtures.
**Addresses:** F1 (SigningSlot-Sale FK)
**Avoids:** Pitfall #1 (text-to-FK migration), Pitfall #5 (multi-lote ambiguity -- design decision resolved here), Pitfall #12 (column type mismatch), Pitfall #14 (broken test fixtures)
**Key decision:** Resolve multi-lote FK strategy before writing any code. Recommended: `saleId` on SigningSlot (nullable, NOT unique), with application-level groupId resolution in queries.

### Phase 2: Service Layer -- Payment Gating and Auto-Commission

**Rationale:** Business logic must be in place before UI work begins. The service layer is the single enforcement point, and both the sale detail page and cobranza page depend on it. Gating and commission are the two core business rules of this milestone.
**Delivers:** Payment gating in `payment.service.ts`, signing completion with auto-commission in new `signing.service.ts`, updated `signing.actions.ts` routing COMPLETADA through the service.
**Addresses:** F3 (payment gating), F4 (firma exemption), F6 (auto-commission)
**Avoids:** Pitfall #2 (legacy sales -- allow payment when no signing linked), Pitfall #3 (duplicate commission -- idempotency check), Pitfall #6 (partial state -- full transaction), Pitfall #8 (missing commissionAmount -- skip gracefully), Pitfall #10 (wrong currency direction -- use Expense fields)
**Key tests:** Legacy sale without signing = payment allowed. ACTIVA sale with PENDIENTE signing = payment blocked. CONTADO/CESION = always allowed. Signing completed = exactly one COMISION CashMovement created. Double-completion = no duplicate.

### Phase 3: UI Integration -- Status Display, Gating UX, and Signing Management

**Rationale:** UI depends on both data shape (signingSlot relation on Sale) and service behavior (gating errors, commission creation). Building UI last means the backend contract is stable.
**Delivers:** Signing status badges on sales list and detail, disabled payment buttons with explanatory banner, signing management section on sale detail page, exchange rate equivalence display in payment dialogs.
**Addresses:** F2 (status display), F5 (manage firma from sale detail), F7 (exchange rate display)
**Avoids:** Pitfall #4 (rounding -- round to 2 decimals, show as approximation), Pitfall #9 (multiple signings -- display latest non-CANCELADA), Pitfall #11 (missing weekend rates -- fallback to latest, show date), Pitfall #13 (stale calendar -- revalidatePath on all affected routes)

### Phase Ordering Rationale

- **Schema first** because F1 is a hard dependency for F2, F3, F5, and F6. Without the FK, no queries, no gating, no commission.
- **Services second** because the UI cannot show correct disabled states or error messages without the service-layer gating being in place. Testing services in isolation (with Vitest mocks) is faster than testing through the UI.
- **UI last** because it is the consumer of both data shape and service behavior. Building UI against a stable backend contract avoids rework.
- **Payment gating and auto-commission in the same phase** because they share the signing status check and both live in the service layer. The `signing.service.ts` file is created here.
- **Exchange rate display alongside other UI** because it is independent of gating logic and purely additive -- no risk of breaking existing flows.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Multi-lote FK strategy needs validation against actual production data. Run `SELECT group_id, COUNT(*) FROM sales WHERE group_id IS NOT NULL GROUP BY group_id` to understand the real grouping patterns before finalizing the schema design.
- **Phase 2:** Commission idempotency and multi-lote commission splitting need careful test design. Research the exact `commissionAmount` values on grouped sales to determine if commission is per-sale or per-group.

Phases with standard patterns (skip research-phase):
- **Phase 3:** All UI work follows established patterns in the codebase (Badge components, disabled buttons with tooltips, dialog data fetching via `useEffect`). No novel patterns needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All capabilities verified in existing codebase. No ambiguity. |
| Features | HIGH | 7 features with clear dependency graph. Complexity assessments grounded in codebase analysis. No web sources needed -- all domain-specific. |
| Architecture | HIGH | Four-layer pattern is well-established. New code follows exact same patterns as existing `payment.service.ts`. File inventory is complete (3 new, 13 modified). |
| Pitfalls | HIGH | 15 pitfalls identified from direct codebase analysis. Risk matrix with severity and likelihood. Prevention strategies are concrete (code snippets, query patterns). |

**Overall confidence:** HIGH -- all findings based on direct codebase inspection. No external API integrations, no unfamiliar libraries, no speculative architecture.

### Gaps to Address

- **Multi-lote FK resolution:** The exact strategy for linking signings to grouped sales needs validation against production data before Phase 1 begins. The recommended approach (saleId FK with groupId query resolution) is sound but should be confirmed with the client's actual multi-lote usage patterns.
- **Data backfill for existing signings:** Existing SigningSlot records have text fields but no FK. A backfill script could match by client name and lot numbers, but accuracy depends on data quality. This should be a manual task, not automated -- the client should review matches.
- **Commission currency edge case:** If a sale is in USD but the seller wants ARS commission, the current schema has no mechanism for this. The commission will be created in the sale's currency. Confirm this is acceptable with the client.
- **`db push` vs `migrate dev`:** The ARCHITECTURE.md references `prisma migrate dev` in some code blocks, but STACK.md correctly identifies that the project uses `db push` (no migrations directory exists). All phases should use `db push` for consistency.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `prisma/schema.prisma`, `payment.service.ts`, `sale.service.ts`, `signing.model.ts`, `signing.actions.ts`, `exchange-rate.ts`, `prisma.ts`, `package.json`
- Schema deployment pattern verified: no `prisma/migrations/` directory, `package.json` scripts confirm `db push` workflow
- Transaction pattern verified: `$transaction(async (tx) => { ... })` works with `PrismaPg` adapter in `payment.service.ts` (line 53) and `sale.service.ts` (line 129)
- Exchange rate pipeline verified: `src/lib/exchange-rate.ts` and `src/server/actions/exchange-rate.actions.ts` provide complete fetch/cache/convert pipeline

### Secondary (MEDIUM confidence)
- Domain knowledge: Argentine real estate escrituracion workflow, ERP payment gating patterns
- Multi-lote grouping: inferred from `groupId` field usage in schema and sale creation logic

### Tertiary (LOW confidence)
- None. No web search was available. All findings are grounded in codebase evidence.

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
