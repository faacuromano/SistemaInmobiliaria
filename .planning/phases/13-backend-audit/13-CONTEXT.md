# Phase 13: Backend Audit - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce `docs/AUDIT_BACKEND.md` — a comprehensive document covering every server action in the system with exhaustive step-by-step logic: validation, guards, business rules, DB operations, and response shape. Also documents the 7 service files that contain heavy business logic. Documentation-only phase — no code changes.

</domain>

<decisions>
## Implementation Decisions

### Document organization
- Group by business domain (consistent with Phase 11/12): Ventas, Pagos y Caja, Firmas, Personas, Desarrollos, Comunicaciones, Sistema
- Include an upfront alphabetical quick-reference index table: Function | File | Module | Section link
- Single file (`docs/AUDIT_BACKEND.md`), consistent with Phase 11 (970 lines) and Phase 12 (1395 lines)
- Written entirely in Spanish (carried from Phase 11)
- Source code references: full path on first mention, short name after (carried from Phase 11)

### Action documentation format
- Numbered prose steps for each action's logic flow (not table format)
- Each action includes a header block with 4 metadata fields:
  - **Archivo:** file path + line number
  - **Guard:** requireRole() args or "Ninguno"
  - **Schema:** Zod schema used or "Ninguno"
  - **Retorno + Errores:** return shape and possible error conditions
  - **Modelos afectados:** which Prisma models are read/written (links to AUDIT_DATABASE.md)
- Step-by-step flow as numbered list: 1. Validate → 2. Auth guard → 3. Business logic → 4. DB operation → 5. Return
- Same depth for ALL actions including simple CRUD — every action gets the full treatment

### Service vs Action boundary
- Document the full call chain: when an action delegates to a service, trace through both layers
- Services documented inline within their domain module (e.g., sale.service.ts documented alongside sale.actions.ts under Ventas)
- For heavy services (payment.service: 392 LOC, sale.service: 333 LOC, import.service: 433 LOC), include their own detailed step-by-step logic sections
- When an action calls a service method, the action's flow references the service section: "→ Ver sale.service.createSale() abajo"

### Cross-reference depth
- Assume reader has NOT read AUDIT_DATABASE.md or AUDIT_CONCEPT.md
- On first mention of a model, include a brief inline note: "Sale (ver AUDIT_DATABASE.md §3.X para detalle de campos)"
- Link to specific sections in other audit docs, not just file names
- Each domain module section should be self-contained enough to read independently

### Claude's Discretion
- Exact ordering of modules within the document
- How to handle the import.service.ts (433 LOC) — may warrant its own subsection
- Whether to include a summary statistics section (total actions, actions per module, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Server actions (primary input — 21 files, 2655 LOC total)
- `src/server/actions/sale.actions.ts` — 98 LOC, sale CRUD
- `src/server/actions/payment.actions.ts` — 172 LOC, payment processing
- `src/server/actions/cash-movement.actions.ts` — 181 LOC, cash movement operations
- `src/server/actions/signing.actions.ts` — 273 LOC, signing slot management (largest)
- `src/server/actions/person.actions.ts` — 220 LOC, person/client management
- `src/server/actions/user.actions.ts` — 211 LOC, user management
- `src/server/actions/extra-charge.actions.ts` — 127 LOC, refuerzo management
- `src/server/actions/lot.actions.ts` — 156 LOC, lot operations
- `src/server/actions/development.actions.ts` — 121 LOC, development CRUD
- `src/server/actions/tag.actions.ts` — 153 LOC, tag operations
- `src/server/actions/exchange-rate.actions.ts` — 136 LOC, exchange rate
- `src/server/actions/cash-balance.actions.ts` — 133 LOC, cash balance
- `src/server/actions/notification.actions.ts` — 130 LOC, notifications
- `src/server/actions/message.actions.ts` — 97 LOC, messaging
- `src/server/actions/payment-receipt.actions.ts` — 88 LOC, receipts
- `src/server/actions/audit-log.actions.ts` — 84 LOC, audit logging
- `src/server/actions/role-permission.actions.ts` — 83 LOC, RBAC definitions
- `src/server/actions/business-hours.actions.ts` — 66 LOC, business hours
- `src/server/actions/system-config.actions.ts` — 54 LOC, system config
- `src/server/actions/auth.actions.ts` — 43 LOC, authentication
- `src/server/actions/import.actions.ts` — 29 LOC, import entry point

### Services (heavy business logic — 7 files, 1716 LOC total)
- `src/server/services/import.service.ts` — 433 LOC, bulk import logic
- `src/server/services/payment.service.ts` — 392 LOC, payment processing
- `src/server/services/sale.service.ts` — 333 LOC, sale creation/management
- `src/server/services/receipt.service.ts` — 176 LOC, receipt generation
- `src/server/services/development.service.ts` — 141 LOC, development operations
- `src/server/services/extra-charge.service.ts` — 140 LOC, refuerzo logic
- `src/server/services/signing.service.ts` — 101 LOC, signing operations

### Models (data access layer — 19 files)
- `src/server/models/` — All 19 model files showing Prisma query patterns

### Validation schemas
- `src/schemas/sale.schema.ts` — Sale Zod schemas
- `src/schemas/lot.schema.ts` — Lot Zod schemas
- `src/schemas/extra-charge.schema.ts` — Extra charge Zod schemas
- `src/schemas/user.schema.ts` — User Zod schemas

### Cross-reference docs
- `docs/AUDIT_CONCEPT.md` — Phase 11 output, module overview and RBAC matrix
- `docs/AUDIT_DATABASE.md` — Phase 12 output, full data model documentation

### Auth & RBAC
- `src/server/actions/auth.actions.ts` — Authentication logic
- `src/server/actions/role-permission.actions.ts` — Role permission definitions

### Utilities
- `src/lib/exchange-rate.ts` — Exchange rate fetching
- `src/lib/installment-recalculator.ts` — Installment recalculation logic
- `src/lib/audit.ts` — Audit utility functions
- `src/lib/service-error.ts` — Service error handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Codebase inventory
- 21 server action files (2,655 LOC total)
- 7 service files (1,716 LOC total) — heavy business logic lives here
- 19 model files (Prisma data access layer)
- Largest files: import.service (433), payment.service (392), sale.service (333), signing.actions (273)

### Established patterns
- Layered architecture: Pages -> Server Actions -> Services -> Models -> Prisma
- RBAC via role-permission.actions.ts with 4 fixed roles
- Zod validation at action entry points
- Audit logging via logAction/logActionFromSession in audit-log.actions.ts
- revalidatePath() calls for Next.js cache invalidation
- prisma.$transaction for multi-model operations

### Integration points
- Output file: `docs/AUDIT_BACKEND.md` (new file, no existing code to modify)
- Cross-references to: `docs/AUDIT_CONCEPT.md` (Phase 11) and `docs/AUDIT_DATABASE.md` (Phase 12)

</code_context>

<specifics>
## Specific Ideas

- The index table should let a dev quickly find "where is createSale documented?" without scrolling
- Service methods should be traceable from their calling action — a dev reading an action should never hit a dead end
- Heavy services (payment, sale, import) deserve the same treatment depth as actions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-backend-audit*
*Context gathered: 2026-03-17*
