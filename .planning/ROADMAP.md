# Roadmap: Sistema Inmobiliaria

## Milestones

- v1.0 Delivery Hardening -- Phases 1-4 (shipped 2026-02-26)
- v1.1 Bug Fixes & UX Polish -- Phases 5-7 (shipped 2026-02-26)
- v1.2 Integracion Firma-Venta -- Phases 8-10 (in progress)

## Phases

<details>
<summary>v1.0 Delivery Hardening (Phases 1-4) -- SHIPPED 2026-02-26</summary>

- [x] Phase 1: Testing Infrastructure (2/2 plans) -- completed 2026-02-26
- [x] Phase 2: Financial Logic Tests (2/2 plans) -- completed 2026-02-26
- [x] Phase 3: Integration Tests (2/2 plans) -- completed 2026-02-26
- [x] Phase 4: Delivery Gates and Lot Grid (3/3 plans) -- completed 2026-02-26

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Bug Fixes & UX Polish (Phases 5-7) -- SHIPPED 2026-02-26</summary>

- [x] Phase 5: Quick Fixes (1/1 plan) -- completed 2026-02-26
- [x] Phase 6: Estadisticas Overhaul (1/1 plan) -- completed 2026-02-26
- [x] Phase 7: Features & Polish (2/2 plans) -- completed 2026-02-26

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v1.2 Integracion Firma-Venta (In Progress)

**Milestone Goal:** Vincular firmas con ventas como requisito para habilitar pagos y comisiones, convirtiendo la firma en el eje central del ciclo de vida de una venta.

- [ ] **Phase 8: Schema & Data Layer** - SigningSlot-Sale FK, model updates, Zod schema extensions
- [ ] **Phase 9: Service Layer** - Payment gating, firma exemptions, auto-commission on signing completion
- [ ] **Phase 10: UI Integration** - Firma status display, payment UX gating, signing management from sale detail, exchange rate equivalence

## Phase Details

### Phase 8: Schema & Data Layer
**Goal**: The data layer supports a direct relationship between signings and sales, enabling all downstream business logic and UI queries
**Depends on**: Phase 7
**Requirements**: FIRMA-01
**Success Criteria** (what must be TRUE):
  1. SigningSlot table has a nullable `saleId` FK column pointing to Sale
  2. Querying a Sale includes its related SigningSlot (if any) in the response
  3. Querying a SigningSlot includes its related Sale (if any) in the response
  4. Zod schemas validate `saleId` as optional string on signing creation/update
  5. Existing SigningSlots without a linked sale continue to work without errors
**Plans**: TBD

### Phase 9: Service Layer
**Goal**: Business rules enforce that installment/refuerzo payments require a completed signing, exempt sales bypass the gate, and completing a signing auto-generates the seller commission
**Depends on**: Phase 8
**Requirements**: PAGO-01, PAGO-02, PAGO-03, COMIS-01, COMIS-02, COMIS-03
**Success Criteria** (what must be TRUE):
  1. Attempting to pay an installment on a sale with a non-completed signing returns a blocking error
  2. Attempting to pay a refuerzo on a sale with a non-completed signing returns a blocking error
  3. Paying installments/refuerzos on CONTADO, CESION, and PERMUTA sales succeeds regardless of signing status
  4. Completing a signing automatically creates a COMISION CashMovement linked to the sale, seller, and development
  5. Completing a signing that already has a commission does NOT create a duplicate
**Plans**: TBD

### Phase 10: UI Integration
**Goal**: Users can see signing status on every sale, manage signings from the sale detail page, and understand payment blocking with clear visual feedback and currency equivalence
**Depends on**: Phase 9
**Requirements**: FIRMA-02, FIRMA-03, FIRMA-04, FIRMA-05, PAGO-04, PAGO-05
**Success Criteria** (what must be TRUE):
  1. Sales list table shows a badge with the signing status (Por fijarse / Fijada / Completada) for each sale
  2. Sale detail page displays a firma section showing the current signing status and details
  3. User can create a new signing or link an existing one directly from the sale detail page
  4. Payment buttons on installments/refuerzos are visually disabled with an explanatory tooltip when signing is not completed
  5. Payment dialog shows the ARS/USD equivalence using the current exchange rate and confirms the amount covers the installment
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Testing Infrastructure | v1.0 | 2/2 | Complete | 2026-02-26 |
| 2. Financial Logic Tests | v1.0 | 2/2 | Complete | 2026-02-26 |
| 3. Integration Tests | v1.0 | 2/2 | Complete | 2026-02-26 |
| 4. Delivery Gates and Lot Grid | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Quick Fixes | v1.1 | 1/1 | Complete | 2026-02-26 |
| 6. Estadisticas Overhaul | v1.1 | 1/1 | Complete | 2026-02-26 |
| 7. Features & Polish | v1.1 | 2/2 | Complete | 2026-02-26 |
| 8. Schema & Data Layer | v1.2 | 0/? | Not started | - |
| 9. Service Layer | v1.2 | 0/? | Not started | - |
| 10. UI Integration | v1.2 | 0/? | Not started | - |
