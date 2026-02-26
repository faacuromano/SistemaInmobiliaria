# Roadmap: Sistema Inmobiliaria

## Milestones

- ✅ **v1.0 Delivery Hardening** — Phases 1-4 (shipped 2026-02-26)
- 🚧 **v1.1 Bug Fixes & UX Polish** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Delivery Hardening (Phases 1-4) — SHIPPED 2026-02-26</summary>

- [x] Phase 1: Testing Infrastructure (2/2 plans) — completed 2026-02-26
- [x] Phase 2: Financial Logic Tests (2/2 plans) — completed 2026-02-26
- [x] Phase 3: Integration Tests (2/2 plans) — completed 2026-02-26
- [x] Phase 4: Delivery Gates and Lot Grid (3/3 plans) — completed 2026-02-26

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Bug Fixes & UX Polish (In Progress)

**Milestone Goal:** Fix user-reported bugs, improve UX across Estadisticas, Desarrollos, Personas, and Mensajes modules.

- [ ] **Phase 5: Quick Fixes** - Dialog spacing, critical status bug, and message dialog padding
- [ ] **Phase 6: Estadisticas Overhaul** - Movements table filtering, visual types, collection rate fix, and metric labels
- [ ] **Phase 7: Features & Polish** - Bulk lot editing, Google Maps URL, and person layout improvement

## Phase Details

### Phase 5: Quick Fixes
**Goal**: Users encounter no visual clutter in dialogs and no data corruption when editing sold lots
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: DEV-01, DEV-02, MSG-01
**Success Criteria** (what must be TRUE):
  1. New Lot dialog displays fields with comfortable padding and margins — no cramped or overlapping elements
  2. Send Message dialog displays fields with comfortable padding and margins — no cramped or overlapping elements
  3. Editing a sold lot and saving preserves the lot's current status (VENDIDO, CONTADO, etc.) instead of resetting to DISPONIBLE
  4. The disabled status Select field on sold lots does not send null to the server
**Plans**: TBD

### Phase 6: Estadisticas Overhaul
**Goal**: Users can understand their financial performance from the statistics page with accurate data and clear explanations
**Depends on**: Phase 5
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. User can filter the monthly movements table by movement type (e.g., show only CUOTA or only SUELDO entries)
  2. Movement types in the monthly table are visually distinguishable through color coding or icons without reading the text
  3. Collection rate (Rendimientos de Cobranza) correctly counts PARCIAL payments proportionally rather than as full or zero
  4. Each metric in Rendimientos de Cobranza has a clear label and help text explaining what it measures and how it is calculated
**Plans**: TBD

### Phase 7: Features & Polish
**Goal**: Users can manage lots in bulk, locate developments on a map, and view person information in a clean layout
**Depends on**: Phase 6
**Requirements**: DEV-03, DEV-04, PERS-01
**Success Criteria** (what must be TRUE):
  1. User can select multiple lots from the lots table and apply a shared tag or status change to all selected lots at once
  2. User can enter a Google Maps URL when creating or editing a development, and click it from the development detail to open the location in a new tab
  3. Person detail page displays contact info, sales history, and financial summary in a well-organized layout with readable table design
  4. The Development model in Prisma includes a new optional field for storing the Google Maps URL
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Testing Infrastructure | v1.0 | 2/2 | Complete | 2026-02-26 |
| 2. Financial Logic Tests | v1.0 | 2/2 | Complete | 2026-02-26 |
| 3. Integration Tests | v1.0 | 2/2 | Complete | 2026-02-26 |
| 4. Delivery Gates and Lot Grid | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Quick Fixes | v1.1 | 0/? | Not started | - |
| 6. Estadisticas Overhaul | v1.1 | 0/? | Not started | - |
| 7. Features & Polish | v1.1 | 0/? | Not started | - |
