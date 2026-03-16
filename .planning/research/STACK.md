# Technology Stack: v1.2 Integracion Firma-Venta

**Project:** Sistema Inmobiliaria
**Milestone:** v1.2 Integracion Firma-Venta
**Researched:** 2026-03-16
**Overall Confidence:** HIGH

---

## Verdict: No New Dependencies Required

The v1.2 features (SigningSlot-Sale FK, payment gating, auto-commission, exchange rate display) are entirely achievable with the existing stack. Every capability needed is already installed and battle-tested in the codebase. Adding libraries would be wrong -- this is a domain logic milestone, not a technology milestone.

---

## Existing Stack (Already Installed, Already Sufficient)

### Core Runtime

| Technology | Installed Version | v1.2 Role | Confidence |
|------------|-------------------|-----------|------------|
| Prisma ORM | 7.4.1 | Schema migration (add `saleId` FK to SigningSlot), `$transaction` for auto-commission | HIGH |
| @prisma/adapter-pg | 7.4.1 | PostgreSQL driver adapter (already configured in `src/lib/prisma.ts`) | HIGH |
| Next.js | 15.5.12 | Server Actions for new endpoints, `revalidatePath` for cache busting | HIGH |
| Zod | 3.25.76 | Schema extension for signing-sale linking, payment gating validation | HIGH |
| date-fns | 4.x | Date formatting for signing status display in sale detail | HIGH |
| Lucide React | 0.500.x | Icons for signing status indicators (CalendarCheck, Lock, etc.) | HIGH |
| Sonner | 2.0.7 | Toast notifications for gating messages ("Firma requerida antes de pagar") | HIGH |

### Testing

| Technology | Installed Version | v1.2 Role | Confidence |
|------------|-------------------|-----------|------------|
| Vitest | 4.0.18 | Unit tests for commission calculation, gating logic | HIGH |
| vitest-mock-extended | 3.1.0 | Mock Prisma for transaction-based commission tests | HIGH |
| @vitest/coverage-v8 | 4.0.18 | Coverage for new service layer code | HIGH |

### UI Components

| Technology | Installed Version | v1.2 Role | Confidence |
|------------|-------------------|-----------|------------|
| radix-ui | 1.4.3 | Dialog for signing management from sale detail, AlertDialog for gating | HIGH |
| shadcn/ui | (generated) | Badge for signing status, Card for exchange rate display, Select for signing linking | HIGH |
| react-hook-form | 7.71.2 | Forms for linking signing to sale, commission override | HIGH |
| @hookform/resolvers | 3.10.0 | Zod resolver for extended schemas | HIGH |

---

## What Changes (Code, Not Dependencies)

### 1. Prisma Schema Migration

**What:** Add `saleId` optional FK to `SigningSlot` model, establishing 1:N relationship (one signing can cover multiple sales via `groupId`).

**Current state:** SigningSlot has text fields (`lotInfo`, `clientName`, `lotNumbers`) with no FK to Sale. Sale has a `signingDate` DateTime field but no reference to SigningSlot.

**Required schema change:**
```prisma
model SigningSlot {
  // ... existing fields ...
  saleId    String?  @map("sale_id")
  sale      Sale?    @relation(fields: [saleId], references: [id])
  // ... existing relations ...
}

model Sale {
  // ... existing fields ...
  signingSlot  SigningSlot?
  // ... existing relations ...
}
```

**Migration method:** `prisma db push` (the project does NOT use `prisma migrate dev` -- no migrations directory exists, all schema changes have been applied via `db push`). This is appropriate for a single-client deployment.

**Confidence:** HIGH -- verified by inspecting the `prisma/` directory (no `migrations/` folder, scripts include `db:push`).

### 2. Prisma `$transaction` for Auto-Commission

**What:** When a signing status is set to COMPLETADA, automatically create a `CashMovement` of type `COMISION` within the same transaction.

**Current state:** The codebase already uses `prisma.$transaction(async (tx) => { ... })` extensively in `payment.service.ts` (line 53) and `sale.service.ts` (line 129). The interactive transaction pattern is well-established and works with `PrismaPg` adapter.

**Pattern to follow:**
```typescript
// In a new signing.service.ts (or extended signing.actions.ts)
await prisma.$transaction(async (tx) => {
  // 1. Update signing status to COMPLETADA
  await tx.signingSlot.update({ where: { id }, data: { status: "COMPLETADA" } });

  // 2. Fetch the linked sale + seller info
  const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { seller: true, lot: true } });

  // 3. Create commission CashMovement
  if (sale?.sellerId && sale?.commissionAmount) {
    await tx.cashMovement.create({
      data: {
        type: "COMISION",
        // ... commission data using sale.commissionAmount
      },
    });
  }
});
```

**Confidence:** HIGH -- identical pattern to existing `payInstallment()` and `payExtraCharge()`.

### 3. Exchange Rate Display in Payment Dialogs

**What:** Show ARS equivalent when paying in USD (or vice versa) using today's exchange rate, so the user can verify the payment covers the installment.

**Current state:** `getTodayExchangeRate()` already fetches and caches daily rates from dolarapi.com. `convertCurrency()` in `src/lib/exchange-rate.ts` already converts between USD/ARS. The payment form already has a `manualRate` field.

**Required change:** Pass exchange rate data to the payment dialog component and display a computed conversion. Pure UI work -- no new libraries needed. The `convertCurrency` function (already async/server-side) can be used client-side as a simple multiply/divide since the rate is already fetched.

**Confidence:** HIGH -- all primitives exist, this is UI composition.

### 4. Payment Gating Logic

**What:** Before allowing payment of installments/extra charges, check whether the sale's signing slot has status COMPLETADA. Exempt sale types: CONTADO, CESION (and PERMUTA via CESION status).

**Current state:** `payInstallment()` in `payment.service.ts` already validates installment status and balance. Adding a signing check is a 5-line addition to the existing validation chain.

**Where to add it:**
```typescript
// In payment.service.ts, inside the transaction, after fetching installment:
if (installment.sale.status === "ACTIVA") {
  const signing = await tx.signingSlot.findFirst({
    where: { saleId: installment.saleId, status: "COMPLETADA" },
  });
  if (!signing) {
    throw new ServiceError("La firma debe estar completada antes de registrar pagos");
  }
}
```

**Confidence:** HIGH -- follows established validation pattern in the same file.

---

## What NOT to Add

| Suggestion You Might Consider | Why It Would Be Wrong |
|-------------------------------|----------------------|
| State machine library (xstate, robot) | SigningStatus has 5 states with simple transitions. An enum + switch in service code is clearer than a state machine DSL for this scale. |
| Workflow engine | Auto-commission is a single if/then inside a transaction, not a multi-step workflow. |
| Separate exchange rate API client library | `fetch()` with `next: { revalidate: 3600 }` already works perfectly in `exchange-rate.ts`. A library would add abstraction with no benefit. |
| Redis/caching layer for exchange rates | Next.js fetch cache + DB upsert already handles this. 6 users do not need Redis. |
| Event emitter / pub-sub for commission creation | Transactions guarantee atomicity. Events would introduce eventual consistency for something that must be atomic. |
| Migration tool (prisma migrate) | The project uses `db push` consistently. Switching mid-project for one FK addition would create tooling confusion. |
| Form library upgrade or alternative | react-hook-form + zod + shadcn is already the established pattern, fully working. |

---

## Alternatives Considered

| Decision | Chosen | Alternative | Why Chosen |
|----------|--------|-------------|------------|
| FK direction | SigningSlot has `saleId` FK | Sale has `signingSlotId` FK | SigningSlot pointing to Sale is more natural: a signing "belongs to" a sale. Also allows future 1:N (one signing for multi-lot sales via groupId) without schema changes. |
| Commission trigger | Service-level inside transaction | Database trigger | Service code is testable with Vitest mocks. DB triggers are invisible to the application layer and harder to debug. |
| Gating enforcement | Service-level validation in `payment.service.ts` | Middleware / API route guard | Payment validation already lives in the service layer. Adding a separate middleware would scatter the business rule across layers. |
| Exchange rate display | Pass rate prop to client component | Client-side API call | Server Components can fetch the rate and pass it down. No client-side fetch needed, better UX. |

---

## Schema Migration Plan

Since the project uses `prisma db push`, the migration is straightforward:

1. Edit `prisma/schema.prisma` -- add `saleId` FK to SigningSlot, add `signingSlot` relation to Sale
2. Run `npx prisma db push` -- applies the change to PostgreSQL
3. Run `npx prisma generate` -- regenerates the client types
4. Existing SigningSlot rows will have `saleId = null` (optional FK), which is correct -- they can be linked retroactively via the UI

**Data backfill consideration:** Existing SigningSlots have text `lotInfo` and `clientName` fields but no FK link to Sale. A backfill script could match them using lot numbers, but this is optional -- the client can link them manually through the new UI. The text fields should be kept as-is for display/search purposes even after FK linking.

---

## New Files to Create (Architecture, Not Dependencies)

| File | Purpose | Pattern Source |
|------|---------|----------------|
| `src/server/services/signing.service.ts` | Complete signing with auto-commission transaction | `payment.service.ts` |
| (none -- extend existing) `src/server/services/payment.service.ts` | Add signing gating check to `payInstallment` and `payExtraCharge` | Same file, existing validation pattern |
| (none -- extend existing) `src/schemas/signing.schema.ts` | Add `saleId` to create/update schemas | Same file |
| (none -- extend existing) `src/types/enums.ts` | No changes needed -- `SigningStatus` already includes COMPLETADA | N/A |

---

## Version Compatibility Notes

| Package | Current | Latest Stable | Action |
|---------|---------|---------------|--------|
| Prisma | 7.4.1 | 7.x | No upgrade needed. FK additions are basic Prisma functionality. |
| Next.js | 15.5.12 | 15.x | No upgrade needed. Server Actions and revalidation work as-is. |
| Zod | 3.25.76 | 3.x | No upgrade needed. Schema extension is basic Zod. |
| All others | Current | N/A | No changes. v1.2 is a domain logic milestone. |

---

## Sources

- **Codebase analysis** (HIGH confidence): `prisma/schema.prisma`, `src/server/services/payment.service.ts`, `src/server/services/sale.service.ts`, `src/server/actions/signing.actions.ts`, `src/server/models/signing.model.ts`, `src/lib/exchange-rate.ts`, `src/lib/prisma.ts`, `package.json`
- **Schema deployment** (HIGH confidence): Verified no `prisma/migrations/` directory exists; `package.json` scripts confirm `db:push` workflow
- **Transaction pattern** (HIGH confidence): Verified `$transaction(async (tx) => { ... })` works with `PrismaPg` adapter in existing `payment.service.ts` (line 53) and `sale.service.ts` (line 129)
- **Exchange rate API** (HIGH confidence): Verified `src/lib/exchange-rate.ts` and `src/server/actions/exchange-rate.actions.ts` provide complete fetch/cache/convert pipeline

---

*Stack research for: v1.2 Integracion Firma-Venta milestone*
*Researched: 2026-03-16*
