# Requirements: Sistema Inmobiliaria

**Defined:** 2026-03-16
**Core Value:** The client can manage their entire real estate operation — from lot availability through sale, installment collection, and cash tracking — in one system, with every transaction auditable and every peso accounted for.

## v1.3 Requirements

Requirements for Auditoria Tecnica Completa milestone. Each maps to roadmap phases.

### Concepto (Conceptual Overview)

- [x] **CONC-01**: Documento describe propósito del sistema, dominio de negocio y arquitectura de alto nivel
- [x] **CONC-02**: Documento lista todos los módulos/features con descripciones y mapa de interconexión
- [x] **CONC-03**: Documento detalla roles de usuario y alcance de acceso de cada uno

### Base de Datos (Database Architecture)

- [x] **DB-01**: Documento describe todas las tablas/modelos con descripción campo por campo
- [x] **DB-02**: Documento mapea todas las relaciones (1:1, 1:N, N:M), foreign keys, indexes y constraints
- [x] **DB-03**: Documento explica la lógica dual USD/ARS — cómo se modela en la base de datos
- [x] **DB-04**: Documento detalla la implementación del audit trail (AuditLog)

### Backend (Server Actions & Business Logic)

- [x] **BACK-01**: Documento cubre TODOS los server actions del módulo ventas con lógica paso a paso
- [x] **BACK-02**: Documento cubre TODOS los server actions de pagos/cuotas/refuerzos con lógica paso a paso
- [x] **BACK-03**: Documento cubre TODOS los server actions de caja/movimientos con lógica paso a paso
- [ ] **BACK-04**: Documento cubre TODOS los server actions de firmas/personas/usuarios/desarrollos
- [x] **BACK-05**: Cada server action documentado incluye: validación, guards, lógica de negocio, operaciones DB, respuesta

### Frontend (Architecture & Components)

- [ ] **FRONT-01**: Documento incluye mapa de rutas/páginas con árbol de componentes
- [ ] **FRONT-02**: Documento mapea cada página a los server actions que consume
- [ ] **FRONT-03**: Documento describe flujo de auth, rutas protegidas y manejo de estado
- [ ] **FRONT-04**: Documento cataloga patrones UI clave y componentes reutilizables

### Flujos (Critical Business Flows)

- [ ] **FLOW-01**: Documento describe flujo completo de creación de venta (DB → Backend → Frontend)
- [ ] **FLOW-02**: Documento describe flujo completo de pago de cuota con conversión de moneda
- [ ] **FLOW-03**: Documento describe flujo de firma → bloqueo de pagos → comisión automática
- [ ] **FLOW-04**: Documento describe enforcement de RBAC a través de todas las capas
- [ ] **FLOW-05**: Documento señala inconsistencias, código muerto o comportamientos no documentados

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Documentación

- **DOC-01**: Diagrama ER visual generado desde Prisma schema
- **DOC-02**: Documentación de API en formato OpenAPI/Swagger
- **DOC-03**: Guía de onboarding para nuevos desarrolladores

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cambios de código | Este milestone es solo documentación — no se modifica código fuente |
| Tests nuevos | La auditoría documenta lo existente, no agrega cobertura |
| Refactoring | Inconsistencias encontradas se documentan, no se corrigen |
| Documentación automática | Generadores automáticos pierden contexto de negocio — documentación manual es más valiosa |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONC-01 | Phase 11 | Complete |
| CONC-02 | Phase 11 | Complete |
| CONC-03 | Phase 11 | Complete |
| DB-01 | Phase 12 | Complete |
| DB-02 | Phase 12 | Complete |
| DB-03 | Phase 12 | Complete |
| DB-04 | Phase 12 | Complete |
| BACK-01 | Phase 13 | Complete |
| BACK-02 | Phase 13 | Complete |
| BACK-03 | Phase 13 | Complete |
| BACK-04 | Phase 13 | Pending |
| BACK-05 | Phase 13 | Complete |
| FRONT-01 | Phase 14 | Pending |
| FRONT-02 | Phase 14 | Pending |
| FRONT-03 | Phase 14 | Pending |
| FRONT-04 | Phase 14 | Pending |
| FLOW-01 | Phase 15 | Pending |
| FLOW-02 | Phase 15 | Pending |
| FLOW-03 | Phase 15 | Pending |
| FLOW-04 | Phase 15 | Pending |
| FLOW-05 | Phase 15 | Pending |

**Coverage:**
- v1.3 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
