# Auditoria de Backend: Server Actions y Services

**Fecha:** 2026-03-18
**Version:** 1.0
**Proposito:** Documentar exhaustivamente cada server action y service del Sistema Inmobiliaria -- su firma, validacion, flujo paso a paso, modelos afectados y condiciones de error. Este documento permite a cualquier desarrollador trazar una operacion desde el punto de entrada (action) hasta la base de datos, sin necesidad de leer el codigo fuente.

**Arquitectura de capas:**
```
Pages (UI) -> Server Actions (src/server/actions/) -> Services (src/server/services/) -> Models (src/server/models/) -> Prisma -> PostgreSQL
```

**Como leer este documento:**
- Cada funcion documentada tiene un bloque de metadatos con 5 campos fijos: Archivo, Guard, Schema, Retorno + Errores, Modelos afectados.
- Despues del bloque de metadatos, un flujo paso a paso numerado describe la logica exacta.
- Cuando una action delega a un service, se indica con: "-> Ver {service}.{metodo}() en seccion X.Y"
- En la primera mencion de un modelo Prisma, se incluye una nota con referencia a AUDIT_DATABASE.md.
- Documentos relacionados: [AUDIT_CONCEPT.md](./AUDIT_CONCEPT.md) (vision conceptual, glosario, roles), [AUDIT_DATABASE.md](./AUDIT_DATABASE.md) (schema Prisma, modelos, enums, relaciones).

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Indice Alfabetico de Funciones](#2-indice-alfabetico-de-funciones)
3. [Utilidades Compartidas](#3-utilidades-compartidas)
4. [Ventas (Sales)](#4-ventas-sales)
   - 4.1 [sale.actions.ts](#41-saleactionsts)
   - 4.2 [sale.service.ts](#42-saleservicets)
   - 4.3 [lot.actions.ts](#43-lotactionsts)
5. [Pagos y Cuotas (Payments, Installments, Extra Charges)](#5-pagos-y-cuotas-payments-installments-extra-charges)
   - 5.1 [payment.actions.ts](#51-paymentactionsts)
   - 5.2 [payment.service.ts](#52-paymentservicets)
   - 5.3 [extra-charge.actions.ts](#53-extra-chargeactionsts)
   - 5.4 [extra-charge.service.ts](#54-extra-chargeservicets)
   - 5.5 [receipt.service.ts](#55-receiptservicets)
6. [Caja y Cotizacion (Cash Movements, Balances, Exchange Rates)](#6-caja-y-cotizacion-cash-movements-balances-exchange-rates)
   - 6.1 [cash-movement.actions.ts](#61-cash-movementactionsts)
   - 6.2 [cash-balance.actions.ts](#62-cash-balanceactionsts)
   - 6.3 [exchange-rate.actions.ts](#63-exchange-rateactionsts)
7. [Firmas y Escrituracion (Plan 02)](#7-firmas-y-escrituracion-plan-02)
8. [Personas y Usuarios (Plan 02)](#8-personas-y-usuarios-plan-02)
9. [Desarrollos y Etiquetas (Plan 02)](#9-desarrollos-y-etiquetas-plan-02)
10. [Comunicaciones y Notificaciones (Plan 02)](#10-comunicaciones-y-notificaciones-plan-02)
11. [Sistema y Configuracion (Plan 02)](#11-sistema-y-configuracion-plan-02)

---

## 1. Introduccion

### Alcance

Este documento cubre la totalidad de las funciones exportadas en:

- **21 archivos de server actions** en `src/server/actions/` -- el punto de entrada para toda operacion iniciada desde la UI o desde otras acciones.
- **7 archivos de services** en `src/server/services/` -- la capa de logica de negocio que encapsula transacciones complejas.
- **4 archivos de utilidades compartidas** en `src/lib/` -- funciones auxiliares reutilizadas por actions y services.

### Arquitectura

El sistema sigue la convencion de Next.js 15 App Router con Server Actions:

1. **Pages (UI):** Componentes React que invocan server actions directamente via `useFormState`, `useFormAction`, o llamadas directas.
2. **Server Actions (`src/server/actions/`):** Funciones marcadas con `"use server"`. Reciben `FormData` o parametros tipados, validan con Zod, verifican permisos via `requirePermission()`, delegan logica compleja a services, y llaman `revalidatePath()` para actualizar la cache.
3. **Services (`src/server/services/`):** Contienen logica de negocio transaccional compleja. Usan `prisma.$transaction()` para operaciones atomicas multi-modelo. No tienen acceso directo a la sesion -- reciben `userId` como parametro.
4. **Models (`src/server/models/`):** Wrappers delgados sobre Prisma que encapsulan queries comunes (findAll, findById, create, etc.).
5. **Prisma:** ORM que genera el cliente tipado desde `prisma/schema.prisma`.

### Patron de guards

Todas las actions usan `requirePermission(permiso)` de `src/lib/auth-guard.ts` como guardia de acceso. Esta funcion:
- Verifica que exista una sesion activa (Auth.js v5)
- Consulta los permisos configurados en la tabla `RolePermission` (ver AUDIT_DATABASE.md seccion 3.2)
- Lanza un error si el usuario no tiene el permiso requerido
- Retorna el objeto `session` con `session.user.id` para audit logging

### Patron de retorno

Las actions que mutan datos siguen el patron `ActionResult`:
```typescript
type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }
```

Las actions de lectura retornan directamente el dato o `null`/`[]`.

### Patron de errores

Los services lanzan `ServiceError` (ver seccion 3.1). Las actions atrapan `ServiceError` y lo convierten en `{ success: false, error: message }`. Errores no esperados se loguean con `console.error` y retornan un mensaje generico.

### Referencias cruzadas

- Para definiciones de modelos, campos, tipos y relaciones: ver [AUDIT_DATABASE.md](./AUDIT_DATABASE.md)
- Para vision conceptual, glosario de dominio y matriz de permisos: ver [AUDIT_CONCEPT.md](./AUDIT_CONCEPT.md)
- Para enums de dominio (SaleStatus, LotStatus, MovementType, etc.): ver AUDIT_DATABASE.md seccion 2

---

## 2. Indice Alfabetico de Funciones

Referencia rapida de todas las funciones exportadas del sistema, ordenadas alfabeticamente.

| Funcion | Archivo | Modulo | Seccion |
|---------|---------|--------|---------|
| `bulkSetLotTags` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `bulkUpdateLotStatus` | lot.actions.ts | Lotes | &sect;4.3 |
| `cancelSale` (action) | sale.actions.ts | Ventas | &sect;4.1 |
| `cancelSale` (service) | sale.service.ts | Ventas | &sect;4.2 |
| `changeUserPassword` | user.actions.ts | Usuarios | &sect;8.2 |
| `completeSigningSlot` | signing.service.ts | Firmas | &sect;7.2 |
| `convertCurrency` | exchange-rate.ts (lib) | Utilidades | &sect;3.4 |
| `createCashMovement` | cash-movement.actions.ts | Caja | &sect;6.1 |
| `createDevelopment` (action) | development.actions.ts | Desarrollos | &sect;9.1 |
| `createDevelopment` (service) | development.service.ts | Desarrollos | &sect;9.3 |
| `createExtraCharge` (action) | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `createExtraCharge` (service) | extra-charge.service.ts | Pagos | &sect;5.4 |
| `createLot` | lot.actions.ts | Lotes | &sect;4.3 |
| `createNotification` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `createNotificationInternal` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `createPerson` | person.actions.ts | Personas | &sect;8.1 |
| `createPersonQuick` | person.actions.ts | Personas | &sect;8.1 |
| `createSale` (action) | sale.actions.ts | Ventas | &sect;4.1 |
| `createSale` (service) | sale.service.ts | Ventas | &sect;4.2 |
| `createSigning` | signing.actions.ts | Firmas | &sect;7.1 |
| `createTag` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `createUser` | user.actions.ts | Usuarios | &sect;8.2 |
| `deleteDevelopment` (action) | development.actions.ts | Desarrollos | &sect;9.1 |
| `deleteExtraCharge` (action) | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `deleteExtraCharge` (service) | extra-charge.service.ts | Pagos | &sect;5.4 |
| `deleteDevelopment` (service) | development.service.ts | Desarrollos | &sect;9.3 |
| `deleteLot` | lot.actions.ts | Lotes | &sect;4.3 |
| `deleteSigning` | signing.actions.ts | Firmas | &sect;7.1 |
| `deleteTag` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `fetchDolarApiRates` | exchange-rate.ts (lib) | Utilidades | &sect;3.4 |
| `generateAllBalances` | cash-balance.actions.ts | Caja | &sect;6.2 |
| `generateMonthlyBalance` | cash-balance.actions.ts | Caja | &sect;6.2 |
| `generateReceipt` (action) | payment-receipt.actions.ts | Recibos | &sect;11.3 |
| `generateReceipt` (service) | receipt.service.ts | Recibos | &sect;5.5 |
| `getActiveUsersForMessaging` | message.actions.ts | Mensajes | &sect;10.1 |
| `getActiveSellers` | user.actions.ts | Usuarios | &sect;8.2 |
| `getAllRolePermissions` | role-permission.actions.ts | Sistema | &sect;11.1 |
| `getAuditLogs` | audit-log.actions.ts | Sistema | &sect;11.2 |
| `getBusinessHours` | business-hours.actions.ts | Sistema | &sect;11.4 |
| `getCashBalances` | cash-balance.actions.ts | Caja | &sect;6.2 |
| `getCashMovementById` | cash-movement.actions.ts | Caja | &sect;6.1 |
| `getCashMovements` | cash-movement.actions.ts | Caja | &sect;6.1 |
| `getCashMovementsBySale` | cash-movement.actions.ts | Caja | &sect;6.1 |
| `getCashMovementsSummary` | cash-movement.actions.ts | Caja | &sect;6.1 |
| `getDevelopmentBySlug` | development.actions.ts | Desarrollos | &sect;9.1 |
| `getDevelopmentOptions` | development.actions.ts | Desarrollos | &sect;9.1 |
| `getDevelopments` | development.actions.ts | Desarrollos | &sect;9.1 |
| `getEmployees` | user.actions.ts | Usuarios | &sect;8.2 |
| `getExchangeRates` | exchange-rate.actions.ts | Cotizacion | &sect;6.3 |
| `getExtraChargesBySale` | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `getLatestExchangeRate` | exchange-rate.actions.ts | Cotizacion | &sect;6.3 |
| `getLotsByDevelopment` | lot.actions.ts | Lotes | &sect;4.3 |
| `getMyMessages` | message.actions.ts | Mensajes | &sect;10.1 |
| `getMyNotifications` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `getPaymentReceiptById` | payment-receipt.actions.ts | Recibos | &sect;11.3 |
| `getPaymentReceipts` | payment-receipt.actions.ts | Recibos | &sect;11.3 |
| `getPersonById` | person.actions.ts | Personas | &sect;8.1 |
| `getPersons` | person.actions.ts | Personas | &sect;8.1 |
| `getSaleById` | sale.actions.ts | Ventas | &sect;4.1 |
| `getSaleForPrint` | sale.actions.ts | Ventas | &sect;4.1 |
| `getSales` | sale.actions.ts | Ventas | &sect;4.1 |
| `getSentMessages` | message.actions.ts | Mensajes | &sect;10.1 |
| `getSigningById` | signing.actions.ts | Firmas | &sect;7.1 |
| `getSignings` | signing.actions.ts | Firmas | &sect;7.1 |
| `getSigningsByWeek` | signing.actions.ts | Firmas | &sect;7.1 |
| `getSystemConfig` | system-config.actions.ts | Sistema | &sect;11.5 |
| `getTagsForLot` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `getTags` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `getTodayExchangeRate` | exchange-rate.actions.ts | Cotizacion | &sect;6.3 |
| `getUnlinkedSignings` | signing.actions.ts | Firmas | &sect;7.1 |
| `getUnreadCount` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `getUnreadMessageCount` | message.actions.ts | Mensajes | &sect;10.1 |
| `getUserById` | user.actions.ts | Usuarios | &sect;8.2 |
| `getUsers` | user.actions.ts | Usuarios | &sect;8.2 |
| `importPersons` (action) | import.actions.ts | Importacion | &sect;11.6 |
| `importPersons` (service) | import.service.ts | Importacion | &sect;11.7 |
| `importSales` (action) | import.actions.ts | Importacion | &sect;11.6 |
| `importSales` (service) | import.service.ts | Importacion | &sect;11.7 |
| `linkSigningToSale` | signing.actions.ts | Firmas | &sect;7.1 |
| `logAction` (action) | audit-log.actions.ts | Sistema | &sect;11.2 |
| `logAction` (lib) | audit.ts (lib) | Utilidades | &sect;3.2 |
| `logActionFromSession` | audit-log.actions.ts | Sistema | &sect;11.2 |
| `loginAction` | auth.actions.ts | Auth | &sect;11.8 |
| `logoutAction` | auth.actions.ts | Auth | &sect;11.8 |
| `markAllNotificationsRead` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `markMessageRead` | message.actions.ts | Mensajes | &sect;10.1 |
| `markNotificationRead` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `createManualExchangeRate` | exchange-rate.actions.ts | Cotizacion | &sect;6.3 |
| `payExtraCharge` (action) | payment.actions.ts | Pagos | &sect;5.1 |
| `payExtraCharge` (service) | payment.service.ts | Pagos | &sect;5.2 |
| `payInstallment` (action) | payment.actions.ts | Pagos | &sect;5.1 |
| `payInstallment` (service) | payment.service.ts | Pagos | &sect;5.2 |
| `recalculateInstallments` | installment-recalculator.ts (lib) | Utilidades | &sect;3.5 |
| `recordDeliveryPayment` (action) | payment.actions.ts | Pagos | &sect;5.1 |
| `recordDeliveryPayment` (service) | payment.service.ts | Pagos | &sect;5.2 |
| `resolveNotificationUrl` | notification.actions.ts | Notificaciones | &sect;10.2 |
| `searchPersonsForCollection` | person.actions.ts | Personas | &sect;8.1 |
| `seedDefaultPermissions` | role-permission.actions.ts | Sistema | &sect;11.1 |
| `sendMessage` | message.actions.ts | Mensajes | &sect;10.1 |
| `serializeSaleForClient` | sale.service.ts | Ventas | &sect;4.2 |
| `setLotTags` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `togglePersonActive` | person.actions.ts | Personas | &sect;8.1 |
| `toggleUserActive` | user.actions.ts | Usuarios | &sect;8.2 |
| `toggleUserSeller` | user.actions.ts | Usuarios | &sect;8.2 |
| `unlinkSigningFromSale` | signing.actions.ts | Firmas | &sect;7.1 |
| `updateBusinessHours` | business-hours.actions.ts | Sistema | &sect;11.4 |
| `updateDevelopment` (action) | development.actions.ts | Desarrollos | &sect;9.1 |
| `updateDevelopment` (service) | development.service.ts | Desarrollos | &sect;9.3 |
| `updateExtraCharge` (action) | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `updateExtraCharge` (service) | extra-charge.service.ts | Pagos | &sect;5.4 |
| `updateLot` | lot.actions.ts | Lotes | &sect;4.3 |
| `updatePerson` | person.actions.ts | Personas | &sect;8.1 |
| `updateRolePermissions` | role-permission.actions.ts | Sistema | &sect;11.1 |
| `updateSigning` | signing.actions.ts | Firmas | &sect;7.1 |
| `updateSigningStatus` | signing.actions.ts | Firmas | &sect;7.1 |
| `updateSystemConfig` | system-config.actions.ts | Sistema | &sect;11.5 |
| `updateTag` | tag.actions.ts | Etiquetas | &sect;9.2 |
| `updateUser` | user.actions.ts | Usuarios | &sect;8.2 |
| `updateUserCommission` | user.actions.ts | Usuarios | &sect;8.2 |

**Total:** 108 funciones exportadas en 21 archivos de actions + 7 archivos de services + 4 archivos de utilidades.

---

## 3. Utilidades Compartidas

Funciones auxiliares en `src/lib/` usadas transversalmente por actions y services.

### 3.1 ServiceError (`src/lib/service-error.ts`)

Clase de error personalizada para errores de logica de negocio.

```typescript
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}
```

**Patron de uso:**
- Los services lanzan `new ServiceError("mensaje descriptivo en espanol")` cuando una regla de negocio se viola.
- Las actions atrapan `ServiceError` y lo convierten en `{ success: false, error: error.message }`.
- Los errores no esperados (Prisma, red, etc.) se loguean con `console.error` y retornan un mensaje generico.

**Ejemplo:** `throw new ServiceError("El lote no esta disponible para venta")`

### 3.2 logAction (`src/lib/audit.ts`)

Wrapper ligero para crear entradas en la tabla AuditLog (ver AUDIT_DATABASE.md seccion 3.19). Extraido de `audit-log.actions.ts` para que los services puedan usarlo sin importar acciones cross-layer.

**Firma:**
```typescript
export async function logAction(
  entity: string,        // Nombre del modelo: "Sale", "Installment", "Lot", etc.
  entityId: string,      // ID del registro afectado
  action: string,        // Tipo de accion: "CREATE", "UPDATE", "DELETE", "BULK_UPDATE"
  details?: { oldData?: unknown; newData?: unknown },  // Datos antes/despues del cambio
  userId?: string        // ID del usuario que realizo la accion
): Promise<void>
```

**Comportamiento:**
1. Si `userId` no esta presente, loguea una advertencia y retorna sin crear el registro.
2. Llama a `auditLogModel.create()` para insertar en la tabla `audit_logs`.
3. Nunca lanza excepcion -- falla silenciosamente con `console.error`. Esto es intencional: el audit log no debe romper la operacion principal.

**Usado en:** `sale.service.ts`, `payment.service.ts`, `extra-charge.service.ts`, `receipt.service.ts`.

### 3.3 logAction / logActionFromSession (`src/server/actions/audit-log.actions.ts`)

Version alternativa usada por actions que tienen acceso directo al `userId`. Funcionalidad identica a la de `src/lib/audit.ts`, pero con acceso al session object. Documentacion completa en &sect;11.2.

### 3.4 fetchDolarApiRates y convertCurrency (`src/lib/exchange-rate.ts`)

#### fetchDolarApiRates

Obtiene cotizaciones del dolar desde la API publica `dolarapi.com`.

**Firma:**
```typescript
export async function fetchDolarApiRates(): Promise<{
  officialBuy: number | null;
  officialSell: number | null;
  blueBuy: number | null;
  blueSell: number | null;
  cryptoBuy: number | null;
  cryptoSell: number | null;
} | null>
```

**Flujo:**
1. Realiza `fetch("https://dolarapi.com/v1/dolares")` con cache de 1 hora (`next: { revalidate: 3600 }`).
2. Si la respuesta no es OK, retorna `null` (fallo silencioso).
3. Parsea el array de cotizaciones y extrae tres tipos de dolar:
   - **Oficial** (`casa === "oficial"`): cotizacion regulada por el BCRA
   - **Blue** (`casa === "blue"`): cotizacion del mercado paralelo
   - **Cripto** (`casa === "cripto"`): cotizacion via exchanges de criptomonedas
4. Retorna un objeto con compra/venta de cada tipo, o `null` si alguno no esta disponible.
5. En caso de excepcion (red, parsing), retorna `null` sin lanzar error.

**Caching:** Next.js ISR cache con revalidacion cada 3600 segundos (1 hora). Esto significa que multiples llamadas dentro de la misma hora usan la misma respuesta cacheada.

#### convertCurrency

Convierte montos entre USD y ARS usando una cotizacion dada.

**Firma:**
```typescript
export async function convertCurrency(
  amount: number,
  fromCurrency: "USD" | "ARS",
  toCurrency: "USD" | "ARS",
  rate: number
): Promise<number>
```

**Logica:**
1. Si `fromCurrency === toCurrency`, retorna el mismo monto.
2. USD a ARS: `amount * rate`
3. ARS a USD: `amount / rate` (valida que `rate > 0`, lanza `Error` si no).

### 3.5 recalculateInstallments (`src/lib/installment-recalculator.ts`)

Recalcula los montos de cuotas pendientes despues de que un refuerzo (ExtraCharge) es pagado. Este es un mecanismo central del sistema de financiacion: cuando el cliente paga un refuerzo, el monto se distribuye proporcionalmente entre las cuotas restantes, reduciendo cada una.

**Firma:**
```typescript
export async function recalculateInstallments(
  saleId: string,
  paidExtraChargeAmount: number,
  tx?: TxClient  // Cliente de transaccion Prisma opcional
): Promise<void>
```

**Algoritmo paso a paso:**
1. Obtener todas las cuotas impagas de la venta (status `PENDIENTE`, `VENCIDA`, o `PARCIAL`), ordenadas por numero de cuota ascendente.
2. Si no hay cuotas impagas, retornar sin hacer nada.
3. Calcular la reduccion por cuota: `paidExtraChargeAmount / cantidadCuotasImpagas`.
4. Para cada cuota impaga:
   a. Calcular nuevo monto: `max(montoActual - reduccionPorCuota, 0)`, redondeado a 2 decimales.
   b. Si es la primera vez que se recalcula (campo `originalAmount` es `null`), guardar el monto actual como `originalAmount` para referencia historica (mostrado como tachado en la UI).
   c. Actualizar el campo `amount` con el nuevo monto.
   d. Si el nuevo monto llega a 0: marcar la cuota como `PAGADA` con `paidAmount = montoActual` y `paidDate = now`.
5. Despues de actualizar todas las cuotas, contar las cuotas que NO estan `PAGADA`.
6. Si todas las cuotas estan pagadas (remainingUnpaid === 0), actualizar el status de la venta a `COMPLETADA`.

**Transaccionalidad:** Si se pasa `tx` (cliente de transaccion), todas las operaciones corren dentro de esa transaccion. Si no, usa la conexion Prisma directa. En el flujo de pago de refuerzo (&sect;5.2 payExtraCharge), siempre se pasa `tx` para garantizar atomicidad.

**Modelos afectados:** Installment (ver AUDIT_DATABASE.md seccion 3.9), Sale (ver AUDIT_DATABASE.md seccion 3.8).

---

## 4. Ventas (Sales)

Dominio mas complejo del sistema. Cubre la creacion de ventas con generacion automatica de cuotas, cancelacion, consulta y serializacion. Ver AUDIT_CONCEPT.md seccion 2 para el contexto de negocio de las ventas inmobiliarias.

### 4.1 sale.actions.ts

**Archivo completo:** `src/server/actions/sale.actions.ts` (99 lineas)

---

#### getSales

**Archivo:** `src/server/actions/sale.actions.ts` L13-L20
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de ventas desde `saleModel.findAll()`. No lanza errores al cliente.
**Modelos afectados:** Sale (lectura) -- ver AUDIT_DATABASE.md seccion 3.8

**Flujo:**
1. Verificar permiso `sales:view` via `requirePermission()`.
2. Llamar a `saleModel.findAll(params)` pasando filtros opcionales: `search` (texto libre), `status` (SaleStatus enum), `developmentId` (filtro por desarrollo).
3. Retornar el array de ventas directamente.

---

#### getSaleById

**Archivo:** `src/server/actions/sale.actions.ts` L22-L27
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna venta serializada o `null` si no existe. No lanza errores.
**Modelos afectados:** Sale (lectura), Lot, Installment, ExtraCharge (lectura via includes)

**Flujo:**
1. Verificar permiso `sales:view`.
2. Llamar a `saleModel.findById(id)` -- incluye lot, installments, extraCharges, person, seller.
3. Si no existe, retornar `null`.
4. Serializar con `saleService.serializeSaleForClient(sale)` -> Ver serializeSaleForClient() en &sect;4.2.
5. Retornar la venta serializada (Decimals convertidos a numbers, status de cuotas vencidas calculados).

---

#### createSale

**Archivo:** `src/server/actions/sale.actions.ts` L29-L72
**Guard:** `requirePermission("sales:manage")`
**Schema:** `saleCreateSchema` de `src/schemas/sale.schema.ts`
**Retorno + Errores:** `ActionResult<{ saleId: string }>`. Errores: validacion Zod, ServiceError del service, error generico "Error al crear la venta".
**Modelos afectados:** Sale (escritura), Installment (escritura), ExtraCharge (escritura), Lot (escritura) -- ver AUDIT_DATABASE.md secciones 3.8, 3.9, 3.10, 3.4

**Flujo:**
1. Verificar permiso `sales:manage`. Obtener `session.user.id`.
2. Extraer campos del `FormData`: lotId, personId, sellerId, saleDate, totalPrice, downPayment, currency, totalInstallments, firstInstallmentAmount, firstInstallmentMonth, collectionDay, commissionAmount, exchangeRateOverride, status, signingDate, notes, paymentWindow, extraCharges (JSON string).
3. Validar con `saleCreateSchema.safeParse(raw)`. Si falla, retornar `{ success: false, error: primerError }`.
4. Delegar a `saleService.createSale(parsed.data, session.user.id)` -> Ver createSale() en &sect;4.2.
5. Si el service lanza `ServiceError`, retornar `{ success: false, error: message }`.
6. Si exito: `revalidatePath("/ventas")`, `revalidatePath("/desarrollos")`.
7. Retornar `{ success: true, data: { saleId } }`.

**Schema saleCreateSchema** (`src/schemas/sale.schema.ts`):
- `lotId`: string requerido
- `personId`: string requerido
- `sellerId`: string opcional
- `saleDate`: string requerido (fecha ISO)
- `totalPrice`: string -> transformado a number >= 0
- `downPayment`: string opcional -> transformado a number >= 0
- `currency`: Currency enum, default USD
- `totalInstallments`: string -> transformado a int >= 0
- `firstInstallmentAmount`: string opcional -> transformado a number > 0
- `firstInstallmentMonth`: string opcional (YYYY-MM)
- `collectionDay`: string opcional -> transformado a int 1-31
- `commissionAmount`: string opcional -> transformado a number >= 0
- `exchangeRateOverride`: string opcional -> transformado a number > 0
- `status`: SaleStatus enum, default ACTIVA
- `signingDate`: string opcional
- `notes`: string opcional
- `paymentWindow`: string opcional
- `extraCharges`: string JSON opcional -> transformado a array de `{ description, amount, dueDate, notes? }`

---

#### getSaleForPrint

**Archivo:** `src/server/actions/sale.actions.ts` L74-L82
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna venta serializada con `companyName` agregado, o `null`. No lanza errores.
**Modelos afectados:** Sale (lectura), SystemConfig (lectura) -- ver AUDIT_DATABASE.md secciones 3.8, 3.20

**Flujo:**
1. Verificar permiso `sales:view`.
2. En paralelo (`Promise.all`):
   a. Obtener la venta via `getSaleById(id)` (reutiliza la action &sect;4.1).
   b. Obtener el nombre de la empresa via `systemConfigModel.get("company_name")`.
3. Si la venta no existe, retornar `null`.
4. Retornar la venta con `companyName` agregado (default: "Sistema Inmobiliaria").

---

#### cancelSale

**Archivo:** `src/server/actions/sale.actions.ts` L84-L98
**Guard:** `requirePermission("sales:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: ServiceError del service, error generico "Error al cancelar la venta".
**Modelos afectados:** Sale (escritura), Lot (escritura) -- ver AUDIT_DATABASE.md secciones 3.8, 3.4

**Flujo:**
1. Verificar permiso `sales:manage`.
2. Delegar a `saleService.cancelSale(id)` -> Ver cancelSale() en &sect;4.2.
3. Si el service lanza `ServiceError`, retornar `{ success: false, error: message }`.
4. Si exito: `revalidatePath("/ventas")`, `revalidatePath("/desarrollos")`.
5. Retornar `{ success: true }`.

---

### 4.2 sale.service.ts

**Archivo completo:** `src/server/services/sale.service.ts` (333 lineas)

Contiene la logica de negocio transaccional para ventas. Tres funciones exportadas: `createSale`, `cancelSale`, `serializeSaleForClient`.

**Helper privado -- getLotStatusForSale:**
Mapea el status de una venta al status correspondiente del lote:
- `"CONTADO"` -> `"CONTADO"` (LotStatus)
- `"CESION"` -> `"PERMUTA"` (LotStatus)
- Cualquier otro (tipicamente `"ACTIVA"`) -> `"VENDIDO"` (LotStatus)

**Helper privado -- validateAndCalculate:**
Validacion de reglas de negocio y calculo de montos de cuotas, ejecutado antes de crear la venta.

---

#### createSale (service)

**Archivo:** `src/server/services/sale.service.ts` L121-L241
**Guard:** Ninguno (llamado desde action que ya verifico permisos)
**Schema:** Recibe `SaleCreateData` (output del schema ya validado)
**Retorno + Errores:** Retorna `string` (saleId). Lanza `ServiceError` en caso de error de negocio o Prisma.
**Modelos afectados:** Sale (escritura), Installment (escritura), ExtraCharge (escritura), Lot (escritura), AuditLog (escritura)

**Flujo detallado:**
1. **Validacion y calculo** (`validateAndCalculate(data)`):
   a. Verificar que el lote existe y su status es `DISPONIBLE` o `RESERVADO`. Si no -> `ServiceError("El lote no esta disponible para venta")`.
   b. Verificar que la persona (comprador) existe. Si no -> `ServiceError("La persona no existe")`.
   c. Si se especifica vendedor (`sellerId`), verificar que existe como User con `isSeller: true`. Si no -> `ServiceError("El vendedor no existe")`.
   d. Si `downPayment > totalPrice` -> `ServiceError("La entrega no puede superar el precio total")`.
   e. Si status `ACTIVA` con `totalInstallments > 0`:
      - Validar que `firstInstallmentMonth` y `collectionDay` estan presentes.
      - Calcular `financedAmount = totalPrice - downPayment - sumaExtraCharges`.
      - Si `financedAmount <= 0` -> `ServiceError("No hay monto a financiar en cuotas")`.
      - Si hay `firstInstallmentAmount` y mas de 1 cuota: la primera cuota tiene monto especial, el resto se calcula como `(financedAmount - firstInstallmentAmount) / (totalInstallments - 1)`.
      - Si no hay firstInstallmentAmount: todas las cuotas iguales `financedAmount / totalInstallments`.
      - Los montos se redondean a 2 decimales.
   f. Si status `CONTADO` o `CESION` con `totalInstallments !== 0` -> `ServiceError("Ventas al contado o cesion no pueden tener cuotas")`.

2. **Determinar status del lote** con `getLotStatusForSale(validated.status)`.

3. **Transaccion atomica** (`prisma.$transaction`):
   a. **Crear la venta** (`tx.sale.create`) con todos los campos validados: lotId, personId, sellerId, saleDate, signingDate, totalPrice, downPayment, currency, totalInstallments, firstInstallmentAmount, regularInstallmentAmount, firstInstallmentMonth, collectionDay, commissionAmount, exchangeRateOverride, status, notes, paymentWindow, createdById.
   b. **Generar cuotas** (`tx.installment.createMany`) si `totalInstallments > 0` y los campos requeridos estan presentes. Usa `generateInstallments()` de `src/lib/installment-generator.ts` que calcula fechas de vencimiento basadas en `firstInstallmentMonth` y `collectionDay`, asignando montos segun `regularInstallmentAmount` y opcionalmente `firstInstallmentAmount`.
   c. **Crear extra charges** (`tx.extraCharge.createMany`) si status es `ACTIVA` y hay extraCharges en el input. Cada uno con status `PENDIENTE`, paidAmount 0, isInKind false.
   d. **Actualizar status del lote** (`tx.lot.update`) al status calculado en paso 2.

4. **Audit log** (fuera de transaccion): Registrar la creacion con `logAction("Sale", saleId, "CREATE", {...}, userId)`.

5. **Manejo de errores Prisma:**
   - `P2002` (unique constraint): "Ya existe una venta registrada para este lote."
   - `P2003` (foreign key): "Referencia invalida: verifique que el lote, persona y vendedor existan."
   - Otros: `ServiceError("Error al crear la venta")`.

6. **Retornar** el `saleId` creado.

---

#### cancelSale (service)

**Archivo:** `src/server/services/sale.service.ts` L247-L274
**Guard:** Ninguno (llamado desde action)
**Schema:** Ninguno (recibe `id: string`)
**Retorno + Errores:** `void`. Lanza `ServiceError` si la venta no existe o no esta ACTIVA.
**Modelos afectados:** Sale (escritura), Lot (escritura), AuditLog (escritura)

**Flujo detallado:**
1. Buscar la venta con `saleModel.findById(id)`. Si no existe -> `ServiceError("Venta no encontrada")`.
2. Verificar que el status es `ACTIVA`. Si no -> `ServiceError("Solo se pueden cancelar ventas activas")`.
3. **Transaccion atomica** (`prisma.$transaction`):
   a. Actualizar el status de la venta a `CANCELADA`.
   b. Actualizar el status del lote asociado a `DISPONIBLE` (libera el lote para futuras ventas).
4. **Audit log:** Registrar la cancelacion con `logAction("Sale", id, "UPDATE", { oldData: { status: "ACTIVA" }, newData: { status: "CANCELADA" } })`.

**Nota:** La cancelacion NO elimina las cuotas generadas ni los extra charges. Quedan en la base de datos como historico vinculado a la venta cancelada.

---

#### serializeSaleForClient (service)

**Archivo:** `src/server/services/sale.service.ts` L280-L333
**Guard:** Ninguno (funcion pura de transformacion)
**Schema:** Ninguno
**Retorno + Errores:** Retorna objeto venta con campos Decimal convertidos a number y status de cuotas vencidas. No lanza errores.
**Modelos afectados:** Ninguno (transformacion en memoria)

**Flujo detallado:**
1. Establecer la fecha de hoy (medianoche) para comparaciones.
2. Definir funcion auxiliar `overdueStatus`: si una cuota tiene status `PENDIENTE` o `PARCIAL` y su `dueDate < today`, retorna `VENCIDA` (status virtual calculado, no almacenado en DB).
3. Serializar la venta:
   a. Convertir campos Decimal a number: `totalPrice`, `downPayment`, `firstInstallmentAmount`, `regularInstallmentAmount`, `commissionAmount`, `exchangeRateOverride`.
   b. Convertir campos del lote: `area`, `listPrice`.
   c. Serializar cada cuota: convertir `amount`, `originalAmount`, `paidAmount` a number; aplicar `overdueStatus` al status.
   d. Serializar cada extra charge: convertir `amount`, `paidAmount` a number; aplicar `overdueStatus`.
4. Retornar el objeto serializado.

---

### 4.3 lot.actions.ts

**Archivo completo:** `src/server/actions/lot.actions.ts` (157 lineas)

Acciones CRUD para lotes dentro de desarrollos. Los lotes son la unidad basica de inventario del sistema inmobiliario (ver AUDIT_DATABASE.md seccion 3.4 para el modelo Lot, seccion 2.4 para LotStatus).

---

#### getLotsByDevelopment

**Archivo:** `src/server/actions/lot.actions.ts` L11-L17
**Guard:** `requirePermission("lots:view")`
**Schema:** Ninguno (parametros tipados)
**Retorno + Errores:** Retorna array de lotes del desarrollo. No lanza errores al cliente.
**Modelos afectados:** Lot (lectura) -- ver AUDIT_DATABASE.md seccion 3.4

**Flujo:**
1. Verificar permiso `lots:view`.
2. Llamar a `lotModel.findByDevelopmentId(developmentId, params)` con filtros opcionales: `search` (texto libre), `status` (LotStatus enum).
3. Retornar el array de lotes.

---

#### createLot

**Archivo:** `src/server/actions/lot.actions.ts` L19-L61
**Guard:** `requirePermission("lots:manage")`
**Schema:** `lotCreateSchema` de `src/schemas/lot.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, duplicado de numero de lote, error de modelo.
**Modelos afectados:** Lot (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.4, 3.19

**Flujo:**
1. Verificar permiso `lots:manage`. Obtener `session.user.id`.
2. Extraer campos del `FormData`: developmentId, lotNumber, block, area, listPrice, status, notes.
3. Validar con `lotCreateSchema.safeParse(raw)`. Si falla, retornar error.
4. Verificar unicidad: `lotModel.lotNumberExists(developmentId, lotNumber)`. Si existe, retornar `"Ya existe un lote con ese numero en este desarrollo"`.
5. Crear el lote con `lotModel.create(...)`.
6. Registrar en audit log: `logAction("Lot", lot.id, "CREATE", {...}, userId)`.
7. `revalidatePath("/desarrollos")`.
8. Retornar `{ success: true }`.

**Schema lotCreateSchema** (`src/schemas/lot.schema.ts`):
- `developmentId`: string requerido
- `lotNumber`: string requerido
- `block`: string opcional (manzana)
- `area`: string opcional -> transformado a number > 0
- `listPrice`: string opcional -> transformado a number >= 0
- `status`: LotStatus enum, default DISPONIBLE
- `notes`: string opcional

---

#### updateLot

**Archivo:** `src/server/actions/lot.actions.ts` L63-L109
**Guard:** `requirePermission("lots:manage")`
**Schema:** `lotUpdateSchema` de `src/schemas/lot.schema.ts` (extiende lotCreateSchema con `id`)
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, duplicado de numero de lote.
**Modelos afectados:** Lot (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `lots:manage`. Obtener `session.user.id`.
2. Extraer campos del `FormData` (igual que createLot pero con `id`).
3. Validar con `lotUpdateSchema.safeParse(raw)`.
4. Verificar unicidad de lotNumber excluyendo el lote actual: `lotModel.lotNumberExists(developmentId, lotNumber, id)`.
5. Actualizar con `lotModel.update(id, {...})`.
6. Registrar en audit log.
7. `revalidatePath("/desarrollos")`.
8. Retornar `{ success: true }`.

---

#### bulkUpdateLotStatus

**Archivo:** `src/server/actions/lot.actions.ts` L111-L140
**Guard:** `requirePermission("lots:manage")`
**Schema:** Ninguno (parametros tipados directamente)
**Retorno + Errores:** `ActionResult`. Errores: array vacio, mas de 200 lotes, lotes con venta asociada.
**Modelos afectados:** Lot (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `lots:manage`. Obtener `session.user.id`.
2. Validar que `lotIds` no este vacio y no supere 200 elementos.
3. Verificar que ningun lote tenga venta asociada: `lotModel.countWithSales(lotIds)`. Si hay lotes con venta, retornar error `"{N} lote(s) tienen venta asociada y no se pueden modificar en bloque"`.
4. Ejecutar actualizacion masiva: `lotModel.bulkUpdateStatus(lotIds, status)`.
5. Registrar en audit log con accion `BULK_UPDATE`, incluyendo IDs concatenados y cantidad.
6. `revalidatePath("/desarrollos")`.
7. Retornar `{ success: true }`.

---

#### deleteLot

**Archivo:** `src/server/actions/lot.actions.ts` L142-L156
**Guard:** `requirePermission("lots:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: lote con venta asociada.
**Modelos afectados:** Lot (eliminacion), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `lots:manage`. Obtener `session.user.id`.
2. Verificar que el lote no tenga venta asociada: `lotModel.hasSale(id)`. Si tiene, retornar `"No se puede eliminar un lote con venta asociada"`.
3. Eliminar con `lotModel.delete(id)`.
4. Registrar en audit log: `logAction("Lot", id, "DELETE", undefined, userId)`.
5. `revalidatePath("/desarrollos")`.
6. Retornar `{ success: true }`.

---

## 5. Pagos y Cuotas (Payments, Installments, Extra Charges)

Segundo dominio mas complejo del sistema. Cubre el procesamiento de pagos de cuotas (Installment, ver AUDIT_DATABASE.md seccion 3.9), pagos de refuerzos (ExtraCharge, ver AUDIT_DATABASE.md seccion 3.10), registracion de entregas, y generacion automatica de recibos. Ver AUDIT_CONCEPT.md seccion 2 para el contexto de cobranza.

### 5.1 payment.actions.ts

**Archivo completo:** `src/server/actions/payment.actions.ts` (173 lineas)

Tres acciones de pago, cada una delegando la logica pesada al payment.service.ts. Contiene helpers privados para parsear FormData de forma segura.

**Helpers privados:**
- `parseFormAmount(formData, field)`: Extrae un numero del FormData, retorna `null` si no existe o no es numerico.
- `parseFormString(formData, field)`: Extrae un string, retorna `null` si vacio.
- `parseFormDate(formData, field)`: Extrae una fecha, retorna `null` si invalida.

---

#### payInstallment

**Archivo:** `src/server/actions/payment.actions.ts` L40-L80
**Guard:** `requirePermission("cash:manage")`
**Schema:** Ninguno (validacion manual inline)
**Retorno + Errores:** `ActionResult`. Errores: campo requerido faltante, monto <= 0, moneda invalida, fecha invalida, ServiceError del service, error generico.
**Modelos afectados:** Installment (escritura), CashMovement (escritura), Sale (escritura condicional), PaymentReceipt (escritura via service) -- ver AUDIT_DATABASE.md secciones 3.9, 3.11, 3.8, 3.13

**Flujo:**
1. Verificar permiso `cash:manage`. Obtener `session.user.id`.
2. Parsear del FormData: `installmentId`, `amount`, `currency`, `manualRate`, `notes`, `date`.
3. Validaciones manuales:
   - `installmentId` requerido
   - `amount > 0`
   - `currency` debe ser `"USD"` o `"ARS"`
   - `date` debe ser una fecha valida
4. Delegar a `paymentService.payInstallment({...})` -> Ver payInstallment() en &sect;5.2.
5. Si ServiceError: retornar `{ success: false, error: message }`.
6. `revalidatePath("/ventas")`, `revalidatePath("/caja")`.
7. Retornar `{ success: true }`.

---

#### payExtraCharge

**Archivo:** `src/server/actions/payment.actions.ts` L86-L126
**Guard:** `requirePermission("cash:manage")`
**Schema:** Ninguno (validacion manual inline)
**Retorno + Errores:** `ActionResult`. Mismos errores que payInstallment.
**Modelos afectados:** ExtraCharge (escritura), CashMovement (escritura), Installment (escritura condicional via recalculo), Sale (escritura condicional), PaymentReceipt (escritura via service) -- ver AUDIT_DATABASE.md secciones 3.10, 3.11, 3.9, 3.8, 3.13

**Flujo:**
1. Verificar permiso `cash:manage`. Obtener `session.user.id`.
2. Parsear del FormData: `extraChargeId`, `amount`, `currency`, `manualRate`, `notes`, `date`.
3. Validaciones manuales (identicas a payInstallment pero con `extraChargeId`).
4. Delegar a `paymentService.payExtraCharge({...})` -> Ver payExtraCharge() en &sect;5.2.
5. Si ServiceError: retornar error.
6. `revalidatePath("/ventas")`, `revalidatePath("/caja")`.
7. Retornar `{ success: true }`.

---

#### recordDeliveryPayment

**Archivo:** `src/server/actions/payment.actions.ts` L132-L172
**Guard:** `requirePermission("cash:manage")`
**Schema:** Ninguno (validacion manual inline)
**Retorno + Errores:** `ActionResult`. Mismos errores que payInstallment pero con `saleId`.
**Modelos afectados:** CashMovement (escritura), Sale (lectura) -- ver AUDIT_DATABASE.md secciones 3.11, 3.8

**Flujo:**
1. Verificar permiso `cash:manage`. Obtener `session.user.id`.
2. Parsear del FormData: `saleId`, `amount`, `currency`, `manualRate`, `notes`, `date`.
3. Validaciones manuales (identicas a payInstallment pero con `saleId`).
4. Delegar a `paymentService.recordDeliveryPayment({...})` -> Ver recordDeliveryPayment() en &sect;5.2.
5. Si ServiceError: retornar error.
6. `revalidatePath("/ventas")`, `revalidatePath("/caja")`.
7. Retornar `{ success: true }`.

---

### 5.2 payment.service.ts

**Archivo completo:** `src/server/services/payment.service.ts` (392 lineas)

Contiene la logica de negocio mas critica del sistema: procesamiento de pagos con transacciones atomicas, signing gate, generacion de recibos, y recalculo de cuotas.

**Mecanismo Signing Gate (checkSigningGate):**
Funcion privada que bloquea pagos si la firma de escritura de la venta no esta completada.
- Sales con status `CONTADO` o `CESION` estan exentas (no requieren firma).
- Si la venta no tiene SigningSlots vinculados (venta legacy o sin firma programada), se permite el pago (backward compatibility).
- Si la venta tiene SigningSlot pero el ultimo no esta `COMPLETADA` -> `ServiceError("No se puede registrar el pago: la firma de escritura no esta completada")`.
- Ver AUDIT_DATABASE.md seccion 3.15 para el modelo SigningSlot.

---

#### payInstallment (service)

**Archivo:** `src/server/services/payment.service.ts` L88-L219
**Guard:** Ninguno (llamado desde action)
**Schema:** Recibe `PayInstallmentParams` interface
**Retorno + Errores:** `void`. Lanza `ServiceError` en multiples escenarios de validacion.
**Modelos afectados:** Installment (lectura + escritura), CashMovement (escritura), Sale (lectura + escritura condicional), Lot (lectura), PaymentReceipt (escritura via generateReceipt), AuditLog (escritura)

**Flujo detallado:**
1. **Signing gate:** Buscar la cuota por ID para obtener `saleId`. Si no existe -> error. Ejecutar `checkSigningGate(saleId)`.
2. **Transaccion atomica** (`prisma.$transaction`):
   a. **Fetch cuota con contexto** (`tx.installment.findUnique` con include sale.lot): Obtener la cuota con datos del lote para construir el concepto del movimiento.
   b. **Validar estado:** La cuota debe estar `PENDIENTE`, `PARCIAL`, o `VENCIDA`. Si esta `PAGADA` u otro -> error.
   c. **Validar monto:** Calcular saldo pendiente `amount - paidAmount`. Si el pago supera el saldo -> `ServiceError("El monto supera el saldo pendiente de la cuota")`.
   d. **Crear CashMovement** (`tx.cashMovement.create`):
      - Tipo: `CUOTA`
      - Concepto: `"CUOTA {numero} - LOTE {lotNumber}"`
      - Si currency es USD: `usdIncome = amount`. Si ARS: `arsIncome = amount`.
      - Vinculado a: `saleId`, `installmentId`, `personId`, `developmentId`.
      - `manualRate` guardado si se proporciona (permite override de cotizacion).
   e. **Actualizar cuota** (`tx.installment.update`):
      - `paidAmount = paidAmount + amount`
      - `paidDate = date`
      - `paidInCurrency = currency`
      - Si `newPaidAmount >= amount`: status `PAGADA`. Si no: status `PARCIAL`.
   f. **Auto-completar venta:** Si la cuota quedo PAGADA, verificar si TODAS las cuotas de la venta estan PAGADA. Si todas estan pagadas -> actualizar la venta a status `COMPLETADA`.
   g. Retornar `{ cashMovementId, saleId }`.
3. **Generar recibo** (fuera de transaccion, fire-and-forget): `generateReceipt(cashMovementId, userId)` -> Ver &sect;5.5. Si falla, se loguea error pero NO se revierte el pago.
4. **Audit log:** `logAction("Installment", installmentId, "UPDATE", { action: "PAGO_CUOTA", amount, currency, saleId }, userId)`.

---

#### payExtraCharge (service)

**Archivo:** `src/server/services/payment.service.ts` L225-L341
**Guard:** Ninguno (llamado desde action)
**Schema:** Recibe `PayExtraChargeParams` interface
**Retorno + Errores:** `void`. Lanza `ServiceError` en multiples escenarios.
**Modelos afectados:** ExtraCharge (lectura + escritura), CashMovement (escritura), Installment (escritura condicional via recalculo), Sale (lectura + escritura condicional), Lot (lectura), PaymentReceipt (escritura via generateReceipt), AuditLog (escritura)

**Flujo detallado:**
1. **Signing gate:** Buscar el extra charge por ID para obtener `saleId`. Si no existe -> error. Ejecutar `checkSigningGate(saleId)`.
2. **Transaccion atomica** (`prisma.$transaction`):
   a. **Fetch extra charge con contexto** (`tx.extraCharge.findUnique` con include sale.lot).
   b. **Validar estado:** Debe estar `PENDIENTE`, `PARCIAL`, o `VENCIDA`.
   c. **Validar monto:** Calcular saldo pendiente. Si el pago supera el saldo -> error.
   d. **Crear CashMovement** (`tx.cashMovement.create`):
      - Tipo: `CUOTA` (mismo tipo que pagos de cuotas regulares)
      - Concepto: `"REFUERZO - {description}"`
      - Vinculado a: `saleId`, `extraChargeId`, `personId`, `developmentId`.
   e. **Actualizar extra charge** (`tx.extraCharge.update`):
      - `paidAmount = paidAmount + amount`
      - `paidDate = date`
      - Status: `PAGADA` si `newPaidAmount >= amount`, sino `PARCIAL`.
   f. **Recalcular cuotas pendientes** (si el extra charge quedo totalmente pagado):
      - Llamar a `recalculateInstallments(saleId, extraCharge.amount, tx)` -> Ver &sect;3.5.
      - Esto distribuye el monto del refuerzo entre las cuotas pendientes, reduciendo cada una proporcionalmente.
      - Se ejecuta DENTRO de la transaccion para garantizar atomicidad.
   g. Retornar `{ cashMovementId, saleId }`.
3. **Generar recibo** (fuera de transaccion): `generateReceipt(cashMovementId, userId)`.
4. **Audit log:** `logAction("ExtraCharge", extraChargeId, "UPDATE", { action: "PAGO_REFUERZO", amount, currency, saleId }, userId)`.

**Diferencia clave con payInstallment:** Este flujo incluye la recalculacion de cuotas pendientes cuando el refuerzo se paga completamente. Es el unico punto del sistema que dispara `recalculateInstallments` durante un pago (el otro punto es en createExtraCharge con `isInKind: true`, ver &sect;5.4).

---

#### recordDeliveryPayment (service)

**Archivo:** `src/server/services/payment.service.ts` L347-L392
**Guard:** Ninguno (llamado desde action)
**Schema:** Recibe `RecordDeliveryParams` interface
**Retorno + Errores:** `void`. Lanza `ServiceError` si la venta no existe o error de BD.
**Modelos afectados:** CashMovement (escritura), Sale (lectura), Lot (lectura), AuditLog (escritura)

**Flujo detallado:**
1. Buscar la venta con `prisma.sale.findUnique` incluyendo `lot` (lotNumber, developmentId). Si no existe -> `ServiceError("Venta no encontrada")`.
2. **Crear CashMovement** (`prisma.cashMovement.create`) -- nota: NO usa transaccion porque es una sola operacion:
   - Tipo: `ENTREGA`
   - Concepto: `"ENTREGA - LOTE {lotNumber}"`
   - Vinculado a: `saleId`, `personId`, `developmentId`.
   - Montos: segun currency (usdIncome o arsIncome).
3. **Audit log:** `logAction("Sale", saleId, "UPDATE", { action: "PAGO_ENTREGA", amount, currency }, userId)`.

**Nota:** Este flujo no verifica signing gate ni actualiza el status de la venta o del lote. Es un registro de ingreso de dinero unicamente.

---

### 5.3 extra-charge.actions.ts

**Archivo completo:** `src/server/actions/extra-charge.actions.ts` (127 lineas)

Acciones CRUD para cargos extra / refuerzos (ExtraCharge, ver AUDIT_DATABASE.md seccion 3.10). Los refuerzos son cuotas extraordinarias que se agregan a una venta activa, generalmente semestrales, y cuyo pago reduce proporcionalmente las cuotas ordinarias pendientes.

**Helper privado -- serializeExtraCharge:**
Convierte campos Decimal (`amount`, `paidAmount`) a number para consumo del cliente.

---

#### getExtraChargesBySale

**Archivo:** `src/server/actions/extra-charge.actions.ts` L23-L33
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de extra charges serializados. Retorna `[]` en caso de error (fallo silencioso).
**Modelos afectados:** ExtraCharge (lectura)

**Flujo:**
1. Verificar permiso `sales:view`.
2. Obtener cargos via `extraChargeModel.findBySaleId(saleId)`.
3. Serializar cada cargo (Decimal -> number).
4. Retornar el array. Si hay error, loguear y retornar `[]`.

---

#### createExtraCharge

**Archivo:** `src/server/actions/extra-charge.actions.ts` L35-L71
**Guard:** `requirePermission("sales:manage")`
**Schema:** `extraChargeCreateSchema` de `src/schemas/extra-charge.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, ServiceError del service.
**Modelos afectados:** ExtraCharge (escritura), Installment (escritura condicional via recalculo si isInKind) -- ver AUDIT_DATABASE.md secciones 3.10, 3.9

**Flujo:**
1. Verificar permiso `sales:manage`. Obtener `session.user.id`.
2. Extraer campos del FormData: saleId, description, amount, currency, dueDate, isInKind, inKindType, notes.
3. Validar con `extraChargeCreateSchema.safeParse(raw)`.
4. Delegar a `extraChargeService.createExtraCharge(parsed.data, userId)` -> Ver &sect;5.4.
5. Si exito: `revalidatePath("/ventas/{saleId}")`, `revalidatePath("/ventas")`.
6. Retornar `{ success: true }`.

**Schema extraChargeCreateSchema** (`src/schemas/extra-charge.schema.ts`):
- `saleId`: string requerido
- `description`: string requerido
- `amount`: string -> transformado a number > 0
- `currency`: Currency enum, default USD
- `dueDate`: string requerido
- `isInKind`: string opcional -> transformado a boolean (`"true"` -> true)
- `inKindType`: string opcional
- `notes`: string opcional

---

#### updateExtraCharge

**Archivo:** `src/server/actions/extra-charge.actions.ts` L73-L109
**Guard:** `requirePermission("sales:manage")`
**Schema:** `extraChargeUpdateSchema` de `src/schemas/extra-charge.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: ID faltante, validacion Zod, ServiceError del service.
**Modelos afectados:** ExtraCharge (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `sales:manage`.
2. Obtener `id` del FormData. Si falta, retornar error.
3. Extraer campos: description, amount, currency, dueDate, notes.
4. Validar con `extraChargeUpdateSchema.safeParse(raw)`.
5. Delegar a `extraChargeService.updateExtraCharge(id, parsed.data)` -> Ver &sect;5.4. Retorna `saleId`.
6. `revalidatePath("/ventas/{saleId}")`, `revalidatePath("/ventas")`.
7. Retornar `{ success: true }`.

---

#### deleteExtraCharge

**Archivo:** `src/server/actions/extra-charge.actions.ts` L111-L127
**Guard:** `requirePermission("sales:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: ID faltante, ServiceError del service.
**Modelos afectados:** ExtraCharge (eliminacion), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `sales:manage`.
2. Validar que `id` no este vacio.
3. Delegar a `extraChargeService.deleteExtraCharge(id)` -> Ver &sect;5.4. Retorna `saleId`.
4. `revalidatePath("/ventas/{saleId}")`, `revalidatePath("/ventas")`.
5. Retornar `{ success: true }`.

---

### 5.4 extra-charge.service.ts

**Archivo completo:** `src/server/services/extra-charge.service.ts` (140 lineas)

Logica de negocio para gestion de cargos extra / refuerzos.

---

#### createExtraCharge (service)

**Archivo:** `src/server/services/extra-charge.service.ts` L19-L76
**Guard:** Ninguno (llamado desde action)
**Schema:** Recibe `ExtraChargeCreateData` (output del schema validado)
**Retorno + Errores:** `void`. Lanza `ServiceError` si la venta no existe o no esta activa.
**Modelos afectados:** ExtraCharge (escritura), Installment (escritura condicional), Sale (lectura + escritura condicional), AuditLog (escritura)

**Flujo detallado:**
1. Verificar que la venta existe y esta `ACTIVA`. Si no -> `ServiceError`.
2. Determinar si el cargo es "en especie" (`isInKind`).
3. Crear el extra charge via `extraChargeModel.create(...)`:
   - Si `isInKind`: status `PAGADA`, `paidAmount = amount`, `paidDate = now`. Un cargo en especie es uno que ya fue pagado con bienes/servicios en vez de dinero.
   - Si no: status `PENDIENTE`, `paidAmount = 0`.
   - `inKindType` solo se guarda si `isInKind` es true.
4. **Si isInKind:** Llamar a `recalculateInstallments(saleId, amount)` inmediatamente (sin transaccion separada). Esto reduce las cuotas pendientes porque el refuerzo ya fue "pagado" en especie.
5. Registrar en audit log con detalles de creacion.

**Diferencia con pago normal:** Cuando isInKind es true, el recalculo ocurre al crear el cargo, no al pagarlo. Para cargos normales (isInKind false), el recalculo ocurre cuando se paga via payExtraCharge (&sect;5.2).

---

#### updateExtraCharge (service)

**Archivo:** `src/server/services/extra-charge.service.ts` L82-L110
**Guard:** Ninguno (llamado desde action)
**Schema:** Recibe `ExtraChargeUpdateData` (output del schema)
**Retorno + Errores:** Retorna `string` (saleId). Lanza `ServiceError` si no existe o no esta PENDIENTE.
**Modelos afectados:** ExtraCharge (lectura + escritura), AuditLog (escritura)

**Flujo detallado:**
1. Buscar el cargo existente. Si no existe -> `ServiceError("Cargo no encontrado")`.
2. Verificar que el status es `PENDIENTE`. Si no -> `ServiceError("Solo se pueden editar cargos pendientes")`.
3. Construir objeto de actualizacion con los campos proporcionados (partial update).
4. Actualizar via `extraChargeModel.update(id, updateData)`.
5. Registrar en audit log (sin userId, ya que el service no tiene acceso a la session).
6. Retornar el `saleId` del cargo.

---

#### deleteExtraCharge (service)

**Archivo:** `src/server/services/extra-charge.service.ts` L116-L140
**Guard:** Ninguno (llamado desde action)
**Schema:** Ninguno
**Retorno + Errores:** Retorna `string` (saleId). Lanza `ServiceError` si no existe o no esta PENDIENTE.
**Modelos afectados:** ExtraCharge (lectura + eliminacion), AuditLog (escritura)

**Flujo detallado:**
1. Buscar el cargo existente. Si no existe -> `ServiceError("Cargo no encontrado")`.
2. Verificar que el status es `PENDIENTE`. Si no -> `ServiceError("Solo se pueden eliminar cargos pendientes")`. Cargos pagados o parcialmente pagados no se pueden eliminar.
3. Eliminar via `extraChargeModel.delete(id)`.
4. Registrar en audit log con los datos eliminados (description, amount, saleId).
5. Retornar el `saleId`.

---

### 5.5 receipt.service.ts

**Archivo completo:** `src/server/services/receipt.service.ts` (176 lineas)

Genera recibos de pago automaticamente despues de cada pago de cuota o refuerzo. Los recibos son documentos textuales con numero secuencial, enviados por email al cliente si tiene email registrado.

---

#### generateReceipt (service)

**Archivo:** `src/server/services/receipt.service.ts` L13-L176
**Guard:** Ninguno (llamado internamente desde payment.service.ts)
**Schema:** Ninguno (recibe cashMovementId y userId)
**Retorno + Errores:** `void`. Lanza `ServiceError` en multiples casos de validacion.
**Modelos afectados:** CashMovement (lectura con includes), PaymentReceipt (escritura), Sale (lectura), Lot (lectura), Person (lectura), SystemConfig (lectura) -- ver AUDIT_DATABASE.md secciones 3.11, 3.13, 3.8, 3.4, 3.7, 3.20

**Flujo detallado:**
1. **Obtener CashMovement** con todos los includes: sale (con lot.development), installment, extraCharge, person. Si no existe -> `ServiceError`.
2. **Verificar duplicado:** Buscar recibo existente para este `cashMovementId`. Si ya existe -> `ServiceError("Este movimiento ya tiene un recibo generado")`.
3. **Validar vinculaciones:** El movimiento debe estar vinculado a una venta (`saleId`) y a una persona (`personId`). Si no -> `ServiceError`.
4. **Construir concepto:**
   - Si esta vinculado a una cuota: `"Cuota {numero} - Lote {lotNumber} [- Mz {block}]"`
   - Si esta vinculado a un extra charge: `"Refuerzo: {description} - Lote {lotNumber}"`
   - Otro caso: usa el concepto del movimiento de caja directamente.
5. **Determinar monto y moneda:**
   - Si `usdIncome > 0`: monto en USD.
   - Si `arsIncome > 0`: monto en ARS.
   - Sino: monto 0, moneda de la venta.
6. **Generar texto del recibo:**
   ```
   Recibi de {nombre completo} [(DNI: {dni})],
   la suma de {monto formateado con moneda},
   en concepto de {concepto},
   correspondiente al Lote {lotNumber} del desarrollo {devName}.
   Fecha: {fecha formateada}.
   ```
7. **Generar numero secuencial:** `paymentReceiptModel.generateReceiptNumber()` genera un numero unico tipo `REC-000001`.
8. **Crear recibo** en la tabla `PaymentReceipt` con: cashMovementId, saleId, personId, receiptNumber, content, generatedById.
9. **Enviar email** (fire-and-forget):
   - Si la persona tiene email: genera HTML con `receiptEmailHtml({...})` y envia via `sendEmail()`.
   - Si no tiene email: loguea info y omite.
   - El envio de email usa `.catch()` para no bloquear ni fallar -- un error de email no afecta la generacion del recibo.

**Nota sobre nombre de empresa:** Intenta obtener `company_name` de SystemConfig. Si falla, usa default del template de email.

---

## 6. Caja y Cotizacion (Cash Movements, Balances, Exchange Rates)

Tercer dominio documentado. Cubre la gestion de movimientos de caja unificados (ver AUDIT_CONCEPT.md seccion 5 "Mapa de Modulos" -- modulo Caja), balances mensuales por desarrollo, y cotizaciones del dolar.

### 6.1 cash-movement.actions.ts

**Archivo completo:** `src/server/actions/cash-movement.actions.ts` (182 lineas)

Acciones para consultar y crear movimientos de caja. El modelo CashMovement (ver AUDIT_DATABASE.md seccion 3.11) unifica todos los tipos de transacciones financieras del sistema con 14+ tipos definidos en el enum MovementType (ver AUDIT_DATABASE.md seccion 2.10).

**Helper privado -- serializeMovement:**
Convierte campos Decimal (`arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`, `manualRate`) a number para consumo del cliente.

---

#### getCashMovements

**Archivo:** `src/server/actions/cash-movement.actions.ts` L26-L51
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de movimientos serializados. Retorna `[]` en caso de error.
**Modelos afectados:** CashMovement (lectura) -- ver AUDIT_DATABASE.md seccion 3.11

**Flujo:**
1. Verificar permiso `cash:view`.
2. Llamar a `cashMovementModel.findAll(params)` con filtros opcionales:
   - `dateFrom` / `dateTo`: rango de fechas (strings convertidos a Date)
   - `type`: MovementType enum
   - `developmentId`: filtrar por desarrollo
   - `saleId`: filtrar por venta
   - `search`: texto libre
3. Serializar cada movimiento (Decimal -> number).
4. Retornar el array.

---

#### getCashMovementById

**Archivo:** `src/server/actions/cash-movement.actions.ts` L56-L68
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna movimiento serializado o `null`. No lanza errores.
**Modelos afectados:** CashMovement (lectura)

**Flujo:**
1. Verificar permiso `cash:view`.
2. Obtener movimiento con `cashMovementModel.findById(id)`.
3. Si no existe, retornar `null`.
4. Serializar y retornar.

---

#### getCashMovementsBySale

**Archivo:** `src/server/actions/cash-movement.actions.ts` L73-L83
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de movimientos serializados. Retorna `[]` en caso de error.
**Modelos afectados:** CashMovement (lectura)

**Flujo:**
1. Verificar permiso `sales:view` (no `cash:view` -- permite a roles con permiso de ventas ver los movimientos asociados a sus ventas).
2. Obtener movimientos con `cashMovementModel.findBySaleId(saleId)`.
3. Serializar y retornar.

---

#### getCashMovementsSummary

**Archivo:** `src/server/actions/cash-movement.actions.ts` L88-L112
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna objeto con totales. En caso de error, retorna todos los totales en 0.
**Modelos afectados:** CashMovement (lectura agregada)

**Flujo:**
1. Verificar permiso `cash:view`.
2. Obtener resumen agregado con `cashMovementModel.getSummary(params)`:
   - Filtros opcionales: `dateFrom`, `dateTo`, `developmentId`.
   - El modelo ejecuta un `aggregate` de Prisma sumando `arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`.
3. Serializar Decimals a numbers.
4. Retornar `{ arsIncome, arsExpense, usdIncome, usdExpense }`.

---

#### createCashMovement

**Archivo:** `src/server/actions/cash-movement.actions.ts` L117-L181
**Guard:** `requirePermission("cash:manage")`
**Schema:** `cashMovementCreateSchema` de `src/schemas/cash-movement.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, error de creacion.
**Modelos afectados:** CashMovement (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.11, 3.19

**Flujo:**
1. Verificar permiso `cash:manage`. Obtener `session.user.id`.
2. Extraer campos del FormData: date, type, concept, detail, developmentId, personId, saleId, installmentId, extraChargeId, arsIncome, arsExpense, usdIncome, usdExpense, manualRate, notes.
3. Validar con `cashMovementCreateSchema.safeParse(raw)`.
4. Crear el movimiento con `cashMovementModel.create(...)`:
   - Campos opcionales con valor `"none"` se convierten a `null`.
   - Montos financieros opcionales pasan como `null` si no proporcionados.
5. Registrar en audit log: tipo, concepto, montos.
6. `revalidatePath("/caja")`.
7. Retornar `{ success: true }`.

**Schema cashMovementCreateSchema** (`src/schemas/cash-movement.schema.ts`):
- `date`: string requerido
- `type`: MovementType enum (CUOTA, SUELDO, COMISION, GASTO_OFICINA, GASTO_OBRA, IMPUESTO, ALQUILER, HONORARIO, PROVEEDOR, TRANSFERENCIA, RETIRO, DEPOSITO, CAMBIO, OTRO)
- `concept`: string requerido, max 200 chars
- `detail`, `developmentId`, `personId`, `saleId`, `installmentId`, `extraChargeId`: strings opcionales
- `arsIncome`, `arsExpense`, `usdIncome`, `usdExpense`: strings opcionales -> transformados a number > 0
- `manualRate`: string opcional -> transformado a number > 0
- `notes`: string opcional
- **Validacion superRefine:**
  - Al menos un monto (ARS o USD) debe ser proporcionado.
  - Un movimiento solo puede usar una moneda, excepto tipo `CAMBIO` (conversion de divisas).
  - Un movimiento no puede ser ingreso y egreso en la misma moneda simultaneamente.

---

### 6.2 cash-balance.actions.ts

**Archivo completo:** `src/server/actions/cash-balance.actions.ts` (133 lineas)

Acciones para consultar y generar balances de caja mensuales. Los balances se calculan agregando movimientos de caja por desarrollo y mes/anio. Modelo CashBalance: ver AUDIT_DATABASE.md seccion 3.12.

**Helper privado -- serializeBalance:**
Convierte campos Decimal (`arsBalance`, `usdBalance`) a number.

---

#### getCashBalances

**Archivo:** `src/server/actions/cash-balance.actions.ts` L21-L38
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de balances serializados. Retorna `[]` en caso de error.
**Modelos afectados:** CashBalance (lectura) -- ver AUDIT_DATABASE.md seccion 3.12

**Flujo:**
1. Verificar permiso `cash:view`.
2. Obtener balances con `cashBalanceModel.findAll(params)`:
   - Filtros opcionales: `developmentId`, `year`.
3. Serializar y retornar.

---

#### generateMonthlyBalance

**Archivo:** `src/server/actions/cash-balance.actions.ts` L44-L72
**Guard:** `requirePermission("cash:manage")`
**Schema:** Ninguno (parametros tipados directamente)
**Retorno + Errores:** `ActionResult`. Error generico en caso de fallo.
**Modelos afectados:** CashMovement (lectura agregada), CashBalance (escritura/upsert) -- ver AUDIT_DATABASE.md secciones 3.11, 3.12

**Flujo:**
1. Verificar permiso `cash:manage`.
2. Calcular balance desde movimientos: `cashBalanceModel.calculateFromMovements(developmentId, month, year)`. Esto agrega `SUM(arsIncome - arsExpense)` y `SUM(usdIncome - usdExpense)` para el mes/anio/desarrollo especificado.
3. Upsert del balance: `cashBalanceModel.upsert({developmentId, month, year, arsBalance, usdBalance})`. Si ya existe un balance para ese mes/desarrollo, lo actualiza; si no, lo crea.
4. `revalidatePath("/caja")`.
5. Retornar `{ success: true }`.

---

#### generateAllBalances

**Archivo:** `src/server/actions/cash-balance.actions.ts` L77-L133
**Guard:** `requirePermission("cash:manage")`
**Schema:** Ninguno (parametros tipados)
**Retorno + Errores:** `ActionResult`. Error generico en caso de fallo.
**Modelos afectados:** Development (lectura), CashMovement (lectura agregada), CashBalance (escritura/upsert)

**Flujo:**
1. Verificar permiso `cash:manage`.
2. Obtener todos los desarrollos: `prisma.development.findMany({ select: { id: true } })`.
3. Para cada desarrollo:
   a. Calcular balance desde movimientos de caja del mes/anio.
   b. Upsert del balance para ese desarrollo.
4. Calcular y upsert balance "General" (movimientos sin desarrollo asociado, `developmentId = null`). Solo se guarda si alguno de los totales es distinto de 0.
5. `revalidatePath("/caja")`.
6. Retornar `{ success: true }`.

---

### 6.3 exchange-rate.actions.ts

**Archivo completo:** `src/server/actions/exchange-rate.actions.ts` (136 lineas)

Acciones para consultar y gestionar cotizaciones del dolar. Integra con la API publica dolarapi.com para auto-fetch, y permite carga manual. Modelo ExchangeRate: ver AUDIT_DATABASE.md seccion 3.14.

**Helper privado -- serializeRate:**
Convierte campos Decimal (`officialBuy`, `officialSell`, `blueBuy`, `blueSell`, `cryptoBuy`, `cryptoSell`) a number.

---

#### getTodayExchangeRate

**Archivo:** `src/server/actions/exchange-rate.actions.ts` L28-L51
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna cotizacion serializada o `null`. No lanza errores.
**Modelos afectados:** ExchangeRate (lectura + escritura condicional) -- ver AUDIT_DATABASE.md seccion 3.14

**Flujo:**
1. Verificar permiso `cash:view`.
2. Buscar cotizacion de hoy en BD: `exchangeRateModel.findByDate(today)`.
3. Si no existe en BD:
   a. Auto-fetch desde dolarapi.com: `fetchDolarApiRates()` -> Ver &sect;3.4.
   b. Si la API retorna datos, guardar en BD: `exchangeRateModel.upsertByDate(today, { source: "dolarapi", ...rates })`.
4. Serializar y retornar (o `null` si ni BD ni API tienen datos).

**Patron de caching en dos niveles:**
- Nivel 1: BD (ExchangeRate por fecha). Si existe, no se llama a la API.
- Nivel 2: API con cache ISR de 1 hora. Multiples llamadas en la misma hora reusan la respuesta cacheada.

---

#### getExchangeRates

**Archivo:** `src/server/actions/exchange-rate.actions.ts` L56-L71
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de cotizaciones serializadas. Retorna `[]` en caso de error.
**Modelos afectados:** ExchangeRate (lectura)

**Flujo:**
1. Verificar permiso `cash:view`.
2. Calcular rango de fechas: `dateFrom` default = 30 dias atras, `dateTo` default = hoy.
3. Obtener cotizaciones del rango: `exchangeRateModel.findByDateRange(from, to)`.
4. Serializar y retornar.

---

#### getLatestExchangeRate

**Archivo:** `src/server/actions/exchange-rate.actions.ts` L76-L86
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna la cotizacion mas reciente serializada, o `null`. No lanza errores.
**Modelos afectados:** ExchangeRate (lectura)

**Flujo:**
1. Verificar permiso `cash:view`.
2. Obtener la cotizacion mas reciente (cualquier fecha): `exchangeRateModel.findLatest()`.
3. Serializar y retornar.

---

#### createManualExchangeRate

**Archivo:** `src/server/actions/exchange-rate.actions.ts` L91-L136
**Guard:** `requirePermission("cash:manage")`
**Schema:** `manualExchangeRateSchema` de `src/schemas/exchange-rate.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, error generico.
**Modelos afectados:** ExchangeRate (escritura/upsert), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.14, 3.19

**Flujo:**
1. Verificar permiso `cash:manage`.
2. Extraer campos del FormData: date, officialBuy, officialSell, blueBuy, blueSell, cryptoBuy, cryptoSell.
3. Validar con `manualExchangeRateSchema.safeParse(raw)`.
4. Upsert por fecha: `exchangeRateModel.upsertByDate(new Date(date), { source: "manual", ...rateData })`. Si ya existe una cotizacion para esa fecha (ya sea de API o manual previa), la sobreescribe.
5. Registrar en audit log con los datos de cotizacion.
6. `revalidatePath("/caja")`.
7. Retornar `{ success: true }`.

**Schema manualExchangeRateSchema** (`src/schemas/exchange-rate.schema.ts`):
- `date`: string requerido
- `officialBuy`, `officialSell`, `blueBuy`, `blueSell`, `cryptoBuy`, `cryptoSell`: numeros positivos opcionales/nullable (coerced desde string)

---

## 7. Firmas y Escrituracion (Plan 02)

*Seccion pendiente de documentacion en Plan 02. Cubrira:*
- signing.actions.ts: getSignings, getSigningById, createSigning, updateSigning, updateSigningStatus, getSigningsByWeek, deleteSigning, getUnlinkedSignings, unlinkSigningFromSale, linkSigningToSale
- signing.service.ts: completeSigningSlot

---

## 8. Personas y Usuarios (Plan 02)

*Seccion pendiente de documentacion en Plan 02. Cubrira:*
- person.actions.ts: getPersons, getPersonById, createPerson, createPersonQuick, updatePerson, searchPersonsForCollection, togglePersonActive
- user.actions.ts: getUsers, getUserById, createUser, updateUser, changeUserPassword, toggleUserActive, getEmployees, getActiveSellers, toggleUserSeller, updateUserCommission

---

## 9. Desarrollos y Etiquetas (Plan 02)

*Seccion pendiente de documentacion en Plan 02. Cubrira:*
- development.actions.ts: getDevelopments, getDevelopmentOptions, getDevelopmentBySlug, createDevelopment, updateDevelopment, deleteDevelopment
- development.service.ts: createDevelopment, updateDevelopment, deleteDevelopment
- tag.actions.ts: getTags, createTag, updateTag, deleteTag, getTagsForLot, bulkSetLotTags, setLotTags

---

## 10. Comunicaciones y Notificaciones (Plan 02)

*Seccion pendiente de documentacion en Plan 02. Cubrira:*
- message.actions.ts: getMyMessages, getSentMessages, sendMessage, markMessageRead, getUnreadMessageCount, getActiveUsersForMessaging
- notification.actions.ts: getMyNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, createNotification, resolveNotificationUrl, createNotificationInternal

---

## 11. Sistema y Configuracion (Plan 02)

*Seccion pendiente de documentacion en Plan 02. Cubrira:*
- role-permission.actions.ts: getAllRolePermissions, updateRolePermissions, seedDefaultPermissions
- audit-log.actions.ts: logAction, logActionFromSession, getAuditLogs
- payment-receipt.actions.ts: getPaymentReceipts, getPaymentReceiptById, generateReceipt
- business-hours.actions.ts: getBusinessHours, updateBusinessHours
- system-config.actions.ts: getSystemConfig, updateSystemConfig
- import.actions.ts: importPersons, importSales
- import.service.ts: importPersons, importSales
- auth.actions.ts: loginAction, logoutAction
