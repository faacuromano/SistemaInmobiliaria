# Requirements: Sistema Inmobiliaria

**Defined:** 2026-02-26
**Core Value:** The client can manage their entire real estate operation — from lot availability through sale, installment collection, and cash tracking — in one system, with every transaction auditable and every peso accounted for.

## v1.1 Requirements

Requirements for Bug Fixes & UX Polish milestone. Each maps to roadmap phases.

### Estadisticas

- [x] **STAT-01**: User can filter monthly movements table by movement type (CUOTA, SUELDO, etc.) to understand income/expense sources
- [x] **STAT-02**: User can see visual differentiation between movement types in the monthly table (color coding or icons)
- [x] **STAT-03**: User can see correct collection rate that accounts for PARCIAL payments proportionally
- [x] **STAT-04**: User can see clear labels and help text explaining what "Rendimientos de Cobranza" metrics mean

### Desarrollos

- [x] **DEV-01**: New Lot dialog has proper padding and margins for comfortable layout
- [x] **DEV-02**: Editing a sold lot preserves the current status instead of silently resetting to DISPONIBLE
- [x] **DEV-03**: User can select multiple lots and edit shared fields (tags, status where applicable) in bulk
- [ ] **DEV-04**: User can add a Google Maps URL to a development and click it to view the location

### Personas

- [ ] **PERS-01**: Person detail page displays information in a clearer, better-organized layout with improved table design

### Mensajes

- [x] **MSG-01**: Send Message dialog has proper padding and margins for comfortable layout

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Estadisticas

- **STAT-F01**: User can see year-over-year trend charts for collection performance
- **STAT-F02**: User can export estadisticas data to CSV/PDF

### Desarrollos

- **DEV-F01**: User can edit lots directly from the grid detail panel (without switching to table view)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Geographic/satellite map view | Client wants manzana grid, not a geographic map |
| Real-time notifications for overdue installments | Out of scope for polish milestone |
| Embedded Google Maps iframe | Simple URL link is sufficient — no API key management needed |
| Bulk lot creation | Only bulk editing of existing lots is needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAT-01 | Phase 6 | Complete |
| STAT-02 | Phase 6 | Complete |
| STAT-03 | Phase 6 | Complete |
| STAT-04 | Phase 6 | Complete |
| DEV-01 | Phase 5 | Complete |
| DEV-02 | Phase 5 | Complete |
| DEV-03 | Phase 7 | Complete |
| DEV-04 | Phase 7 | Pending |
| PERS-01 | Phase 7 | Pending |
| MSG-01 | Phase 5 | Complete |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after Phase 6 Plan 01 execution*
