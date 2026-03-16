# Requirements: Sistema Inmobiliaria

**Defined:** 2026-03-16
**Core Value:** The client can manage their entire real estate operation — from lot availability through sale, installment collection, and cash tracking — in one system, with every transaction auditable and every peso accounted for.

## v1.2 Requirements

Requirements for Integración Firma-Venta milestone. Each maps to roadmap phases.

### Firma (Signing-Sale Integration)

- [ ] **FIRMA-01**: Sistema vincula SigningSlot con Sale via FK nullable (saleId en SigningSlot)
- [ ] **FIRMA-02**: Usuario puede crear una firma directamente desde el detalle de una venta
- [ ] **FIRMA-03**: Usuario puede vincular una firma existente a una venta desde el detalle de venta
- [ ] **FIRMA-04**: Detalle de venta muestra sección de firma con estado actual (Por fijarse / Fijada / Completada)
- [ ] **FIRMA-05**: Tabla de ventas muestra columna con badge de estado de firma

### Pagos (Payment Gating & Exchange Rate)

- [ ] **PAGO-01**: Sistema bloquea pago de cuotas si la venta no tiene firma con status COMPLETADA
- [ ] **PAGO-02**: Sistema bloquea pago de refuerzos si la venta no tiene firma con status COMPLETADA
- [ ] **PAGO-03**: Ventas de contado, cesión y permuta están exentas del bloqueo de firma
- [ ] **PAGO-04**: UI muestra botones de pago deshabilitados con tooltip explicativo cuando la firma no está completada
- [ ] **PAGO-05**: Dialog de pago muestra equivalencia ARS↔USD usando cotización (API o manual) y confirma que el monto cubre la cuota

### Comisión (Auto-Commission)

- [ ] **COMIS-01**: Al completar firma, sistema crea automáticamente CashMovement tipo COMISION con el monto de commissionAmount de la Sale
- [ ] **COMIS-02**: Sistema previene creación duplicada de comisión (idempotencia)
- [ ] **COMIS-03**: Comisión se registra vinculada a la venta, el vendedor y el desarrollo correspondiente

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Firma

- **FIRMA-06**: Vincular manualmente firmas legacy (existentes sin FK) a ventas
- **FIRMA-07**: Notificar al creador de la venta cuando la firma se completa

### Comisión

- **COMIS-04**: Al completar firma grupal (multi-lote), crear comisión para TODAS las ventas del grupo

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migración automática de firmas legacy | Text matching (clientName/lotInfo) es poco confiable — vincular manualmente |
| Workflow engine / state machine | Over-engineering para un sistema de 6 usuarios — lógica directa en service layer |
| Reversa de comisión al reabrir firma | Movimiento financiero ya registrado — manejar manualmente si ocurre |
| Comisión multi-lote automática | Requiere definir estrategia de splitting — diferido a v1.3 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIRMA-01 | — | Pending |
| FIRMA-02 | — | Pending |
| FIRMA-03 | — | Pending |
| FIRMA-04 | — | Pending |
| FIRMA-05 | — | Pending |
| PAGO-01 | — | Pending |
| PAGO-02 | — | Pending |
| PAGO-03 | — | Pending |
| PAGO-04 | — | Pending |
| PAGO-05 | — | Pending |
| COMIS-01 | — | Pending |
| COMIS-02 | — | Pending |
| COMIS-03 | — | Pending |

**Coverage:**
- v1.2 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*
