# Requirements: Sistema Inmobiliaria

**Defined:** 2026-03-16
**Core Value:** The client can manage their entire real estate operation — from lot availability through sale, installment collection, and cash tracking — in one system, with every transaction auditable and every peso accounted for.

## v1.3 Requirements

Requirements for Auditoria Tecnica Completa milestone. Each maps to roadmap phases.

### Concepto (Conceptual Overview)

- [ ] **CONC-01**: Documento describe propósito del sistema, dominio de negocio y arquitectura de alto nivel
- [ ] **CONC-02**: Documento lista todos los módulos/features con descripciones y mapa de interconexión
- [ ] **CONC-03**: Documento detalla roles de usuario y alcance de acceso de cada uno

### Base de Datos (Database Architecture)

- [ ] **DB-01**: Documento describe todas las tablas/modelos con descripción campo por campo
- [ ] **DB-02**: Documento mapea todas las relaciones (1:1, 1:N, N:M), foreign keys, indexes y constraints
- [ ] **DB-03**: Documento explica la lógica dual USD/ARS — cómo se modela en la base de datos
- [ ] **DB-04**: Documento detalla la implementación del audit trail (AuditLog)

### Backend (Server Actions & Business Logic)

- [ ] **BACK-01**: Documento cubre TODOS los server actions del módulo ventas con lógica paso a paso
- [ ] **BACK-02**: Documento cubre TODOS los server actions de pagos/cuotas/refuerzos con lógica paso a paso
- [ ] **BACK-03**: Documento cubre TODOS los server actions de caja/movimientos con lógica paso a paso
- [ ] **BACK-04**: Documento cubre TODOS los server actions de firmas/personas/usuarios/desarrollos
- [ ] **BACK-05**: Cada server action documentado incluye: validación, guards, lógica de negocio, operaciones DB, respuesta

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
| CONC-01 | TBD | Pending |
| CONC-02 | TBD | Pending |
| CONC-03 | TBD | Pending |
| DB-01 | TBD | Pending |
| DB-02 | TBD | Pending |
| DB-03 | TBD | Pending |
| DB-04 | TBD | Pending |
| BACK-01 | TBD | Pending |
| BACK-02 | TBD | Pending |
| BACK-03 | TBD | Pending |
| BACK-04 | TBD | Pending |
| BACK-05 | TBD | Pending |
| FRONT-01 | TBD | Pending |
| FRONT-02 | TBD | Pending |
| FRONT-03 | TBD | Pending |
| FRONT-04 | TBD | Pending |
| FLOW-01 | TBD | Pending |
| FLOW-02 | TBD | Pending |
| FLOW-03 | TBD | Pending |
| FLOW-04 | TBD | Pending |
| FLOW-05 | TBD | Pending |

**Coverage:**
- v1.3 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*
