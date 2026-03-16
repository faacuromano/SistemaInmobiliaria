# Phase 11: Conceptual Overview - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce `docs/AUDIT_CONCEPT.md` — a comprehensive document describing the system's purpose, business domain, high-level architecture, all modules/features with descriptions, how they interconnect, and what each user role can access. This is a documentation-only phase — no code changes.

</domain>

<decisions>
## Implementation Decisions

### Document structure
- Hybrid approach: start with high-level architecture overview, then detail each feature area with all its layers
- Include an upfront glossary of domain terms (refuerzo, manzana, cuota, cesion, permuta, escritura, etc.)
- Written entirely in Spanish (matching UI language)
- Source code references: full path on first mention (e.g., `src/server/actions/sale.actions.ts`), short name after (e.g., "sale actions")

### Module interconnections
- Prose description + summary table combo (no diagrams)
- Show data lifecycle flow direction (e.g., Sale → Installments → Payments → CashMovements)
- Trace how data flows through the system: creation → processing → completion

### RBAC detail level
- Full access matrix: roles as columns, every action as rows, checkmarks for access
- Include BOTH server action guards AND UI-level access (which pages/buttons each role sees)
- All 4 roles documented: SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA

### Depth & tone
- Target audience: both new developer onboarding AND experienced dev reference
- Layered depth: overview sections for quick scanning, detailed sections for deep dives
- No length constraint per module — as deep as needed to be truly exhaustive
- Explain business domain concepts (not just code structure)

### Claude's Discretion
- Exact section ordering within modules
- Whether to use collapsible details sections for deep-dive content
- How to format the access matrix (markdown table vs structured list)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### System architecture
- `CLAUDE.md` — Project overview, domain models, business flows, folder structure
- `prisma/schema.prisma` — Full database schema with all models and relationships

### Server layer
- `src/server/actions/` — All 21 server action files (the authoritative list of system operations)
- `src/server/models/` — All 19 model files (data access layer)
- `src/server/services/` — All 7 service files (business logic layer)

### Frontend layer
- `src/app/(dashboard)/` — All 14 dashboard page directories
- `src/components/shared/` — Shared components
- `src/lib/` — Utility functions

### Auth & RBAC
- `src/server/actions/auth.actions.ts` — Authentication logic
- `src/server/actions/role-permission.actions.ts` — Role permission definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Module inventory (from codebase scout)
- 14 dashboard pages: auditoria, caja, cobranza, configuracion, dashboard, desarrollos, estadisticas, firmas, mensajes, personas, ventas (+ error, loading)
- 21 server action files covering all business operations
- 19 model files (Prisma data access)
- 7 service files (business logic: development, extra-charge, import, payment, receipt, sale, signing)

### Established patterns
- Layered architecture: Pages → Server Actions → Services → Models → Prisma
- RBAC via role-permission.actions.ts with 4 fixed roles
- Dual currency (USD/ARS) with exchange rate system

### Integration points
- Output file: `docs/AUDIT_CONCEPT.md` (new file, no existing code to modify)
- Existing docs: `docs/SYSTEM_DOCUMENTATION.md` may contain partial documentation to reference

</code_context>

<specifics>
## Specific Ideas

- The glossary should cover Argentine real estate terms that a non-Argentine developer wouldn't know
- Data lifecycle should trace the full journey: Development → Lots → Sales → Installments → Payments → CashMovements → Receipts
- Access matrix should be actionable — a dev should be able to look up "can COBRANZA do X?" and get a definitive answer

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-conceptual-overview*
*Context gathered: 2026-03-16*
