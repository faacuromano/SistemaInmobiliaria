# Phase 8: Schema & Data Layer - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a nullable `saleId` FK on SigningSlot pointing to Sale, update Prisma schema, models, Zod schemas, and queries so both sides include each other. This is the data foundation for Phase 9 (payment gating, auto-commission) and Phase 10 (UI integration).

</domain>

<decisions>
## Implementation Decisions

### FK Relationship Shape
- `saleId` nullable FK on SigningSlot pointing to Sale — NOT unique (multiple SigningSlots can point to same Sale, per STATE.md)
- Add `@@index([saleId])` on SigningSlot for query performance
- `onDelete: SetNull` — deleting a Sale sets saleId to null on linked SigningSlots (consistent with other nullable FKs)
- Prisma relation: `SigningSlot.sale` (single Sale?) and `Sale.signingSlots` (SigningSlot[])
- Keep existing `Sale.signingDate` field — do not remove in this phase, cleanup deferred
- Keep existing text fields on SigningSlot (clientName, lotInfo, lotNumbers) — no changes, useful for unlinked legacy signings
- No cross-development constraint — trust UI to show correct options, allow flexible linking

### Multi-Lote Strategy
- Each Sale in a multi-lote group (shared groupId) gets its own link: all their SigningSlots point to the same SigningSlot record
- This means querying any individual sale finds its signing directly, no groupId resolution needed at query time

### Query Includes & Model Changes
- `sale.model.ts` findById: add `signingSlots` to base include (always loaded on sale detail)
- Sales list query: add `signingSlots: { select: { id: true, status: true } }` so Phase 10 can render badges without model changes
- `signing.model.ts` findAll/findById: add sale relation include with `{ select: { id, status, person: { select: { firstName, lastName } }, lot: { select: { lotNumber } } } }`
- Zod `signingCreateSchema`: add optional `saleId` field (allows creating a signing already linked to a sale)
- Zod `signingUpdateSchema`: inherits `saleId` from create schema

### Claude's Discretion
- Migration file naming and ordering
- Exact Prisma relation names/map annotations
- Whether to add a helper method for "active signing" on the model (not required, can use array[0] or filter)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Models
- `prisma/schema.prisma` — Current SigningSlot model (line 583) and Sale model (line 327), enums (SigningStatus line 575)
- `src/server/models/signing.model.ts` — Current signing model with includeBase pattern
- `src/server/models/sale.model.ts` — Current sale model queries and includes
- `src/schemas/signing.schema.ts` — Current Zod schemas for signing create/update
- `src/schemas/sale.schema.ts` — Sale Zod schema (references signingDate)

### Server Actions
- `src/server/actions/signing.actions.ts` — Current signing CRUD actions (create, update, updateStatus, delete)
- `src/server/actions/sale.actions.ts` — Sale actions that will consume the new relation

### Requirements
- `.planning/REQUIREMENTS.md` — FIRMA-01: Sistema vincula SigningSlot con Sale via FK nullable

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `includeBase` pattern in signing.model.ts — extend with sale relation
- Sale model already has established include patterns for related entities
- `ServiceError` class in `src/lib/service-error.ts` — for validation errors

### Established Patterns
- Prisma FK pattern: nullable String field + `@map("snake_case")` + `@relation(fields:..., references:...)` + `@@index`
- Model files export a single object with findAll, findById, create, update, delete methods
- Zod schemas: `.optional().or(z.literal(""))` pattern for optional string fields
- Server actions use `revalidatePath` after mutations

### Integration Points
- `prisma/schema.prisma` — both Sale and SigningSlot models need reciprocal relation fields
- `src/server/models/signing.model.ts` — extend includeBase, extend create/update data types
- `src/server/models/sale.model.ts` — extend includes in findById and findAll
- `src/server/actions/signing.actions.ts` — pass saleId through create/update flows
- `src/schemas/signing.schema.ts` — add saleId to create and update schemas

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard Prisma FK + model extension pattern.

</specifics>

<deferred>
## Deferred Ideas

- Remove Sale.signingDate field — cleanup in a future phase after confirming all UI derives date from SigningSlot
- Auto-migration of legacy signings (text-matching clientName to Sale) — explicitly out of scope per REQUIREMENTS.md
- FIRMA-06: Manual linking of legacy signings — deferred to future release

</deferred>

---

*Phase: 08-schema-data-layer*
*Context gathered: 2026-03-16*
