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
7. [Firmas (Signings)](#7-firmas-signings)
   - 7.1 [signing.actions.ts](#71-signingactionsts)
   - 7.2 [signing.service.ts](#72-signingservicets)
8. [Personas y Usuarios (Persons, Users)](#8-personas-y-usuarios-persons-users)
   - 8.1 [person.actions.ts](#81-personactionsts)
   - 8.2 [user.actions.ts](#82-useractionsts)
9. [Desarrollos (Developments, Lots, Tags)](#9-desarrollos-developments-lots-tags)
   - 9.1 [development.actions.ts](#91-developmentactionsts)
   - 9.2 [development.service.ts](#92-developmentservicets)
   - 9.3 [tag.actions.ts](#93-tagactionsts)
10. [Comunicaciones (Notifications, Messages)](#10-comunicaciones-notifications-messages)
    - 10.1 [notification.actions.ts](#101-notificationactionsts)
    - 10.2 [message.actions.ts](#102-messageactionsts)
11. [Sistema (Auth, RBAC, Receipts, Audit, Import, Config)](#11-sistema-auth-rbac-receipts-audit-import-config)
    - 11.1 [auth.actions.ts](#111-authactionsts)
    - 11.2 [role-permission.actions.ts](#112-role-permissionactionsts)
    - 11.3 [payment-receipt.actions.ts](#113-payment-receiptactionsts)
    - 11.4 [audit-log.actions.ts](#114-audit-logactionsts)
    - 11.5 [import.actions.ts + import.service.ts](#115-importactionsts--importservicets)
    - 11.6 [business-hours.actions.ts](#116-business-hoursactionsts)
    - 11.7 [system-config.actions.ts](#117-system-configactionsts)
12. [Resumen y Estadisticas](#12-resumen-y-estadisticas)

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
| `bulkSetLotTags` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `bulkUpdateLotStatus` | lot.actions.ts | Lotes | &sect;4.3 |
| `cancelSale` (action) | sale.actions.ts | Ventas | &sect;4.1 |
| `cancelSale` (service) | sale.service.ts | Ventas | &sect;4.2 |
| `changeUserPassword` | user.actions.ts | Usuarios | &sect;8.2 |
| `completeSigningSlot` | signing.service.ts | Firmas | &sect;7.2 |
| `convertCurrency` | exchange-rate.ts (lib) | Utilidades | &sect;3.4 |
| `createCashMovement` | cash-movement.actions.ts | Caja | &sect;6.1 |
| `createDevelopment` (action) | development.actions.ts | Desarrollos | &sect;9.1 |
| `createDevelopment` (service) | development.service.ts | Desarrollos | &sect;9.2 |
| `createExtraCharge` (action) | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `createExtraCharge` (service) | extra-charge.service.ts | Pagos | &sect;5.4 |
| `createLot` | lot.actions.ts | Lotes | &sect;4.3 |
| `createNotification` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `createNotificationInternal` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `createPerson` | person.actions.ts | Personas | &sect;8.1 |
| `createPersonQuick` | person.actions.ts | Personas | &sect;8.1 |
| `createSale` (action) | sale.actions.ts | Ventas | &sect;4.1 |
| `createSale` (service) | sale.service.ts | Ventas | &sect;4.2 |
| `createSigning` | signing.actions.ts | Firmas | &sect;7.1 |
| `createTag` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `createUser` | user.actions.ts | Usuarios | &sect;8.2 |
| `deleteDevelopment` (action) | development.actions.ts | Desarrollos | &sect;9.1 |
| `deleteExtraCharge` (action) | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `deleteExtraCharge` (service) | extra-charge.service.ts | Pagos | &sect;5.4 |
| `deleteDevelopment` (service) | development.service.ts | Desarrollos | &sect;9.2 |
| `deleteLot` | lot.actions.ts | Lotes | &sect;4.3 |
| `deleteSigning` | signing.actions.ts | Firmas | &sect;7.1 |
| `deleteTag` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `fetchDolarApiRates` | exchange-rate.ts (lib) | Utilidades | &sect;3.4 |
| `generateAllBalances` | cash-balance.actions.ts | Caja | &sect;6.2 |
| `generateMonthlyBalance` | cash-balance.actions.ts | Caja | &sect;6.2 |
| `generateReceipt` (action) | payment-receipt.actions.ts | Sistema | &sect;11.3 |
| `generateReceipt` (service) | receipt.service.ts | Recibos | &sect;5.5 |
| `getActiveUsersForMessaging` | message.actions.ts | Mensajes | &sect;10.2 |
| `getActiveSellers` | user.actions.ts | Usuarios | &sect;8.2 |
| `getAllRolePermissions` | role-permission.actions.ts | Sistema | &sect;11.2 |
| `getAuditLogs` | audit-log.actions.ts | Sistema | &sect;11.4 |
| `getBusinessHours` | business-hours.actions.ts | Sistema | &sect;11.6 |
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
| `getMyMessages` | message.actions.ts | Mensajes | &sect;10.2 |
| `getMyNotifications` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `getPaymentReceiptById` | payment-receipt.actions.ts | Recibos | &sect;11.3 |
| `getPaymentReceipts` | payment-receipt.actions.ts | Recibos | &sect;11.3 |
| `getPersonById` | person.actions.ts | Personas | &sect;8.1 |
| `getPersons` | person.actions.ts | Personas | &sect;8.1 |
| `getSaleById` | sale.actions.ts | Ventas | &sect;4.1 |
| `getSaleForPrint` | sale.actions.ts | Ventas | &sect;4.1 |
| `getSales` | sale.actions.ts | Ventas | &sect;4.1 |
| `getSentMessages` | message.actions.ts | Mensajes | &sect;10.2 |
| `getSigningById` | signing.actions.ts | Firmas | &sect;7.1 |
| `getSignings` | signing.actions.ts | Firmas | &sect;7.1 |
| `getSigningsByWeek` | signing.actions.ts | Firmas | &sect;7.1 |
| `getSystemConfig` | system-config.actions.ts | Sistema | &sect;11.7 |
| `getTagsForLot` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `getTags` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `getTodayExchangeRate` | exchange-rate.actions.ts | Cotizacion | &sect;6.3 |
| `getUnlinkedSignings` | signing.actions.ts | Firmas | &sect;7.1 |
| `getUnreadCount` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `getUnreadMessageCount` | message.actions.ts | Mensajes | &sect;10.2 |
| `getUserById` | user.actions.ts | Usuarios | &sect;8.2 |
| `getUsers` | user.actions.ts | Usuarios | &sect;8.2 |
| `importPersons` (action) | import.actions.ts | Importacion | &sect;11.5 |
| `importPersons` (service) | import.service.ts | Importacion | &sect;11.5 |
| `importSales` (action) | import.actions.ts | Importacion | &sect;11.5 |
| `importSales` (service) | import.service.ts | Importacion | &sect;11.5 |
| `linkSigningToSale` | signing.actions.ts | Firmas | &sect;7.1 |
| `logAction` (action) | audit-log.actions.ts | Sistema | &sect;11.4 |
| `logAction` (lib) | audit.ts (lib) | Utilidades | &sect;3.2 |
| `logActionFromSession` | audit-log.actions.ts | Sistema | &sect;11.4 |
| `loginAction` | auth.actions.ts | Auth | &sect;11.1 |
| `logoutAction` | auth.actions.ts | Auth | &sect;11.1 |
| `markAllNotificationsRead` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `markMessageRead` | message.actions.ts | Mensajes | &sect;10.2 |
| `markNotificationRead` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `createManualExchangeRate` | exchange-rate.actions.ts | Cotizacion | &sect;6.3 |
| `payExtraCharge` (action) | payment.actions.ts | Pagos | &sect;5.1 |
| `payExtraCharge` (service) | payment.service.ts | Pagos | &sect;5.2 |
| `payInstallment` (action) | payment.actions.ts | Pagos | &sect;5.1 |
| `payInstallment` (service) | payment.service.ts | Pagos | &sect;5.2 |
| `recalculateInstallments` | installment-recalculator.ts (lib) | Utilidades | &sect;3.5 |
| `recordDeliveryPayment` (action) | payment.actions.ts | Pagos | &sect;5.1 |
| `recordDeliveryPayment` (service) | payment.service.ts | Pagos | &sect;5.2 |
| `resolveNotificationUrl` | notification.actions.ts | Notificaciones | &sect;10.1 |
| `searchPersonsForCollection` | person.actions.ts | Personas | &sect;8.1 |
| `seedDefaultPermissions` | role-permission.actions.ts | Sistema | &sect;11.2 |
| `sendMessage` | message.actions.ts | Mensajes | &sect;10.2 |
| `serializeSaleForClient` | sale.service.ts | Ventas | &sect;4.2 |
| `setLotTags` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `togglePersonActive` | person.actions.ts | Personas | &sect;8.1 |
| `toggleUserActive` | user.actions.ts | Usuarios | &sect;8.2 |
| `toggleUserSeller` | user.actions.ts | Usuarios | &sect;8.2 |
| `unlinkSigningFromSale` | signing.actions.ts | Firmas | &sect;7.1 |
| `updateBusinessHours` | business-hours.actions.ts | Sistema | &sect;11.6 |
| `updateDevelopment` (action) | development.actions.ts | Desarrollos | &sect;9.1 |
| `updateDevelopment` (service) | development.service.ts | Desarrollos | &sect;9.2 |
| `updateExtraCharge` (action) | extra-charge.actions.ts | Pagos | &sect;5.3 |
| `updateExtraCharge` (service) | extra-charge.service.ts | Pagos | &sect;5.4 |
| `updateLot` | lot.actions.ts | Lotes | &sect;4.3 |
| `updatePerson` | person.actions.ts | Personas | &sect;8.1 |
| `updateRolePermissions` | role-permission.actions.ts | Sistema | &sect;11.2 |
| `updateSigning` | signing.actions.ts | Firmas | &sect;7.1 |
| `updateSigningStatus` | signing.actions.ts | Firmas | &sect;7.1 |
| `updateSystemConfig` | system-config.actions.ts | Sistema | &sect;11.7 |
| `updateTag` | tag.actions.ts | Etiquetas | &sect;9.3 |
| `updateUser` | user.actions.ts | Usuarios | &sect;8.2 |
| `updateUserCommission` | user.actions.ts | Usuarios | &sect;8.2 |

**Total:** 116 funciones documentadas en 21 archivos de actions + 7 archivos de services + 4 archivos de utilidades.

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

Version alternativa usada por actions que tienen acceso directo al `userId`. Funcionalidad identica a la de `src/lib/audit.ts`, pero con acceso al session object. Documentacion completa en &sect;11.4.

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

## 7. Firmas (Signings)

Dominio de gestion de turnos de escrituracion. Cada turno (SigningSlot, ver AUDIT_DATABASE.md seccion 3.15) representa una cita para la firma de escritura de una venta. El sistema gestiona la agenda semanal, vinculacion con ventas, y al completar una firma puede auto-generar la comision del vendedor. Ver AUDIT_CONCEPT.md seccion 5.7 para el contexto funcional del modulo de firmas.

### 7.1 signing.actions.ts

**Archivo completo:** `src/server/actions/signing.actions.ts` (273 lineas)

Acciones CRUD para turnos de firma, consulta por semana, vinculacion/desvinculacion con ventas, y cambio de estado. Es el archivo de actions mas grande del sistema.

---

#### getSignings

**Archivo:** `src/server/actions/signing.actions.ts` L16-L26
**Guard:** `requirePermission("signings:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de signings desde `signingModel.findAll()`. No lanza errores al cliente.
**Modelos afectados:** SigningSlot (lectura) -- ver AUDIT_DATABASE.md seccion 3.15

**Flujo:**
1. Verificar permiso `signings:view` via `requirePermission()`.
2. Llamar a `signingModel.findAll(params)` con filtros opcionales: `dateFrom`, `dateTo` (rango de fechas), `status` (SigningStatus enum), `developmentId`, `sellerId`, `search` (texto libre).
3. Retornar el array de signings directamente.

---

#### getSigningById

**Archivo:** `src/server/actions/signing.actions.ts` L28-L31
**Guard:** `requirePermission("signings:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna signing o `null` si no existe. No lanza errores.
**Modelos afectados:** SigningSlot (lectura)

**Flujo:**
1. Verificar permiso `signings:view`.
2. Llamar a `signingModel.findById(id)`.
3. Retornar el resultado directamente.

---

#### createSigning

**Archivo:** `src/server/actions/signing.actions.ts` L33-L80
**Guard:** `requirePermission("signings:manage")`
**Schema:** `signingCreateSchema` de `src/schemas/signing.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod.
**Modelos afectados:** SigningSlot (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.15, 3.19

**Flujo:**
1. Verificar permiso `signings:manage`. Obtener `session.user.id`.
2. Extraer campos del `FormData`: date, time, endTime, lotInfo, clientName, lotNumbers, developmentId, sellerId, notes, saleId.
3. Validar con `signingCreateSchema.safeParse(raw)`. Si falla, retornar `{ success: false, error: primerError }`.
4. Crear el signing via `signingModel.create(...)`:
   - `date` se convierte de string a Date.
   - Campos opcionales (endTime, clientName, lotNumbers, developmentId, sellerId, notes, saleId) pasan como `null` si vacios.
   - `createdById` se asigna desde la sesion.
5. Registrar en audit log: `logAction("SigningSlot", signing.id, "CREATE", { date, time, lotInfo, saleId }, userId)`.
6. `revalidatePath("/firmas")`. Si hay `saleId`, tambien `revalidatePath("/ventas")`.
7. Retornar `{ success: true }`.

**Schema signingCreateSchema** (`src/schemas/signing.schema.ts`):
- `date`: string requerido (fecha ISO)
- `time`: string requerido, formato HH:MM (regex `^\d{2}:\d{2}$`)
- `endTime`: string opcional, formato HH:MM
- `lotInfo`: string requerido, max 200 chars (descripcion del lote para mostrar en agenda)
- `clientName`: string opcional, max 200 chars
- `lotNumbers`: string opcional, max 200 chars
- `developmentId`: string opcional
- `sellerId`: string opcional
- `notes`: string opcional
- `saleId`: string opcional (vinculacion directa con venta al crear)

---

#### updateSigning

**Archivo:** `src/server/actions/signing.actions.ts` L82-L131
**Guard:** `requirePermission("signings:manage")`
**Schema:** `signingUpdateSchema` de `src/schemas/signing.schema.ts` (extiende signingCreateSchema con `id` y `status`)
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod.
**Modelos afectados:** SigningSlot (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `signings:manage`.
2. Extraer campos del `FormData` (mismos que createSigning, mas `id` y `status`).
3. Validar con `signingUpdateSchema.safeParse(raw)`.
4. Actualizar via `signingModel.update(id, {...})`:
   - Todos los campos se actualizan, incluyendo status si proporcionado.
5. Registrar en audit log con datos actualizados.
6. `revalidatePath("/firmas")`. Si hay `saleId`, tambien `revalidatePath("/ventas")`.
7. Retornar `{ success: true }`.

---

#### updateSigningStatus

**Archivo:** `src/server/actions/signing.actions.ts` L133-L167
**Guard:** `requirePermission("signings:manage")`
**Schema:** Ninguno (recibe `id: string` y `status: SigningStatus`)
**Retorno + Errores:** `ActionResult`. Errores: signing no encontrado, ServiceError del service, error generico.
**Modelos afectados:** SigningSlot (lectura + escritura), CashMovement (escritura condicional via service), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `signings:manage`. Obtener `session.user.id`.
2. Buscar el signing via `signingModel.findById(id)`. Si no existe, retornar `{ success: false, error: "Turno de firma no encontrado" }`.
3. **Branching por status:**
   - **Si status === "COMPLETADA":** Delegar a `completeSigningSlot({ signingId, userId })` -> Ver &sect;7.2. Este flujo atomico actualiza el status y auto-genera la comision del vendedor si corresponde.
   - **Si status !== "COMPLETADA":** Actualizar directamente via `signingModel.updateStatus(id, status)`. Registrar en audit log con el cambio de status.
4. Si `completeSigningSlot` lanza `ServiceError`, retornar el error al cliente.
5. `revalidatePath("/firmas")`, `revalidatePath("/ventas")`.
6. Retornar `{ success: true }`.

**Nota critica:** La logica de completar firma esta separada en el service porque involucra una transaccion atomica: cambiar status + crear comision. Los demas cambios de status (PENDIENTE, CANCELADA) son operaciones simples que no requieren transaccion.

---

#### getSigningsByWeek

**Archivo:** `src/server/actions/signing.actions.ts` L169-L176
**Guard:** `requirePermission("signings:view")`
**Schema:** Ninguno (recibe `weekStart: string`)
**Retorno + Errores:** Retorna array de signings de la semana. No lanza errores.
**Modelos afectados:** SigningSlot (lectura)

**Flujo:**
1. Verificar permiso `signings:view`.
2. Calcular rango de la semana: `from` = weekStart (lunes), `to` = weekStart + 6 dias (domingo, 23:59:59.999).
3. Llamar a `signingModel.findByDateRange(from, to)`.
4. Retornar el array directamente.

---

#### deleteSigning

**Archivo:** `src/server/actions/signing.actions.ts` L178-L194
**Guard:** `requirePermission("signings:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: signing no encontrado.
**Modelos afectados:** SigningSlot (lectura + eliminacion), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `signings:manage`.
2. Buscar el signing via `signingModel.findById(id)`. Si no existe, retornar error.
3. Eliminar via `signingModel.delete(id)`.
4. Registrar en audit log con datos del signing eliminado (lotInfo, date, time).
5. `revalidatePath("/firmas")`.
6. Retornar `{ success: true }`.

---

#### getUnlinkedSignings

**Archivo:** `src/server/actions/signing.actions.ts` L196-L210
**Guard:** `requirePermission("signings:view")`
**Schema:** Ninguno (recibe `developmentId: string`)
**Retorno + Errores:** Retorna array de signings sin venta vinculada. No lanza errores.
**Modelos afectados:** SigningSlot (lectura)

**Flujo:**
1. Verificar permiso `signings:view`.
2. Consulta directa a Prisma: `prisma.signingSlot.findMany` con filtros:
   - `saleId: null` (sin venta vinculada)
   - `developmentId: developmentId` (mismo desarrollo)
   - Select: id, clientName, lotInfo, date, time, status.
   - Orden: fecha descendente.
3. Retornar el array. Esta consulta se usa en la UI para mostrar signings disponibles al vincular con una venta.

---

#### unlinkSigningFromSale

**Archivo:** `src/server/actions/signing.actions.ts` L212-L241
**Guard:** `requirePermission("signings:manage")`
**Schema:** Ninguno (recibe `signingId: string`)
**Retorno + Errores:** `ActionResult`. Errores: signing no encontrado.
**Modelos afectados:** SigningSlot (lectura + escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `signings:manage`. Obtener `session.user.id`.
2. Buscar el signing via `signingModel.findById(signingId)`. Si no existe, retornar error.
3. Actualizar el signing: `prisma.signingSlot.update({ where: { id }, data: { saleId: null } })`. Esto desvincula la firma de su venta.
4. Registrar en audit log: datos anteriores (saleId viejo) y nuevos (saleId: null).
5. `revalidatePath("/firmas")`, `revalidatePath("/ventas")`.
6. Retornar `{ success: true }`.

---

#### linkSigningToSale

**Archivo:** `src/server/actions/signing.actions.ts` L243-L273
**Guard:** `requirePermission("signings:manage")`
**Schema:** Ninguno (recibe `signingId: string`, `saleId: string`)
**Retorno + Errores:** `ActionResult`. Errores: signing no encontrado.
**Modelos afectados:** SigningSlot (lectura + escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `signings:manage`. Obtener `session.user.id`.
2. Buscar el signing via `signingModel.findById(signingId)`. Si no existe, retornar error.
3. Actualizar el signing: `prisma.signingSlot.update({ where: { id }, data: { saleId } })`. Esto vincula la firma con una venta especifica.
4. Registrar en audit log: datos anteriores (saleId viejo) y nuevos (saleId nuevo).
5. `revalidatePath("/firmas")`, `revalidatePath("/ventas")`.
6. Retornar `{ success: true }`.

---

### 7.2 signing.service.ts

**Archivo completo:** `src/server/services/signing.service.ts` (101 lineas)

Contiene la logica de completar un turno de firma con auto-generacion de comision del vendedor. Llamado desde `updateSigningStatus` cuando el status es `COMPLETADA` (ver &sect;7.1).

---

#### completeSigningSlot

**Archivo:** `src/server/services/signing.service.ts` L10-L101
**Guard:** Ninguno (llamado desde action que ya verifico permisos)
**Schema:** Recibe `CompleteSigningParams` interface (`{ signingId: string, userId: string }`)
**Retorno + Errores:** `void`. Lanza `ServiceError` si el signing no existe.
**Modelos afectados:** SigningSlot (lectura + escritura), Sale (lectura), CashMovement (escritura condicional), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.15, 3.8, 3.11, 3.19

**Flujo detallado:**
1. **Transaccion atomica** (`prisma.$transaction`):
   a. **Fetch signing con contexto:** Obtener el signing con include de sale (id, sellerId, currency, commissionAmount, lot.lotNumber, lot.developmentId, seller.name/lastName). Si no existe -> `ServiceError("Turno de firma no encontrado")`.
   b. **Actualizar status** a `COMPLETADA`: `tx.signingSlot.update({ status: "COMPLETADA" })`.
   c. **Verificar sale vinculada:** Si el signing no tiene sale vinculada (`!signing.sale`), terminar (la firma fue creada sin venta o la venta fue desvinculada).
   d. **Verificar monto de comision:** Si `commissionAmount <= 0`, terminar silenciosamente (la venta no tiene comision configurada).
   e. **Check de idempotencia:** Buscar CashMovement existente con `type: "COMISION"` y `saleId: sale.id`. Si ya existe, terminar (previene duplicados si se llama multiples veces).
   f. **Crear CashMovement de comision:** `tx.cashMovement.create(...)`:
      - Tipo: `COMISION`
      - Concepto: `"COMISION - LOTE {lotNumber}"`
      - Si moneda USD: `usdExpense = commissionAmount`. Si ARS: `arsExpense = commissionAmount`.
      - `personId: null` (la comision va al vendedor, no al cliente).
      - `developmentId` del lote.
      - `notes` incluye nombre completo del vendedor y su ID.
2. **Audit log** (fuera de transaccion): Registrar con `logAction("SigningSlot", signingId, "UPDATE", { status: "COMPLETADA", action: "AUTO_COMISION" }, userId)`.

**Patron de idempotencia:** El check en paso 1.e previene que se cree una comision duplicada si `completeSigningSlot` se ejecuta multiples veces para el mismo signing. Esto puede ocurrir por reintentos de red o doble-click en la UI.

**Moneda de la comision:** La comision se registra como egreso (`usdExpense` o `arsExpense`) en la misma moneda de la venta, reflejando que es un costo para la empresa.

---

## 8. Personas y Usuarios (Persons, Users)

Dominio de gestion de personas (clientes, proveedores) y usuarios del sistema. Las personas son entidades externas que participan en ventas; los usuarios son operadores internos con acceso al sistema. Ver AUDIT_CONCEPT.md seccion 5.3 para personas y seccion 7 para el modelo de roles.

### 8.1 person.actions.ts

**Archivo completo:** `src/server/actions/person.actions.ts` (220 lineas)

Acciones CRUD para personas, busqueda para cobranza, y activacion/desactivacion. El modelo Person (ver AUDIT_DATABASE.md seccion 3.7) maneja tres tipos: CLIENTE, PROVEEDOR, AMBOS (ver AUDIT_DATABASE.md seccion 2.5 para PersonType).

---

#### getPersons

**Archivo:** `src/server/actions/person.actions.ts` L12-L19
**Guard:** `requirePermission("persons:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de personas. No lanza errores al cliente.
**Modelos afectados:** Person (lectura) -- ver AUDIT_DATABASE.md seccion 3.7

**Flujo:**
1. Verificar permiso `persons:view`.
2. Llamar a `personModel.findAll(params)` con filtros opcionales: `search` (texto libre), `type` (PersonType enum), `isActive` (boolean).
3. Retornar el array directamente.

---

#### getPersonById

**Archivo:** `src/server/actions/person.actions.ts` L21-L24
**Guard:** `requirePermission("persons:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna persona con datos relacionados o `null`. No lanza errores.
**Modelos afectados:** Person (lectura con includes de installments, extraCharges, cashMovements)

**Flujo:**
1. Verificar permiso `persons:view`.
2. Llamar a `personModel.findById(id)` -- incluye ventas, cuotas, cargos extra y movimientos de caja (take 50 para cada relacion).
3. Retornar el resultado (ficha completa del cliente).

---

#### createPerson

**Archivo:** `src/server/actions/person.actions.ts` L26-L83
**Guard:** `requirePermission("persons:manage")`
**Schema:** `personCreateSchema` de `src/schemas/person.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, duplicado de DNI o CUIT (Prisma P2002), error generico.
**Modelos afectados:** Person (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.7, 3.19

**Flujo:**
1. Verificar permiso `persons:manage`. Obtener `session.user.id`.
2. Extraer campos del `FormData`: type, firstName, lastName, dni, cuit, email, phone, phone2, address, city, province, notes.
3. Validar con `personCreateSchema.safeParse(raw)`. Si falla, retornar error.
4. Crear persona via `personModel.create(...)`:
   - `createdById` asignado desde la sesion.
   - Campos opcionales pasan como `null` si vacios.
5. Registrar en audit log con tipo, nombre y apellido.
6. **Manejo de duplicados:** Si Prisma lanza error P2002 (unique constraint), determinar si el campo duplicado es DNI o CUIT inspeccionando `error.meta.target` y retornar mensaje descriptivo.
7. `revalidatePath("/personas")`.
8. Retornar `{ success: true }`.

**Schema personCreateSchema** (`src/schemas/person.schema.ts`):
- `type`: PersonType enum (CLIENTE, PROVEEDOR, AMBOS)
- `firstName`: string requerido, max 100
- `lastName`: string requerido, max 100
- `dni`: string opcional -> regex `^\d{7,8}$` (7 u 8 digitos, formato argentino)
- `cuit`: string opcional -> regex `^\d{2}-\d{8}-\d{1}$` (formato XX-XXXXXXXX-X)
- `email`: string opcional -> validacion email
- `phone`, `phone2`: strings opcionales, max 50
- `address`: string opcional, max 200
- `city`, `province`: strings opcionales, max 100
- `notes`: string opcional

---

#### createPersonQuick

**Archivo:** `src/server/actions/person.actions.ts` L85-L139
**Guard:** `requirePermission("persons:manage")`
**Schema:** Ninguno (validacion manual inline -- solo requiere firstName y lastName)
**Retorno + Errores:** `ActionResult<{ id, firstName, lastName, dni, phone }>`. Errores: campos requeridos faltantes, duplicado DNI/CUIT.
**Modelos afectados:** Person (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `persons:manage`. Obtener `session.user.id`.
2. Extraer campos del `FormData` directamente con `.trim()`.
3. Validar que `firstName` y `lastName` existan. Si no, retornar error.
4. Crear persona con `type: "CLIENTE"` fijo (es un alta rapida para clientes nuevos desde el formulario de ventas).
5. Registrar en audit log.
6. **Manejo de duplicados:** Igual que createPerson (P2002 -> mensaje descriptivo).
7. `revalidatePath("/personas")`.
8. Retornar `{ success: true, data: { id, firstName, lastName, dni, phone } }` -- los datos se usan para autocompletar el selector de persona en el formulario de venta.

**Diferencia con createPerson:** No usa schema Zod completo, solo valida nombre y apellido. Tipo fijo CLIENTE. Retorna `data` con los campos basicos del cliente creado para uso inmediato en la UI.

---

#### updatePerson

**Archivo:** `src/server/actions/person.actions.ts` L141-L198
**Guard:** `requirePermission("persons:manage")`
**Schema:** `personUpdateSchema` de `src/schemas/person.schema.ts` (extiende personCreateSchema con `id`)
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, duplicado DNI/CUIT, error generico.
**Modelos afectados:** Person (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `persons:manage`.
2. Extraer campos del `FormData` (mismos que createPerson, mas `id`).
3. Validar con `personUpdateSchema.safeParse(raw)`.
4. Actualizar via `personModel.update(id, {...})`.
5. Registrar en audit log con datos actualizados.
6. **Manejo de duplicados:** Igual que createPerson.
7. `revalidatePath("/personas")`.
8. Retornar `{ success: true }`.

---

#### searchPersonsForCollection

**Archivo:** `src/server/actions/person.actions.ts` L200-L203
**Guard:** `requirePermission("cash:view")`
**Schema:** Ninguno (recibe `search: string`)
**Retorno + Errores:** Retorna array de personas para selector de cobranza. No lanza errores.
**Modelos afectados:** Person (lectura)

**Flujo:**
1. Verificar permiso `cash:view` (nota: usa `cash:view` en vez de `persons:view` porque esta busqueda esta orientada al modulo de caja/cobranza).
2. Llamar a `personModel.findForCollection(search)` -- busqueda optimizada que retorna solo campos basicos para un selector (id, nombre, apellido, dni).
3. Retornar el resultado.

---

#### togglePersonActive

**Archivo:** `src/server/actions/person.actions.ts` L205-L220
**Guard:** `requirePermission("persons:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: persona no encontrada.
**Modelos afectados:** Person (lectura + escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `persons:manage`.
2. Buscar persona via `personModel.findById(id)`. Si no existe, retornar error.
3. Toggle: `personModel.toggleActive(id, !person.isActive)` -- invierte el estado activo/inactivo.
4. Registrar en audit log: `{ oldData: { isActive: old }, newData: { isActive: new } }`.
5. `revalidatePath("/personas")`.
6. Retornar `{ success: true }`.

---

### 8.2 user.actions.ts

**Archivo completo:** `src/server/actions/user.actions.ts` (211 lineas)

Acciones para gestion de usuarios del sistema, cambio de contrasena, activacion/desactivacion, y gestion de vendedores (seller). El modelo User (ver AUDIT_DATABASE.md seccion 3.1) tiene roles RBAC definidos en el enum Role (ver AUDIT_DATABASE.md seccion 2.1): SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA.

---

#### getUsers

**Archivo:** `src/server/actions/user.actions.ts` L16-L23
**Guard:** `requirePermission("users:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de usuarios. No lanza errores.
**Modelos afectados:** User (lectura) -- ver AUDIT_DATABASE.md seccion 3.1

**Flujo:**
1. Verificar permiso `users:view`.
2. Llamar a `userModel.findAll(params)` con filtros opcionales: `search`, `role`, `isActive`.
3. Retornar el array.

---

#### getUserById

**Archivo:** `src/server/actions/user.actions.ts` L25-L28
**Guard:** `requirePermission("users:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna usuario o `null`. No lanza errores.
**Modelos afectados:** User (lectura)

**Flujo:**
1. Verificar permiso `users:view`.
2. Llamar a `userModel.findById(id)`.
3. Retornar el resultado.

---

#### createUser

**Archivo:** `src/server/actions/user.actions.ts` L30-L78
**Guard:** `requirePermission("users:manage")`
**Schema:** `userCreateSchema` de `src/schemas/user.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, email duplicado (Prisma P2002), error generico.
**Modelos afectados:** User (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.1, 3.19

**Flujo:**
1. Verificar permiso `users:manage`.
2. Extraer campos del `FormData`: email, name, lastName, phone, role, password.
3. Validar con `userCreateSchema.safeParse(raw)`.
4. **Hashear contrasena:** `bcrypt.hash(parsed.data.password, 10)` con salt rounds = 10.
5. Crear usuario via `userModel.create(...)` con la contrasena hasheada.
6. Registrar en audit log con email, nombre, apellido y rol (nunca loguea la contrasena).
7. **Manejo de duplicados:** Si Prisma lanza P2002, retornar `"Ya existe un usuario con ese email"`.
8. `revalidatePath("/configuracion")`.
9. Retornar `{ success: true }`.

**Schema userCreateSchema** (`src/schemas/user.schema.ts`):
- `email`: string, validacion email
- `name`: string requerido, max 100
- `lastName`: string requerido, max 100
- `phone`: string opcional, max 50
- `role`: Role enum (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA)
- `password`: string min 8 chars, debe contener al menos una mayuscula (`/[A-Z]/`) y un numero (`/[0-9]/`)

---

#### updateUser

**Archivo:** `src/server/actions/user.actions.ts` L80-L125
**Guard:** `requirePermission("users:manage")`
**Schema:** `userUpdateSchema` de `src/schemas/user.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, email duplicado, error generico.
**Modelos afectados:** User (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `users:manage`.
2. Extraer campos del `FormData` (mismos que createUser sin `password`, mas `id`).
3. Validar con `userUpdateSchema.safeParse(raw)`.
4. Actualizar via `userModel.update(id, {...})`.
5. Registrar en audit log.
6. **Manejo de duplicados:** Igual que createUser.
7. `revalidatePath("/configuracion")`.
8. Retornar `{ success: true }`.

**Nota:** La actualizacion de usuario NO incluye cambio de contrasena. Para eso existe `changeUserPassword` (ver abajo).

---

#### changeUserPassword

**Archivo:** `src/server/actions/user.actions.ts` L127-L152
**Guard:** `requirePermission("users:manage")`
**Schema:** `passwordChangeSchema` de `src/schemas/user.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod.
**Modelos afectados:** User (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `users:manage`.
2. Extraer `id` y `password` del FormData.
3. Validar con `passwordChangeSchema.safeParse(raw)` -- mismas reglas que userCreateSchema.password.
4. **Hashear nueva contrasena:** `bcrypt.hash(parsed.data.password, 10)`.
5. Actualizar via `userModel.updatePassword(id, hashedPassword)`.
6. Registrar en audit log con `{ newData: { passwordChanged: true } }` (nunca loguea la contrasena).
7. `revalidatePath("/configuracion")`.
8. Retornar `{ success: true }`.

**Schema passwordChangeSchema** (`src/schemas/user.schema.ts`):
- `id`: string requerido
- `password`: string min 8, con mayuscula y numero

---

#### toggleUserActive

**Archivo:** `src/server/actions/user.actions.ts` L154-L169
**Guard:** `requirePermission("users:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: usuario no encontrado.
**Modelos afectados:** User (lectura + escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `users:manage`.
2. Buscar usuario via `userModel.findById(id)`. Si no existe, retornar error.
3. Toggle: `userModel.toggleActive(id, !user.isActive)`.
4. Registrar en audit log: `{ oldData: { isActive: old }, newData: { isActive: new } }`.
5. `revalidatePath("/configuracion")`.
6. Retornar `{ success: true }`.

---

#### getEmployees

**Archivo:** `src/server/actions/user.actions.ts` L173-L179
**Guard:** `requirePermission("users:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de usuarios con flag `isSeller`. No lanza errores.
**Modelos afectados:** User (lectura)

**Flujo:**
1. Verificar permiso `users:view`.
2. Llamar a `userModel.findAllSellers(params)` con filtros opcionales: `search`, `isActive`.
3. Retornar el array (incluye todos los usuarios, con su estado de vendedor).

---

#### getActiveSellers

**Archivo:** `src/server/actions/user.actions.ts` L181-L184
**Guard:** `requirePermission("sales:manage")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de vendedores activos. No lanza errores.
**Modelos afectados:** User (lectura)

**Flujo:**
1. Verificar permiso `sales:manage` (nota: usa `sales:manage` porque esta lista se consume desde el formulario de ventas).
2. Llamar a `userModel.findActiveSellers()` -- filtra por `isSeller: true` y `isActive: true`.
3. Retornar el array.

---

#### toggleUserSeller

**Archivo:** `src/server/actions/user.actions.ts` L186-L196
**Guard:** `requirePermission("users:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: usuario no encontrado.
**Modelos afectados:** User (lectura + escritura)

**Flujo:**
1. Verificar permiso `users:manage`.
2. Buscar usuario. Si no existe, retornar error.
3. Toggle: `userModel.toggleSeller(id, !user.isSeller)` -- activa o desactiva al usuario como vendedor.
4. `revalidatePath("/configuracion")`.
5. Retornar `{ success: true }`.

---

#### updateUserCommission

**Archivo:** `src/server/actions/user.actions.ts` L198-L211
**Guard:** `requirePermission("users:manage")`
**Schema:** Ninguno (recibe `id: string`, `rate: number | null`)
**Retorno + Errores:** `ActionResult`. Errores: usuario no encontrado.
**Modelos afectados:** User (lectura + escritura)

**Flujo:**
1. Verificar permiso `users:manage`.
2. Buscar usuario. Si no existe, retornar error.
3. Actualizar tasa de comision: `userModel.updateCommissionRate(id, rate)`. El rate puede ser `null` para eliminar la comision configurada.
4. `revalidatePath("/configuracion")`.
5. Retornar `{ success: true }`.

---

## 9. Desarrollos (Developments, Lots, Tags)

Dominio de gestion de desarrollos inmobiliarios, lotes y etiquetas. Los desarrollos son el contenedor principal del inventario de lotes. Las etiquetas (tags) permiten clasificar lotes de forma flexible. Ver AUDIT_CONCEPT.md seccion 5.2 para el contexto funcional de desarrollos.

### 9.1 development.actions.ts

**Archivo completo:** `src/server/actions/development.actions.ts` (121 lineas)

Acciones para gestion de desarrollos. El modelo Development (ver AUDIT_DATABASE.md seccion 3.3) tiene tipos INMOBILIARIO y OTROS (ver AUDIT_DATABASE.md seccion 2.3), y status PLANIFICACION, ACTIVO, COMPLETADO, SUSPENDIDO (ver AUDIT_DATABASE.md seccion 2.2).

---

#### getDevelopments

**Archivo:** `src/server/actions/development.actions.ts` L19-L26
**Guard:** `requirePermission("developments:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de desarrollos. No lanza errores.
**Modelos afectados:** Development (lectura) -- ver AUDIT_DATABASE.md seccion 3.3

**Flujo:**
1. Verificar permiso `developments:view`.
2. Llamar a `developmentModel.findAll(params)` con filtros opcionales: `search`, `status` (DevelopmentStatus), `type` (DevelopmentType).
3. Retornar el array.

---

#### getDevelopmentOptions

**Archivo:** `src/server/actions/development.actions.ts` L28-L35
**Guard:** `requireAuth()` (solo autenticacion, sin permiso especifico)
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de `{ id, name }`. No lanza errores.
**Modelos afectados:** Development (lectura)

**Flujo:**
1. Verificar autenticacion (no requiere permiso especifico -- cualquier usuario autenticado puede ver las opciones).
2. Consulta directa a Prisma: `prisma.development.findMany({ select: { id, name }, orderBy: { name: "asc" } })`.
3. Retornar el array. Esta lista se usa en selectores dropdown de la UI (formularios de venta, firmas, etc.).

---

#### getDevelopmentBySlug

**Archivo:** `src/server/actions/development.actions.ts` L37-L40
**Guard:** `requirePermission("developments:view")`
**Schema:** Ninguno (recibe `slug: string`)
**Retorno + Errores:** Retorna desarrollo completo con lotes o `null`. No lanza errores.
**Modelos afectados:** Development (lectura con includes de lots)

**Flujo:**
1. Verificar permiso `developments:view`.
2. Llamar a `developmentModel.findBySlug(slug)` -- incluye lotes asociados con sus datos completos.
3. Retornar el resultado (pagina de detalle del desarrollo).

---

#### createDevelopment

**Archivo:** `src/server/actions/development.actions.ts` L42-L73
**Guard:** `requirePermission("developments:manage")`
**Schema:** `developmentCreateSchema` de `src/schemas/development.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, ServiceError del service.
**Modelos afectados:** Development (escritura), Lot (escritura masiva condicional), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.3, 3.4, 3.19

**Flujo:**
1. Verificar permiso `developments:manage`.
2. Extraer campos del `FormData`: name, description, location, googleMapsUrl, type, status, totalLots.
3. Validar con `developmentCreateSchema.safeParse(raw)`.
4. Delegar a `developmentService.createDevelopment(parsed.data)` -> Ver &sect;9.2.
5. Si ServiceError: retornar `{ success: false, error: message }`.
6. `revalidatePath("/desarrollos")`.
7. Retornar `{ success: true }`.

**Schema developmentCreateSchema** (`src/schemas/development.schema.ts`):
- `name`: string requerido, max 100
- `description`: string opcional, max 500
- `location`: string opcional, max 200
- `googleMapsUrl`: string opcional, validacion URL, max 500
- `type`: DevelopmentType enum (INMOBILIARIO, OTROS)
- `status`: DevelopmentStatus enum (PLANIFICACION, ACTIVO, COMPLETADO, SUSPENDIDO)
- `totalLots`: numero coerced desde string, entero >= 0, max 500, default 0

---

#### updateDevelopment

**Archivo:** `src/server/actions/development.actions.ts` L75-L106
**Guard:** `requirePermission("developments:manage")`
**Schema:** `developmentUpdateSchema` de `src/schemas/development.schema.ts` (extiende createSchema sin `totalLots`, con `id`)
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, ServiceError del service.
**Modelos afectados:** Development (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `developments:manage`.
2. Extraer campos del `FormData` (mismos que create sin `totalLots`, mas `id`).
3. Validar con `developmentUpdateSchema.safeParse(raw)`.
4. Delegar a `developmentService.updateDevelopment(parsed.data)` -> Ver &sect;9.2.
5. Si ServiceError: retornar error.
6. `revalidatePath("/desarrollos")`.
7. Retornar `{ success: true }`.

---

#### deleteDevelopment

**Archivo:** `src/server/actions/development.actions.ts` L108-L121
**Guard:** `requirePermission("developments:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: ServiceError del service (lotes existentes, lotes con ventas).
**Modelos afectados:** Development (lectura + eliminacion), Lot (validacion), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `developments:manage`.
2. Delegar a `developmentService.deleteDevelopment(id)` -> Ver &sect;9.2.
3. Si ServiceError: retornar error.
4. `revalidatePath("/desarrollos")`.
5. Retornar `{ success: true }`.

---

### 9.2 development.service.ts

**Archivo completo:** `src/server/services/development.service.ts` (141 lineas)

Logica de negocio para desarrollos: creacion con auto-generacion de lotes, actualizacion con regeneracion de slug, y eliminacion con validacion de integridad. Llamado desde las actions de &sect;9.1.

**Helper privado -- generateUniqueSlug:**
Genera un slug unico a partir del nombre del desarrollo. Usa `slugify(name)` y, si ya existe, agrega un sufijo numerico (e.g., `"mi-desarrollo-2"`). Verifica unicidad via `developmentModel.slugExists(slug, excludeId)`.

---

#### createDevelopment (service)

**Archivo:** `src/server/services/development.service.ts` L36-L72
**Guard:** Ninguno (llamado desde action que ya verifico permisos)
**Schema:** Recibe `DevCreateData` (output del schema validado)
**Retorno + Errores:** `void`. Lanza `ServiceError` en caso de error de creacion.
**Modelos afectados:** Development (escritura), Lot (escritura masiva), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.3, 3.4, 3.19

**Flujo detallado:**
1. **Generar slug unico** via `generateUniqueSlug(data.name)`.
2. **Crear desarrollo** via `developmentModel.create(...)` con: name, slug, description, location, googleMapsUrl, type, status.
3. **Auto-generar lotes** si `totalLots > 0`:
   - `prisma.lot.createMany(...)` con un array de lotes numerados del 1 al totalLots.
   - Cada lote: `developmentId`, `lotNumber: String(i+1)`, `status: "DISPONIBLE"`.
4. **Audit log:** Registrar creacion con nombre, tipo, status y cantidad de lotes.
5. Si hay error en cualquier paso, lanzar `ServiceError("Error al crear el desarrollo")`.

---

#### updateDevelopment (service)

**Archivo:** `src/server/services/development.service.ts` L78-L114
**Guard:** Ninguno (llamado desde action)
**Schema:** Recibe `DevUpdateData` (output del schema)
**Retorno + Errores:** `void`. Lanza `ServiceError` si el desarrollo no existe.
**Modelos afectados:** Development (lectura + escritura), AuditLog (escritura)

**Flujo detallado:**
1. Buscar el desarrollo existente. Si no existe -> `ServiceError("Desarrollo no encontrado")`.
2. **Regenerar slug** si el nombre cambio: `generateUniqueSlug(data.name, data.id)`. Si no cambio, mantener el slug actual.
3. Actualizar via `developmentModel.update(id, {...})` con todos los campos.
4. Registrar en audit log con datos anteriores y nuevos (name, type, status).

---

#### deleteDevelopment (service)

**Archivo:** `src/server/services/development.service.ts` L120-L141
**Guard:** Ninguno (llamado desde action)
**Schema:** Ninguno (recibe `id: string`)
**Retorno + Errores:** `void`. Lanza `ServiceError` si no existe, tiene lotes vendidos, o tiene lotes.
**Modelos afectados:** Development (lectura + eliminacion), Lot (validacion), AuditLog (escritura)

**Flujo detallado:**
1. Buscar desarrollo. Si no existe -> `ServiceError("Desarrollo no encontrado")`.
2. **Validar integridad:**
   a. Si tiene lotes (`development.lots.length > 0`):
      - Verificar si hay lotes con ventas: `developmentModel.hasLotsWithSales(id)`.
      - Si hay ventas -> `ServiceError("No se puede eliminar un desarrollo con lotes vendidos")`.
      - Si hay lotes sin ventas -> `ServiceError("Elimina todos los lotes antes de eliminar el desarrollo")`.
3. Eliminar via `developmentModel.delete(id)`.
4. Registrar en audit log con nombre del desarrollo eliminado.

**Politica de eliminacion:** Un desarrollo solo se puede eliminar si no tiene ningun lote. Esto fuerza al operador a eliminar los lotes uno a uno (verificando que ninguno tenga venta) antes de poder eliminar el desarrollo.

---

### 9.3 tag.actions.ts

**Archivo completo:** `src/server/actions/tag.actions.ts` (153 lineas)

Acciones para gestion de etiquetas y su asignacion a lotes. Las etiquetas permiten clasificar lotes de forma flexible (e.g., "esquina", "vista al rio", "reservado"). Modelo Tag: ver AUDIT_DATABASE.md seccion 3.5. Modelo LotTag (tabla pivot): ver AUDIT_DATABASE.md seccion 3.6. Ver AUDIT_CONCEPT.md seccion 5.14 para el contexto funcional.

---

#### getTags

**Archivo:** `src/server/actions/tag.actions.ts` L10-L13
**Guard:** `requirePermission("lots:view")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de todas las etiquetas. No lanza errores.
**Modelos afectados:** Tag (lectura) -- ver AUDIT_DATABASE.md seccion 3.5

**Flujo:**
1. Verificar permiso `lots:view` (las etiquetas se gestionan en contexto de lotes).
2. Llamar a `tagModel.findAll()`.
3. Retornar el array.

---

#### createTag

**Archivo:** `src/server/actions/tag.actions.ts` L15-L53
**Guard:** `requirePermission("lots:manage")`
**Schema:** `tagCreateSchema` de `src/schemas/tag.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, nombre generado invalido, nombre duplicado.
**Modelos afectados:** Tag (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.5, 3.19

**Flujo:**
1. Verificar permiso `lots:manage`.
2. Extraer campos del `FormData`: label, color.
3. Validar con `tagCreateSchema.safeParse(raw)`.
4. **Generar slug name** desde el label: `labelToName(parsed.data.label)` -- convierte a lowercase, elimina acentos, reemplaza espacios con guiones.
5. Si el name generado es vacio, retornar error.
6. Verificar unicidad: `tagModel.nameExists(name)`. Si existe, retornar `"Ya existe una etiqueta con ese nombre"`.
7. Crear tag via `tagModel.create({ name, label, color })`.
8. Registrar en audit log con name y label.
9. `revalidatePath("/desarrollos")`.
10. Retornar `{ success: true }`.

**Schema tagCreateSchema** (`src/schemas/tag.schema.ts`):
- `label`: string requerido, max 50, con `.trim()`
- `color`: string opcional, regex `^#[0-9A-Fa-f]{6}$` (color hexadecimal)

---

#### updateTag

**Archivo:** `src/server/actions/tag.actions.ts` L55-L95
**Guard:** `requirePermission("lots:manage")`
**Schema:** `tagUpdateSchema` de `src/schemas/tag.schema.ts` (extiende tagCreateSchema con `id`)
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod, nombre generado invalido, nombre duplicado.
**Modelos afectados:** Tag (escritura), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `lots:manage`.
2. Extraer campos del `FormData`: id (recibido como parametro), label, color.
3. Validar con `tagUpdateSchema.safeParse(raw)`.
4. Generar slug name: `labelToName(parsed.data.label)`.
5. Verificar unicidad excluyendo la etiqueta actual: `tagModel.nameExists(name, id)`.
6. Actualizar via `tagModel.update(id, { name, label, color })`.
7. Registrar en audit log.
8. `revalidatePath("/desarrollos")`.
9. Retornar `{ success: true }`.

---

#### deleteTag

**Archivo:** `src/server/actions/tag.actions.ts` L97-L113
**Guard:** `requirePermission("lots:manage")`
**Schema:** Ninguno (solo recibe `id: string`)
**Retorno + Errores:** `ActionResult`. Errores: etiqueta no encontrada.
**Modelos afectados:** Tag (lectura + eliminacion), LotTag (eliminacion en cascada), AuditLog (escritura)

**Flujo:**
1. Verificar permiso `lots:manage`.
2. Buscar tag via `tagModel.findById(id)`. Si no existe, retornar error.
3. Eliminar via `tagModel.delete(id)` -- las relaciones LotTag se eliminan en cascada.
4. Registrar en audit log con name y label del tag eliminado.
5. `revalidatePath("/desarrollos")`.
6. Retornar `{ success: true }`.

---

#### getTagsForLot

**Archivo:** `src/server/actions/tag.actions.ts` L115-L118
**Guard:** `requirePermission("lots:view")`
**Schema:** Ninguno (recibe `lotId: string`)
**Retorno + Errores:** Retorna array de tags asignadas al lote. No lanza errores.
**Modelos afectados:** LotTag (lectura), Tag (lectura) -- ver AUDIT_DATABASE.md secciones 3.6, 3.5

**Flujo:**
1. Verificar permiso `lots:view`.
2. Llamar a `tagModel.findByLotId(lotId)`.
3. Retornar el array de tags.

---

#### bulkSetLotTags

**Archivo:** `src/server/actions/tag.actions.ts` L120-L139
**Guard:** `requirePermission("lots:manage")`
**Schema:** Ninguno (parametros tipados: `lotIds: string[]`, `tagIds: string[]`)
**Retorno + Errores:** `ActionResult`. Errores: sin lotes seleccionados, maximo 200 lotes.
**Modelos afectados:** LotTag (eliminacion + escritura masiva)

**Flujo:**
1. Verificar permiso `lots:manage`.
2. Validar que `lotIds` no este vacio y no supere 200 elementos.
3. Para cada lote: `tagModel.setLotTags(lotId, tagIds)` -- reemplaza todas las etiquetas del lote con las nuevas (delete + insert).
4. `revalidatePath("/desarrollos")`.
5. Retornar `{ success: true }`.

**Nota:** Esta operacion reemplaza completamente las tags de cada lote (no agrega). Si `tagIds` esta vacio, se eliminan todas las tags del lote.

---

#### setLotTags

**Archivo:** `src/server/actions/tag.actions.ts` L141-L153
**Guard:** `requirePermission("lots:manage")`
**Schema:** `lotTagsSchema` de `src/schemas/tag.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod.
**Modelos afectados:** LotTag (eliminacion + escritura)

**Flujo:**
1. Verificar permiso `lots:manage`.
2. Validar con `lotTagsSchema.safeParse({ lotId, tagIds })`.
3. Llamar a `tagModel.setLotTags(parsed.data.lotId, parsed.data.tagIds)`.
4. `revalidatePath("/desarrollos")`.
5. Retornar `{ success: true }`.

**Schema lotTagsSchema** (`src/schemas/tag.schema.ts`):
- `lotId`: string requerido
- `tagIds`: array de strings

---

## 10. Comunicaciones (Notifications, Messages)

Dominio de notificaciones internas y mensajeria entre usuarios. Las notificaciones son alertas del sistema (pago recibido, firma proxima, etc.); los mensajes son comunicacion directa entre usuarios. Ver AUDIT_CONCEPT.md seccion 5.8 para el contexto funcional.

### 10.1 notification.actions.ts

**Archivo completo:** `src/server/actions/notification.actions.ts` (130 lineas)

Acciones para consultar, marcar como leidas, crear y resolver URLs de notificaciones. Modelo Notification: ver AUDIT_DATABASE.md seccion 3.18. Tipos de notificacion definidos en el enum NotificationType (ver AUDIT_DATABASE.md seccion 2.12): PAGO, VENCIMIENTO, FIRMA, SISTEMA, MENSAJE.

---

#### getMyNotifications

**Archivo:** `src/server/actions/notification.actions.ts` L9-L12
**Guard:** `requireAuth()` (solo autenticacion)
**Schema:** Ninguno (parametros opcionales)
**Retorno + Errores:** Retorna array de notificaciones del usuario actual. No lanza errores.
**Modelos afectados:** Notification (lectura) -- ver AUDIT_DATABASE.md seccion 3.18

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Llamar a `notificationModel.findByUserId(session.user.id, params)` con filtro opcional: `read` (boolean, filtra leidas/no leidas).
3. Retornar el array.

---

#### getUnreadCount

**Archivo:** `src/server/actions/notification.actions.ts` L14-L17
**Guard:** `requireAuth()`
**Schema:** Ninguno
**Retorno + Errores:** Retorna numero de notificaciones no leidas. No lanza errores.
**Modelos afectados:** Notification (lectura agregada)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Llamar a `notificationModel.countUnread(session.user.id)`.
3. Retornar el conteo.

---

#### markNotificationRead

**Archivo:** `src/server/actions/notification.actions.ts` L19-L33
**Guard:** `requireAuth()`
**Schema:** Ninguno (recibe `id: string`)
**Retorno + Errores:** `{ success: boolean, error?: string }`. Errores: notificacion no encontrada, permiso denegado.
**Modelos afectados:** Notification (lectura + escritura)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Buscar notificacion via `notificationModel.findById(id)`. Si no existe, retornar error.
3. **Verificar propiedad:** Si `notification.userId !== session.user.id`, retornar `"Permiso denegado"`. Un usuario solo puede marcar como leidas sus propias notificaciones.
4. Marcar como leida: `notificationModel.markAsRead(id)`.
5. `revalidatePath("/")` (actualiza el badge de notificaciones en toda la app).
6. Retornar `{ success: true }`.

---

#### markAllNotificationsRead

**Archivo:** `src/server/actions/notification.actions.ts` L35-L40
**Guard:** `requireAuth()`
**Schema:** Ninguno
**Retorno + Errores:** `{ success: true }`. No lanza errores.
**Modelos afectados:** Notification (escritura masiva)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Marcar todas como leidas: `notificationModel.markAllAsRead(session.user.id)`.
3. `revalidatePath("/")`.
4. Retornar `{ success: true }`.

---

#### createNotification

**Archivo:** `src/server/actions/notification.actions.ts` L46-L66
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno (parametros tipados directamente)
**Retorno + Errores:** `{ success: true }`. No lanza errores.
**Modelos afectados:** Notification (escritura)

**Flujo:**
1. Verificar permiso `config:manage` (solo administradores pueden crear notificaciones manualmente).
2. Crear notificacion via `notificationModel.create(...)`:
   - `userId`: destinatario
   - `type`: NotificationType (PAGO, VENCIMIENTO, FIRMA, SISTEMA, MENSAJE)
   - `title`, `body`: contenido de la notificacion
   - `referenceType`, `referenceId`: referencia opcional a la entidad relacionada (e.g., "Sale", saleId)
3. Retornar `{ success: true }`.

---

#### resolveNotificationUrl

**Archivo:** `src/server/actions/notification.actions.ts` L71-L108
**Guard:** `requireAuth()`
**Schema:** Ninguno (recibe `referenceType: string`, `referenceId: string | null`)
**Retorno + Errores:** Retorna `string | null` (URL de navegacion). No lanza errores.
**Modelos afectados:** Installment (lectura condicional), ExtraCharge (lectura condicional)

**Flujo:**
1. Verificar autenticacion.
2. **Switch por referenceType:**
   - `"Sale"` -> `/ventas/{referenceId}` (o `/ventas` si no hay ID)
   - `"Installment"` -> Buscar installment para obtener saleId, retornar `/ventas/{saleId}` (o `/cobranza`)
   - `"ExtraCharge"` -> Buscar extraCharge para obtener saleId, retornar `/ventas/{saleId}` (o `/cobranza`)
   - `"SigningSlot"` -> `/firmas`
   - `"Message"` -> `/mensajes`
   - Default -> `null`

**Uso:** La UI llama a esta funcion cuando el usuario hace click en una notificacion, para navegar a la entidad referenciada.

---

#### createNotificationInternal

**Archivo:** `src/server/actions/notification.actions.ts` L114-L130
**Guard:** Ninguno (funcion interna, sin verificacion de permisos)
**Schema:** Ninguno (parametros tipados directamente)
**Retorno + Errores:** `void`. No lanza errores.
**Modelos afectados:** Notification (escritura)

**Flujo:**
1. Crear notificacion via `notificationModel.create(...)` con los mismos campos que `createNotification`.

**Diferencia con createNotification:** No tiene guard de permisos. Esta disenada para uso interno desde otros server actions (e.g., `sendMessage` crea una notificacion para cada destinatario). No debe exponerse directamente a la UI.

---

### 10.2 message.actions.ts

**Archivo completo:** `src/server/actions/message.actions.ts` (97 lineas)

Acciones para mensajeria interna entre usuarios del sistema. Modelo Message: ver AUDIT_DATABASE.md seccion 3.16. Modelo MessageRecipient (tabla pivot): ver AUDIT_DATABASE.md seccion 3.17.

---

#### getMyMessages

**Archivo:** `src/server/actions/message.actions.ts` L19-L22
**Guard:** `requireAuth()`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de mensajes recibidos por el usuario actual. No lanza errores.
**Modelos afectados:** MessageRecipient (lectura), Message (lectura)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Llamar a `messageModel.findReceivedByUserId(session.user.id)`.
3. Retornar el array.

---

#### getSentMessages

**Archivo:** `src/server/actions/message.actions.ts` L24-L27
**Guard:** `requireAuth()`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de mensajes enviados por el usuario actual. No lanza errores.
**Modelos afectados:** Message (lectura)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Llamar a `messageModel.findBySenderId(session.user.id)`.
3. Retornar el array.

---

#### sendMessage

**Archivo:** `src/server/actions/message.actions.ts` L29-L68
**Guard:** `requireAuth()`
**Schema:** `sendMessageSchema` (definido inline en el archivo)
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod.
**Modelos afectados:** Message (escritura), MessageRecipient (escritura), Notification (escritura via createNotificationInternal) -- ver AUDIT_DATABASE.md secciones 3.16, 3.17, 3.18

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id` y `session.user.name`.
2. Extraer campos del `FormData`: subject, body, recipientIds (array via `formData.getAll`).
3. Validar con `sendMessageSchema.safeParse(raw)`.
4. Crear mensaje via `messageModel.create(...)` con senderId, subject, body, recipientIds.
5. **Crear notificacion para cada destinatario:**
   - Para cada `recipientId` en la lista: `createNotificationInternal(recipientId, "SISTEMA", "Nuevo mensaje", "{senderName} te envio un mensaje: {subject}", "Message", message.id)`.
6. `revalidatePath("/mensajes")`.
7. Retornar `{ success: true }`.

**Schema sendMessageSchema** (inline):
- `subject`: string requerido, max 200
- `body`: string requerido
- `recipientIds`: array de strings, min 1 (`"Selecciona al menos un destinatario"`)

---

#### markMessageRead

**Archivo:** `src/server/actions/message.actions.ts` L70-L75
**Guard:** `requireAuth()`
**Schema:** Ninguno (recibe `messageId: string`)
**Retorno + Errores:** `{ success: true }`. No lanza errores.
**Modelos afectados:** MessageRecipient (escritura)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Marcar como leido: `messageModel.markAsRead(messageId, session.user.id)` -- actualiza el campo `readAt` en la tabla pivot MessageRecipient.
3. `revalidatePath("/mensajes")`.
4. Retornar `{ success: true }`.

---

#### getUnreadMessageCount

**Archivo:** `src/server/actions/message.actions.ts` L77-L80
**Guard:** `requireAuth()`
**Schema:** Ninguno
**Retorno + Errores:** Retorna numero de mensajes no leidos. No lanza errores.
**Modelos afectados:** MessageRecipient (lectura agregada)

**Flujo:**
1. Verificar autenticacion. Obtener `session.user.id`.
2. Llamar a `messageModel.countUnread(session.user.id)`.
3. Retornar el conteo.

---

#### getActiveUsersForMessaging

**Archivo:** `src/server/actions/message.actions.ts` L86-L97
**Guard:** `requireAuth()`
**Schema:** Ninguno
**Retorno + Errores:** Retorna array de usuarios activos `{ id, name, lastName }`. No lanza errores.
**Modelos afectados:** User (lectura)

**Flujo:**
1. Verificar autenticacion (cualquier usuario autenticado puede ver la lista para enviar mensajes).
2. Consulta directa a Prisma: `prisma.user.findMany({ where: { isActive: true }, select: { id, name, lastName }, orderBy: { name: "asc" } })`.
3. Retornar el array. Esta lista se usa en el selector de destinatarios del formulario de mensajes.

---

## 11. Sistema (Auth, RBAC, Receipts, Audit, Import, Config)

Dominio de funcionalidades transversales del sistema: autenticacion, permisos, recibos de pago, audit trail, importacion masiva de datos, horarios de atencion, y configuracion general. Ver AUDIT_CONCEPT.md secciones 5.9 (Configuracion), 5.10 (Auditoria), 5.12 (Importacion), 5.13 (Recibos), seccion 7 (Modelo de Roles y Permisos), seccion 9 (Flujo de Autenticacion).

### 11.1 auth.actions.ts

**Archivo completo:** `src/server/actions/auth.actions.ts` (43 lineas)

Acciones de autenticacion: login y logout. Integra con Auth.js v5 (NextAuth) para el flujo de credenciales. Ver AUDIT_CONCEPT.md seccion 9 para el flujo completo de autenticacion.

---

#### loginAction

**Archivo:** `src/server/actions/auth.actions.ts` L12-L39
**Guard:** Ninguno (pagina publica de login)
**Schema:** `loginSchema` de `src/schemas/auth.schema.ts`
**Retorno + Errores:** `AuthState` (`{ success?: boolean, error?: string }`). Errores: validacion Zod, credenciales invalidas.
**Modelos afectados:** User (lectura via Auth.js) -- ver AUDIT_DATABASE.md seccion 3.1

**Flujo:**
1. Extraer `email` y `password` del `FormData`.
2. Validar con `loginSchema.safeParse(raw)`. Si falla, retornar `{ error: primerError }`.
3. Llamar a `signIn("credentials", { email, password, redirectTo: "/dashboard" })`:
   - Auth.js busca el usuario por email en la BD.
   - Compara la contrasena hasheada con bcrypt.
   - Si coincide, crea una sesion JWT y redirige a `/dashboard`.
4. Si `signIn` lanza `AuthError`, retornar `{ error: "Credenciales invalidas" }`.
5. Si `signIn` lanza otro tipo de error, re-lanzar (puede ser un redirect de Auth.js, que es esperado).
6. Retornar `{ success: true }` (en la practica, el redirect ocurre antes).

**Schema loginSchema** (`src/schemas/auth.schema.ts`):
- `email`: string, validacion email
- `password`: string min 6 chars

---

#### logoutAction

**Archivo:** `src/server/actions/auth.actions.ts` L41-L43
**Guard:** Ninguno (disponible para cualquier usuario autenticado)
**Schema:** Ninguno
**Retorno + Errores:** No retorna (redirige). No lanza errores.
**Modelos afectados:** Ninguno

**Flujo:**
1. Llamar a `signOut({ redirectTo: "/login" })`.
2. Auth.js destruye la sesion y redirige a `/login`.

---

### 11.2 role-permission.actions.ts

**Archivo completo:** `src/server/actions/role-permission.actions.ts` (83 lineas)

Acciones para gestion de permisos RBAC del sistema. Los permisos se almacenan en la tabla RolePermission (ver AUDIT_DATABASE.md seccion 3.2) y son consultados por `requirePermission()` en cada action. Ver AUDIT_CONCEPT.md seccion 7 para la descripcion completa de roles y seccion 8 para la matriz de acceso.

Los 4 roles del sistema:
- **SUPER_ADMIN:** Acceso completo, permisos inmutables.
- **ADMINISTRACION:** Gestion de ventas, desarrollos, personas, configuracion.
- **FINANZAS:** Gestion de caja, cotizaciones, reportes financieros.
- **COBRANZA:** Gestion de cobros, pagos de cuotas.

---

#### getAllRolePermissions

**Archivo:** `src/server/actions/role-permission.actions.ts` L11-L24
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna `Record<string, string[]>` (permisos agrupados por rol). No lanza errores.
**Modelos afectados:** RolePermission (lectura) -- ver AUDIT_DATABASE.md seccion 3.2

**Flujo:**
1. Verificar permiso `config:manage`.
2. Obtener todos los registros: `rolePermissionModel.findAll()`.
3. Agrupar por rol: construir un objeto donde cada clave es un rol y el valor es un array de permisos.
4. Retornar el objeto agrupado.

---

#### updateRolePermissions

**Archivo:** `src/server/actions/role-permission.actions.ts` L27-L57
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno (parametros tipados: `role: string`, `permissions: string[]`)
**Retorno + Errores:** `ActionResult`. Errores: intento de modificar SUPER_ADMIN, error de actualizacion.
**Modelos afectados:** RolePermission (escritura) -- ver AUDIT_DATABASE.md seccion 3.2

**Flujo:**
1. Verificar permiso `config:manage`.
2. **Proteccion SUPER_ADMIN:** Si `role === "SUPER_ADMIN"`, retornar `{ success: false, error: "No se pueden modificar los permisos de Super Admin" }`. Los permisos del SUPER_ADMIN son inmutables.
3. **Filtrar permisos validos:** Solo conservar permisos que existan en la lista `ALL_PERMISSIONS` de `src/lib/rbac.ts`.
4. Actualizar permisos: `rolePermissionModel.setRolePermissions(role, validPermissions)` -- elimina todos los permisos del rol y crea los nuevos (delete + insert atomico).
5. `revalidatePath("/configuracion")`.
6. Retornar `{ success: true }`.

---

#### seedDefaultPermissions

**Archivo:** `src/server/actions/role-permission.actions.ts` L60-L83
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno
**Retorno + Errores:** `ActionResult`. Errores: permisos ya inicializados, error de seed.
**Modelos afectados:** RolePermission (lectura + escritura)

**Flujo:**
1. Verificar permiso `config:manage`.
2. **Check de idempotencia:** Contar registros existentes: `rolePermissionModel.count()`. Si `count > 0`, retornar `"Los permisos ya fueron inicializados"`.
3. Para cada rol en `DEFAULT_ROLE_PERMISSIONS` (de `src/lib/rbac.ts`):
   - Insertar todos los permisos del rol: `rolePermissionModel.setRolePermissions(role, permissions)`.
4. `revalidatePath("/configuracion")`.
5. Retornar `{ success: true }`.

**Uso:** Se ejecuta una sola vez al configurar el sistema por primera vez. Los permisos por defecto estan hardcodeados en `DEFAULT_ROLE_PERMISSIONS`.

---

### 11.3 payment-receipt.actions.ts

**Archivo completo:** `src/server/actions/payment-receipt.actions.ts` (88 lineas)

Acciones para consultar y generar recibos de pago. El modelo PaymentReceipt (ver AUDIT_DATABASE.md seccion 3.13) almacena recibos textuales auto-generados con numero secuencial.

**Helper privado -- serializeReceipt:**
Convierte campos Decimal del CashMovement anidado (`usdIncome`, `arsIncome`, `usdExpense`, `arsExpense`, `manualRate`) a number.

---

#### getPaymentReceipts

**Archivo:** `src/server/actions/payment-receipt.actions.ts` L38-L58
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de recibos serializados. Retorna `[]` en caso de error.
**Modelos afectados:** PaymentReceipt (lectura), CashMovement (lectura via include)

**Flujo:**
1. Verificar permiso `sales:view`.
2. Obtener recibos via `paymentReceiptModel.findAll(params)` con filtros opcionales: `saleId`, `personId`, `dateFrom`, `dateTo`.
3. Serializar cada recibo (Decimals del CashMovement -> numbers).
4. Retornar el array.

---

#### getPaymentReceiptById

**Archivo:** `src/server/actions/payment-receipt.actions.ts` L60-L71
**Guard:** `requirePermission("sales:view")`
**Schema:** Ninguno (recibe `id: string`)
**Retorno + Errores:** Retorna recibo serializado o `null`. No lanza errores.
**Modelos afectados:** PaymentReceipt (lectura), CashMovement (lectura via include)

**Flujo:**
1. Verificar permiso `sales:view`.
2. Obtener recibo via `paymentReceiptModel.findById(id)`.
3. Si no existe, retornar `null`.
4. Serializar y retornar.

---

#### generateReceipt (action)

**Archivo:** `src/server/actions/payment-receipt.actions.ts` L73-L88
**Guard:** `requirePermission("cash:manage")`
**Schema:** Ninguno (recibe `cashMovementId: string`)
**Retorno + Errores:** `ActionResult`. Errores: ServiceError del service, error generico.
**Modelos afectados:** PaymentReceipt (escritura via service), CashMovement (lectura via service), Person (lectura via service)

**Flujo:**
1. Verificar permiso `cash:manage`. Obtener `session.user.id`.
2. Delegar a `receiptService.generateReceipt(cashMovementId, session.user.id)` -> Ver &sect;5.5.
3. Si ServiceError: retornar `{ success: false, error: message }`.
4. Retornar `{ success: true }`.

**Nota:** La generacion de recibos se documenta en detalle en &sect;5.5 (receipt.service.ts) del dominio de Pagos, ya que esta intimamente ligada al flujo de pagos.

---

### 11.4 audit-log.actions.ts

**Archivo completo:** `src/server/actions/audit-log.actions.ts` (84 lineas)

Acciones para audit logging y consulta de registros de auditoria. Modelo AuditLog: ver AUDIT_DATABASE.md seccion 3.19. Ver AUDIT_CONCEPT.md seccion 5.10 para el contexto funcional del modulo de auditoria. Ver AUDIT_DATABASE.md seccion 6 para la arquitectura completa del audit trail.

---

#### logAction (action)

**Archivo:** `src/server/actions/audit-log.actions.ts` L11-L19
**Guard:** Ninguno (funcion de utilidad interna, no expuesta a la UI directamente)
**Schema:** Ninguno (parametros tipados)
**Retorno + Errores:** `void`. No lanza errores (fallo silencioso).
**Modelos afectados:** AuditLog (escritura)

**Flujo:**
1. Delegar a `_logAction()` de `src/lib/audit.ts` (ver &sect;3.2).
2. Esta version existe como re-export "use server" para que otros action files puedan importarla sin romper las reglas de Next.js sobre server action imports.

---

#### logActionFromSession

**Archivo:** `src/server/actions/audit-log.actions.ts` L25-L51
**Guard:** Ninguno (resuelve el userId internamente desde la sesion)
**Schema:** Ninguno (parametros tipados)
**Retorno + Errores:** `void`. No lanza errores (fallo silencioso).
**Modelos afectados:** AuditLog (escritura)

**Flujo:**
1. Obtener sesion via `auth()` (Auth.js).
2. Si no hay sesion o no hay `user.id`, loguear warning y retornar sin crear registro.
3. Crear entrada de audit log via `auditLogModel.create(...)`:
   - `userId`: extraido de la sesion
   - `entity`, `entityId`, `action`: identifica la operacion
   - `oldData`, `newData`: datos opcionales antes/despues del cambio (almacenados como JSON en la BD)
4. En caso de error, loguear con `console.error` pero no lanzar -- el audit log no debe romper la operacion principal.

**Diferencia con logAction:** `logAction` recibe `userId` como parametro. `logActionFromSession` lo obtiene de la sesion automaticamente. Usar `logActionFromSession` cuando no se tiene el userId a mano.

---

#### getAuditLogs

**Archivo:** `src/server/actions/audit-log.actions.ts` L57-L84
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno (parametros opcionales tipados)
**Retorno + Errores:** Retorna array de registros de auditoria. Retorna `[]` en caso de error.
**Modelos afectados:** AuditLog (lectura) -- ver AUDIT_DATABASE.md seccion 3.19

**Flujo:**
1. Verificar permiso `config:manage` (solo administradores pueden ver el audit trail).
2. Obtener registros via `auditLogModel.findAll(params)` con filtros opcionales:
   - `search`: texto libre (busca en entity, action, datos JSON)
   - `entity`: filtrar por tipo de entidad (e.g., "Sale", "User", "Lot")
   - `userId`: filtrar por usuario que realizo la accion
   - `dateFrom`, `dateTo`: rango de fechas
3. Serializar: `oldData` y `newData` se normalizan a `null` si no existen.
4. Retornar el array.

**Datos capturados por entrada:** Cada entrada de audit log contiene: `userId` (quien), `entity` (que modelo), `entityId` (que registro), `action` (que operacion: CREATE, UPDATE, DELETE, BULK_UPDATE, IMPORT), `oldData` (estado anterior), `newData` (estado nuevo), `createdAt` (cuando).

---

### 11.5 import.actions.ts + import.service.ts

**Acciones:** `src/server/actions/import.actions.ts` (29 lineas)
**Service:** `src/server/services/import.service.ts` (433 lineas -- el archivo de service mas grande del sistema)

Sistema de importacion masiva de datos desde JSON, CSV y Excel. Permite cargar personas y ventas en bulk. Ver AUDIT_CONCEPT.md seccion 5.12 para el contexto funcional del modulo de importacion.

---

#### importPersons (action)

**Archivo:** `src/server/actions/import.actions.ts` L10-L18
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno en la action (validacion en el service)
**Retorno + Errores:** `ImportResult` (`{ created, skipped, errors[], details[] }`). No usa ActionResult.
**Modelos afectados:** Person (escritura via service), AuditLog (escritura via service)

**Flujo:**
1. Verificar permiso `config:manage`. Obtener `session.user.id`.
2. Delegar a `importService.importPersons(rawData, format, userId)` -> Ver importPersons (service) abajo.
3. `revalidatePath("/personas")`.
4. Retornar el resultado del service.

---

#### importSales (action)

**Archivo:** `src/server/actions/import.actions.ts` L20-L29
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno en la action (validacion en el service)
**Retorno + Errores:** `ImportResult`. No usa ActionResult.
**Modelos afectados:** Sale (escritura via service), Installment (escritura via service), Lot (escritura via service), AuditLog (escritura via service)

**Flujo:**
1. Verificar permiso `config:manage`. Obtener `session.user.id`.
2. Delegar a `importService.importSales(rawData, format, userId)` -> Ver importSales (service) abajo.
3. `revalidatePath("/ventas")`, `revalidatePath("/desarrollos")`.
4. Retornar el resultado.

---

#### parseInputData (service helper)

**Archivo:** `src/server/services/import.service.ts` L63-L106
**Guard:** Ninguno (funcion interna)
**Schema:** Ninguno
**Retorno + Errores:** `{ rows: unknown[], error?: string }`. Retorna error string si el formato es invalido.
**Modelos afectados:** Ninguno (parsing en memoria)

**Flujo:**
1. **Si format === "json":**
   a. Parsear con `JSON.parse(rawData)`.
   b. Verificar que sea un array. Si no -> `{ rows: [], error: "El JSON debe ser un array de objetos" }`.
   c. Retornar `{ rows: parsed }`.
2. **Si format === "csv":**
   a. Parsear con `Papa.parse(rawData, { header: true, skipEmptyLines: true })`.
   b. Si hay errores de parsing y no hay datos -> retornar error.
   c. Aplicar `coerceNumericFields()` para convertir strings numericos a numbers (totalPrice, totalInstallments, etc.).
   d. Retornar `{ rows: data }`.
3. **Si format === "excel":**
   a. Leer workbook: `XLSX.read(rawData, { type: "base64" })` (el cliente envia el archivo en base64).
   b. Obtener la primera hoja del workbook.
   c. Convertir a JSON: `XLSX.utils.sheet_to_json(sheet)`.
   d. Retornar `{ rows: data }`.

**Dependencias externas:** `papaparse` para CSV, `xlsx` para Excel.

---

#### importPersons (service)

**Archivo:** `src/server/services/import.service.ts` L133-L230
**Guard:** Ninguno (llamado desde action que ya verifico permisos)
**Schema:** `personImportSchema` (definido inline en el service)
**Retorno + Errores:** `ImportResult`. No lanza errores (acumula errores en el resultado).
**Modelos afectados:** Person (lectura + escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.7, 3.19

**Flujo detallado:**
1. **Parsear datos de entrada:** `parseInputData(rawData, format)`. Si hay error de formato, retornar inmediatamente.
2. Si el array esta vacio, retornar con error `"El array esta vacio"`.
3. **Para cada fila** (procesamiento secuencial, NO transaccional):
   a. Validar con `personImportSchema.safeParse(row)`. Si falla -> acumular error con mensaje descriptivo por fila.
   b. **Check DNI duplicado:** Si la persona tiene DNI, buscar en BD via `prisma.person.findUnique({ where: { dni } })`. Si existe -> `skipped++`, agregar detalle y continuar.
   c. **Check CUIT duplicado:** Analogo al DNI.
   d. **Crear persona:** `prisma.person.create(...)` con type (default CLIENTE), nombre, datos opcionales, `createdById = userId`.
   e. Incrementar `created++`, agregar detalle.
   f. Si hay error en la creacion -> acumular error y continuar con la siguiente fila.
4. **Audit log** (si se creo al menos una persona): `logAction("Person", "BULK_IMPORT", "IMPORT", { created, skipped, errors, format }, userId)`.
5. Retornar `ImportResult`.

**Schema personImportSchema** (inline):
- `firstName`, `lastName`: strings requeridos
- `dni`, `cuit`, `email`, `phone`, `phone2`, `address`, `city`, `province`, `notes`: strings opcionales/nullable
- `type`: enum CLIENTE|PROVEEDOR|AMBOS, default CLIENTE

**Nota:** El procesamiento es fila-a-fila sin transaccion global. Si la fila 50 falla, las 49 anteriores ya estan creadas. Esto es intencional para importaciones parciales.

---

#### importSales (service)

**Archivo:** `src/server/services/import.service.ts` L236-L433
**Guard:** Ninguno (llamado desde action)
**Schema:** `saleImportSchema` (definido inline en el service)
**Retorno + Errores:** `ImportResult`. No lanza errores (acumula errores en el resultado).
**Modelos afectados:** Development (lectura), Lot (lectura + escritura), Person (lectura), Sale (escritura), Installment (escritura), AuditLog (escritura) -- ver AUDIT_DATABASE.md secciones 3.3, 3.4, 3.7, 3.8, 3.9, 3.19

**Flujo detallado:**
1. **Parsear datos de entrada:** `parseInputData(rawData, format)`.
2. Si el array esta vacio, retornar error.
3. **Para cada fila:**
   a. Validar con `saleImportSchema.safeParse(row)`. Si falla -> acumular error.
   b. **Buscar desarrollo:** `prisma.development.findUnique({ where: { slug: developmentSlug } })`. Si no existe -> error descriptivo.
   c. **Buscar lote:** `prisma.lot.findUnique({ where: { developmentId_lotNumber } })`. Si no existe -> error.
   d. **Verificar lote libre:** `prisma.sale.findUnique({ where: { lotId } })`. Si ya tiene venta -> `skipped++`.
   e. **Buscar persona por DNI:** `prisma.person.findUnique({ where: { dni: personDni } })`. Si no existe -> error con sugerencia "Importe las personas primero".
   f. **Calcular monto de cuota:** Si `totalInstallments > 0` y no se proporciona `regularInstallmentAmount`:
      - `financedAmount = totalPrice - downPayment`
      - Si `firstInstallmentAmount` y mas de 1 cuota: primera cuota especial, resto `= (financedAmount - firstInstallmentAmount) / (totalInstallments - 1)`.
      - Sino: todas iguales `= financedAmount / totalInstallments`.
      - Redondeo a 2 decimales.
   g. **Determinar lot status:** CONTADO -> CONTADO, CESION -> PERMUTA, otros -> VENDIDO.
   h. **Transaccion atomica** (`prisma.$transaction`):
      - **Crear Sale** con todos los campos.
      - **Generar cuotas** con `generateInstallments()` si hay cuotas configuradas (totalInstallments > 0, regularAmount, firstInstallmentMonth, collectionDay).
      - **Actualizar lot status**.
   i. Incrementar `created++`, agregar detalle.
   j. Si hay error -> acumular y continuar.
4. **Audit log** (si se creo al menos una venta): `logAction("Sale", "BULK_IMPORT", "IMPORT", { created, skipped, errors, format }, userId)`.
5. Retornar `ImportResult`.

**Schema saleImportSchema** (inline):
- `lotNumber`, `developmentSlug`, `personDni`: strings requeridos
- `totalPrice`: number >= 0
- `currency`: enum USD|ARS, default USD
- `totalInstallments`: int >= 0
- `regularInstallmentAmount`, `firstInstallmentAmount`, `downPayment`: numbers opcionales
- `firstInstallmentMonth`: string opcional (YYYY-MM)
- `collectionDay`: int 1-31 opcional
- `status`: enum SaleStatus, default ACTIVA
- `paymentWindow`, `notes`, `saleDate`, `groupId`: strings opcionales

**Diferencia con importPersons:** Cada venta se crea en una transaccion individual (Sale + Installments + Lot update son atomicos por fila). Las filas entre si son independientes.

---

### 11.6 business-hours.actions.ts

**Archivo completo:** `src/server/actions/business-hours.actions.ts` (66 lineas)

Acciones para gestionar horarios de atencion de la empresa. Los horarios se almacenan como un JSON en la tabla SystemConfig (ver AUDIT_DATABASE.md seccion 3.20) bajo la clave `business_hours`.

---

#### getBusinessHours

**Archivo:** `src/server/actions/business-hours.actions.ts` L15-L36
**Guard:** Ninguno (lectura publica para la agenda de firmas)
**Schema:** `businessHoursSchema` (para validar datos existentes en BD)
**Retorno + Errores:** Retorna `BusinessHoursConfig`. Nunca falla -- retorna defaults si no hay datos.
**Modelos afectados:** SystemConfig (lectura) -- ver AUDIT_DATABASE.md seccion 3.20

**Flujo:**
1. Obtener valor de configuracion: `systemConfigModel.get("business_hours")`.
2. Si no existe en BD, retornar `DEFAULT_BUSINESS_HOURS` (horarios por defecto definidos en `src/lib/business-hours.ts`).
3. Si existe: parsear JSON y validar con `businessHoursSchema`.
   - Si validacion exitosa: retornar datos validados.
   - Si validacion falla (datos corruptos parcialmente): merge con defaults (`{ ...DEFAULT, ...parsed }`).
   - Si JSON.parse falla: retornar defaults.

**Resiliencia:** Esta funcion nunca falla. Ante cualquier problema de datos, retorna defaults validos. Esto garantiza que la agenda de firmas siempre tenga horarios de referencia.

**Schema businessHoursSchema** (`src/schemas/business-hours.schema.ts`):
- `openingTime`: string HH:MM requerido
- `closingTime`: string HH:MM requerido (debe ser posterior a openingTime)
- `breaks`: array de periodos de descanso (max 10), cada uno con label, startTime, endTime. Validaciones: dentro del horario laboral, sin superposicion entre descansos.
- `enabledDays`: array de numeros 0-6 (domingo-sabado), min 1 dia habilitado

---

#### updateBusinessHours

**Archivo:** `src/server/actions/business-hours.actions.ts` L38-L66
**Guard:** `requirePermission("config:manage")`
**Schema:** `businessHoursSchema` de `src/schemas/business-hours.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: datos invalidos, validacion Zod, error de procesamiento.
**Modelos afectados:** SystemConfig (escritura)

**Flujo:**
1. Verificar permiso `config:manage`.
2. Obtener JSON string del FormData: `formData.get("business_hours_json")`.
3. Si no es un string, retornar error.
4. Parsear JSON y validar con `businessHoursSchema.safeParse(data)`.
5. Guardar en BD: `systemConfigModel.set("business_hours", JSON.stringify(parsed.data))`.
6. `revalidatePath("/configuracion")`, `revalidatePath("/firmas")` (la agenda de firmas usa estos horarios).
7. Retornar `{ success: true }`.

---

### 11.7 system-config.actions.ts

**Archivo completo:** `src/server/actions/system-config.actions.ts` (54 lineas)

Acciones para la configuracion general del sistema. Los valores se almacenan como pares clave-valor en la tabla SystemConfig (ver AUDIT_DATABASE.md seccion 3.20). Ver AUDIT_CONCEPT.md seccion 5.9 para el contexto funcional del modulo de configuracion.

---

#### getSystemConfig

**Archivo:** `src/server/actions/system-config.actions.ts` L9-L12
**Guard:** `requirePermission("config:manage")`
**Schema:** Ninguno
**Retorno + Errores:** Retorna `Record<string, string>` (todas las configuraciones). No lanza errores.
**Modelos afectados:** SystemConfig (lectura) -- ver AUDIT_DATABASE.md seccion 3.20

**Flujo:**
1. Verificar permiso `config:manage`.
2. Obtener todas las configuraciones: `systemConfigModel.getAll()`.
3. Retornar el diccionario clave-valor.

---

#### updateSystemConfig

**Archivo:** `src/server/actions/system-config.actions.ts` L14-L54
**Guard:** `requirePermission("config:manage")`
**Schema:** `systemConfigSchema` de `src/schemas/system-config.schema.ts`
**Retorno + Errores:** `ActionResult`. Errores: validacion Zod.
**Modelos afectados:** SystemConfig (escritura)

**Flujo:**
1. Verificar permiso `config:manage`.
2. Extraer campos del `FormData`:
   - **Datos de empresa:** company_name, company_cuit, company_address, company_phone, company_email
   - **Configuracion de recibos:** receipt_header, receipt_footer
   - **Fuente de cotizacion:** default_exchange_source
   - **Configuracion SMTP:** smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from
3. Validar con `systemConfigSchema.safeParse(raw)`.
4. **Para cada par clave-valor validado:**
   - Si el valor no esta vacio: `systemConfigModel.set(key, value.trim())` -- upsert (crea o actualiza).
   - Si el valor esta vacio: `systemConfigModel.delete(key)` -- elimina la clave (volver a default).
5. `revalidatePath("/configuracion")`.
6. Retornar `{ success: true }`.

**Schema systemConfigSchema** (`src/schemas/system-config.schema.ts`):
- `company_name`: string max 200, opcional
- `company_cuit`: string max 50, opcional
- `company_address`: string max 300, opcional
- `company_phone`: string max 50, opcional
- `company_email`: string email, opcional
- `receipt_header`, `receipt_footer`: string max 500, opcional
- `default_exchange_source`: string max 50, opcional
- `smtp_host`, `smtp_user`, `smtp_pass`, `smtp_from`: string max 200, opcional
- `smtp_port`: string max 5, opcional

---

## 12. Resumen y Estadisticas

### 12.1 Totales de funciones documentadas

| Modulo | Actions | Service Methods | Total |
|--------|---------|-----------------|-------|
| Ventas (sale, lot) | 10 | 3 | 13 |
| Pagos (payment, extra-charge) | 6 | 6 | 12 |
| Caja (cash-movement, cash-balance, exchange-rate) | 9 | 0 | 9 |
| Firmas (signing) | 10 | 1 | 11 |
| Personas y Usuarios (person, user) | 17 | 0 | 17 |
| Desarrollos (development, tag) | 13 | 3 | 16 |
| Comunicaciones (notification, message) | 13 | 0 | 13 |
| Sistema (auth, role-permission, receipt, audit, import, business-hours, system-config) | 17 | 4 | 21 |
| Utilidades (lib/) | 4 | 0 | 4 |
| **Total** | **99** | **17** | **116** |

### 12.2 Archivos por complejidad (mayor cantidad de pasos)

| Funcion | Archivo | Pasos | Razon |
|---------|---------|-------|-------|
| `importSales` | import.service.ts | 10+ | Multiples lookups, validacion, transaccion, generacion de cuotas |
| `createSale` | sale.service.ts | 6 | Validacion compleja, cuotas, extra charges, lot status, atomico |
| `payExtraCharge` | payment.service.ts | 4 | Signing gate, transaccion, recalculo de cuotas, recibo |
| `payInstallment` | payment.service.ts | 4 | Signing gate, transaccion, auto-completar venta, recibo |
| `completeSigningSlot` | signing.service.ts | 5 | Transaccion, idempotencia, auto-comision condicional |
| `generateReceipt` | receipt.service.ts | 9 | Multiples validaciones, calculo de concepto/monto, email |
| `importPersons` | import.service.ts | 4 | Duplicidad check, creacion fila a fila |

### 12.3 Cobertura de guards y RBAC

| Permiso | Modulos que lo usan | Tipo |
|---------|---------------------|------|
| `sales:view` | Ventas, Pagos (extra-charge lectura), Recibos | Lectura |
| `sales:manage` | Ventas, Pagos (extra-charge escritura), Vendedores activos | Escritura |
| `cash:view` | Caja, Cotizacion, Personas (busqueda cobranza) | Lectura |
| `cash:manage` | Caja, Pagos (payInstallment, payExtraCharge, recordDelivery), Recibos (generar) | Escritura |
| `lots:view` | Lotes, Tags | Lectura |
| `lots:manage` | Lotes, Tags | Escritura |
| `developments:view` | Desarrollos | Lectura |
| `developments:manage` | Desarrollos | Escritura |
| `persons:view` | Personas | Lectura |
| `persons:manage` | Personas | Escritura |
| `users:view` | Usuarios, Empleados | Lectura |
| `users:manage` | Usuarios, Vendedores, Comisiones | Escritura |
| `signings:view` | Firmas | Lectura |
| `signings:manage` | Firmas | Escritura |
| `config:manage` | RBAC, Audit log, Importacion, Horarios, Config sistema | Admin |
| `requireAuth()` | Notificaciones, Mensajes, Development options | Solo autenticacion |

### 12.4 Patrones comunes observados

**1. Patron de transaccion atomica (`prisma.$transaction`):**
Usado en: `sale.service.createSale`, `sale.service.cancelSale`, `payment.service.payInstallment`, `payment.service.payExtraCharge`, `signing.service.completeSigningSlot`, `import.service.importSales` (por fila). Garantiza que multiples operaciones de escritura son todo-o-nada.

**2. Patron de revalidacion de cache (`revalidatePath`):**
Todas las actions de escritura llaman `revalidatePath` al final. Patron: la ruta primaria del modulo + rutas relacionadas (e.g., crear firma revalida `/firmas` y `/ventas`).

**3. Patron de audit logging:**
Todas las operaciones de escritura registran en AuditLog via `logAction()`. Los datos capturados incluyen: entidad, ID, accion, datos anteriores/nuevos. El logging es fire-and-forget: nunca falla la operacion principal.

**4. Patron de ServiceError:**
Los services lanzan `ServiceError` para errores de negocio. Las actions los atrapan y convierten a `{ success: false, error: message }`. Errores no esperados se loguean con `console.error` y retornan mensaje generico.

**5. Patron de serializacion Decimal->number:**
Todos los actions que retornan datos con campos Prisma Decimal los convierten a `number` antes de enviar al cliente. Helpers privados: `serializeMovement`, `serializeBalance`, `serializeRate`, `serializeReceipt`, `serializeExtraCharge`.

**6. Patron de signing gate:**
`payment.service.ts` verifica que la firma de escritura este completada antes de permitir pagos (excepto ventas CONTADO/CESION y ventas legacy sin firma). Ver &sect;5.2 para detalles.

### 12.5 Referencias cruzadas

- **AUDIT_DATABASE.md:** Referenciado en cada funcion para modelos afectados (20 modelos, 12 enums).
- **AUDIT_CONCEPT.md:** Referenciado en introducciones de seccion para contexto funcional (14 modulos documentados).
- **Cross-references internas:** Actions -> Services (e.g., "&sect;4.1 -> &sect;4.2"), Services -> Utilidades (e.g., "&sect;5.2 -> &sect;3.5"), Actions -> Actions (e.g., "sendMessage -> createNotificationInternal en &sect;10.1").
