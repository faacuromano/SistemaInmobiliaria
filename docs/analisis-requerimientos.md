# Análisis de Requerimientos vs. Estado Actual

**Sistema Inmobiliaria — ERP para Gestión de Desarrollos Inmobiliarios**
**Fecha:** 25 de Febrero de 2026

---

## 1. SEGURIDAD E INFRAESTRUCTURA

| Requerimiento | Estado | Detalle |
|---|---|---|
| **Hosting y SSL** | 🟡 Parcial | Dockerfile + docker-compose.yml listos para producción (Node 22, PostgreSQL 16, healthcheck). SSL/dominio dependen del deploy (no hay config de Nginx/Caddy ni headers de seguridad explícitos como HSTS, CSP, X-Frame-Options) |
| **Backups diarios automáticos** | 🔴 Falta | No hay script de `pg_dump`, ni cron de backup, ni integración con almacenamiento cloud (S3). Solo existe el volumen Docker `pgdata` (sin backup off-site) |
| **Auditoría de cambios** | 🟢 Completo | Modelo `AuditLog` en Prisma con 3 índices. `logAction()` integrado en las 24 operaciones CRUD del sistema (Sale, Person, Lot, Development, User, CashMovement, Payment, ExtraCharge, Signing, ExchangeRate). Página `/auditoria` con filtros y tabla |
| **Encriptado de datos sensibles** | 🟡 Parcial | Passwords hasheados con bcrypt. JWT para sesiones. No hay encriptación at-rest de datos sensibles en DB (DNI, CUIT, emails) ni HTTPS forzado a nivel aplicación |
| **Autenticación por login** | 🟢 Completo | Auth.js v5 con estrategia Credentials, bcrypt, sesiones JWT, middleware que protege todas las rutas, redirect automático a `/login` |
| **QA/Testing** | 🔴 Falta | No hay tests unitarios, de integración, ni E2E. No hay configuración de Jest, Vitest, Playwright, ni Cypress |

---

## 2. FUNCIONALIDADES DEL SISTEMA

### 2.1 Acceso Total (Web Responsiva)

**Estado: 🟢 Completo**

Tailwind CSS con breakpoints `sm:`, `md:`, `lg:` aplicados en todo el sistema. Grids adaptativos (1→2→4 columnas en KPIs, 4→10 en lotes), dialogs responsive, tablas con scroll horizontal, padding adaptativo. Funciona en móvil, tablet y desktop.

**Pendiente menor:** el sidebar no colapsa en mobile (siempre ocupa w-56). Falta un drawer/hamburger menu para pantallas pequeñas.

---

### 2.2 Roles: 4 Niveles

**Estado: 🟢 Completo**

| Rol | Permisos clave |
|---|---|
| **SUPER_ADMIN** | Acceso total (`["*"]`) |
| **ADMINISTRACION** | Desarrollos, Lotes, Personas, Ventas, Firmas, Usuarios (CRUD completo) |
| **FINANZAS** | Caja (ver + gestionar), Personas y Ventas (solo lectura) |
| **COBRANZA** | Caja (solo ver), Personas y Ventas (solo lectura) |

21 permisos definidos con checks hardcoded + overrides dinámicos desde base de datos. El sidebar filtra la navegación según el rol del usuario autenticado.

---

### 2.3 Dashboard: Métricas en Tiempo Real

**Estado: 🟢 Completo**

**Dashboard principal** (`/dashboard`):
- 4 KPIs principales: Ventas Activas, Cuotas Vencidas, Ingresos del Mes (USD+ARS), Lotes Disponibles
- Tabla de 5 ventas recientes con link a detalle
- Indicador de firmas próximas (3 días)

**Estadísticas** (`/estadisticas`):
- Tabla de ingresos/egresos mensuales por moneda con barras visuales
- Resumen de ventas por estado (cantidad, promedio, total)
- Tasa de cobranza (%) con barra de progreso y color-coding
- Comparación interanual (YoY) con indicadores de tendencia
- Filtros por año y desarrollo

**Pendiente:** no hay gráficos/charts (solo tablas y barras CSS), no hay refresh automático (server-rendered, requiere recarga de página).

---

### 2.4 Mapa Interactivo

**Estado: 🔴 Falta**

No existe mapa geográfico. No hay integración con Leaflet, Mapbox, ni Google Maps. No hay coordenadas lat/lng en el modelo de Lote.

**Lo que SÍ existe:** grilla visual de lotes (`lots-grid.tsx`) con color por estado (verde=disponible, azul=vendido, ámbar=contado, violeta=permuta). Clickeable para ir al detalle de la venta. Pero no es un mapa interactivo geográfico.

---

### 2.5 Integración Virtual Tour 360°

**Estado: ⬜ Pospuesto**

Según lo acordado, esta integración se realizará en una etapa posterior.

---

### 2.6 Ficha de Cliente

**Estado: 🟡 Parcial**

**Implementado:**
- Página de detalle (`/personas/[id]`) con datos personales completos y contacto
- Lista de ventas asociadas (lote, desarrollo, fecha, estado)
- Campo de notas/anotaciones
- Filtro por tipo (CLIENTE, PROVEEDOR, AMBOS)

**Falta para cumplir "historial unificado de datos, deuda y anotaciones":**
- Resumen de deuda total (USD/ARS) con desglose por estado (pendiente, parcial, vencida)
- Historial de pagos cronológico (hoy solo visible desde cada venta individual)
- Cuotas pendientes/vencidas con próximo vencimiento
- Movimientos de caja vinculados a la persona
- Acciones rápidas ("Registrar pago", "Agregar refuerzo")

Los datos existen en la base de datos (relaciones Person→Sale→Installment→CashMovement) pero no se muestran en la ficha del cliente.

---

### 2.7 Cálculo de Cuotas

**Estado: 🟢 Completo**

- **Generador:** cuotas variables con primera cuota diferenciada, día de cobro configurable, manejo automático de fin de mes
- **Recalculador:** al pagar un refuerzo, distribuye la reducción equitativamente entre cuotas pendientes (muestra monto original tachado)
- **Pagos parciales:** soporte completo con estado PARCIAL
- **Estados automáticos:** PENDIENTE → PARCIAL → PAGADA, detección automática de VENCIDA
- **Completado automático:** cuando todas las cuotas están pagadas, la venta pasa a COMPLETADA

---

### 2.8 Proveedores

**Estado: 🟡 Parcial**

- Personas con `type = PROVEEDOR` o `AMBOS` existen en el sistema
- Flujo CESION/PERMUTA funciona correctamente (Sale con totalPrice=0, status=CESION → Lot cambia a PERMUTA)
- **Falta:** no hay interfaz especializada para proveedores, ni gestión de pagos a proveedores separada (solo se usa el flujo genérico de ventas)

---

### 2.9 Dólar Blue

**Estado: 🟢 Completo**

- Cotización diaria automática desde dolarapi.com (oficial, blue, cripto — compra/venta)
- Display en header del dashboard con reloj en vivo
- Carga manual de cotización como fallback
- Tasa manual por operación individual en pagos
- Historial de cotizaciones consultable

---

### 2.10 Cobranza Integrada

**Estado: 🟢 Completo**

- Módulo `/cobranza` con búsqueda por nombre, DNI o CUIT
- Muestra cuotas y refuerzos pendientes organizados por cliente y venta
- Pago con creación automática de movimiento en caja
- Soporte dual USD/ARS con tasa de cambio manual por operación
- Auto-completado de venta cuando todas las cuotas están pagadas
- Reflejo inmediato en módulo `/caja` (revalidación automática)

---

### 2.11 Comprobantes

**Estado: 🟢 Completo**

- Generación automática de recibo tras cada pago (número secuencial mensual: REC-YYYYMM-NNNN)
- Envío por email con template HTML profesional (nodemailer, SMTP configurable desde panel de admin)
- Vista de recibo en modal con función de impresión del navegador
- 3 templates de email implementados: recibo de pago, aviso de refuerzo próximo, notificación de cuota vencida

---

### 2.12 Alertas

**Estado: 🟡 Parcial**

| Tipo de Alerta | Estado | Detalle |
|---|---|---|
| Refuerzo próximo (3 días antes) | 🟢 Funciona | Cron diario + email al comprador |
| Cuota vencida | 🟢 Funciona | Cron diario + email al comprador |
| **Firma próxima** | 🔴 Falta | Tipo `FIRMA_PROXIMA` definido en schema pero sin lógica implementada |
| Pago recibido | 🔴 Falta | Solo placeholder en el código |

Las notificaciones se muestran en la campana del header (últimas 20, badge de no leídas, marca individual y masiva de leídas). No hay notificaciones push del navegador ni actualizaciones en tiempo real (solo al recargar página).

---

### 2.13 Mensajería Interna

**Estado: 🟢 Completo**

- Envío de mensajes entre usuarios del sistema (asunto + cuerpo)
- Soporte para múltiples destinatarios
- Tracking de leídos/no leídos por destinatario con timestamp
- Notificación automática tipo SISTEMA al recibir mensaje
- Bandejas de entrada y enviados separadas

---

### 2.14 Migración (Import CSV/Excel)

**Estado: 🟡 Parcial**

- Import de **Personas** y **Ventas** (con auto-generación de cuotas) implementado
- Detección de duplicados por DNI/CUIT
- Validación por fila con reporte detallado de errores
- Documentación inline con ejemplos de datos

**Falta:**
- Solo acepta formato JSON — no soporta CSV ni Excel (.xlsx)
- No hay funcionalidad de exportación de datos

---

## 3. RESUMEN VISUAL

```
COMPLETO  🟢  Autenticación, RBAC (4 roles), Dashboard + Estadísticas,
              Cálculo de Cuotas, Dólar Blue, Cobranza Integrada,
              Comprobantes + Email, Mensajería Interna,
              Auditoría de Cambios, Web Responsiva

PARCIAL   🟡  Hosting/SSL (falta hardening de headers),
              Encriptado (solo passwords, falta at-rest),
              Ficha de Cliente (falta deuda y historial de pagos),
              Proveedores (falta UI dedicada),
              Alertas (falta firma próxima y pago recibido),
              Import de Datos (falta CSV/Excel y export),
              Sidebar mobile (falta collapse/drawer)

FALTA     🔴  Mapa Interactivo (geográfico con estado de lotes),
              Backups Diarios Automáticos,
              Testing / QA,
              Alerta de Firma Próxima

POSPUESTO ⬜  Integración Virtual Tour 360°
```

---

## 4. PRIORIDADES SUGERIDAS

| Prioridad | Feature | Justificación | Esfuerzo estimado |
|---|---|---|---|
| 1 | Backups automáticos | Riesgo crítico de pérdida de datos en producción | Bajo |
| 2 | Alerta de firma próxima | Prometido y casi implementado (falta lógica en cron) | Bajo |
| 3 | Ficha de Cliente completa | Alto impacto de usabilidad para el equipo | Medio |
| 4 | Import CSV/Excel | Prometido explícitamente en el presupuesto | Medio |
| 5 | Mapa Interactivo | Feature diferenciadora vendida al cliente | Alto |
| 6 | Testing / QA | Necesario antes de entrega según presupuesto | Alto |
| 7 | Sidebar colapsable mobile | Mejora de UX en dispositivos móviles | Bajo |
| 8 | Headers de seguridad | Best practice para producción | Bajo |
