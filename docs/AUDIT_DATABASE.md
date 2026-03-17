# Auditoria de Base de Datos -- Sistema Inmobiliaria

**Fecha:** 2026-03-17
**Version:** 1.0
**Fuente primaria:** `prisma/schema.prisma` (v0.7, 721 lineas)
**Proposito:** Documentar exhaustivamente la arquitectura de la base de datos del Sistema Inmobiliaria -- cada modelo, cada campo, cada relacion, cada indice, cada enum, cada regla de negocio codificada en el schema. Este documento permite a cualquier desarrollador comprender el modelo de datos completo sin necesidad de leer el schema de Prisma directamente.

**Base de datos:** PostgreSQL
**ORM:** Prisma ORM con generador `prisma-client`
**Output del cliente:** `src/generated/prisma/client`

---

## 1. Resumen del Schema

### Estadisticas Generales

| Metrica | Valor |
|---------|-------|
| Total de modelos | 21 |
| Total de enums | 12 |
| Total de indices (`@@index`) | 22 |
| Total de constraints unicos (`@@unique`, `@unique`) | 12 |
| Total de mapeos de tabla (`@@map`) | 21 |
| Campos financieros (`@db.Decimal`) | 24 |
| Campos de texto largo (`@db.Text`) | 7 |

### Agrupaciones de Dominio

El schema se organiza en 7 dominios funcionales:

| Dominio | Modelos | Descripcion |
|---------|---------|-------------|
| **Auth y Usuarios** | User, RolePermission | Usuarios del sistema con roles RBAC y permisos configurables por base de datos |
| **Desarrollos** | Development, Lot, Tag, LotTag | Desarrollos inmobiliarios, sus lotes, y sistema de etiquetas |
| **Ventas** | Person, Sale, Installment, ExtraCharge | Clientes/proveedores, ventas con planes de cuotas, y cargos extraordinarios |
| **Pagos y Caja** | CashMovement, CashBalance, PaymentReceipt, ExchangeRate | Movimientos de caja unificados, saldos mensuales, recibos, y cotizaciones |
| **Firmas** | SigningSlot | Agenda de turnos de escrituracion |
| **Comunicaciones** | Message, MessageRecipient, Notification | Mensajeria interna y notificaciones del sistema |
| **Sistema** | AuditLog, SystemConfig | Trazabilidad de operaciones y configuracion clave-valor |

---

## 2. Referencia de Enums

### 2.1 Role

Define los roles de acceso del sistema RBAC. Implementado en middleware de aplicacion, no en la base de datos.

| Valor | Significado |
|-------|-------------|
| `SUPER_ADMIN` | Acceso total al sistema. Puede ver quien cargo cada operacion. |
| `ADMINISTRACION` | Acceso a todo excepto caja. |
| `FINANZAS` | Ve cuotas, montos, estados de pago. |
| `COBRANZA` | Ve nombre, email, telefono, fecha de cobro. |

**Usado en:** `User.role`, `RolePermission.role`

### 2.2 DevelopmentStatus

Estado del ciclo de vida de un desarrollo inmobiliario.

| Valor | Significado |
|-------|-------------|
| `PLANIFICACION` | Desarrollo en fase de planificacion, aun no iniciado. |
| `EN_CURSO` | Desarrollo activo, con lotes en venta. |
| `FINALIZADO` | Desarrollo completado, todos los lotes vendidos/escriturados. |
| `PAUSADO` | Desarrollo temporalmente detenido. |

**Usado en:** `Development.status`

### 2.3 DevelopmentType

Tipo de desarrollo o item gestionado.

| Valor | Significado |
|-------|-------------|
| `INMOBILIARIO` | Desarrollos inmobiliarios tradicionales: Raices de Alvear, Potus de Avellaneda, Fiderza (sin lotes, solo centro de costos). |
| `OTROS` | Items varios: casas en venta, vehiculos, animales, etc. |

**Usado en:** `Development.type`

### 2.4 LotStatus

Estado de un lote dentro de un desarrollo.

| Valor | Significado |
|-------|-------------|
| `DISPONIBLE` | Lote sin venta asociada, disponible para la venta. |
| `RESERVADO` | Lote reservado temporalmente para un cliente. |
| `VENDIDO` | Lote con venta activa asociada (plan de cuotas en curso). |
| `CONTADO` | Lote pagado al contado en una unica transaccion. |
| `ESCRITURADO` | Lote con escritura firmada y completada. |
| `CESION` | Lote transferido/cedido a un tercero. |
| `PERMUTA` | Lote entregado a un proveedor como pago en especie. |

**Usado en:** `Lot.status`

### 2.5 PersonType

Tipo de persona (cliente, proveedor, o ambos).

| Valor | Significado |
|-------|-------------|
| `CLIENTE` | Comprador de lotes. |
| `PROVEEDOR` | Proveedor de servicios (puede recibir lotes como pago). |
| `AMBOS` | Persona que actua como cliente y proveedor simultaneamente. |

**Usado en:** `Person.type`

### 2.6 SaleStatus

Estado del ciclo de vida de una venta.

| Valor | Significado |
|-------|-------------|
| `ACTIVA` | Venta en curso con plan de cuotas activo. |
| `CANCELADA` | Venta cancelada. |
| `COMPLETADA` | Todas las cuotas pagadas, venta finalizada. |
| `CONTADO` | Pagado al contado, sin plan de cuotas (totalInstallments = 0). |
| `CESION` | Venta cedida/transferida. Tambien usado para permutas a proveedores (totalPrice = 0). |

**Usado en:** `Sale.status`

### 2.7 Currency

Moneda utilizada en transacciones financieras.

| Valor | Significado |
|-------|-------------|
| `USD` | Dolares estadounidenses. Moneda principal de denominacion de ventas. |
| `ARS` | Pesos argentinos. Moneda de pago local. |

**Usado en:** `Sale.currency`, `Installment.currency`, `Installment.paidInCurrency`, `ExtraCharge.currency`

### 2.8 InstallmentStatus

Estado de una cuota ordinaria.

| Valor | Significado |
|-------|-------------|
| `PENDIENTE` | Cuota aun no pagada y dentro de plazo. |
| `PAGADA` | Cuota completamente pagada. |
| `VENCIDA` | Cuota cuya fecha de vencimiento ha pasado sin pago completo. |
| `PARCIAL` | Cuota con pago parcial registrado. |

**Usado en:** `Installment.status`

### 2.9 ExtraChargeStatus

Estado de una cuota de refuerzo o cargo extraordinario.

| Valor | Significado |
|-------|-------------|
| `PENDIENTE` | Cargo aun no pagado. |
| `PAGADA` | Cargo completamente pagado. |
| `VENCIDA` | Cargo vencido sin pago. |
| `PARCIAL` | Cargo con pago parcial. |

**Usado en:** `ExtraCharge.status`

### 2.10 MovementType

Tipo de movimiento de caja. El sistema unifica 18 categorias distintas de movimientos financieros.

| Valor | Significado |
|-------|-------------|
| `CUOTA` | Pago de cuota de un plan de financiacion. |
| `ENTREGA` | Pago inicial, entrega de lote, o pago al contado. |
| `COMISION` | Comision pagada a un vendedor. |
| `SUELDO` | Sueldo de empleados y socios. |
| `CAMBIO` | Conversion de moneda USD a ARS o viceversa. |
| `RETIRO` | Retiro de fondos por parte de socios. |
| `GASTO_PROYECTO` | Gastos del desarrollo: corta pasto, renders, agrimensor. |
| `GASTO_OFICINA` | Gastos de oficina: alquiler, insumos, electricista. |
| `FIDEICOMISO` | Pagos de fideicomiso. |
| `BANCO` | Movimientos bancarios, extracciones. |
| `CONTABLE` | Honorarios de contador, estudio contable. |
| `PRESTAMO` | Cuotas de prestamo. |
| `IMPUESTO` | IIBB, sellos, API, certificaciones. |
| `ALQUILER` | Alquileres cobrados o pagados. |
| `MARKETING` | Gastos de marketing y publicidad. |
| `COCHERA` | Ingresos por alquiler/venta de cocheras. |
| `DESARROLLO` | Gastos generales de desarrollo inmobiliario. |
| `VARIOS` | Otros: taxis, limpieza, kiosco, etc. |

**Usado en:** `CashMovement.type`

### 2.11 SigningStatus

Estado de un turno de firma/escrituracion.

| Valor | Significado |
|-------|-------------|
| `PENDIENTE` | Turno programado, aun no confirmado. |
| `CONFIRMADA` | Turno confirmado por las partes. |
| `COMPLETADA` | Firma realizada exitosamente. |
| `CANCELADA` | Turno cancelado. |
| `REPROGRAMADA` | Turno reprogramado a otra fecha. |

**Usado en:** `SigningSlot.status`

### 2.12 NotificationType

Tipo de notificacion del sistema.

| Valor | Significado |
|-------|-------------|
| `REFUERZO_PROXIMO` | Alerta 3 dias antes del vencimiento de un refuerzo. |
| `CUOTA_VENCIDA` | Notificacion de cuota vencida sin pago. |
| `PAGO_RECIBIDO` | Confirmacion de pago recibido. |
| `FIRMA_PROXIMA` | Alerta 1 dia antes de un turno de firma. |
| `SISTEMA` | Notificaciones generales del sistema. |

**Usado en:** `Notification.type`

---

## 3. Modelos por Dominio

### Auth y Usuarios

---

### 3.1 User

**Proposito:** Representa a los usuarios del sistema con autenticacion y autorizacion basada en roles (RBAC). Ademas de los datos de usuario tradicionales, este modelo integra la funcionalidad de vendedor (`isSeller`, `commissionRate`) que anteriormente era un modelo separado. Un usuario puede ser simultaneamente operador del sistema y vendedor comercial.

**Tabla: `users`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| email | String | No | - | Email del usuario. Unico en todo el sistema. Usado para login. |
| password | String | No | - | Contrasena hasheada del usuario. |
| name | String | No | - | Nombre del usuario. |
| lastName | String | No | - | Apellido del usuario. Mapeado a `last_name` en la DB. |
| role | Role | No | `COBRANZA` | Rol RBAC del usuario. Los nuevos usuarios se crean con el rol mas restrictivo. |
| isActive | Boolean | No | `true` | Indica si el usuario esta activo. Usuarios desactivados no pueden ingresar. Mapeado a `is_active`. |
| phone | String | Si | - | Telefono de contacto opcional. |
| createdAt | DateTime | No | `now()` | Fecha de creacion del registro. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion, gestionada automaticamente por Prisma. Mapeado a `updated_at`. |
| isSeller | Boolean | No | `false` | Indica si el usuario actua como vendedor comercial. Mapeado a `is_seller`. |
| commissionRate | Decimal(5,2) | Si | - | Porcentaje de comision del vendedor (ej: 3.50 = 3.5%). Mapeado a `commission_rate`. Solo aplica cuando `isSeller = true`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| User -> Message | 1:N | - (via senderId) | - | Default | Default |
| User -> MessageRecipient | 1:N | - (via userId) | - | Default | Default |
| User -> CashMovement (RegisteredBy) | 1:N | - (via registeredById) | - | Default | Default |
| User -> PaymentReceipt (GeneratedBy) | 1:N | - (via generatedById) | - | Default | Default |
| User -> AuditLog | 1:N | - (via userId) | - | Default | Default |
| User -> Sale (SaleCreatedBy) | 1:N | - (via createdById) | - | Default | Default |
| User -> ExtraCharge (ChargeCreatedBy) | 1:N | - (via createdById) | - | Default | Default |
| User -> Person (PersonCreatedBy) | 1:N | - (via createdById) | - | Default | Default |
| User -> SigningSlot (SigningCreatedBy) | 1:N | - (via createdById) | - | Default | Default |
| User -> Sale (SaleSeller) | 1:N | - (via sellerId) | - | Default | Default |
| User -> SigningSlot (SigningSeller) | 1:N | - (via sellerId) | - | Default | Default |
| User -> Notification | 1:N | - (via userId) | - | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | email | Garantiza unicidad de email para autenticacion. |
| `@@map` | `users` | Mapea el nombre del modelo a la tabla `users` en PostgreSQL. |

**Reglas de negocio en el schema:**
- `role @default(COBRANZA)`: Los nuevos usuarios se crean con el rol mas restrictivo por defecto.
- `isActive @default(true)`: Los usuarios se crean activos por defecto.
- `isSeller @default(false)`: Los usuarios no son vendedores por defecto; se habilita manualmente.
- El campo `commissionRate` solo tiene sentido cuando `isSeller = true`.

---

### 3.2 RolePermission

**Proposito:** Almacena permisos adicionales por rol a nivel de base de datos. Permite sobreescribir o extender los permisos RBAC base que estan codificados en la aplicacion. Cada registro asocia un rol con una cadena de permiso (ej: `"cash:view"`, `"config:manage"`).

**Tabla: `role_permissions`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| role | Role | No | - | Rol al que se asigna el permiso. |
| permission | String | No | - | Cadena de permiso (ej: `"cash:view"`, `"sales:manage"`, `"config:manage"`). |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |

**Relaciones:** Ninguna relacion explicita con otros modelos. Se usa programaticamente para consultar permisos por rol.

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@unique` | [role, permission] | Evita que un mismo permiso se asigne dos veces al mismo rol. |
| `@@map` | `role_permissions` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- La combinacion unica [role, permission] garantiza que no haya duplicados.
- Los permisos se gestionan mediante reemplazo completo (`deleteMany` + `createMany` en transaccion) desde `role-permission.model.ts`.

---

### Desarrollos

---

### 3.3 Development

**Proposito:** Representa un desarrollo inmobiliario o item gestionado. Los desarrollos de tipo `INMOBILIARIO` contienen lotes que se venden (ej: "Raices de Alvear", "Potus de Avellaneda"). Un caso especial es "Fiderza", un desarrollo sin lotes que sirve como centro de costos para imputar gastos de oficina. Los desarrollos de tipo `OTROS` representan items varios como casas, vehiculos, o animales.

**Tabla: `developments`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| name | String | No | - | Nombre del desarrollo (ej: "Raices de Alvear"). |
| slug | String | No | - | Slug URL-friendly unico (ej: "raices-de-alvear"). Usado en rutas del frontend. |
| description | String | Si | - | Descripcion opcional del desarrollo. |
| location | String | Si | - | Ubicacion geografica del desarrollo. |
| type | DevelopmentType | No | `INMOBILIARIO` | Tipo de desarrollo. |
| status | DevelopmentStatus | No | `EN_CURSO` | Estado actual del desarrollo. |
| imageUrl | String | Si | - | URL de imagen del desarrollo. Mapeado a `image_url`. |
| googleMapsUrl | String | Si | - | URL de Google Maps del desarrollo. Mapeado a `google_maps_url`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Development -> Lot | 1:N | development.lots | Lot.developmentId | Default | Default |
| Development -> CashMovement | 1:N | development.cashMovements | CashMovement.developmentId | Default | Default |
| Development -> CashBalance | 1:N | development.cashBalances | CashBalance.developmentId | Default | Default |
| Development -> SigningSlot | 1:N | development.signingSlots | SigningSlot.developmentId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | slug | Garantiza que cada desarrollo tenga un slug unico para routing en el frontend. |
| `@@map` | `developments` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `type @default(INMOBILIARIO)`: Los desarrollos se crean como inmobiliarios por defecto.
- `status @default(EN_CURSO)`: Los nuevos desarrollos se inician como activos.
- El slug unico permite acceder a `/desarrollos/[slug]` en el frontend.
- No tiene `onDelete: Cascade` hacia Lot, por lo que intentar borrar un desarrollo con lotes fallara (integridad referencial por defecto de Prisma/PostgreSQL). El servicio `development.service.ts` verifica si hay lotes con ventas antes de permitir la eliminacion.

---

### 3.4 Lot

**Proposito:** Representa un lote individual dentro de un desarrollo inmobiliario. Los lotes son la unidad basica de venta del sistema. Su estado cambia a lo largo del ciclo de vida de una venta: disponible -> vendido/contado/cesion/permuta -> escriturado. Cada lote puede tener como maximo una venta asociada (relacion 1:1 con Sale).

**Tabla: `lots`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| developmentId | String | No | - | FK al desarrollo al que pertenece. Mapeado a `development_id`. |
| lotNumber | String | No | - | Numero o identificador del lote dentro del desarrollo (ej: "194", "212A"). Mapeado a `lot_number`. |
| block | String | Si | - | Manzana o bloque al que pertenece el lote. |
| area | Decimal(10,2) | Si | - | Superficie del lote en metros cuadrados. |
| listPrice | Decimal(12,2) | Si | - | Precio de lista del lote en USD. Mapeado a `list_price`. |
| status | LotStatus | No | `DISPONIBLE` | Estado actual del lote. |
| notes | String (Text) | Si | - | Notas libres sobre el lote. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Lot -> Development | N:1 | lot.development | developmentId | Default | Default |
| Lot -> LotTag | 1:N | lot.tags | LotTag.lotId | Cascade (en LotTag) | Default |
| Lot -> Sale | 1:1 (opcional) | lot.sale | Sale.lotId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@unique` | [developmentId, lotNumber] | Un numero de lote es unico dentro de su desarrollo. |
| `@@index` | [status] | Busqueda rapida por estado (ej: filtrar lotes disponibles). |
| `@@index` | [developmentId, status] | Busqueda combinada de lotes por desarrollo y estado. |
| `@@map` | `lots` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `status @default(DISPONIBLE)`: Los lotes se crean como disponibles.
- `Sale? (optional)`: Un lote puede existir sin venta asociada.
- La relacion 1:1 con Sale se garantiza mediante `@unique` en `Sale.lotId`.
- `listPrice` es el precio de referencia; el precio real de venta se registra en `Sale.totalPrice`.

---

### 3.5 Tag

**Proposito:** Representa una etiqueta personalizable para clasificar lotes. Las etiquetas son definidas libremente por el usuario (ej: "lote comercial", "paga a fin de mes") y se asocian a lotes mediante la tabla intermedia LotTag. El frontend ofrece autocompletado para evitar duplicados.

**Tabla: `tags`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| name | String | No | - | Slug interno unico de la etiqueta (ej: "lote-comercial"). |
| label | String | No | - | Nombre de display de la etiqueta (ej: "Lote Comercial"). |
| color | String | Si | - | Color en formato hex para la UI (ej: "#FF5733"). |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Tag -> LotTag | 1:N | tag.lots | LotTag.tagId | Cascade (en LotTag) | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | name | Garantiza que no se creen etiquetas con el mismo slug. |
| `@@map` | `tags` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `name @unique`: Previene duplicados de etiquetas. El model `tag.model.ts` verifica existencia antes de crear.

---

### 3.6 LotTag

**Proposito:** Tabla intermedia que implementa la relacion muchos-a-muchos entre Lot y Tag. Cada registro asocia un lote con una etiqueta.

**Tabla: `lot_tags`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| lotId | String | No | - | FK al lote. Mapeado a `lot_id`. |
| tagId | String | No | - | FK a la etiqueta. Mapeado a `tag_id`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| LotTag -> Lot | N:1 | lotTag.lot | lotId | Cascade | Default |
| LotTag -> Tag | N:1 | lotTag.tag | tagId | Cascade | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@unique` | [lotId, tagId] | Evita que la misma etiqueta se asigne dos veces al mismo lote. |
| `@@map` | `lot_tags` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `onDelete: Cascade` en ambas relaciones: si se elimina un lote o una etiqueta, los registros LotTag asociados se eliminan automaticamente.
- La gestion de tags de un lote se hace mediante `tag.model.ts -> setLotTags()`, que elimina todos los LotTag existentes y recrea los nuevos en una transaccion.

---

### Ventas

---

### 3.7 Person

**Proposito:** Representa a una persona fisica o juridica que interactua con el sistema como cliente, proveedor, o ambos. Los clientes compran lotes, los proveedores pueden recibir lotes como pago en especie (permuta). La seccion "Proveedores" del sidebar en el frontend es un filtro: muestra ventas donde `person.type IN (PROVEEDOR, AMBOS)`.

**Tabla: `persons`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| type | PersonType | No | `CLIENTE` | Tipo de persona. |
| firstName | String | No | - | Nombre de la persona. Mapeado a `first_name`. |
| lastName | String | No | - | Apellido de la persona. Mapeado a `last_name`. |
| dni | String | Si | - | Documento Nacional de Identidad. Unico si presente. |
| cuit | String | Si | - | CUIT/CUIL fiscal. Unico si presente. |
| email | String | Si | - | Email de contacto. |
| phone | String | Si | - | Telefono principal. |
| phone2 | String | Si | - | Telefono secundario. |
| address | String | Si | - | Direccion postal. |
| city | String | Si | - | Ciudad. |
| province | String | Si | - | Provincia. |
| notes | String (Text) | Si | - | Notas libres sobre la persona. |
| isActive | Boolean | No | `true` | Indica si la persona esta activa. Mapeado a `is_active`. |
| createdById | String | Si | - | FK al usuario que creo el registro. Mapeado a `created_by_id`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Person -> Sale | 1:N | person.sales | Sale.personId | Default | Default |
| Person -> CashMovement (PersonMovements) | 1:N | person.cashMovements | CashMovement.personId | Default | Default |
| Person -> PaymentReceipt | 1:N | person.receipts | PaymentReceipt.personId | Default | Default |
| Person -> User (PersonCreatedBy) | N:1 | person.createdBy | createdById | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | dni | DNI es unico cuando se proporciona (nullable unique). |
| `@unique` | cuit | CUIT es unico cuando se proporciona (nullable unique). |
| `@@index` | [type] | Busqueda rapida por tipo de persona (clientes vs proveedores). |
| `@@index` | [isActive] | Filtrado rapido de personas activas/inactivas. |
| `@@map` | `persons` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `type @default(CLIENTE)`: Las personas se crean como clientes por defecto.
- `isActive @default(true)`: Las personas se crean activas por defecto.
- `dni` y `cuit` son nullable unique: permiten nulos pero si tienen valor, debe ser unico.
- `createdById` es nullable para soportar datos migrados o importados sin usuario asociado.

---

### 3.8 Sale

**Proposito:** Representa una venta de un lote a una persona. Es el modelo central del dominio de ventas, conectando persona, lote, cuotas, cargos extraordinarios, movimientos de caja, recibos y turnos de firma. Soporta multiples modalidades de venta: financiada (con plan de cuotas), contado, cesion, y permuta. El campo `groupId` permite agrupar ventas de multiples lotes bajo un mismo plan de pago (ej: cliente que compra lotes 212, 213, 214 juntos).

**Tabla: `sales`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| groupId | String | Si | - | Agrupador para ventas multi-lote. Ventas con el mismo groupId comparten plan de pago. Mapeado a `group_id`. |
| lotId | String | No | - | FK al lote vendido. Unico (relacion 1:1). Mapeado a `lot_id`. |
| personId | String | No | - | FK a la persona compradora. Mapeado a `person_id`. |
| sellerId | String | Si | - | FK al usuario vendedor (donde `isSeller = true`). Mapeado a `seller_id`. |
| saleDate | DateTime | No | - | Fecha de la venta. Mapeado a `sale_date`. |
| signingDate | DateTime | Si | - | Fecha de escrituracion pactada. Mapeado a `signing_date`. |
| totalPrice | Decimal(12,2) | No | - | Precio total de la venta. En USD para ventas normales, 0 para cesiones/permutas. Mapeado a `total_price`. |
| downPayment | Decimal(12,2) | Si | - | Monto de la entrega inicial/anticipo. Mapeado a `down_payment`. |
| currency | Currency | No | `USD` | Moneda de la venta. |
| totalInstallments | Int | No | - | Numero total de cuotas del plan. 0 = contado. Mapeado a `total_installments`. |
| firstInstallmentAmount | Decimal(12,2) | Si | - | Monto de la primera cuota (puede diferir de las regulares). Mapeado a `first_installment_amount`. |
| regularInstallmentAmount | Decimal(12,2) | Si | - | Monto de las cuotas regulares (2da en adelante). Mapeado a `regular_installment_amount`. |
| firstInstallmentMonth | String | Si | - | Mes de inicio del plan de cuotas (ej: "ABRIL 2025"). Mapeado a `first_installment_month`. |
| collectionDay | Int | Si | - | Dia del mes de cobro (ej: 10 = dia 10 de cada mes). Mapeado a `collection_day`. |
| commissionAmount | Decimal(12,2) | Si | - | Monto de comision del vendedor calculado al momento de la venta. Mapeado a `commission_amount`. |
| exchangeRateOverride | Decimal(10,2) | Si | - | Cotizacion fija pactada para la venta (sobreescribe la cotizacion diaria). Mapeado a `exchange_rate_override`. |
| status | SaleStatus | No | `ACTIVA` | Estado actual de la venta. |
| notes | String (Text) | Si | - | Notas libres. Usado para entregas de propiedad (ej: "Entrega casa Bv. Orono 1234, valuada USD 80.000"), permutas, y observaciones generales. |
| paymentWindow | String | Si | - | Ventana de pago descriptiva (ej: "del 1 al 20", "vence el 30"). Mapeado a `payment_window`. |
| createdById | String | No | - | FK al usuario que registro la venta. Mapeado a `created_by_id`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion del registro. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Sale -> Lot | 1:1 | sale.lot | lotId | Default | Default |
| Sale -> Person | N:1 | sale.person | personId | Default | Default |
| Sale -> User (SaleSeller) | N:1 | sale.seller | sellerId | Default | Default |
| Sale -> User (SaleCreatedBy) | N:1 | sale.createdBy | createdById | Default | Default |
| Sale -> Installment | 1:N | sale.installments | Installment.saleId | Cascade (en Installment) | Default |
| Sale -> ExtraCharge | 1:N | sale.extraCharges | ExtraCharge.saleId | Cascade (en ExtraCharge) | Default |
| Sale -> CashMovement | 1:N | sale.cashMovements | CashMovement.saleId | Default | Default |
| Sale -> PaymentReceipt | 1:N | sale.receipts | PaymentReceipt.saleId | Default | Default |
| Sale -> SigningSlot | 1:N | sale.signingSlots | SigningSlot.saleId | SetNull (en SigningSlot) | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | lotId | Garantiza relacion 1:1 entre lote y venta. Un lote solo puede tener una venta. |
| `@@index` | [groupId] | Busqueda rapida de ventas agrupadas (multi-lote). |
| `@@index` | [status] | Filtrado por estado de venta. |
| `@@index` | [personId] | Busqueda de ventas por persona. |
| `@@index` | [sellerId] | Busqueda de ventas por vendedor. |
| `@@map` | `sales` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `status @default(ACTIVA)`: Las ventas se crean como activas.
- `currency @default(USD)`: Las ventas se denominan en dolares por defecto.
- `totalInstallments = 0` indica venta al contado (status = CONTADO).
- `totalPrice = 0` con `status = CESION` indica permuta a proveedor.
- `lotId @unique` implementa la restriccion de negocio de que cada lote solo puede estar en una venta.
- Las cuotas (`Installment`) y refuerzos (`ExtraCharge`) se eliminan en cascada si se elimina la venta.

---

### 3.9 Installment

**Proposito:** Representa una cuota ordinaria dentro del plan de pagos de una venta. Las cuotas se auto-generan al crear la venta y pueden recalcularse cuando se paga un refuerzo (`ExtraCharge`). El campo `originalAmount` preserva el monto previo al recalculo para mostrar como referencia visual (tachado) en la UI.

**Tabla: `installments`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| saleId | String | No | - | FK a la venta asociada. Mapeado a `sale_id`. |
| installmentNumber | Int | No | - | Numero secuencial de la cuota (1, 2, 3...). Mapeado a `installment_number`. |
| amount | Decimal(12,2) | No | - | Monto actual de la cuota (puede cambiar por recalculo). |
| originalAmount | Decimal(12,2) | Si | - | Monto original antes del recalculo por refuerzo. Null si nunca fue recalculada. Mapeado a `original_amount`. |
| currency | Currency | No | `USD` | Moneda en que esta denominada la cuota. |
| dueDate | DateTime | No | - | Fecha de vencimiento de la cuota. Mapeado a `due_date`. |
| monthLabel | String | Si | - | Etiqueta descriptiva del mes (ej: "ABRIL 2025"). Mapeado a `month_label`. |
| status | InstallmentStatus | No | `PENDIENTE` | Estado actual de la cuota. |
| paidAmount | Decimal(12,2) | No | `0` | Monto efectivamente pagado. Permite pagos parciales. Mapeado a `paid_amount`. |
| paidInCurrency | Currency | Si | - | Moneda real en la que se realizo el pago (puede diferir de `currency`). Mapeado a `paid_in_currency`. |
| paidDate | DateTime | Si | - | Fecha en que se realizo el pago. Mapeado a `paid_date`. |
| notes | String | Si | - | Notas sobre la cuota. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Installment -> Sale | N:1 | installment.sale | saleId | Cascade | Default |
| Installment -> CashMovement | 1:N | installment.cashMovements | CashMovement.installmentId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@unique` | [saleId, installmentNumber] | Una venta no puede tener dos cuotas con el mismo numero. |
| `@@index` | [status] | Filtrado rapido por estado (ej: cuotas pendientes). |
| `@@index` | [dueDate] | Busqueda por fecha de vencimiento (ej: cuotas proximas a vencer). |
| `@@map` | `installments` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `status @default(PENDIENTE)`: Las cuotas se crean como pendientes.
- `currency @default(USD)`: Las cuotas se denominan en USD por defecto.
- `paidAmount @default(0)`: Inicialmente no se ha pagado nada.
- `originalAmount` se llena la primera vez que un recalculo modifica el monto (ver `src/lib/installment-recalculator.ts`).
- `onDelete: Cascade` en la relacion con Sale: si se elimina la venta, todas sus cuotas se eliminan.

---

### 3.10 ExtraCharge

**Proposito:** Representa un cargo extraordinario o refuerzo asociado a una venta. Los refuerzos pueden crearse al inicio de la venta o a mitad de plan de pagos. Cuando un refuerzo se paga a mitad de plan, se dispara un recalculo de las cuotas pendientes (ver seccion 7). Tambien soporta pagos en especie (`isInKind`).

**Tabla: `extra_charges`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| saleId | String | No | - | FK a la venta asociada. Mapeado a `sale_id`. |
| description | String | No | - | Descripcion del cargo (ej: "Refuerzo marzo 2025"). |
| amount | Decimal(12,2) | No | - | Monto del cargo extraordinario. |
| currency | Currency | No | `USD` | Moneda del cargo. |
| dueDate | DateTime | No | - | Fecha de vencimiento. Mapeado a `due_date`. |
| status | ExtraChargeStatus | No | `PENDIENTE` | Estado del cargo. |
| paidAmount | Decimal(12,2) | No | `0` | Monto efectivamente pagado. Mapeado a `paid_amount`. |
| paidDate | DateTime | Si | - | Fecha de pago. Mapeado a `paid_date`. |
| isInKind | Boolean | No | `false` | Indica si el pago es en especie (no monetario). Mapeado a `is_in_kind`. |
| inKindType | String | Si | - | Tipo de pago en especie (ej: "vehiculo", "propiedad"). Mapeado a `in_kind_type`. |
| notified | Boolean | No | `false` | Indica si se envio la alerta de proximo vencimiento (3 dias antes). Usado por el cron job para evitar duplicados. |
| notes | String | Si | - | Notas adicionales. |
| createdById | String | No | - | FK al usuario que creo el cargo. Mapeado a `created_by_id`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| ExtraCharge -> Sale | N:1 | extraCharge.sale | saleId | Cascade | Default |
| ExtraCharge -> User (ChargeCreatedBy) | N:1 | extraCharge.createdBy | createdById | Default | Default |
| ExtraCharge -> CashMovement | 1:N | extraCharge.cashMovements | CashMovement.extraChargeId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@index` | [saleId] | Busqueda rapida de cargos por venta. |
| `@@index` | [dueDate] | Busqueda por fecha de vencimiento (usado por cron para alertas). |
| `@@map` | `extra_charges` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `status @default(PENDIENTE)`: Los cargos se crean como pendientes.
- `currency @default(USD)`: Los cargos se denominan en USD por defecto.
- `paidAmount @default(0)`: Inicialmente no se ha pagado nada.
- `isInKind @default(false)`: Por defecto, el pago es monetario.
- `notified @default(false)`: La alerta de proximo vencimiento aun no se ha enviado.
- `onDelete: Cascade` en la relacion con Sale: si se elimina la venta, los cargos se eliminan.
- El campo `notified` es consultado por `src/server/models/cron.model.ts -> findUpcomingExtraCharges()` para evitar alertas duplicadas.

---

### Pagos y Caja

---

### 3.11 CashMovement

**Proposito:** Modelo central del dominio de pagos. Representa cualquier movimiento financiero del sistema de forma unificada: cobros de cuotas, entregas, comisiones, sueldos, gastos, impuestos, y 12 categorias mas. Cada movimiento registra montos tanto en ARS como en USD (pueden coexistir en un mismo movimiento, como en una conversion de moneda). Se vincula opcionalmente a un desarrollo, persona, venta, cuota, refuerzo, y cotizacion del dia.

**Tabla: `cash_movements`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| developmentId | String | Si | - | FK al desarrollo asociado (centro de costos). Mapeado a `development_id`. |
| personId | String | Si | - | FK a la persona asociada al movimiento. Mapeado a `person_id`. |
| saleId | String | Si | - | FK a la venta asociada. Mapeado a `sale_id`. |
| installmentId | String | Si | - | FK a la cuota que se esta pagando. Mapeado a `installment_id`. |
| extraChargeId | String | Si | - | FK al refuerzo que se esta pagando. Mapeado a `extra_charge_id`. |
| exchangeRateId | String | Si | - | FK a la cotizacion del dia usada en la transaccion. Mapeado a `exchange_rate_id`. |
| date | DateTime | No | - | Fecha del movimiento. |
| type | MovementType | No | - | Tipo de movimiento (18 categorias). |
| concept | String | No | - | Concepto descriptivo (ej: "CUOTA 5 LOTE 194", "SUELDO MARCOS"). |
| detail | String (Text) | Si | - | Detalle extendido del movimiento. |
| arsIncome | Decimal(14,2) | Si | - | Ingreso en pesos argentinos. Mapeado a `ars_income`. |
| arsExpense | Decimal(14,2) | Si | - | Egreso en pesos argentinos. Mapeado a `ars_expense`. |
| usdIncome | Decimal(12,2) | Si | - | Ingreso en dolares estadounidenses. Mapeado a `usd_income`. |
| usdExpense | Decimal(12,2) | Si | - | Egreso en dolares estadounidenses. Mapeado a `usd_expense`. |
| manualRate | Decimal(10,2) | Si | - | Cotizacion manual usada en la transaccion (sobreescribe la del dia). Mapeado a `manual_rate`. |
| receiptNumber | String | Si | - | Numero de recibo asociado (referencia rapida). Mapeado a `receipt_number`. |
| registeredById | String | No | - | FK al usuario que registro el movimiento. Mapeado a `registered_by_id`. |
| notes | String | Si | - | Notas adicionales. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| CashMovement -> Development | N:1 | cashMovement.development | developmentId | Default | Default |
| CashMovement -> Person (PersonMovements) | N:1 | cashMovement.person | personId | Default | Default |
| CashMovement -> Sale | N:1 | cashMovement.sale | saleId | Default | Default |
| CashMovement -> Installment | N:1 | cashMovement.installment | installmentId | Default | Default |
| CashMovement -> ExtraCharge | N:1 | cashMovement.extraCharge | extraChargeId | Default | Default |
| CashMovement -> ExchangeRate | N:1 | cashMovement.exchangeRate | exchangeRateId | Default | Default |
| CashMovement -> User (RegisteredBy) | N:1 | cashMovement.registeredBy | registeredById | Default | Default |
| CashMovement -> PaymentReceipt | 1:1 (opcional) | cashMovement.receipt | PaymentReceipt.cashMovementId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@index` | [date] | Busqueda y filtrado por fecha (principal criterio de consulta en caja). |
| `@@index` | [type] | Filtrado por tipo de movimiento. |
| `@@index` | [developmentId] | Filtrado por desarrollo (centro de costos). |
| `@@index` | [saleId] | Busqueda de movimientos por venta. |
| `@@index` | [personId] | Busqueda de movimientos por persona. |
| `@@index` | [installmentId] | Busqueda de pagos por cuota especifica. |
| `@@map` | `cash_movements` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- Todos los campos FK son nullable excepto `registeredById`: cada movimiento debe tener un usuario que lo registro.
- Los campos financieros se dividen en 4: `arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`. Un movimiento puede tener valores en ambas monedas simultaneamente (ej: conversion de moneda).
- `arsIncome`/`arsExpense` usan `Decimal(14,2)` (hasta 999,999,999,999.99) mientras que `usdIncome`/`usdExpense` usan `Decimal(12,2)` (hasta 9,999,999,999.99) porque los montos en pesos son ordenes de magnitud mayores.
- El `exchangeRateId` vincula la cotizacion del dia al movimiento para trazabilidad historica.
- No hay `onDelete: Cascade` en ninguna FK: eliminar un desarrollo, persona, o venta no elimina sus movimientos de caja.

---

### 3.12 CashBalance

**Proposito:** Almacena snapshots mensuales de saldos de caja por desarrollo. Permite consultar el saldo acumulado de un periodo sin recalcular todos los movimientos. El saldo se calcula como la diferencia entre ingresos y egresos del mes, tanto en ARS como en USD.

**Tabla: `cash_balances`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| developmentId | String | Si | - | FK al desarrollo. Null representa el saldo general (sin desarrollo especifico). Mapeado a `development_id`. |
| month | Int | No | - | Mes del periodo (1-12). |
| year | Int | No | - | Anio del periodo. |
| arsBalance | Decimal(14,2) | No | - | Saldo neto en pesos argentinos (ingresos - egresos). Mapeado a `ars_balance`. |
| usdBalance | Decimal(12,2) | No | - | Saldo neto en dolares (ingresos - egresos). Mapeado a `usd_balance`. |
| closedAt | DateTime | Si | - | Fecha de cierre del periodo. Null si aun esta abierto. Mapeado a `closed_at`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| CashBalance -> Development | N:1 | cashBalance.development | developmentId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@unique` | [developmentId, month, year] | Un desarrollo solo puede tener un saldo por mes/anio. |
| `@@map` | `cash_balances` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `developmentId` nullable permite tener un saldo "global" sin desarrollo especifico.
- La combinacion unica [developmentId, month, year] evita duplicados de periodos.
- El calculo real de saldos se hace en `cash-balance.model.ts -> calculateFromMovements()` agregando los movimientos de caja del periodo.

---

### 3.13 PaymentReceipt

**Proposito:** Representa un recibo de pago auto-generado por el sistema. Es un documento no-legal que confirma la recepcion de un pago, con formato: "Recibi de [nombre], $[monto] en concepto de cuota [N] correspondiente al lote [lote], fecha [fecha]." Puede enviarse por email y opcionalmente por WhatsApp via deep link. El membrete es configurable en SystemConfig.

**Tabla: `payment_receipts`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| cashMovementId | String | No | - | FK al movimiento de caja asociado. Unico (relacion 1:1). Mapeado a `cash_movement_id`. |
| saleId | String | No | - | FK a la venta. Mapeado a `sale_id`. |
| personId | String | No | - | FK a la persona. Mapeado a `person_id`. |
| receiptNumber | String | No | - | Numero de recibo generado (formato: REC-YYYYMM-NNNN). Mapeado a `receipt_number`. |
| content | String (Text) | No | - | Contenido completo del recibo en texto. |
| sentByEmail | Boolean | No | `false` | Indica si se envio por email. Mapeado a `sent_by_email`. |
| sentAt | DateTime | Si | - | Fecha/hora de envio por email. Mapeado a `sent_at`. |
| generatedById | String | No | - | FK al usuario que genero el recibo. Mapeado a `generated_by_id`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| PaymentReceipt -> CashMovement | 1:1 | receipt.cashMovement | cashMovementId | Default | Default |
| PaymentReceipt -> Sale | N:1 | receipt.sale | saleId | Default | Default |
| PaymentReceipt -> Person | N:1 | receipt.person | personId | Default | Default |
| PaymentReceipt -> User (GeneratedBy) | N:1 | receipt.generatedBy | generatedById | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | cashMovementId | Garantiza relacion 1:1: un movimiento solo puede tener un recibo. |
| `@@map` | `payment_receipts` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `sentByEmail @default(false)`: Los recibos no se envian automaticamente.
- `cashMovementId @unique`: Cada movimiento de caja genera como maximo un recibo.
- El numero de recibo se genera atomicamente en `payment-receipt.model.ts -> generateReceiptNumber()` usando una raw query para prevenir condiciones de carrera.

---

### 3.14 ExchangeRate

**Proposito:** Almacena la cotizacion diaria del dolar en Argentina, obtenida de APIs gratuitas (dolarapi.com o bluelytics.com.ar). Se guarda una entrada por dia con tres tipos de cotizacion: oficial, blue (informal), y cripto. Al registrar cualquier transaccion financiera, el `exchangeRateId` se estampa en el CashMovement para trazabilidad historica de la cotizacion usada.

**Tabla: `exchange_rates`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| date | DateTime | No | - | Fecha de la cotizacion. Unica (una entrada por dia). |
| source | String | No | `"dolarapi"` | Fuente de la cotizacion (ej: "dolarapi", "manual"). |
| officialBuy | Decimal(10,2) | Si | - | Cotizacion oficial compra. Mapeado a `official_buy`. |
| officialSell | Decimal(10,2) | Si | - | Cotizacion oficial venta. Mapeado a `official_sell`. |
| blueBuy | Decimal(10,2) | Si | - | Cotizacion blue compra. Mapeado a `blue_buy`. |
| blueSell | Decimal(10,2) | Si | - | Cotizacion blue venta. Mapeado a `blue_sell`. |
| cryptoBuy | Decimal(10,2) | Si | - | Cotizacion cripto compra. Mapeado a `crypto_buy`. |
| cryptoSell | Decimal(10,2) | Si | - | Cotizacion cripto venta. Mapeado a `crypto_sell`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion del registro. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| ExchangeRate -> CashMovement | 1:N | exchangeRate.cashMovements | CashMovement.exchangeRateId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | date | Una sola cotizacion por dia. |
| `@@index` | [date] | Busqueda rapida por fecha. |
| `@@map` | `exchange_rates` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `source @default("dolarapi")`: La fuente por defecto es la API de dolarapi.com.
- `date @unique`: Solo puede existir una cotizacion por dia.
- Todas las cotizaciones son nullable: permite registros parciales (ej: solo oficial, sin blue).
- La obtencion de cotizaciones se implementa en `src/lib/exchange-rate.ts -> fetchDolarApiRates()`.
- La cotizacion se obtiene automaticamente si no existe al momento de consultar (`src/server/actions/exchange-rate.actions.ts -> getTodayExchangeRate()`).

---

### Firmas

---

### 3.15 SigningSlot

**Proposito:** Representa un turno de escrituracion (firma) en la agenda del sistema. Permite programar citas de firma asociadas a desarrollos y ventas, con estados de seguimiento. Se visualiza en el frontend mediante `react-big-calendar` en vista semanal. Futuro: sincronizacion con Google Calendar (no requiere cambios en el modelo).

**Tabla: `signing_slots`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| developmentId | String | Si | - | FK al desarrollo. Mapeado a `development_id`. |
| sellerId | String | Si | - | FK al vendedor asociado. Mapeado a `seller_id`. |
| date | DateTime | No | - | Fecha del turno de firma. |
| time | String | No | - | Hora de inicio (formato "HH:mm", ej: "09:00"). |
| endTime | String | Si | - | Hora de fin (formato "HH:mm"). Mapeado a `end_time`. |
| lotInfo | String | No | - | Informacion del lote (texto descriptivo). Mapeado a `lot_info`. |
| clientName | String | Si | - | Nombre del cliente (texto libre). Mapeado a `client_name`. |
| lotNumbers | String | Si | - | Numeros de lote asociados (texto libre). Mapeado a `lot_numbers`. |
| status | SigningStatus | No | `PENDIENTE` | Estado del turno. |
| notes | String | Si | - | Notas adicionales. |
| createdById | String | Si | - | FK al usuario que creo el turno. Mapeado a `created_by_id`. |
| saleId | String | Si | - | FK a la venta asociada. Mapeado a `sale_id`. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |
| updatedAt | DateTime | No | `@updatedAt` | Fecha de ultima actualizacion. Mapeado a `updated_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| SigningSlot -> Development | N:1 | signingSlot.development | developmentId | Default | Default |
| SigningSlot -> User (SigningSeller) | N:1 | signingSlot.seller | sellerId | Default | Default |
| SigningSlot -> User (SigningCreatedBy) | N:1 | signingSlot.createdBy | createdById | Default | Default |
| SigningSlot -> Sale | N:1 | signingSlot.sale | saleId | SetNull | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@index` | [date] | Busqueda de turnos por fecha (consulta principal del calendario). |
| `@@index` | [status] | Filtrado por estado del turno. |
| `@@index` | [saleId] | Busqueda de turnos por venta asociada. |
| `@@map` | `signing_slots` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `status @default(PENDIENTE)`: Los turnos se crean como pendientes.
- `onDelete: SetNull` en la relacion con Sale: si se elimina la venta, el turno de firma no se elimina, pero pierde la referencia a la venta.
- `createdById` es nullable para soportar datos migrados sin usuario asociado.
- El horario se almacena como strings (`time`, `endTime`) en formato "HH:mm", no como DateTime, para simplificar la gestion de la vista de calendario.

---

### Comunicaciones

---

### 3.16 Message

**Proposito:** Representa un mensaje interno del sistema, enviado entre usuarios. Forma parte del sistema de alertas internas visible al login. Caso de uso tipico: un vendedor deja un mensaje el domingo a las 22:00, el administrador lo ve el lunes al conectarse.

**Tabla: `messages`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| senderId | String | No | - | FK al usuario que envio el mensaje. Mapeado a `sender_id`. |
| subject | String | Si | - | Asunto del mensaje. |
| body | String (Text) | No | - | Cuerpo del mensaje. |
| createdAt | DateTime | No | `now()` | Fecha de envio. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Message -> User (SentMessages) | N:1 | message.sender | senderId | Default | Default |
| Message -> MessageRecipient | 1:N | message.recipients | MessageRecipient.messageId | Cascade (en MessageRecipient) | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@map` | `messages` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- No tiene campo `updatedAt`: los mensajes son inmutables una vez enviados.
- Los destinatarios se eliminan en cascada si se elimina el mensaje (`onDelete: Cascade` en MessageRecipient).

---

### 3.17 MessageRecipient

**Proposito:** Tabla intermedia que registra los destinatarios de un mensaje y su estado de lectura. Permite rastrear quien recibio y leyo cada mensaje. Un mensaje puede tener multiples destinatarios.

**Tabla: `message_recipients`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| messageId | String | No | - | FK al mensaje. Mapeado a `message_id`. |
| userId | String | No | - | FK al usuario destinatario. Mapeado a `user_id`. |
| readAt | DateTime | Si | - | Fecha/hora de lectura. Null si no ha sido leido. Mapeado a `read_at`. |
| createdAt | DateTime | No | `now()` | Fecha de envio al destinatario. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| MessageRecipient -> Message | N:1 | messageRecipient.message | messageId | Cascade | Default |
| MessageRecipient -> User | N:1 | messageRecipient.user | userId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@unique` | [messageId, userId] | Un usuario solo puede ser destinatario de un mensaje una vez. |
| `@@map` | `message_recipients` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `readAt` null indica mensaje no leido. Se actualiza mediante `messageModel.markAsRead()`.
- `onDelete: Cascade` en la relacion con Message: si se elimina el mensaje, todos sus registros de destinatarios se eliminan.
- El conteo de no leidos se hace mediante `messageModel.countUnread()` filtrando `readAt: null`.

---

### 3.18 Notification

**Proposito:** Representa una notificacion del sistema dirigida a un usuario. Las notificaciones son generadas automaticamente por el sistema (no por otros usuarios) en respuesta a eventos: refuerzos proximos a vencer, cuotas vencidas, pagos recibidos, firmas proximas. Soporta polimorfismo mediante `referenceType` + `referenceId` para vincular la notificacion a cualquier entidad.

**Tabla: `notifications`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| userId | String | No | - | FK al usuario destinatario. Mapeado a `user_id`. |
| type | NotificationType | No | - | Tipo de notificacion (ver enum NotificationType). |
| title | String | No | - | Titulo de la notificacion. |
| body | String | No | - | Cuerpo/descripcion de la notificacion. |
| referenceType | String | Si | - | Tipo de entidad referenciada (ej: "ExtraCharge", "Installment", "SigningSlot"). Mapeado a `reference_type`. |
| referenceId | String | Si | - | ID de la entidad referenciada. Mapeado a `reference_id`. |
| read | Boolean | No | `false` | Indica si la notificacion fue leida. |
| createdAt | DateTime | No | `now()` | Fecha de creacion. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| Notification -> User | N:1 | notification.user | userId | Cascade | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@index` | [userId, read] | Busqueda rapida de notificaciones no leidas por usuario (consulta principal del bell icon). |
| `@@map` | `notifications` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- `read @default(false)`: Las notificaciones se crean como no leidas.
- `onDelete: Cascade` en la relacion con User: si se elimina el usuario, sus notificaciones se eliminan.
- `referenceType` + `referenceId` implementan un patron de referencia polimorfica: permiten vincular la notificacion a cualquier entidad del sistema sin FK explicita.
- El cron job (`src/server/models/cron.model.ts`) consulta duplicados de notificaciones (`hasOverdueNotification`, `hasSigningNotification`) para evitar crear notificaciones repetidas.

---

### Sistema

---

### 3.19 AuditLog

**Proposito:** Registra un trail de auditoria de todas las operaciones criticas del sistema. Cada entrada captura: quien realizo la accion, que entidad fue afectada, que accion se ejecuto, y opcionalmente el estado antes/despues del cambio en formato JSON. Detalle completo en la seccion 7 (Implementacion del Audit Trail).

**Tabla: `audit_logs`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| userId | String | No | - | FK al usuario que realizo la accion. Mapeado a `user_id`. |
| action | String | No | - | Tipo de accion (ej: "CREATE", "UPDATE", "DELETE", "BULK_UPDATE", "IMPORT"). |
| entity | String | No | - | Nombre del modelo afectado (ej: "Sale", "CashMovement", "Lot"). |
| entityId | String | No | - | ID de la entidad afectada. Para operaciones bulk puede contener IDs concatenados. Mapeado a `entity_id`. |
| oldData | Json | Si | - | Estado previo de la entidad (antes del cambio). Mapeado a `old_data`. |
| newData | Json | Si | - | Estado posterior de la entidad (despues del cambio). Mapeado a `new_data`. |
| ipAddress | String | Si | - | Direccion IP del usuario (no utilizado actualmente). Mapeado a `ip_address`. |
| createdAt | DateTime | No | `now()` | Timestamp de la accion. Mapeado a `created_at`. |

**Relaciones:**

| Relacion | Direccion | Cardinalidad | Campo FK | onDelete | onUpdate |
|----------|-----------|--------------|----------|----------|----------|
| AuditLog -> User | N:1 | auditLog.user | userId | Default | Default |

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@@index` | [entity, entityId] | Busqueda de historial por entidad especifica (ej: todos los cambios de Sale "xyz"). |
| `@@index` | [userId] | Busqueda de acciones por usuario (ej: que hizo el usuario "abc"). |
| `@@index` | [createdAt] | Busqueda por rango de fechas (ej: acciones de la ultima semana). |
| `@@map` | `audit_logs` | Nombre de tabla en PostgreSQL. |

**Reglas de negocio en el schema:**
- No tiene `updatedAt`: los logs de auditoria son inmutables.
- `oldData` y `newData` son campos JSON que permiten almacenar snapshots arbitrarios del estado de la entidad.
- `ipAddress` esta definido en el schema pero no se utiliza actualmente en la implementacion.
- No hay `onDelete: Cascade` en la relacion con User: los logs de auditoria se preservan incluso si el usuario se elimina (falla por FK, lo cual es intencional para preservar la trazabilidad).

---

### 3.20 SystemConfig

**Proposito:** Almacena configuracion del sistema como pares clave-valor. Permite personalizar aspectos del sistema sin modificar codigo: nombre de la empresa, membretes de recibos, logo, CUIT, fuente de cotizacion preferida, etc.

**Tabla: `system_config`**

| Campo | Tipo | Nullable | Default | Descripcion |
|-------|------|----------|---------|-------------|
| id | String | No | `cuid()` | Identificador unico CUID. |
| key | String | No | - | Clave de configuracion unica (ej: "company_name", "receipt_header"). |
| value | String (Text) | No | - | Valor de la configuracion. Tipo Text para soportar valores largos. |

**Relaciones:** Ninguna. Modelo completamente independiente.

**Indices y constraints:**

| Tipo | Campos | Motivo |
|------|--------|--------|
| `@unique` | key | Cada clave de configuracion es unica. |
| `@@map` | `system_config` | Nombre de tabla en PostgreSQL. |

**Claves de configuracion conocidas:**

| Clave | Ejemplo de valor | Uso |
|-------|-----------------|-----|
| `company_name` | "Raices de Alvear" | Nombre en recibos y UI. |
| `receipt_header` | "Recibi de..." | Encabezado de recibos. |
| `receipt_footer` | "Firma y aclaracion" | Pie de recibos. |
| `company_logo_url` | "/uploads/logo.png" | Logo en recibos. |
| `company_cuit` | "30-12345678-9" | CUIT en documentos. |
| `default_exchange_source` | "blue_sell" | Tipo de cotizacion por defecto. |

**Reglas de negocio en el schema:**
- No tiene `createdAt` ni `updatedAt`: modelo simple de configuracion sin historial.
- Se accede mediante `system-config.model.ts` con operaciones get/set/getAll/getMany/delete.
- El upsert (`set`) crea o actualiza la clave atomicamente.

---

## 4. Mapa Global de Relaciones

La siguiente tabla documenta cada relacion existente en el schema con sus detalles de FK y comportamiento de cascada. "Default" en onDelete/onUpdate significa el comportamiento por defecto de PostgreSQL (Restrict/NoAction para onDelete, Cascade para onUpdate).

| Modelo A | Relacion | Modelo B | Campo FK | onDelete | onUpdate |
|----------|----------|----------|----------|----------|----------|
| Lot | N:1 | Development | Lot.developmentId | Default | Default |
| LotTag | N:1 | Lot | LotTag.lotId | Cascade | Default |
| LotTag | N:1 | Tag | LotTag.tagId | Cascade | Default |
| Sale | 1:1 | Lot | Sale.lotId | Default | Default |
| Sale | N:1 | Person | Sale.personId | Default | Default |
| Sale | N:1 | User (SaleSeller) | Sale.sellerId | Default | Default |
| Sale | N:1 | User (SaleCreatedBy) | Sale.createdById | Default | Default |
| Installment | N:1 | Sale | Installment.saleId | Cascade | Default |
| ExtraCharge | N:1 | Sale | ExtraCharge.saleId | Cascade | Default |
| ExtraCharge | N:1 | User (ChargeCreatedBy) | ExtraCharge.createdById | Default | Default |
| CashMovement | N:1 | Development | CashMovement.developmentId | Default | Default |
| CashMovement | N:1 | Person (PersonMovements) | CashMovement.personId | Default | Default |
| CashMovement | N:1 | Sale | CashMovement.saleId | Default | Default |
| CashMovement | N:1 | Installment | CashMovement.installmentId | Default | Default |
| CashMovement | N:1 | ExtraCharge | CashMovement.extraChargeId | Default | Default |
| CashMovement | N:1 | ExchangeRate | CashMovement.exchangeRateId | Default | Default |
| CashMovement | N:1 | User (RegisteredBy) | CashMovement.registeredById | Default | Default |
| CashBalance | N:1 | Development | CashBalance.developmentId | Default | Default |
| PaymentReceipt | 1:1 | CashMovement | PaymentReceipt.cashMovementId | Default | Default |
| PaymentReceipt | N:1 | Sale | PaymentReceipt.saleId | Default | Default |
| PaymentReceipt | N:1 | Person | PaymentReceipt.personId | Default | Default |
| PaymentReceipt | N:1 | User (GeneratedBy) | PaymentReceipt.generatedById | Default | Default |
| SigningSlot | N:1 | Development | SigningSlot.developmentId | Default | Default |
| SigningSlot | N:1 | User (SigningSeller) | SigningSlot.sellerId | Default | Default |
| SigningSlot | N:1 | User (SigningCreatedBy) | SigningSlot.createdById | Default | Default |
| SigningSlot | N:1 | Sale | SigningSlot.saleId | SetNull | Default |
| Message | N:1 | User (SentMessages) | Message.senderId | Default | Default |
| MessageRecipient | N:1 | Message | MessageRecipient.messageId | Cascade | Default |
| MessageRecipient | N:1 | User | MessageRecipient.userId | Default | Default |
| Notification | N:1 | User | Notification.userId | Cascade | Default |
| AuditLog | N:1 | User | AuditLog.userId | Default | Default |
| Person | N:1 | User (PersonCreatedBy) | Person.createdById | Default | Default |

**Total de relaciones:** 31

**Resumen de cascadas:**

| Comportamiento onDelete | Cantidad | Relaciones |
|------------------------|----------|------------|
| Cascade | 6 | LotTag->Lot, LotTag->Tag, Installment->Sale, ExtraCharge->Sale, MessageRecipient->Message, Notification->User |
| SetNull | 1 | SigningSlot->Sale |
| Default (Restrict) | 24 | Todas las demas |

**Analisis de cascada -- "Que pasa cuando se elimina X?":**

- **Eliminar un Development:** Falla (Restrict) si tiene Lots, CashMovements, CashBalances, o SigningSlots asociados. Se debe verificar `hasLotsWithSales()` antes de intentar.
- **Eliminar un Lot:** Falla si tiene una Sale asociada. Los LotTags se eliminan en cascada.
- **Eliminar una Sale:** Se eliminan en cascada: todos los Installments y ExtraCharges. Los SigningSlots pierden la referencia (SetNull). Los CashMovements y PaymentReceipts NO se eliminan (quedan como registros huerfanos de caja).
- **Eliminar un User:** Falla si tiene CashMovements, Sales, AuditLogs, etc. asociados (todas son Default/Restrict). Las Notifications se eliminan en cascada.
- **Eliminar una Tag:** Los LotTags se eliminan en cascada.
- **Eliminar un Message:** Los MessageRecipients se eliminan en cascada.
- **Eliminar un ExchangeRate:** Falla si tiene CashMovements asociados.

---

## 5. Arquitectura de Moneda Dual USD/ARS

El sistema opera con dos monedas: dolares estadounidenses (USD) como moneda de denominacion de ventas, y pesos argentinos (ARS) como moneda de pago local. Esta seccion documenta como se modelan los campos financieros, como se conecta la cotizacion a las transacciones, y como funciona la conversion.

### 5.1 Campos que Almacenan USD

Todos los precios de venta y cuotas se denominan en USD. La precision estandar es `Decimal(12,2)`.

| Modelo | Campo | Tipo Prisma | Descripcion |
|--------|-------|-------------|-------------|
| Lot | listPrice | Decimal(12,2) | Precio de lista del lote en USD. |
| Sale | totalPrice | Decimal(12,2) | Precio total de venta en USD. |
| Sale | downPayment | Decimal(12,2) | Anticipo/entrega en USD. |
| Sale | firstInstallmentAmount | Decimal(12,2) | Monto de la primera cuota en USD. |
| Sale | regularInstallmentAmount | Decimal(12,2) | Monto de cuotas regulares en USD. |
| Sale | commissionAmount | Decimal(12,2) | Comision del vendedor en USD. |
| Installment | amount | Decimal(12,2) | Monto actual de la cuota en USD. |
| Installment | originalAmount | Decimal(12,2) | Monto original pre-recalculo en USD. |
| Installment | paidAmount | Decimal(12,2) | Monto pagado de la cuota (en la moneda de la cuota). |
| ExtraCharge | amount | Decimal(12,2) | Monto del refuerzo en USD. |
| ExtraCharge | paidAmount | Decimal(12,2) | Monto pagado del refuerzo. |
| CashMovement | usdIncome | Decimal(12,2) | Ingreso en USD del movimiento de caja. |
| CashMovement | usdExpense | Decimal(12,2) | Egreso en USD del movimiento de caja. |
| CashBalance | usdBalance | Decimal(12,2) | Saldo neto en USD del periodo. |

### 5.2 Campos que Almacenan ARS

Los montos en pesos utilizan `Decimal(14,2)` para acomodar valores significativamente mayores (la cotizacion puede ser 1000+ ARS por USD).

| Modelo | Campo | Tipo Prisma | Descripcion |
|--------|-------|-------------|-------------|
| CashMovement | arsIncome | Decimal(14,2) | Ingreso en pesos del movimiento de caja. |
| CashMovement | arsExpense | Decimal(14,2) | Egreso en pesos del movimiento de caja. |
| CashBalance | arsBalance | Decimal(14,2) | Saldo neto en pesos del periodo. |

### 5.3 Campos de Cotizacion y Tipo de Cambio

| Modelo | Campo | Tipo Prisma | Descripcion |
|--------|-------|-------------|-------------|
| ExchangeRate | officialBuy | Decimal(10,2) | Cotizacion oficial compra ARS/USD. |
| ExchangeRate | officialSell | Decimal(10,2) | Cotizacion oficial venta ARS/USD. |
| ExchangeRate | blueBuy | Decimal(10,2) | Cotizacion blue compra ARS/USD. |
| ExchangeRate | blueSell | Decimal(10,2) | Cotizacion blue venta ARS/USD. |
| ExchangeRate | cryptoBuy | Decimal(10,2) | Cotizacion cripto compra ARS/USD. |
| ExchangeRate | cryptoSell | Decimal(10,2) | Cotizacion cripto venta ARS/USD. |
| Sale | exchangeRateOverride | Decimal(10,2) | Cotizacion fija pactada para la venta. |
| CashMovement | manualRate | Decimal(10,2) | Cotizacion manual usada en el movimiento. |
| User | commissionRate | Decimal(5,2) | Tasa de comision del vendedor (porcentaje). |

### 5.4 Modelo ExchangeRate

El modelo ExchangeRate almacena una entrada por dia con tres pares de cotizacion (compra/venta):

1. **Oficial**: Cotizacion regulada por el gobierno.
2. **Blue**: Cotizacion informal del mercado paralelo (la mas usada en transacciones inmobiliarias).
3. **Cripto**: Cotizacion de criptomonedas (referencia).

La fuente principal es `dolarapi.com/v1/dolares` (API gratuita, sin API key). La obtencion es automatica: cuando se consulta la cotizacion del dia (`getTodayExchangeRate()` en `src/server/actions/exchange-rate.actions.ts`), si no existe en la base de datos, se obtiene de la API y se guarda. Tambien permite carga manual.

### 5.5 Flujo de Conversion

El flujo completo cuando se paga una cuota denominada en USD con pesos argentinos:

1. **Cuota en USD:** La cuota (`Installment`) tiene `amount = 500.00` y `currency = USD`.
2. **Obtencion de cotizacion:** El sistema obtiene la cotizacion del dia desde ExchangeRate (o la fetcha de la API si no existe). La fuente preferida se configura en SystemConfig (`default_exchange_source`, tipicamente `"blue_sell"`).
3. **Conversion:** Se utiliza `src/lib/exchange-rate.ts -> convertCurrency()`:
   - USD a ARS: `amount * rate` (ej: 500 USD * 1200 ARS/USD = 600,000 ARS).
   - ARS a USD: `amount / rate` (ej: 600,000 ARS / 1200 ARS/USD = 500 USD).
4. **Registro del movimiento:** Se crea un `CashMovement` con:
   - `usdIncome = 500.00` (o null si el pago es solo en ARS).
   - `arsIncome = 600000.00` (el equivalente en pesos).
   - `exchangeRateId` = ID de la cotizacion del dia (trazabilidad).
   - `installmentId` = ID de la cuota que se esta pagando.
5. **Actualizacion de cuota:** `Installment.status` cambia a `PAGADA`, `paidAmount` se actualiza, `paidInCurrency` registra la moneda real del pago, `paidDate` registra la fecha.

**Cotizacion fija por venta:** Si `Sale.exchangeRateOverride` tiene valor, se usa esa cotizacion en vez de la del dia para todos los pagos de esa venta.

**Cotizacion manual por movimiento:** Si `CashMovement.manualRate` tiene valor, se uso una cotizacion especifica para ese movimiento particular.

### 5.6 Precision Decimal

Todos los campos financieros usan `@db.Decimal(X,Y)` de Prisma, que mapea a `DECIMAL(X,Y)` en PostgreSQL. Esto garantiza precision exacta sin errores de punto flotante.

| Precision | Rango Maximo | Uso |
|-----------|-------------|-----|
| `Decimal(5,2)` | 999.99 | Tasa de comision (porcentaje). |
| `Decimal(10,2)` | 99,999,999.99 | Cotizaciones ARS/USD. Suficiente para cotizaciones hasta ~100M. |
| `Decimal(12,2)` | 9,999,999,999.99 | Montos en USD (precios, cuotas, saldos). Soporta operaciones de hasta ~10 mil millones. |
| `Decimal(14,2)` | 999,999,999,999.99 | Montos en ARS (ingresos, egresos, saldos). Mayor precision por la magnitud de los montos en pesos argentinos. |

**Nota:** El campo `Lot.area` tambien usa `Decimal(10,2)` para metros cuadrados con precision decimal (ej: 325.50 m2).

---

## 6. Implementacion del Audit Trail

### 6.1 Estructura del Modelo AuditLog

El modelo AuditLog (documentado en la seccion 3.19) almacena registros inmutables de operaciones. Los campos clave son:

- **action:** Cadena libre que identifica la operacion. Valores observados: `"CREATE"`, `"UPDATE"`, `"DELETE"`, `"BULK_UPDATE"`, `"IMPORT"`.
- **entity:** Nombre del modelo afectado como string (ej: `"Sale"`, `"Lot"`, `"CashMovement"`).
- **entityId:** ID de la entidad. Para operaciones bulk, puede contener IDs concatenados con comas (ej: `"id1,id2,id3"`). Para imports, puede contener `"BULK_IMPORT"`.
- **oldData/newData:** Campos JSON opcionales que almacenan snapshots del estado antes y despues del cambio.

### 6.2 Que se Audita

La auditoria se implementa mediante dos funciones principales:
- `src/lib/audit.ts -> logAction()`: Funcion base que crea el registro de auditoria. Falla silenciosamente (nunca interrumpe la operacion que la invoca).
- `src/server/actions/audit-log.actions.ts -> logAction()` y `logActionFromSession()`: Wrappers que pueden obtener el userId de la sesion automaticamente.

**Entidades auditadas y acciones registradas:**

| Entidad | Acciones | Archivo Fuente |
|---------|----------|----------------|
| **User** | CREATE, UPDATE (datos, contrasena, toggle active) | `src/server/actions/user.actions.ts` |
| **Lot** | CREATE, UPDATE, BULK_UPDATE, DELETE | `src/server/actions/lot.actions.ts` |
| **Person** | CREATE, UPDATE (datos, toggle active) | `src/server/actions/person.actions.ts` |
| **Sale** | CREATE, UPDATE (status) | `src/server/services/sale.service.ts` |
| **CashMovement** | CREATE | `src/server/actions/cash-movement.actions.ts` |
| **ExchangeRate** | UPDATE (manual rate) | `src/server/actions/exchange-rate.actions.ts` |
| **ExtraCharge** | CREATE, UPDATE, DELETE | `src/server/services/extra-charge.service.ts` |
| **SigningSlot** | CREATE, UPDATE, DELETE, LINK_SALE, UNLINK_SALE | `src/server/actions/signing.actions.ts` |
| **Tag** | CREATE, UPDATE, DELETE | `src/server/actions/tag.actions.ts` |
| **Development** | CREATE, UPDATE, DELETE | `src/server/services/development.service.ts` |
| **Person (import)** | IMPORT | `src/server/services/import.service.ts` |
| **Sale (import)** | IMPORT | `src/server/services/import.service.ts` |

### 6.3 Datos Capturados

Cada registro de auditoria captura:

1. **Quien:** `userId` -- ID del usuario que ejecuto la accion. Se obtiene de la sesion de Auth.js o se pasa explicitamente.
2. **Que entidad:** `entity` + `entityId` -- Nombre del modelo y su ID.
3. **Que accion:** `action` -- Tipo de operacion (CREATE, UPDATE, DELETE, etc.).
4. **Estado previo:** `oldData` (Json) -- Snapshot del estado antes del cambio. No se captura para CREATE.
5. **Estado posterior:** `newData` (Json) -- Snapshot del estado despues del cambio. No se captura para DELETE.
6. **Cuando:** `createdAt` -- Timestamp automatico.
7. **Desde donde:** `ipAddress` -- Definido en el schema pero no implementado actualmente.

**Ejemplo de registro de auditoria para una actualizacion de venta:**
```json
{
  "userId": "clx1234...",
  "action": "UPDATE",
  "entity": "Sale",
  "entityId": "clx5678...",
  "oldData": { "status": "ACTIVA" },
  "newData": { "status": "COMPLETADA" },
  "createdAt": "2026-03-17T10:30:00Z"
}
```

### 6.4 Consulta y Retencion

**Consulta:**
Los logs de auditoria se consultan desde `src/server/models/audit-log.model.ts` con dos metodos:

1. **`findAll(params)`:** Lista paginada (maximo 100 registros) con filtros opcionales por:
   - `search`: Busqueda en entity, entityId, y action.
   - `entity`: Filtro por tipo de entidad.
   - `userId`: Filtro por usuario.
   - `dateFrom` / `dateTo`: Rango de fechas.
   - Incluye datos del usuario (`name`, `lastName`) via join.

2. **`findByEntity(entity, entityId)`:** Historial completo de una entidad especifica. Devuelve todos los cambios ordenados por fecha descendente.

**Acceso:** La consulta de logs requiere permiso `config:manage` (implementado en `src/server/actions/audit-log.actions.ts -> getAuditLogs()`).

**Retencion:** No hay estrategia de retencion implementada. Los logs se acumulan indefinidamente. Los indices en `[entity, entityId]`, `[userId]`, y `[createdAt]` optimizan las consultas mas comunes.

**Resiliencia:** La funcion `logAction()` en `src/lib/audit.ts` envuelve la creacion en try/catch y solo emite un `console.error` si falla. Esto garantiza que un error de auditoria nunca interrumpa una operacion de negocio.

---

## 7. Observaciones y Patrones

### 7.1 Patrones Comunes en Todos los Modelos

- **Identificadores CUID:** Todos los modelos usan `@id @default(cuid())` en vez de autoincrement. Esto genera IDs unicos sin coordinacion central, ideal para sistemas distribuidos.
- **Timestamps:** Todos los modelos (excepto SystemConfig) tienen `createdAt @default(now())`. La mayoria tambien tiene `updatedAt @updatedAt` (excepto Message, AuditLog, ExchangeRate, CashBalance, PaymentReceipt, Notification, SystemConfig, RolePermission, Tag, LotTag, MessageRecipient).
- **Column mapping:** Todos los campos camelCase en Prisma estan mapeados a snake_case en PostgreSQL mediante `@map()`. Todas las tablas usan `@@map()` para nombres en plural/snake_case.
- **Sin soft delete:** No hay patron de soft delete (campo `deletedAt`) en ningun modelo. El campo `isActive` en User y Person funciona como desactivacion logica, no como eliminacion suave.

### 7.2 Decisiones de Diseno Notables

- **Seller como parte de User:** En vez de un modelo `Seller` separado, los datos de vendedor (`isSeller`, `commissionRate`) estan integrados en User. Esto simplifica consultas pero acopla dos conceptos.
- **CashMovement como modelo unificado:** En vez de tener tablas separadas para pagos de cuotas, sueldos, gastos, etc., todos los movimientos financieros se almacenan en una sola tabla con 18 tipos. Esto simplifica la vista de caja pero genera un modelo con muchos campos nullable.
- **Referencia polimorfica en Notification:** En vez de FKs explicitas a cada entidad, usa `referenceType` + `referenceId` como patron de referencia polimorfica. Esto es flexible pero pierde integridad referencial.
- **Horarios como strings:** SigningSlot almacena `time` y `endTime` como strings "HH:mm" en vez de DateTime. Esto simplifica la integracion con el calendario pero requiere parsing manual.
- **Sin tabla de Seller:** La decision de merge se documenta en el schema (v0.6). Las relaciones `SaleSeller` y `SigningSeller` apuntan directamente a User.
- **Multi-lote con groupId:** En vez de una tabla N:M entre Sale y Lot, se usa `groupId` en Sale para agrupar ventas que comparten plan de pago. Cada Sale sigue teniendo un solo Lot (1:1).

### 7.3 Integridad Referencial

- La mayoria de las relaciones usan `onDelete: Default` (Restrict en PostgreSQL), lo que impide eliminar registros referenciados.
- Las excepciones notables son:
  - `onDelete: Cascade` en Installment/ExtraCharge -> Sale: eliminar una venta elimina todas sus cuotas y refuerzos.
  - `onDelete: Cascade` en LotTag -> Lot/Tag: limpiar asociaciones al eliminar lote o etiqueta.
  - `onDelete: Cascade` en MessageRecipient -> Message y Notification -> User: limpiar registros de mensajeria.
  - `onDelete: SetNull` en SigningSlot -> Sale: el turno de firma sobrevive a la eliminacion de la venta.

### 7.4 Referencia Cruzada

- Para el contexto de negocio y flujos operativos, ver `docs/AUDIT_CONCEPT.md`.
- Para el schema fuente completo, ver `prisma/schema.prisma`.
- Para la logica de recalculo de cuotas por refuerzos, ver `src/lib/installment-recalculator.ts`.
- Para la obtencion de cotizaciones, ver `src/lib/exchange-rate.ts` y `src/server/actions/exchange-rate.actions.ts`.
- Para la implementacion de auditoria, ver `src/lib/audit.ts` y `src/server/actions/audit-log.actions.ts`.
- Para las consultas de datos por modelo, ver `src/server/models/*.model.ts`.
