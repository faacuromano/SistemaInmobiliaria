# Phase 12: Database Architecture - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce `docs/AUDIT_DATABASE.md` — a comprehensive document analyzing the full Prisma schema: every model field-by-field, all relationships (1:1, 1:N, N:M), foreign keys, indexes, constraints, cascade behaviors, dual USD/ARS currency modeling, and audit trail implementation. Documentation-only phase — no code changes.

</domain>

<decisions>
## Implementation Decisions

### Document structure (carried from Phase 11)
- Hybrid approach: start with schema overview, then detail each model with all its fields and relationships
- Written entirely in Spanish
- Source code references: full path on first mention, short name after
- Layered depth: overview sections for quick scanning, detailed sections for deep dives
- No length constraint — as deep as needed

### Model documentation format
- Table format for each model: Field | Type | Nullable | Default | Description columns
- Models grouped by domain area (not alphabetical): Auth, Desarrollo, Ventas, Pagos, Caja, Firmas, Comunicaciones, Sistema
- Enums documented inline with their models + a consolidated enum reference section
- Each model section includes: purpose, fields table, relationships, indexes/constraints, business rules

### Relationship visualization
- Per-model relationship list showing direction, cardinality, and FK field
- Global relationship summary table: Model A | Relation | Model B | FK | Cascade
- Cascade behaviors (onDelete, onUpdate) documented for every FK

### Currency section
- Dedicated section explaining dual-currency architecture
- Which fields store USD vs ARS (field-by-field enumeration)
- How ExchangeRate model connects to CashMovement and payment flows
- Decimal precision settings and why they matter for financial operations

### Claude's Discretion
- Exact table column widths and formatting
- Whether to use collapsible sections for large models
- How to format the global relationship table

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database schema
- `prisma/schema.prisma` — The primary input: 720 lines, 20 models, 52 annotations

### Model layer
- `src/server/models/` — All 19 model files showing how Prisma is used in queries (includes, where, orderBy patterns)

### Currency & exchange
- `src/lib/exchange-rate.ts` — Exchange rate fetching and caching logic
- `src/server/actions/exchange-rate.actions.ts` — Exchange rate server actions

### Audit trail
- `src/server/actions/audit-log.actions.ts` — Audit logging implementation
- `src/server/models/audit-log.model.ts` — AuditLog data access
- `src/lib/audit.ts` — Audit utility functions

</canonical_refs>

<code_context>
## Existing Code Insights

### Schema inventory (from codebase scout)
- 20 Prisma models in 720-line schema file
- 52 @@index/@@unique/@@map annotations
- 19 model files in src/server/models/
- Key enums: Role, SaleStatus, LotStatus, CashMovementType, SigningStatus, etc.

### Domain groupings
- Auth: User, RolePermission
- Desarrollo: Development, Lot, Tag, LotTag
- Ventas: Sale, Installment, ExtraCharge, Person
- Pagos/Caja: CashMovement, CashBalance, PaymentReceipt, ExchangeRate
- Firmas: SigningSlot
- Comunicaciones: Message, MessageRecipient, Notification
- Sistema: AuditLog, SystemConfig

### Integration points
- Output file: `docs/AUDIT_DATABASE.md` (new file)
- Cross-references to: `docs/AUDIT_CONCEPT.md` (Phase 11, for module context)

</code_context>

<specifics>
## Specific Ideas

- Each model should clearly state its business purpose before diving into fields
- The currency section should be practical — a dev should understand which fields to use when recording a USD vs ARS transaction
- Cascade behaviors must be explicit — "what happens when I delete a Development?" should be answerable from this document

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-database-architecture*
*Context gathered: 2026-03-16*
