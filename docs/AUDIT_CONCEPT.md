# Auditoria Conceptual -- Sistema Inmobiliaria

**Fecha:** 2026-03-16
**Version:** 1.0
**Proposito:** Documento de referencia conceptual para que cualquier desarrollador --incluso sin conocimiento del mercado inmobiliario argentino-- pueda comprender que hace el sistema, como se conectan sus partes y quien puede hacer que.

---

## Tabla de Contenidos

1. [Proposito del Sistema](#1-proposito-del-sistema)
2. [Dominio de Negocio](#2-dominio-de-negocio)
3. [Glosario de Terminos](#3-glosario-de-terminos)
4. [Arquitectura de Alto Nivel](#4-arquitectura-de-alto-nivel)
5. [Mapa de Modulos](#5-mapa-de-modulos)
6. [Interconexion de Modulos](#6-interconexion-de-modulos)
7. [Modelo de Roles y Permisos](#7-modelo-de-roles-y-permisos)
8. [Matriz de Acceso Completa](#8-matriz-de-acceso-completa)
9. [Flujo de Autenticacion](#9-flujo-de-autenticacion)

---

## 1. Proposito del Sistema

### Que es

Sistema Inmobiliaria es un ERP (Enterprise Resource Planning) disenado para empresas que desarrollan y comercializan loteos --subdivisiones de tierra en lotes individuales-- en Argentina. Es un sistema de gestion interno, no un portal para clientes finales.

### Que problema resuelve

Las empresas de desarrollo inmobiliario en Argentina operan con planillas de Excel dispersas: una para ventas, otra para cuotas, otra para caja, otra para cotizaciones del dolar. Cada persona del equipo maneja su propia version. No hay trazabilidad de quien cargo que, no hay alertas automaticas de cuotas vencidas, y la cotizacion del dolar --que afecta cada transaccion-- se busca manualmente cada dia.

Sistema Inmobiliaria unifica toda la operacion en un solo sistema: desde la creacion del desarrollo inmobiliario, pasando por la venta de lotes en cuotas, la cobranza diaria, el manejo de caja con doble moneda (USD/ARS), hasta la generacion automatica de recibos y la agenda de escrituracion.

### Quien lo usa

El sistema esta disenado para el equipo interno de la empresa inmobiliaria, tipicamente entre 4 y 10 usuarios con estos perfiles:

- **Dueno/Socio** (SUPER_ADMIN): Acceso total, ve toda la operacion
- **Administrativos** (ADMINISTRACION): Cargan ventas, desarrollos, personas, manejan firmas
- **Finanzas** (FINANZAS): Gestionan caja, registran pagos, ven cotizaciones
- **Cobradores** (COBRANZA): Consultan cuotas pendientes, verifican estados de pago

### Propuesta de valor

Un desarrollador inmobiliario puede gestionar toda su operacion --desde la disponibilidad de lotes hasta el cobro de la ultima cuota-- en un solo sistema, con cada transaccion auditada y cada peso contabilizado en ambas monedas.

---

## 2. Dominio de Negocio

### El modelo de negocio del loteo argentino

Un desarrollador inmobiliario (por ejemplo, "Raices de Alvear" o "Potus de Avellaneda") adquiere un terreno grande, lo subdivide en lotes individuales y los vende a clientes en planes de cuotas en dolares. El ciclo completo es:

1. **Adquisicion del terreno**: El desarrollador compra un campo o parcela grande.
2. **Creacion del desarrollo**: Se define el desarrollo inmobiliario con su nombre, ubicacion y plano. Se crea en el sistema como un `Development` de tipo `INMOBILIARIO`.
3. **Subdivision en lotes**: El terreno se divide en manzanas (bloques) y lotes numerados. Cada lote tiene un precio de lista en dolares. En el sistema, cada `Lot` pertenece a un `Development`.
4. **Venta de lotes**: Un cliente compra un lote. Se pacta un precio total, una posible entrega inicial (anticipo), y un plan de cuotas mensuales. El sistema genera automaticamente las cuotas (`Installment`) y puede incluir cuotas de refuerzo (`ExtraCharge`).
5. **Cobranza mensual**: El equipo de cobranza contacta a los clientes, registra los pagos, y el sistema crea automaticamente el movimiento de caja (`CashMovement`) correspondiente.
6. **Escrituracion**: Cuando el cliente completa sus pagos (o segun acuerdo), se programa un turno de firma de escritura (`SigningSlot`) en la agenda del sistema. Al completar la firma, el sistema genera automaticamente el movimiento de comision del vendedor.

### Modalidades de venta

No todas las ventas son iguales. El sistema soporta varias modalidades:

- **Venta en cuotas** (status `ACTIVA`): La modalidad mas comun. El cliente paga un precio total en N cuotas mensuales, posiblemente con una entrega inicial y refuerzos semestrales.
- **Contado** (status `CONTADO`): El cliente paga el total de una sola vez. No se generan cuotas. El lote pasa a status `CONTADO`.
- **Cesion/Permuta** (status `CESION`): Se usa para proveedores que reciben lotes como pago por servicios (agrimensores, constructores, etc.). El precio total es $0, no se generan cuotas, y el lote pasa a status `PERMUTA`.

### El desafio de la doble moneda

En Argentina, los inmuebles se precian en dolares estadounidenses (USD), pero los pagos pueden realizarse en pesos argentinos (ARS). La cotizacion del dolar cambia diariamente y existe un mercado "blue" (paralelo) cuyo valor difiere significativamente del oficial.

El sistema obtiene automaticamente las cotizaciones del dia desde la API gratuita de `dolarapi.com`, registrando el tipo de cambio oficial, blue y cripto. Cada movimiento de caja queda vinculado a la cotizacion del dia para trazabilidad historica.

---

## 3. Glosario de Terminos

**Boleto** -- Documento legal preliminar que formaliza la compraventa de un inmueble antes de la escritura definitiva. En el sistema, la fecha del boleto se registra como `saleDate` en el modelo `Sale`.

**Caja** -- Modulo de tesoreria donde se registran todos los ingresos y egresos de dinero de la empresa. En el sistema: modulo Caja, modelo `CashMovement` en `prisma/schema.prisma`, acciones en `src/server/actions/cash-movement.actions.ts`.

**Cesion** -- Transferencia de derechos sobre un lote a un tercero, generalmente a un proveedor como forma de pago. En el sistema: `Sale` con status `CESION`, `Lot` con status `PERMUTA`.

**Cobranza** -- Proceso de cobrar las cuotas pendientes a los clientes. En el sistema: modulo Cobranza (ruta `/cobranza`), acciones en `src/server/actions/payment.actions.ts`.

**Cotizacion** -- Tipo de cambio del dia entre USD y ARS. Se obtiene automaticamente de `dolarapi.com`. En el sistema: modelo `ExchangeRate`, acciones en `src/server/actions/exchange-rate.actions.ts`, logica de fetching en `src/lib/exchange-rate.ts`.

**Cuota** -- Pago periodico programado que un cliente debe abonar como parte de su plan de financiacion. En el sistema: modelo `Installment` en `prisma/schema.prisma`. Cada cuota tiene un monto (`amount`), fecha de vencimiento (`dueDate`), y un estado (`PENDIENTE`, `PAGADA`, `VENCIDA`, `PARCIAL`).

**Desarrollo** -- Emprendimiento inmobiliario: un terreno grande subdividido en lotes para la venta. En el sistema: modelo `Development` en `prisma/schema.prisma`, acciones en `src/server/actions/development.actions.ts`. Puede ser de tipo `INMOBILIARIO` (loteo) u `OTROS` (items varios).

**Entrega** -- Pago inicial o anticipo que el cliente realiza al momento de comprar un lote, antes de que comiencen las cuotas. En el sistema: campo `downPayment` en `Sale`, movimiento de caja de tipo `ENTREGA`.

**Escritura / Escrituracion** -- Acto legal notarial que transfiere oficialmente la propiedad del lote al comprador. Es el paso final del proceso de compraventa. En el sistema: modulo Firmas, modelo `SigningSlot`, acciones en `src/server/actions/signing.actions.ts`.

**Lote** -- Porcion individual de terreno dentro de un desarrollo, identificada por numero y manzana. En el sistema: modelo `Lot` en `prisma/schema.prisma`, acciones en `src/server/actions/lot.actions.ts`. Estados posibles: `DISPONIBLE`, `RESERVADO`, `VENDIDO`, `CONTADO`, `ESCRITURADO`, `CESION`, `PERMUTA`.

**Manzana** -- Agrupacion de lotes dentro de un desarrollo, equivalente a un "bloque" o "cuadra". En el sistema: campo `block` del modelo `Lot`.

**Permuta** -- Intercambio de bienes: un proveedor recibe un lote a cambio de un servicio prestado. En el sistema: `Lot` con status `PERMUTA`, vinculado a una `Sale` con status `CESION` y precio $0.

**Proveedor** -- Persona que presta servicios al desarrollador (agrimensor, constructor, contador). Puede recibir un lote como pago. En el sistema: `Person` con type `PROVEEDOR` o `AMBOS`.

**Refuerzo** -- Cuota extraordinaria, generalmente de mayor monto, pactada para determinadas fechas (ej: cada 6 meses). Al pagarse, las cuotas ordinarias pendientes se recalculan a la baja. En el sistema: modelo `ExtraCharge`, logica de recalculo en `src/lib/installment-recalculator.ts`.

**Vendedor** -- Persona fisica que intermedia la venta de un lote y cobra una comision por ello. No es necesariamente un empleado; puede ser un agente externo. En el sistema: `User` con campo `isSeller = true` y `commissionRate`, vinculado a `Sale` via `sellerId`.

---

## 4. Arquitectura de Alto Nivel

### Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript (strict mode) |
| Base de datos | PostgreSQL |
| ORM | Prisma (con adapter-pg) |
| Autenticacion | Auth.js v5 (NextAuth) |
| Componentes UI | shadcn/ui + Radix UI |
| Estilos | Tailwind CSS v4 |
| Validacion | Zod |
| Email | Nodemailer |
| Import datos | papaparse (CSV) + xlsx (Excel) |
| Cotizaciones | dolarapi.com (API gratuita) |

### Arquitectura en capas

El sistema sigue una arquitectura en capas estricta. Cada capa solo se comunica con la inmediatamente inferior:

```
Paginas (src/app/(dashboard)/)
    |
    v
Server Actions (src/server/actions/)
    |
    v
Services (src/server/services/)
    |
    v
Models (src/server/models/)
    |
    v
Prisma Client
    |
    v
PostgreSQL
```

**Paginas** (`src/app/(dashboard)/`): Componentes React del App Router de Next.js. Son server components por defecto, con client components para interactividad. Hay 14 paginas de dashboard.

**Server Actions** (`src/server/actions/`): Funciones marcadas con `"use server"` que manejan la logica de request/response. Cada action valida permisos (via `requirePermission`), parsea datos (via Zod schemas), delega a services/models, y revalida cache. Hay 21 archivos de actions.

**Services** (`src/server/services/`): Logica de negocio compleja que requiere transacciones o multiples operaciones coordinadas. Por ejemplo, `sale.service.ts` crea una venta con sus cuotas, refuerzos, y actualizacion de lote en una sola transaccion. Hay 7 archivos de services.

**Models** (`src/server/models/`): Capa de acceso a datos que encapsula las consultas Prisma. Cada modelo expone funciones como `findAll`, `findById`, `create`, `update`. Hay 19 archivos de models.

**Prisma Client**: ORM configurado en `src/lib/prisma.ts` con PostgreSQL adapter (`@prisma/adapter-pg`). El schema esta en `prisma/schema.prisma` con 16+ modelos.

### Estructura de carpetas

```
src/
  app/                          # Next.js App Router
    (auth)/                     # Paginas publicas (login)
    (dashboard)/                # Paginas protegidas (14 secciones)
      auditoria/                # Visor de audit log
      caja/                     # Movimientos de caja
      cobranza/                 # Cobro de cuotas
      configuracion/            # Usuarios, permisos, config sistema
      dashboard/                # Pagina principal con KPIs
      desarrollos/              # CRUD desarrollos y lotes
      estadisticas/             # Graficos y metricas
      firmas/                   # Agenda de escrituracion
      mensajes/                 # Mensajeria interna
      personas/                 # Gestion de clientes/proveedores
      ventas/                   # Ventas, cuotas, refuerzos
    api/                        # API Routes (cron, auth handlers)
  server/
    actions/                    # 21 server actions files
    services/                   # 7 business logic services
    models/                     # 19 data access models
  lib/                          # Utilidades compartidas
    auth.ts                     # Configuracion Auth.js
    auth.config.ts              # Callbacks de autenticacion
    auth-guard.ts               # Guards de permisos
    rbac.ts                     # Definicion de roles y permisos
    exchange-rate.ts            # Fetching de cotizaciones
    installment-generator.ts    # Generador de cuotas
    installment-recalculator.ts # Recalculo por refuerzos
    email-templates.ts          # Templates HTML para emails
    business-hours.ts           # Horarios laborales (firmas)
    prisma.ts                   # Singleton Prisma client
  schemas/                      # Validaciones Zod
  types/                        # Definiciones TypeScript
  components/
    ui/                         # Primitivos shadcn/ui
    shared/                     # Componentes compartidos (sidebar, notification-bell)
```

### Infraestructura clave

- **Doble moneda**: Cada `CashMovement` tiene 4 campos de monto: `arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`. La cotizacion del dia se obtiene automaticamente de `dolarapi.com` y se almacena en `ExchangeRate`.
- **Notificaciones por email**: El sistema envia emails automaticos para recibos de pago, recordatorios de refuerzos proximos a vencer, cuotas vencidas, y turnos de firma proximos. Los templates HTML estan en `src/lib/email-templates.ts`.
- **Cron job**: El endpoint `/api/cron/notify-upcoming` (protegido con `CRON_SECRET`) ejecuta tareas periodicas como marcar cuotas vencidas y enviar recordatorios.
- **Audit logging**: Toda operacion critica se registra en `AuditLog` con usuario, entidad, accion, datos anteriores y nuevos, y timestamp. La funcion `logAction` en `src/lib/audit.ts` es el punto de entrada.

---

## 5. Mapa de Modulos

### 5.1 Dashboard y Estadisticas

**Proposito**: Pagina de inicio del sistema y panel de metricas. Muestra KPIs clave (ventas activas, cuotas cobradas, saldos de caja) y graficos de tendencia.

**Rutas**:
- `/dashboard` -- Pagina principal con resumen de la operacion
- `/estadisticas` -- Graficos y metricas avanzadas

**Server Actions** (`src/server/actions/cash-movement.actions.ts`, `src/server/actions/cash-balance.actions.ts`):
- `getCashMovementsSummary()` -- Totales agregados de ingresos/egresos
- `getCashBalances()` -- Saldos mensuales por desarrollo

**Modelos involucrados**: `CashMovement`, `CashBalance`, `Sale`, `Installment`

**Reglas de negocio**: El dashboard agrega datos de multiples modulos para presentar una vista consolidada. Los saldos se calculan desde los movimientos de caja. La permission requerida es `dashboard:view`, que todos los roles tienen.

---

### 5.2 Desarrollos (Developments)

**Proposito**: Gestion de los desarrollos inmobiliarios y sus lotes. Un desarrollo es el contenedor principal: representa un terreno subdividido en lotes. Los lotes se gestionan dentro de la pagina de detalle de cada desarrollo.

**Rutas**:
- `/desarrollos` -- Listado de todos los desarrollos
- `/desarrollos/[slug]` -- Detalle de un desarrollo con la grilla de lotes

**Server Actions** (`src/server/actions/development.actions.ts`, `src/server/actions/lot.actions.ts`, `src/server/actions/tag.actions.ts`):
- `getDevelopments()` -- Lista desarrollos con filtros (busqueda, status, tipo)
- `getDevelopmentBySlug()` -- Detalle de un desarrollo por slug
- `createDevelopment()` -- Crea un desarrollo con lotes iniciales
- `updateDevelopment()` -- Modifica datos del desarrollo
- `deleteDevelopment()` -- Elimina un desarrollo (solo si no tiene ventas)
- `getLotsByDevelopment()` -- Lista lotes de un desarrollo con filtros
- `createLot()` -- Crea un lote individual
- `updateLot()` -- Modifica datos de un lote
- `deleteLot()` -- Elimina un lote (solo si no tiene venta asociada)
- `bulkUpdateLotStatus()` -- Cambia status de multiples lotes (maximo 200, sin ventas asociadas)
- `getTags()`, `createTag()`, `updateTag()`, `deleteTag()` -- CRUD de etiquetas
- `setLotTags()`, `bulkSetLotTags()` -- Asignar etiquetas a lotes

**Modelos/Services**:
- `src/server/models/development.model.ts` -- Acceso a datos de desarrollos
- `src/server/models/lot.model.ts` -- Acceso a datos de lotes
- `src/server/models/tag.model.ts` -- Acceso a datos de etiquetas
- `src/server/services/development.service.ts` -- Logica de creacion/actualizacion/eliminacion con validaciones

**Reglas de negocio**:
- Un desarrollo puede ser de tipo `INMOBILIARIO` (loteo con lotes) u `OTROS` (items varios como casas, vehiculos).
- Los lotes tienen status: `DISPONIBLE`, `RESERVADO`, `VENDIDO`, `CONTADO`, `ESCRITURADO`, `CESION`, `PERMUTA`.
- Un lote no puede eliminarse si tiene una venta asociada.
- Existe un concepto de "Fiderza" que es un desarrollo tipo `INMOBILIARIO` sin lotes, usado como centro de costos para imputar gastos de la oficina/holding.
- Los lotes se organizan por manzanas (`block`) y tienen precio de lista en USD.
- El sistema soporta etiquetas personalizables (Tags) para clasificar lotes.

---

### 5.3 Personas (Persons)

**Proposito**: Gestion de las personas con las que opera la empresa: clientes que compran lotes, proveedores que prestan servicios, o ambos. Incluye la "ficha" o perfil detallado con historial de pagos y deudas.

**Rutas**:
- `/personas` -- Listado de personas con filtros por tipo y estado
- `/personas/[id]` -- Ficha del cliente con resumen de deuda, cuotas pendientes e historial de pagos

**Server Actions** (`src/server/actions/person.actions.ts`):
- `getPersons()` -- Lista personas con filtros (busqueda, tipo, activo/inactivo)
- `getPersonById()` -- Detalle de una persona con ventas, cuotas, pagos
- `createPerson()` -- Crea una persona con validacion de DNI/CUIT unicos
- `createPersonQuick()` -- Creacion rapida desde el formulario de venta
- `updatePerson()` -- Modifica datos de una persona
- `togglePersonActive()` -- Activa/desactiva una persona
- `searchPersonsForCollection()` -- Busqueda para el modulo de cobranza

**Modelos involucrados**:
- `src/server/models/person.model.ts` -- Acceso a datos de personas, incluye joins con ventas, cuotas y movimientos de caja

**Reglas de negocio**:
- Tres tipos: `CLIENTE`, `PROVEEDOR`, `AMBOS`.
- El DNI y CUIT son campos unicos. Si ya existe una persona con el mismo DNI o CUIT, el sistema rechaza la creacion.
- La ficha del cliente muestra: resumen de deuda, cuotas pendientes, historial de pagos recientes (ultimos 50 movimientos).
- El campo `createdById` registra que usuario creo la persona, para trazabilidad.

---

### 5.4 Ventas (Sales)

**Proposito**: Modulo central del sistema. Gestiona todo el ciclo de vida de una venta: desde la creacion del plan de cuotas hasta la cancelacion o finalizacion. Es donde se crean las cuotas, los refuerzos, y se visualiza el estado de pago de cada venta.

**Rutas**:
- `/ventas` -- Listado de todas las ventas con filtros (status, desarrollo, busqueda)
- `/ventas/nuevo` -- Formulario de creacion de venta
- `/ventas/[id]` -- Detalle de una venta con cuotas, refuerzos, movimientos, y turnos de firma vinculados

**Server Actions** (`src/server/actions/sale.actions.ts`, `src/server/actions/extra-charge.actions.ts`):
- `getSales()` -- Lista ventas con filtros
- `getSaleById()` -- Detalle completo de una venta con cuotas, refuerzos, lote, persona, vendedor
- `createSale()` -- Crea una venta (ver flujo detallado abajo)
- `cancelSale()` -- Cancela una venta activa, devolviendo el lote a `DISPONIBLE`
- `getSaleForPrint()` -- Datos de venta para impresion/PDF
- `getExtraChargesBySale()` -- Lista refuerzos de una venta
- `createExtraCharge()` -- Crea un refuerzo
- `updateExtraCharge()` -- Modifica un refuerzo pendiente
- `deleteExtraCharge()` -- Elimina un refuerzo no pagado

**Services**:
- `src/server/services/sale.service.ts` -- Logica de creacion de ventas en transaccion, validaciones de negocio, serializacion para cliente
- `src/server/services/extra-charge.service.ts` -- CRUD de refuerzos con validaciones

**Flujo de creacion de venta** (en `src/server/services/sale.service.ts`, funcion `createSale`):
1. Validar que el lote existe y esta disponible (`DISPONIBLE` o `RESERVADO`)
2. Validar que la persona existe
3. Validar vendedor si fue indicado
4. Calcular monto financiado: `totalPrice - downPayment - totalExtraCharges`
5. Calcular monto de cuota regular: `financedAmount / totalInstallments`
6. Dentro de una transaccion atomica:
   a. Crear la `Sale`
   b. Generar N `Installment` con fechas de vencimiento calculadas
   c. Crear los `ExtraCharge` (refuerzos pactados)
   d. Actualizar el `Lot` a status correspondiente (`VENDIDO`, `CONTADO`, o `PERMUTA`)
7. Registrar en audit log

**Reglas de negocio**:
- Status de venta: `ACTIVA` (en cuotas), `CANCELADA`, `COMPLETADA` (todas las cuotas pagadas), `CONTADO` (pago unico), `CESION` (proveedor/permuta).
- Solo se pueden cancelar ventas con status `ACTIVA`.
- Al cancelar, el lote vuelve a `DISPONIBLE`.
- El campo `groupId` permite agrupar ventas de multiples lotes bajo un mismo plan de pago.
- Las cuotas se generan con `src/lib/installment-generator.ts`, respetando el dia de cobro y ajustando cuando el dia excede los dias del mes.
- La primera cuota puede tener un monto diferente al resto.

---

### 5.5 Cobranza (Collections)

**Proposito**: Modulo para el equipo de cobranza. Permite buscar clientes con cuotas pendientes, ver el detalle de sus deudas, y registrar pagos de cuotas, refuerzos y entregas.

**Rutas**:
- `/cobranza` -- Vista de cuotas pendientes con busqueda de personas

**Server Actions** (`src/server/actions/payment.actions.ts`):
- `payInstallment()` -- Registra el pago de una cuota ordinaria
- `payExtraCharge()` -- Registra el pago de un refuerzo
- `recordDeliveryPayment()` -- Registra un pago de entrega (anticipo)

**Services**:
- `src/server/services/payment.service.ts` -- Logica de pagos con transacciones atomicas, signing gate, y auto-generacion de recibos

**Flujo de pago de cuota** (en `src/server/services/payment.service.ts`, funcion `payInstallment`):
1. Verificar signing gate: si la venta tiene un turno de firma, la firma debe estar `COMPLETADA` antes de poder registrar pagos (excepto ventas `CONTADO` y `CESION`)
2. Dentro de una transaccion atomica:
   a. Obtener la cuota con lock
   b. Validar que el monto no exceda el saldo pendiente
   c. Crear `CashMovement` de tipo `CUOTA`
   d. Actualizar la cuota (`paidAmount`, `status`)
   e. Si todas las cuotas estan pagadas, marcar la venta como `COMPLETADA`
3. Generar recibo automaticamente (fuera de la transaccion)
4. Registrar en audit log

**Flujo de pago de refuerzo** (funcion `payExtraCharge`):
1. Verificar signing gate
2. Dentro de una transaccion:
   a. Obtener el refuerzo
   b. Crear `CashMovement`
   c. Actualizar el refuerzo
   d. Si esta totalmente pagado, ejecutar `recalculateInstallments()` que distribuye el monto del refuerzo entre las cuotas pendientes, reduciendo cada una proporcionalmente
3. Generar recibo

**Reglas de negocio**:
- El signing gate bloquea pagos si la firma no esta completada (ver seccion 5.7 Firmas)
- Los pagos parciales estan soportados: una cuota pasa a status `PARCIAL` si el pago no cubre el total
- Al pagar un refuerzo completamente, las cuotas pendientes se recalculan: `nuevoMonto = saldoRestante / cuotasPendientes`. El campo `originalAmount` preserva el monto original para referencia visual.
- Los recibos se generan automaticamente despues de cada pago exitoso

---

### 5.6 Caja (Cash / Treasury)

**Proposito**: Registro completo de todos los movimientos de dinero de la empresa. Funciona como un libro de caja dual (USD y ARS), donde cada movimiento puede ser un ingreso o egreso en cualquiera de las dos monedas. Los pagos de cuotas aparecen automaticamente; los demas movimientos (sueldos, gastos, comisiones) se cargan manualmente.

**Rutas**:
- `/caja` -- Listado de movimientos de caja con filtros, resumen de totales

**Server Actions** (`src/server/actions/cash-movement.actions.ts`, `src/server/actions/cash-balance.actions.ts`):
- `getCashMovements()` -- Lista movimientos con filtros (fecha, tipo, desarrollo, venta, busqueda)
- `getCashMovementById()` -- Detalle de un movimiento
- `getCashMovementsBySale()` -- Movimientos de una venta especifica
- `getCashMovementsSummary()` -- Totales agregados (ingresos/egresos en ambas monedas)
- `createCashMovement()` -- Crea un movimiento manual
- `getCashBalances()` -- Saldos mensuales
- `generateMonthlyBalance()` -- Genera balance mensual para un desarrollo
- `generateAllBalances()` -- Genera balances de todos los desarrollos

**Modelos**:
- `src/server/models/cash-movement.model.ts` -- Acceso a movimientos
- `src/server/models/cash-balance.model.ts` -- Snapshots mensuales

**18 tipos de movimiento** (enum `MovementType` en `prisma/schema.prisma`):

| Tipo | Descripcion |
|------|-------------|
| `CUOTA` | Pago de cuota de un cliente |
| `ENTREGA` | Pago inicial / anticipo / contado |
| `COMISION` | Comision a vendedor (generada al completar firma) |
| `SUELDO` | Sueldo de empleados y socios |
| `CAMBIO` | Conversion USD a ARS o viceversa |
| `RETIRO` | Retiro de socios |
| `GASTO_PROYECTO` | Gastos del desarrollo (agrimensor, renders, etc.) |
| `GASTO_OFICINA` | Alquiler, insumos, electricidad |
| `FIDEICOMISO` | Pagos de fideicomiso |
| `BANCO` | Movimientos bancarios, extracciones |
| `CONTABLE` | Honorarios del contador |
| `PRESTAMO` | Cuotas de prestamo |
| `IMPUESTO` | IIBB, sellos, API, certificaciones |
| `ALQUILER` | Alquileres cobrados/pagados |
| `MARKETING` | Gastos de marketing y publicidad |
| `COCHERA` | Ingresos por cocheras |
| `DESARROLLO` | Gastos generales de desarrollo |
| `VARIOS` | Otros (taxis, limpieza, kiosco, etc.) |

**Reglas de negocio**:
- Cada movimiento registra 4 montos independientes: `arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`. Un mismo movimiento puede tener valores en ambas monedas.
- Los movimientos de tipo `CUOTA` y `ENTREGA` se crean automaticamente al registrar pagos desde cobranza.
- Los movimientos de tipo `COMISION` se crean automaticamente al completar una firma de escrituracion.
- El campo `developmentId` permite imputar gastos a un desarrollo especifico.
- El campo `registeredById` registra que usuario cargo el movimiento.
- Los balances mensuales (`CashBalance`) son snapshots calculados a partir de la agregacion de movimientos.

---

### 5.7 Firmas (Signings)

**Proposito**: Agenda de turnos de escrituracion. Permite programar las citas de firma de escritura ante notario, vincularlas a ventas, y gestionar su estado. Al completar una firma, el sistema genera automaticamente el movimiento de comision del vendedor.

**Rutas**:
- `/firmas` -- Calendario semanal de turnos de firma (vista estilo agenda)

**Server Actions** (`src/server/actions/signing.actions.ts`):
- `getSignings()` -- Lista firmas con filtros (fecha, status, desarrollo, vendedor, busqueda)
- `getSigningById()` -- Detalle de un turno
- `getSigningsByWeek()` -- Firmas de una semana (para la vista de calendario)
- `createSigning()` -- Crea un turno de firma
- `updateSigning()` -- Modifica datos de un turno
- `updateSigningStatus()` -- Cambia status (PENDIENTE -> CONFIRMADA -> COMPLETADA / CANCELADA / REPROGRAMADA)
- `deleteSigning()` -- Elimina un turno
- `getUnlinkedSignings()` -- Firmas no vinculadas a una venta
- `linkSigningToSale()` -- Vincula un turno a una venta
- `unlinkSigningFromSale()` -- Desvincula un turno de una venta

**Services**:
- `src/server/services/signing.service.ts` -- Logica de completar firma con auto-generacion de comision

**Flujo al completar una firma** (funcion `completeSigningSlot`):
1. Actualizar status del turno a `COMPLETADA`
2. Si la firma esta vinculada a una venta con `commissionAmount > 0`:
   a. Verificar idempotencia (no crear comision duplicada)
   b. Crear `CashMovement` de tipo `COMISION` con el monto de comision de la venta
   c. Registrar en audit log

**Reglas de negocio**:
- Los turnos tienen estados: `PENDIENTE`, `CONFIRMADA`, `COMPLETADA`, `CANCELADA`, `REPROGRAMADA`.
- El "signing gate" (ver seccion 5.5) bloquea pagos hasta que la firma este completada. Esto aplica solo a ventas `ACTIVA` que tengan al menos un turno de firma vinculado.
- Los horarios de los turnos se configuran segun el horario laboral del sistema (ver seccion 5.9 Configuracion). La logica de horarios esta en `src/lib/business-hours.ts`.
- Los turnos se muestran en una vista de calendario semanal con slots de 30 minutos.
- El cron job envia recordatorios por email 1 dia antes de cada turno.

---

### 5.8 Mensajes y Notificaciones

**Proposito**: Sistema de comunicacion interna entre usuarios del sistema. Los mensajes son enviados entre usuarios; las notificaciones son alertas generadas automaticamente por el sistema.

**Rutas**:
- `/mensajes` -- Bandeja de mensajes recibidos y enviados

**Server Actions** (`src/server/actions/message.actions.ts`, `src/server/actions/notification.actions.ts`):
- `getMyMessages()` -- Mensajes recibidos del usuario actual
- `getSentMessages()` -- Mensajes enviados por el usuario actual
- `sendMessage()` -- Envia un mensaje a uno o mas usuarios
- `markMessageRead()` -- Marca un mensaje como leido
- `getUnreadMessageCount()` -- Cantidad de mensajes no leidos
- `getActiveUsersForMessaging()` -- Lista usuarios activos para el selector de destinatarios
- `getMyNotifications()` -- Notificaciones del usuario actual
- `getUnreadCount()` -- Cantidad de notificaciones no leidas
- `markNotificationRead()` -- Marca una notificacion como leida
- `markAllNotificationsRead()` -- Marca todas como leidas
- `resolveNotificationUrl()` -- Resuelve la URL de destino de una notificacion

**Modelos**:
- `src/server/models/message.model.ts` -- Mensajes y destinatarios
- `src/server/models/notification.model.ts` -- Notificaciones del sistema

**Tipos de notificacion** (enum `NotificationType`):
- `REFUERZO_PROXIMO` -- Refuerzo a vencer en 3 dias
- `CUOTA_VENCIDA` -- Cuota que paso su fecha de vencimiento
- `PAGO_RECIBIDO` -- Confirmacion de pago recibido
- `FIRMA_PROXIMA` -- Turno de firma en las proximas 24 horas
- `SISTEMA` -- Notificacion general del sistema (ej: mensaje nuevo)

**Reglas de negocio**:
- Todos los usuarios autenticados pueden enviar y recibir mensajes (requiere solo `requireAuth`, no un permiso especifico).
- Al enviar un mensaje, se crea automaticamente una notificacion de tipo `SISTEMA` para cada destinatario.
- El componente `NotificationBell` en `src/components/shared/notification-bell.tsx` muestra un badge con la cantidad de notificaciones no leidas en el header del dashboard.
- Las notificaciones del cron (refuerzo proximo, cuota vencida, firma proxima) se crean automaticamente en el endpoint `/api/cron/notify-upcoming`.

---

### 5.9 Configuracion (Settings)

**Proposito**: Administracion del sistema: gestion de usuarios, asignacion de roles y permisos, datos de la empresa, configuracion de horarios laborales, y configuracion de SMTP para envio de emails.

**Rutas**:
- `/configuracion` -- Panel de configuracion con multiples tabs

**Server Actions** (`src/server/actions/user.actions.ts`, `src/server/actions/role-permission.actions.ts`, `src/server/actions/system-config.actions.ts`, `src/server/actions/business-hours.actions.ts`):
- `getUsers()` -- Lista usuarios con filtros
- `getUserById()` -- Detalle de un usuario
- `createUser()` -- Crea un usuario con contrasena hasheada (bcrypt)
- `updateUser()` -- Modifica datos de un usuario
- `changeUserPassword()` -- Cambia la contrasena de un usuario
- `toggleUserActive()` -- Activa/desactiva un usuario
- `getEmployees()` -- Lista de vendedores/empleados
- `getActiveSellers()` -- Vendedores activos para selector en ventas
- `toggleUserSeller()` -- Marca/desmarca un usuario como vendedor
- `updateUserCommission()` -- Actualiza la tasa de comision de un vendedor
- `getAllRolePermissions()` -- Permisos actuales por rol (desde DB)
- `updateRolePermissions()` -- Modifica permisos de un rol
- `seedDefaultPermissions()` -- Inicializa permisos por defecto en la DB
- `getSystemConfig()` -- Obtiene toda la configuracion del sistema
- `updateSystemConfig()` -- Actualiza configuracion (empresa, recibos, SMTP)
- `getBusinessHours()` -- Obtiene horarios laborales
- `updateBusinessHours()` -- Actualiza horarios laborales

**Modelos**:
- `src/server/models/user.model.ts` -- Usuarios y vendedores
- `src/server/models/role-permission.model.ts` -- Permisos por rol en DB
- `src/server/models/system-config.model.ts` -- Pares clave-valor de configuracion

**Reglas de negocio**:
- Los permisos de `SUPER_ADMIN` no se pueden modificar (siempre tiene acceso total via wildcard `"*"`).
- Las contrasenas se hashean con bcrypt antes de almacenarse.
- El email de usuario es unico.
- Los horarios laborales se almacenan como JSON en `SystemConfig` con clave `business_hours`. Incluyen hora de apertura, cierre, pausas, y dias habiles.
- La configuracion del sistema incluye: nombre de empresa, CUIT, direccion, telefono, email, cabecera/pie de recibo, fuente de cotizacion predeterminada, y credenciales SMTP.

---

### 5.10 Auditoria (Audit Log)

**Proposito**: Registro de trazabilidad de todas las operaciones criticas del sistema. Permite saber quien hizo que, cuando, y con que datos.

**Rutas**:
- `/auditoria` -- Visor de logs de auditoria con filtros

**Server Actions** (`src/server/actions/audit-log.actions.ts`):
- `logAction()` -- Registra una accion en el audit log
- `logActionFromSession()` -- Variante que obtiene el userId de la sesion automaticamente
- `getAuditLogs()` -- Lista logs con filtros (busqueda, entidad, usuario, rango de fechas)

**Modelos**:
- `src/server/models/audit-log.model.ts` -- Acceso a registros de auditoria

**Estructura de un registro de auditoria** (modelo `AuditLog`):
- `userId` -- Quien realizo la accion
- `action` -- Tipo: `CREATE`, `UPDATE`, `DELETE`, `BULK_UPDATE`
- `entity` -- Entidad afectada: `Sale`, `CashMovement`, `Lot`, `Person`, etc.
- `entityId` -- ID de la entidad afectada
- `oldData` -- Datos anteriores (JSON, para UPDATEs)
- `newData` -- Datos nuevos (JSON)
- `ipAddress` -- IP del usuario (opcional)
- `createdAt` -- Timestamp

**Reglas de negocio**:
- Solo los usuarios con permiso `config:manage` pueden ver el log de auditoria.
- El logging se realiza despues de las transacciones principales. Si el log falla, la operacion no se revierte (patron "best-effort").
- Entidades auditadas: Sale, CashMovement, Lot, Person, User, SigningSlot, ExtraCharge, ExchangeRate, Tag.

---

### 5.11 Cotizacion (Exchange Rate)

**Proposito**: Gestion de las cotizaciones del dolar. El sistema obtiene automaticamente las cotizaciones del dia desde `dolarapi.com` y las almacena en la base de datos. Tambien permite cargar cotizaciones manuales.

**Server Actions** (`src/server/actions/exchange-rate.actions.ts`):
- `getTodayExchangeRate()` -- Obtiene la cotizacion del dia. Si no existe en la DB, la busca en la API automaticamente.
- `getExchangeRates()` -- Historial de cotizaciones en un rango de fechas
- `getLatestExchangeRate()` -- Ultima cotizacion disponible
- `createManualExchangeRate()` -- Carga manual de cotizacion para una fecha

**Modelos**:
- `src/server/models/exchange-rate.model.ts` -- Acceso a cotizaciones
- `src/lib/exchange-rate.ts` -- Funcion `fetchDolarApiRates()` que consulta la API y funcion `convertCurrency()` para convertir entre monedas

**Datos almacenados por dia** (modelo `ExchangeRate`):
- Dolar oficial: compra (`officialBuy`) y venta (`officialSell`)
- Dolar blue: compra (`blueBuy`) y venta (`blueSell`)
- Dolar cripto: compra (`cryptoBuy`) y venta (`cryptoSell`)
- Fuente (`source`): `"dolarapi"` o `"manual"`

**Reglas de negocio**:
- Una sola cotizacion por dia (campo `date` unico en `ExchangeRate`).
- Al registrar un movimiento de caja, se puede asociar la cotizacion del dia via `exchangeRateId`.
- El campo `manualRate` en `CashMovement` permite registrar una cotizacion pactada diferente a la del dia.
- La configuracion `default_exchange_source` en `SystemConfig` determina que tipo de cambio se usa por defecto (ej: `blue_sell`).

---

### 5.12 Importacion (Import)

**Proposito**: Importacion masiva de datos desde archivos CSV, Excel o JSON. Permite cargar personas y ventas desde planillas externas (tipicamente las planillas de Excel que el sistema viene a reemplazar).

**Server Actions** (`src/server/actions/import.actions.ts`):
- `importPersons()` -- Importa personas desde datos en formato JSON, CSV o Excel
- `importSales()` -- Importa ventas con cuotas

**Services**:
- `src/server/services/import.service.ts` -- Logica de parseo multi-formato (papaparse para CSV, xlsx para Excel) y creacion de registros con validacion

**Reglas de negocio**:
- Solo usuarios con permiso `config:manage` pueden realizar importaciones.
- Los formatos soportados son: JSON, CSV y Excel (.xlsx).
- La importacion valida cada registro antes de insertarlo y devuelve un resultado con la cantidad de exitos y errores.

---

### 5.13 Recibos (Payment Receipts)

**Proposito**: Generacion automatica de recibos de pago no-legales. Cada vez que se registra un pago de cuota o refuerzo, el sistema genera un recibo con un numero correlativo, y opcionalmente lo envia por email al cliente.

**Server Actions** (`src/server/actions/payment-receipt.actions.ts`):
- `getPaymentReceipts()` -- Lista recibos con filtros (venta, persona, rango de fechas)
- `getPaymentReceiptById()` -- Detalle de un recibo
- `generateReceipt()` -- Genera un recibo manualmente para un movimiento de caja

**Services**:
- `src/server/services/receipt.service.ts` -- Logica de generacion: construye el texto del recibo, asigna numero, y envia email con template HTML

**Modelos**:
- `src/server/models/payment-receipt.model.ts` -- Acceso a recibos, generacion de numero correlativo

**Contenido del recibo** (formato texto, campo `content`):
```
Recibi de [nombre] (DNI: [dni]),
la suma de USD [monto]
en concepto de Cuota [N] - Lote [numero],
correspondiente al Lote [numero] del desarrollo [nombre].
Fecha: [fecha].
```

**Reglas de negocio**:
- Los recibos se generan automaticamente al completar un pago (fuera de la transaccion del pago, para no bloquearlo si falla).
- Cada recibo tiene un numero unico correlativo.
- Un movimiento de caja solo puede tener un recibo (relacion 1:1, campo `cashMovementId` unico).
- Si el cliente tiene email registrado, el recibo se envia automaticamente. El template HTML esta en `src/lib/email-templates.ts`, funcion `receiptEmailHtml()`.
- El membrete del recibo (cabecera y pie) es configurable desde `SystemConfig`.

---

### 5.14 Tags (Etiquetas)

**Proposito**: Sistema de etiquetado personalizable para lotes. Permite crear etiquetas con nombre y color, y asignarlas a lotes individual o masivamente. Util para clasificar lotes (ej: "esquina", "lote comercial", "paga a fin de mes").

**Server Actions** (`src/server/actions/tag.actions.ts`):
- `getTags()` -- Lista todas las etiquetas
- `createTag()` -- Crea una etiqueta con label y color
- `updateTag()` -- Modifica una etiqueta
- `deleteTag()` -- Elimina una etiqueta
- `getTagsForLot()` -- Etiquetas de un lote especifico
- `setLotTags()` -- Asigna etiquetas a un lote
- `bulkSetLotTags()` -- Asigna etiquetas a multiples lotes (maximo 200)

**Modelos**:
- `src/server/models/tag.model.ts` -- CRUD de etiquetas y relaciones lote-etiqueta

**Reglas de negocio**:
- Las etiquetas tienen un `name` (slug interno, ej: `"lote-comercial"`) y un `label` (display, ej: `"Lote Comercial"`). El name se genera automaticamente desde el label.
- El `name` es unico para evitar duplicados.
- Las etiquetas pueden tener un color en formato hexadecimal.
- La relacion lote-etiqueta es muchos-a-muchos via la tabla intermedia `LotTag`.
- Requiere permiso `lots:view` para ver y `lots:manage` para gestionar.

---

## 6. Interconexion de Modulos

### Ciclo de vida de los datos

Los datos del sistema siguen un flujo direccional claro, desde la definicion del inventario hasta la generacion de comprobantes:

**Development** -> **Lot** -> **Sale** -> **Installment** / **ExtraCharge** -> **CashMovement** -> **PaymentReceipt**

1. Se crea un **Development** (desarrollo inmobiliario).
2. Dentro del desarrollo se definen los **Lots** (lotes), cada uno con su numero, manzana, area y precio de lista.
3. Cuando un cliente compra un lote, se crea una **Sale** (venta) que vincula al `Person` (cliente) con el `Lot`. La venta genera automaticamente las **Installments** (cuotas) y puede incluir **ExtraCharges** (refuerzos).
4. Cuando el equipo de cobranza registra un pago, se crea un **CashMovement** (movimiento de caja) vinculado a la cuota o refuerzo pagado. El lote se actualiza segun el pago.
5. Automaticamente se genera un **PaymentReceipt** (recibo) vinculado al movimiento de caja y se envia por email al cliente.
6. Cuando se completa la escrituracion (**SigningSlot**), se genera un movimiento de caja de tipo `COMISION` para el vendedor.

### Flujos transversales

Ademas del flujo principal, existen flujos transversales que cruzan multiples modulos:

- **Cotizacion**: `ExchangeRate` se consulta al registrar cualquier pago. El tipo de cambio del dia queda vinculado al `CashMovement` via `exchangeRateId`.
- **Auditoria**: Cada operacion de escritura (CREATE, UPDATE, DELETE) registra una entrada en `AuditLog`, independientemente del modulo de origen.
- **Notificaciones**: El cron job genera notificaciones que aparecen en el `NotificationBell` del header. Las notificaciones referencian entidades de diferentes modulos (Sale, Installment, ExtraCharge, SigningSlot).
- **Mensajeria**: Los mensajes entre usuarios generan notificaciones de tipo `SISTEMA`.

### Tabla de dependencias entre modulos

| Modulo | Depende de | Es requerido por | Flujo de datos clave |
|--------|-----------|-------------------|---------------------|
| Desarrollos | -- | Lotes, Caja, Firmas | Development es contenedor de Lots |
| Lotes | Desarrollos | Ventas | Lot necesita developmentId |
| Personas | -- | Ventas, Caja | Person es comprador en Sale |
| Ventas | Lotes, Personas, Cotizacion | Cobranza, Firmas, Recibos | Sale vincula Person con Lot |
| Cobranza | Ventas, Cotizacion | Caja, Recibos | Pago genera CashMovement |
| Caja | Desarrollos, Ventas, Personas, Cotizacion | Recibos | CashMovement es registro central |
| Firmas | Desarrollos, Ventas | Caja (comisiones) | SigningSlot completada genera COMISION |
| Cotizacion | -- | Cobranza, Caja | ExchangeRate diario para pagos |
| Recibos | Caja, Ventas, Personas | -- | PaymentReceipt se genera desde CashMovement |
| Notificaciones | Ventas, Cobranza, Firmas | -- | Alertas automaticas de vencimientos |
| Mensajes | Usuarios | Notificaciones | Mensaje genera notificacion SISTEMA |
| Auditoria | Todos los modulos | -- | AuditLog registra todo cambio |
| Tags | Lotes | -- | Etiquetas asignadas a lotes |
| Importacion | Personas, Ventas | -- | Carga masiva de datos |
| Configuracion | -- | Recibos (membrete), Firmas (horarios) | SystemConfig almacena parametros |

---

## 7. Modelo de Roles y Permisos

### Sistema RBAC

El sistema implementa RBAC (Role-Based Access Control) con 4 roles fijos y 16 permisos granulares. Los permisos se almacenan en la base de datos (tabla `RolePermission`) y tienen fallback a valores hardcodeados definidos en `src/lib/rbac.ts`.

Cada permiso sigue el formato `recurso:accion`:
- `:view` -- Permite ver datos del recurso
- `:manage` -- Permite crear, editar y eliminar datos del recurso

El permiso especial `"*"` (wildcard) otorga acceso a todo. Solo `SUPER_ADMIN` lo tiene.

### Descripcion de roles

**SUPER_ADMIN** -- Dueno o socio principal de la empresa. Tiene acceso total a todas las funciones del sistema sin excepcion. Sus permisos no pueden modificarse desde la interfaz. Puede ver el audit log, modificar permisos de otros roles, importar datos, y configurar el sistema.

**ADMINISTRACION** -- Personal de oficina que gestiona las operaciones diarias. Puede crear y administrar desarrollos, lotes, personas, ventas y firmas. Puede ver la lista de usuarios (pero no gestionar caja, lo cual esta reservado a Finanzas). No tiene acceso al audit log ni a la configuracion del sistema.

**FINANZAS** -- Equipo financiero encargado de la tesoreria. Puede gestionar la caja (crear movimientos, ver saldos), registrar pagos, y consultar cotizaciones. Puede ver desarrollos, ventas y personas (solo lectura, no gestion). No puede crear ventas ni manejar firmas.

**COBRANZA** -- Equipo de cobranza con acceso restringido a lectura. Puede ver desarrollos, personas, ventas y la caja (para verificar pagos). No puede crear ni modificar ningun registro. Su funcion principal es consultar cuotas pendientes y verificar estados de pago.

### Permisos por defecto

Los permisos por defecto estan definidos en `src/lib/rbac.ts`, constante `DEFAULT_ROLE_PERMISSIONS`:

```typescript
SUPER_ADMIN: ["*"]                    // Acceso total
ADMINISTRACION: [
  "dashboard:view", "developments:view", "developments:manage",
  "lots:view", "lots:manage", "persons:view", "persons:manage",
  "sales:view", "sales:manage", "signings:view", "signings:manage",
  "users:view"
]
FINANZAS: [
  "dashboard:view", "developments:view", "sales:view",
  "cash:view", "cash:manage", "persons:view"
]
COBRANZA: [
  "dashboard:view", "developments:view", "persons:view",
  "sales:view", "cash:view"
]
```

### Permisos personalizables via DB

Los permisos pueden modificarse desde la interfaz (Configuracion > Permisos de rol). La funcion `checkPermissionDb` en `src/lib/rbac.ts` primero consulta la tabla `RolePermission` en la DB. Si no encuentra registros para el rol, usa los valores hardcodeados como fallback. Esto permite personalizar permisos sin tocar codigo, pero garantiza un funcionamiento correcto "out of the box".

---

## 8. Matriz de Acceso Completa

### Permisos por rol

| Permiso | SUPER_ADMIN | ADMINISTRACION | FINANZAS | COBRANZA |
|---------|:-----------:|:--------------:|:--------:|:--------:|
| `dashboard:view` | Si | Si | Si | Si |
| `developments:view` | Si | Si | Si | Si |
| `developments:manage` | Si | Si | No | No |
| `lots:view` | Si | Si | No | No |
| `lots:manage` | Si | Si | No | No |
| `persons:view` | Si | Si | Si | Si |
| `persons:manage` | Si | Si | No | No |
| `sales:view` | Si | Si | Si | Si |
| `sales:manage` | Si | Si | No | No |
| `cash:view` | Si | No | Si | Si |
| `cash:manage` | Si | No | Si | No |
| `signings:view` | Si | Si | No | No |
| `signings:manage` | Si | Si | No | No |
| `users:view` | Si | Si | No | No |
| `users:manage` | Si | No | No | No |
| `config:manage` | Si | No | No | No |

### Detalle de que gate-a cada permiso

**`dashboard:view`**
- Server actions: `getCashMovementsSummary()`, `getCashBalances()`
- Paginas: `/dashboard`, `/estadisticas`
- Navegacion: Items "Dashboard" y "Estadisticas" en `src/lib/navigation.ts`

**`developments:view`**
- Server actions: `getDevelopments()`, `getDevelopmentBySlug()`, `getDevelopmentOptions()`
- Paginas: `/desarrollos`, `/desarrollos/[slug]`
- Navegacion: Item "Desarrollos" en `src/lib/navigation.ts`

**`developments:manage`**
- Server actions: `createDevelopment()`, `updateDevelopment()`, `deleteDevelopment()`
- UI: Botones de crear, editar y eliminar desarrollo en las paginas de desarrollos

**`lots:view`**
- Server actions: `getLotsByDevelopment()`, `getTags()`, `getTagsForLot()`
- UI: Grilla de lotes en la pagina de detalle de desarrollo

**`lots:manage`**
- Server actions: `createLot()`, `updateLot()`, `deleteLot()`, `bulkUpdateLotStatus()`, `createTag()`, `updateTag()`, `deleteTag()`, `setLotTags()`, `bulkSetLotTags()`
- UI: Botones de crear, editar, eliminar lotes y gestionar etiquetas

**`persons:view`**
- Server actions: `getPersons()`, `getPersonById()`, `searchPersonsForCollection()`
- Paginas: `/personas`, `/personas/[id]`
- Navegacion: Item "Personas" en `src/lib/navigation.ts`

**`persons:manage`**
- Server actions: `createPerson()`, `createPersonQuick()`, `updatePerson()`, `togglePersonActive()`
- UI: Botones de crear, editar persona, toggle activo/inactivo

**`sales:view`**
- Server actions: `getSales()`, `getSaleById()`, `getSaleForPrint()`, `getExtraChargesBySale()`, `getPaymentReceipts()`, `getCashMovementsBySale()`
- Paginas: `/ventas`, `/ventas/[id]`
- Navegacion: Item "Ventas" en `src/lib/navigation.ts`

**`sales:manage`**
- Server actions: `createSale()`, `cancelSale()`, `createExtraCharge()`, `updateExtraCharge()`, `deleteExtraCharge()`, `getActiveSellers()`
- Paginas: `/ventas/nuevo`
- UI: Botones de crear venta, cancelar venta, gestionar refuerzos

**`cash:view`**
- Server actions: `getCashMovements()`, `getCashMovementById()`, `getCashMovementsSummary()`, `getTodayExchangeRate()`, `getExchangeRates()`, `getLatestExchangeRate()`, `getCashBalances()`
- Paginas: `/caja`, `/cobranza`
- Navegacion: Items "Cobranza" y "Caja" en `src/lib/navigation.ts`

**`cash:manage`**
- Server actions: `createCashMovement()`, `payInstallment()`, `payExtraCharge()`, `recordDeliveryPayment()`, `generateReceipt()`, `createManualExchangeRate()`, `generateMonthlyBalance()`, `generateAllBalances()`
- UI: Formularios de pago, crear movimiento de caja, generar recibo

**`signings:view`**
- Server actions: `getSignings()`, `getSigningById()`, `getSigningsByWeek()`, `getUnlinkedSignings()`
- Paginas: `/firmas`
- Navegacion: Item "Firmas" en `src/lib/navigation.ts`

**`signings:manage`**
- Server actions: `createSigning()`, `updateSigning()`, `updateSigningStatus()`, `deleteSigning()`, `linkSigningToSale()`, `unlinkSigningFromSale()`
- UI: Formularios de crear/editar turno, botones de cambio de estado

**`users:view`**
- Server actions: `getUsers()`, `getUserById()`, `getEmployees()`
- Paginas: `/configuracion` (tab de usuarios)
- Navegacion: Item "Configuracion" en `src/lib/navigation.ts` (requiere `users:view`)

**`users:manage`**
- Server actions: `createUser()`, `updateUser()`, `changeUserPassword()`, `toggleUserActive()`, `toggleUserSeller()`, `updateUserCommission()`
- UI: Formularios de crear/editar usuario, cambiar contrasena, toggle activo, gestionar vendedores

**`config:manage`**
- Server actions: `getSystemConfig()`, `updateSystemConfig()`, `updateBusinessHours()`, `getAuditLogs()`, `getAllRolePermissions()`, `updateRolePermissions()`, `seedDefaultPermissions()`, `importPersons()`, `importSales()`, `createNotification()`
- Paginas: `/auditoria`, `/configuracion` (tabs de config, permisos, importacion)
- Navegacion: Item "Auditoria" en `src/lib/navigation.ts` (requiere `config:manage`)

---

## 9. Flujo de Autenticacion

### Configuracion de Auth.js v5

El sistema usa Auth.js (NextAuth v5) con provider de credenciales (email + contrasena). La configuracion se divide en dos archivos:

**`src/lib/auth.config.ts`** -- Configuracion base (compartida con middleware):
- **Pagina de login**: `/login`
- **Estrategia de sesion**: JWT (sin almacenamiento de sesion en DB)
- **Callback `authorized`**: Redirige a `/dashboard` si el usuario ya esta logueado e intenta acceder a `/login`. Rechaza acceso a cualquier otra ruta si no hay sesion.
- **Callback `jwt`**: Almacena `id` y `role` del usuario en el token JWT.
- **Callback `session`**: Expone `id` y `role` en el objeto de sesion para uso en server components y actions.

**`src/lib/auth.ts`** -- Configuracion con provider Credentials:
- Valida email y password contra la DB usando `userModel.findByEmail()`
- Verifica que el usuario este activo (`isActive`)
- Compara la contrasena con bcrypt (`bcrypt.compare`)
- Devuelve `{ id, email, name, role }` si las credenciales son validas

### Proteccion de rutas (Middleware)

El archivo `src/middleware.ts` exporta el middleware de Auth.js que protege todas las rutas excepto:
- `_next/static` -- Assets estaticos de Next.js
- `_next/image` -- Optimizacion de imagenes
- `favicon.ico` -- Favicon
- `api/auth` -- Endpoints de autenticacion de Auth.js
- `api/health` -- Health check
- `api/cron` -- Endpoint del cron job (protegido por CRON_SECRET, no por sesion)

Todas las demas rutas requieren una sesion valida. Si el usuario no esta autenticado, el middleware lo redirige a `/login`.

### Guards de permisos (Server-side)

El archivo `src/lib/auth-guard.ts` exporta dos funciones usadas en todos los server actions:

**`requireAuth()`**: Verifica que existe una sesion valida. Si no hay sesion, redirige a `/login`. Retorna el objeto `session` para uso posterior.

**`requirePermission(permission)`**: Extiende `requireAuth()` con verificacion de permisos. Usa `checkPermissionDb()` de `src/lib/rbac.ts` que:
1. Si el rol es `SUPER_ADMIN`, retorna `true` inmediatamente
2. Consulta la tabla `RolePermission` en la DB para el rol del usuario
3. Si no hay registros en la DB, cae al fallback de `DEFAULT_ROLE_PERMISSIONS`
4. Si el rol no tiene el permiso, lanza un `Error("Permiso denegado: se requiere {permiso}")`

### Gating en la UI (Client-side)

**Sidebar** (`src/components/shared/sidebar.tsx`): Filtra los items de navegacion segun los permisos del usuario. Solo muestra los links para los cuales el usuario tiene el permiso definido en `src/lib/navigation.ts` (campo `permission` de cada `NavItem`).

**Botones y acciones**: Los componentes de pagina condicionan la visibilidad de botones de crear, editar y eliminar segun el rol del usuario o sus permisos.

### Flujo completo de autenticacion

1. El usuario accede a cualquier ruta (ej: `/ventas`)
2. El middleware de Auth.js intercepta el request
3. Verifica si existe un JWT valido en las cookies de sesion
4. Si no hay JWT, redirige a `/login`
5. En `/login`, el usuario ingresa email y contrasena
6. La accion `loginAction()` en `src/server/actions/auth.actions.ts` valida las credenciales con `signIn("credentials", ...)`
7. Auth.js busca al usuario en la DB, verifica que este activo, compara la contrasena
8. Si es valido, genera un JWT con `{ id, role }` y lo almacena en una cookie
9. Redirige a `/dashboard`
10. En cada request posterior, el middleware valida el JWT
11. En cada server action, `requirePermission()` verifica que el rol del usuario tenga el permiso necesario
12. En la UI, el sidebar filtra los items visibles segun permisos

### Flujo de override de permisos via DB

El sistema permite personalizar permisos sin reiniciar la aplicacion:

1. Un SUPER_ADMIN accede a Configuracion > Permisos
2. La accion `getAllRolePermissions()` consulta la tabla `RolePermission`
3. El admin modifica los permisos de un rol (ej: dar `cash:view` a ADMINISTRACION)
4. La accion `updateRolePermissions()` actualiza la tabla `RolePermission`
5. En el proximo request de un usuario de ese rol, `checkPermissionDb()` leer los nuevos permisos de la DB
6. Si la tabla se vacia o corrompe, el sistema vuelve a los `DEFAULT_ROLE_PERMISSIONS` como fallback

---

*Documento generado como parte de la Auditoria Tecnica Completa (v1.3). Ultima actualizacion: 2026-03-16.*
