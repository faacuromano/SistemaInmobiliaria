# Sistema Inmobiliaria — System Documentation

> **ERP para gestion de desarrollos inmobiliarios**
> Last updated: 2026-03-15

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Layer](#3-database-layer)
4. [Backend Layer](#4-backend-layer)
5. [Frontend Layer](#5-frontend-layer)
6. [Pages & Routes](#6-pages--routes)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Business Flows](#8-business-flows)
9. [Feature Completeness Matrix](#9-feature-completeness-matrix)
10. [API Surface](#10-api-surface)
11. [Infrastructure & Config](#11-infrastructure--config)

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 15.5.12 |
| **Language** | TypeScript | ES2022, strict mode |
| **Runtime** | React | 19 |
| **Database** | PostgreSQL | via Prisma adapter-pg |
| **ORM** | Prisma | 7.4.1 |
| **Auth** | Auth.js (NextAuth v5 beta) | 5.0.0-beta.30 |
| **UI Components** | shadcn/ui + Radix UI | 1.4.3 |
| **Styling** | Tailwind CSS | v4 (OKLch color space) |
| **Validation** | Zod | 3.25.76 |
| **Forms** | react-hook-form | 7.71.2 |
| **Icons** | Lucide React | 0.500 |
| **Dates** | date-fns | 4 (es locale) |
| **State** | Zustand | 5 |
| **Toasts** | Sonner | 2.0.7 |
| **Email** | Nodemailer | 7.0.13 |
| **Import (CSV/Excel)** | papaparse + xlsx | 5.5.3 / 0.18.5 |
| **Passwords** | bcryptjs | — |
| **Exchange Rates** | dolarapi.com | Real-time USD/ARS |
| **Output** | Standalone (Docker-ready) | — |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│  React 19 (Server Components + Client Islands)          │
│  shadcn/ui · Tailwind v4 · CurrencyProvider             │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  NEXT.JS 15 APP ROUTER                  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Pages (SSR)  │  │ Server       │  │ API Routes   │  │
│  │  21 pages     │  │ Actions (21) │  │ 3 endpoints  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│  ┌──────▼─────────────────▼──────────────────▼───────┐  │
│  │              MODELS (Data Access Layer)            │  │
│  │              18 model files (Prisma)               │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  Zod Schemas (13) · RBAC (lib/rbac) · Auth Guard  │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   POSTGRESQL                            │
│  20 tables · 10 enums · Dual currency (USD/ARS)         │
└─────────────────────────────────────────────────────────┘
```

**Folder Structure:**
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Public pages (login)
│   ├── (dashboard)/        # Protected pages (11 modules)
│   │   └── _components/    # Page-specific components (65 files)
│   └── api/                # 3 API routes
├── server/
│   ├── actions/            # 21 server action files
│   └── models/             # 18 data access files
├── components/
│   ├── ui/                 # 19 shadcn primitives
│   └── shared/             # 11 reusable components
├── lib/                    # 16 utility files
├── schemas/                # 13 Zod validation schemas
├── types/                  # TypeScript definitions
├── providers/              # CurrencyProvider
└── app/globals.css         # Tailwind v4 theme
```

---

## 3. Database Layer

### 3.1 Enums (10)

| Enum | Values |
|---|---|
| **Role** | `SUPER_ADMIN`, `ADMINISTRACION`, `FINANZAS`, `COBRANZA` |
| **DevelopmentStatus** | `PLANIFICACION`, `EN_CURSO`, `FINALIZADO`, `PAUSADO` |
| **DevelopmentType** | `INMOBILIARIO`, `OTROS` |
| **LotStatus** | `DISPONIBLE`, `RESERVADO`, `VENDIDO`, `CONTADO`, `ESCRITURADO`, `CESION`, `PERMUTA` |
| **PersonType** | `CLIENTE`, `PROVEEDOR`, `AMBOS` |
| **SaleStatus** | `ACTIVA`, `CANCELADA`, `COMPLETADA`, `CONTADO`, `CESION` |
| **Currency** | `USD`, `ARS` |
| **InstallmentStatus** | `PENDIENTE`, `PAGADA`, `VENCIDA`, `PARCIAL` |
| **ExtraChargeStatus** | `PENDIENTE`, `PAGADA`, `VENCIDA`, `PARCIAL` |
| **MovementType** | `CUOTA`, `ENTREGA`, `COMISION`, `SUELDO`, `CAMBIO`, `RETIRO`, `GASTO_PROYECTO`, `GASTO_OFICINA`, `FIDEICOMISO`, `BANCO`, `CONTABLE`, `PRESTAMO`, `IMPUESTO`, `ALQUILER`, `MARKETING`, `COCHERA`, `DESARROLLO`, `VARIOS` |
| **SigningStatus** | `PENDIENTE`, `CONFIRMADA`, `COMPLETADA`, `CANCELADA`, `REPROGRAMADA` |
| **NotificationType** | `REFUERZO_PROXIMO`, `CUOTA_VENCIDA`, `PAGO_RECIBIDO`, `FIRMA_PROXIMA`, `SISTEMA` |

### 3.2 Models (20 tables)

#### Core Domain

| Model | Table | Purpose | Key Relations |
|---|---|---|---|
| **Development** | `developments` | Real estate developments (projects) | → Lot[], CashMovement[], SigningSlot[] |
| **Lot** | `lots` | Individual lots within developments | → Development, Sale?, LotTag[] |
| **Person** | `persons` | Clients & suppliers | → Sale[], CashMovement[] |
| **Sale** | `sales` | Sales transactions | → Lot, Person, Seller?, Installment[], ExtraCharge[] |
| **Installment** | `installments` | Monthly payment schedule | → Sale, CashMovement[] |
| **ExtraCharge** | `extra_charges` | Refuerzos / extraordinary charges | → Sale, CashMovement[] |

#### Financial

| Model | Table | Purpose | Key Relations |
|---|---|---|---|
| **CashMovement** | `cash_movements` | All cash operations (18 types) | → Development?, Person?, Sale?, Installment?, ExtraCharge?, ExchangeRate? |
| **CashBalance** | `cash_balances` | Monthly balance snapshots | → Development? |
| **ExchangeRate** | `exchange_rates` | Daily USD/ARS rates (official/blue/crypto) | → CashMovement[] |
| **PaymentReceipt** | `payment_receipts` | Auto-generated payment receipts | → CashMovement, Sale, Person |

#### Operations

| Model | Table | Purpose | Key Relations |
|---|---|---|---|
| **SigningSlot** | `signing_slots` | Notarization/signing appointments | → Development?, Seller?, CreatedBy? |
| **Tag** | `tags` | Lot classification tags | → LotTag[] |
| **LotTag** | `lot_tags` | Lot-Tag join table | → Lot, Tag |

#### System

| Model | Table | Purpose | Key Relations |
|---|---|---|---|
| **User** | `users` | System users with RBAC roles | → CashMovement[], Sale[], Message[] |
| **RolePermission** | `role_permissions` | Flexible permission assignments | — |
| **Message** | `messages` | Internal messaging | → Sender, MessageRecipient[] |
| **MessageRecipient** | `message_recipients` | Message delivery tracking | → Message, User |
| **Notification** | `notifications` | System alerts & reminders | → User |
| **AuditLog** | `audit_logs` | Full operation traceability | → User |
| **SystemConfig** | `system_config` | Key-value settings store | — |

### 3.3 Key Constraints

- **Unique:** User.email, Development.slug, Person.dni, Person.cuit, Sale.lotId (1 sale per lot), Lot[developmentId+lotNumber]
- **Cascades:** Sale→Installments, Sale→ExtraCharges, Message→Recipients, User→Notifications, Lot→LotTags
- **Decimal precision:** Financial amounts 12,2 (USD) / 14,2 (ARS); Exchange rates 10,2; Commission 5,2
- **Indexes:** Status fields, dates, foreign keys — optimized for filtering and reporting queries

### 3.4 Entity Relationship Diagram (Simplified)

```
Development ──1:N──► Lot ──1:1──► Sale ──1:N──► Installment
                                    │              │
                                    ├──1:N──► ExtraCharge
                                    │              │
                                    └──1:N──► CashMovement ◄── ExchangeRate
                                                   │
                                    Person ◄───────┘
                                                   │
                                              PaymentReceipt

User ──► AuditLog
User ──► Message ──► MessageRecipient
User ──► Notification
User ──► CashMovement (registeredBy)
User ──► Sale (seller / createdBy)
```

---

## 4. Backend Layer

### 4.1 Server Actions (21 files, ~120 functions)

| File | Key Functions | Permission |
|---|---|---|
| **auth.actions** | `loginAction`, `logoutAction` | Public |
| **development.actions** | `getDevelopments`, `getDevelopmentBySlug`, `createDevelopment`, `updateDevelopment`, `deleteDevelopment` | developments:view/manage |
| **lot.actions** | `getLotsByDevelopment`, `createLot`, `updateLot`, `bulkUpdateLotStatus`, `deleteLot` | lots:view/manage |
| **person.actions** | `getPersons`, `getPersonById`, `createPerson`, `createPersonQuick`, `updatePerson`, `togglePersonActive`, `searchPersonsForCollection` | persons:view/manage |
| **sale.actions** | `getSales`, `getSaleById`, `createSale`, `cancelSale`, `getSaleForPrint` | sales:view/manage |
| **payment.actions** | `payInstallment`, `payExtraCharge`, `recordDeliveryPayment` | cash:manage |
| **cash-movement.actions** | `getCashMovements`, `getCashMovementsSummary`, `createCashMovement` | cash:view/manage |
| **cash-balance.actions** | `getCashBalances`, `generateMonthlyBalance`, `generateAllBalances` | cash:view/manage |
| **extra-charge.actions** | `getExtraChargesBySale`, `createExtraCharge`, `updateExtraCharge`, `deleteExtraCharge` | sales:manage |
| **exchange-rate.actions** | `getTodayExchangeRate`, `getLatestExchangeRate`, `createManualExchangeRate` | Auth / cash:manage |
| **signing.actions** | `getSignings`, `createSigning`, `updateSigning`, `updateSigningStatus`, `getSigningsByWeek`, `deleteSigning` | signings:view/manage |
| **user.actions** | `getUsers`, `createUser`, `updateUser`, `changeUserPassword`, `toggleUserActive`, `getActiveSellers`, `toggleUserSeller`, `updateUserCommission` | users:view/manage |
| **notification.actions** | `getMyNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead` | Auth |
| **message.actions** | `getMyMessages`, `getSentMessages`, `sendMessage`, `markMessageRead` | Auth |
| **payment-receipt.actions** | `getPaymentReceipts`, `getPaymentReceiptById`, `generateReceipt` | cash:view |
| **import.actions** | `importPersons`, `importSales` | config:manage |
| **role-permission.actions** | `getAllRolePermissions`, `updateRolePermissions`, `seedDefaultPermissions` | config:manage |
| **system-config.actions** | `getSystemConfig`, `updateSystemConfig` | config:manage |
| **business-hours.actions** | `getBusinessHours`, `updateBusinessHours` | config:manage |
| **audit-log.actions** | `getAuditLogs`, `logAction` | config:manage |
| **tag.actions** | `getTags`, `createTag`, `updateTag`, `deleteTag`, `setLotTags`, `bulkSetLotTags` | lots:manage |

### 4.2 Data Access Models (18 files)

Each model wraps Prisma operations with includes, filters, and business logic:

| Model | Operations |
|---|---|
| **development.model** | findAll, findById, findBySlug, create, update, delete, slugExists, hasLotsWithSales |
| **lot.model** | findByDevelopmentId, findById, create, update, delete, lotNumberExists, hasSale, bulkUpdateStatus |
| **person.model** | findAll, findById, create, update, toggleActive, findForCollection |
| **sale.model** | findAll, findById, create, updateStatus, findActiveSaleForLot |
| **installment.model** | createMany, findBySaleId |
| **extra-charge.model** | findBySaleId, findById, create, update, delete |
| **cash-movement.model** | findAll, findById, findBySaleId, create, getSummary |
| **cash-balance.model** | findAll, findByDevelopmentAndPeriod, upsert, calculateFromMovements |
| **exchange-rate.model** | findByDate, findLatest, findByDateRange, upsertByDate |
| **payment-receipt.model** | findAll, findById, findByCashMovementId, create, generateReceiptNumber |
| **signing.model** | findAll, findById, findByDateRange, create, update, updateStatus, delete |
| **user.model** | findByEmail, findAll, findById, create, update, updatePassword, toggleActive, findAllSellers, findActiveSellers |
| **notification.model** | findByUserId, countUnread, create, markAsRead, markAllAsRead, createForAllUsers |
| **message.model** | findBySenderId, findReceivedByUserId, create, markAsRead, countUnread |
| **tag.model** | findAll, findById, create, update, delete, findByLotId, setLotTags |
| **role-permission.model** | findByRole, findAll, setRolePermissions, count |
| **system-config.model** | get, set, getAll, getMany, delete |
| **cron.model** | findUpcomingExtraCharges, findOverdueInstallments, findUpcomingSignings, has*Notification checks |
| **audit-log.model** | findAll, create, findByEntity |

### 4.3 Validation Schemas (13 Zod schemas)

| Schema | Validates |
|---|---|
| **auth.schema** | email + password (min 6) |
| **development.schema** | name, description, location, googleMapsUrl, type, status, totalLots |
| **lot.schema** | developmentId, lotNumber, block, area, listPrice, status, notes |
| **person.schema** | type, firstName, lastName, DNI (7-8 digits), CUIT (XX-XXXXXXXX-X), contact info |
| **sale.schema** | lotId, personId, sellerId, pricing, installment config, extraCharges JSON array |
| **extra-charge.schema** | saleId, description, amount, currency, dueDate, isInKind, inKindType |
| **cash-movement.schema** | date, type, concept, amounts (ARS/USD), validation: at least one amount required |
| **exchange-rate.schema** | date, official/blue/crypto buy/sell rates |
| **signing.schema** | date, time, endTime, lotInfo, clientName, developmentId, sellerId |
| **user.schema** | email, name, lastName, phone, role, password |
| **tag.schema** | label (auto-slugified), hex color |
| **system-config.schema** | company info, receipt templates, SMTP settings |
| **business-hours.schema** | opening/closing times, breaks (non-overlapping), enabled days |

---

## 5. Frontend Layer

### 5.1 Component Inventory

| Category | Count | Examples |
|---|---|---|
| **shadcn/ui primitives** | 19 | Button, Card, Dialog, Form, Input, Table, Tabs, Sheet, Select, Badge, Skeleton... |
| **Shared components** | 11 | DataTable, PageHeader, Sidebar, MobileSidebar, NotificationBell, HeaderInfo, Price, SearchInput, ConfirmDialog, EmptyState, StatusBadge |
| **Page-specific components** | ~65 | Forms, tables, filters, dialogs per module |
| **Total** | ~95 | — |

### 5.2 Key Shared Components

| Component | Purpose |
|---|---|
| **Sidebar** | Desktop navigation (w-56), groups filtered by RBAC permissions |
| **MobileSidebar** | Sheet drawer for mobile (md:hidden) |
| **HeaderInfo** | Top bar: current time, USD/ARS exchange rate, currency toggle |
| **NotificationBell** | Dropdown with unread count badge, mark-as-read |
| **DataTable** | Generic paginated table (20 rows/page), column definitions |
| **Price** | Currency formatter with live USD↔ARS conversion |
| **SearchInput** | URL-synced search with 300ms debounce |
| **ConfirmDialog** | Async confirmation with customizable actions |
| **PageHeader** | Title + icon + action buttons |
| **StatusBadge** | Color-coded status indicators |
| **EmptyState** | No-data placeholder with icon and description |

### 5.3 Providers & State

| Provider | Purpose |
|---|---|
| **CurrencyProvider** | Dual USD/ARS display toggle, conversion helpers, persists preference in localStorage |
| **Zustand** | Available (dependency installed), used for local component state |

### 5.4 Utility Libraries (16 files in `src/lib/`)

| File | Purpose |
|---|---|
| **auth.ts** | NextAuth config, Credentials provider, bcrypt validation |
| **auth.config.ts** | JWT/session callbacks, authorization logic |
| **auth-guard.ts** | `requireAuth()`, `requirePermission()` server guards |
| **rbac.ts** | Permission system: ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission() |
| **format.ts** | formatCurrency(USD/ARS), formatDate(es-AR), slugify() |
| **constants.ts** | Status labels & colors maps |
| **navigation.ts** | Sidebar nav items with icons and permissions |
| **exchange-rate.ts** | fetchDolarApiRates() — oficial/blue/cripto rates |
| **sale-helpers.ts** | Sale calculation utilities |
| **installment-generator.ts** | Generate installment schedule from sale params |
| **installment-recalculator.ts** | Recalculate pending installments after refuerzo payment |
| **email.ts** | Nodemailer transport configuration |
| **email-templates.ts** | HTML email templates (receipts, signing alerts, overdue notices) |
| **business-hours.ts** | Business hours validation helpers |
| **prisma.ts** | Prisma client singleton with pg adapter |
| **utils.ts** | cn() — clsx + tailwind-merge |

---

## 6. Pages & Routes

### 6.1 Route Map

```
/                           → Redirect to /dashboard
/login                      → Login page (public)

/dashboard                  → Main dashboard (KPIs, recent sales, overdue, signings)

/desarrollos                → Developments list + filters
/desarrollos/nuevo          → Create development form
/desarrollos/[slug]         → Development detail + lots grid
/desarrollos/[slug]/editar  → Edit development form

/personas                   → Persons list + filters
/personas/nuevo             → Create person form
/personas/[id]              → Person detail (sales, debts, payments)
/personas/[id]/editar       → Edit person form

/ventas                     → Sales list + filters
/ventas/nuevo               → Create sale form (multi-step)
/ventas/[id]                → Sale detail (installments, movements, receipts)

/caja                       → Cash movements + balances (tabbed)
/cobranza                   → Collection search + payment interface
/firmas                     → Signing agenda (list + weekly calendar)
/estadisticas               → Analytics & reports (yearly, YoY comparison)
/mensajes                   → Internal messaging (inbox + sent)
/configuracion              → Settings (users, system, permissions, import, hours)
/auditoria                  → Audit log viewer
```

### 6.2 Page Detail

#### Dashboard (`/dashboard`)
- **4 KPI cards:** Active sales, Overdue installments, Monthly income (USD+ARS), Available lots
- **Recent sales table** (last 5)
- **Overdue installments table** (up to 10, color-coded by severity)
- **Upcoming signings panel** (urgency highlighting for <=3 days)
- **Upcoming extra charges** (within 30 days, urgency coloring)

#### Desarrollos — Developments (`/desarrollos`)
- **3 KPI cards:** Total, Active (EN_CURSO/PLANIFICACION), Completed
- **Filters:** Search, status, type (INMOBILIARIO/OTROS)
- **Table:** Name, location, type, status, lot count
- **Detail page:** Development info, lot status summary badges, lots grid with tags
- **CRUD:** Create, edit, delete (if no sold lots)

#### Personas — Persons (`/personas`)
- **3 KPI cards:** Total, Clients, Suppliers
- **Filters:** Search (name/DNI/CUIT/email), type, active status
- **Table:** Name, type, DNI, contact info, sale count
- **Detail page:** Personal info card, debt summary, active sales table, pending installments, payment history
- **CRUD:** Create, quick-create (inline dialog), edit, activate/deactivate

#### Ventas — Sales (`/ventas`)
- **4 KPI cards:** Total, Active, Completed, Cash (Contado)
- **Filters:** Search (name/lot), status, development
- **Table:** Lot, buyer, development, total price, status, date
- **Create form:** Development → lot selector, person picker (with inline create), seller, pricing (auto-calculate installments), extra charges, exchange rate
- **Detail page:** Sale info cards, installments table (with pay actions), extra charges, cash movements, payment receipts, print view, cancel action

#### Caja — Cash (`/caja`)
- **Tab: Movimientos** — Summary cards (USD/ARS income/expense), filters (date range, type, development), movements table
- **Tab: Balances** — Monthly balance snapshots by development, generate balance action
- **Create movement:** 18 movement types, dual currency, link to sale/installment/development

#### Cobranza — Collections (`/cobranza`)
- **Search:** Multi-word person search (name, DNI, CUIT)
- **Results:** Person cards with active sales, pending installments grouped by sale
- **Actions:** Pay installment (full/partial), pay extra charge, view sale detail
- **Auto-compute:** Overdue status calculated on-the-fly

#### Firmas — Signings (`/firmas`)
- **Filters:** Date range, status, development, seller, search
- **List view:** Signing slots with status badges
- **Calendar view:** Weekly grid (Mon-Sun) with business hours
- **CRUD:** Create, edit, update status, delete

#### Estadisticas — Statistics (`/estadisticas`)
- **Period selector:** Year + optional development filter
- **Monthly movements table:** 12-row breakdown (USD income/expense, ARS income/expense, net)
- **Movement type breakdown** by month
- **Sales summary:** Count, total value, average price, by-status breakdown
- **Collection performance:** Rate (%), progress bar, scheduled vs paid vs overdue, avg days to payment
- **Year-over-Year comparison:** Income, sales count, avg price, collection rate with trend indicators

#### Mensajes — Messages (`/mensajes`)
- **2 KPI cards:** Total received, unread count
- **Tab: Recibidos** — Inbox with unread badge, mark-as-read
- **Tab: Enviados** — Sent messages
- **Compose:** Multi-recipient selector, subject, body

#### Configuracion — Settings (`/configuracion`)
- **Tab: Usuarios** — User CRUD, role assignment, seller toggle, commission rates
- **Tab: Sistema** — Company info, SMTP settings, receipt templates
- **Tab: Permisos** — Role-permission matrix editor (per role)
- **Tab: Importar** — Bulk import (JSON, CSV, Excel) for persons and sales
- **Tab: Horarios** — Business hours, breaks, enabled days

#### Auditoria — Audit Log (`/auditoria`)
- **Filters:** Search, entity type, date range
- **Table:** Timestamp, user, action, entity, entity ID, before/after data (JSON)

---

## 7. Authentication & Authorization

### 7.1 Authentication
- **Provider:** Auth.js v5 (Credentials provider)
- **Strategy:** JWT-based sessions
- **Password:** bcrypt hashing (10 salt rounds)
- **Session data:** user.id, user.role, user.name, user.email

### 7.2 RBAC (Role-Based Access Control)

**Roles:**
| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full access, cannot have permissions removed |
| `ADMINISTRACION` | Administrative operations |
| `FINANZAS` | Financial operations |
| `COBRANZA` | Collection operations |

**Permissions (16):**
```
developments:view    developments:manage
lots:view            lots:manage
persons:view         persons:manage
sales:view           sales:manage
cash:view            cash:manage
signings:view        signings:manage
users:view           users:manage
config:manage
```

**Enforcement Points:**
1. **Server-side guards** — `requireAuth()` and `requirePermission()` in every server action
2. **Page-level checks** — Each page verifies permissions before rendering
3. **UI filtering** — Sidebar hides sections user can't access; action buttons hidden without :manage
4. **Flexible mapping** — Role-permission pairs stored in DB, editable via Settings > Permissions

---

## 8. Business Flows

### 8.1 Sale Creation (Normal Installment Sale)
```
1. Select Development → Select available Lot
2. Select/Create Person (buyer)
3. Optionally assign Seller
4. Set pricing: totalPrice, downPayment, currency, totalInstallments
5. Optionally add ExtraCharges (refuerzos)
6. System auto-calculates:
   - regularInstallmentAmount = (totalPrice - downPayment - extraCharges) / totalInstallments
   - firstInstallmentAmount (if different)
7. Transaction:
   ├── Create Sale record
   ├── Generate N Installment records (with month labels and due dates)
   ├── Create ExtraCharge records
   └── Update Lot.status → VENDIDO
8. Audit log entry created
```

### 8.2 Installment Payment
```
1. Navigate to Cobranza or Sale detail
2. Select installment to pay
3. Enter payment: amount, currency, exchange rate
4. System:
   ├── Create CashMovement (type: CUOTA)
   ├── Update Installment (paidAmount, status → PAGADA if full, PARCIAL if partial)
   ├── Check if ALL installments PAGADA → mark Sale COMPLETADA
   └── Auto-generate PaymentReceipt + send email to buyer
5. Audit log entry created
```

### 8.3 Extra Charge (Refuerzo) Payment
```
1. Pay ExtraCharge via Sale detail
2. System:
   ├── Create CashMovement
   ├── Update ExtraCharge status
   ├── If fully paid → recalculate remaining Installment amounts
   │   (reduce each pending installment proportionally)
   └── Auto-generate receipt
```

### 8.4 Cash Sale (Contado)
```
1. Create Sale with totalInstallments = 0
2. Lot.status → CONTADO
3. Sale.status → CONTADO
4. Record ENTREGA payment (full amount)
```

### 8.5 Supplier/Permuta (In-Kind Transfer)
```
1. Create Person (type: PROVEEDOR)
2. Create Sale with totalPrice = 0, status = CESION
3. Lot.status → PERMUTA
```

### 8.6 Cron Notifications (Automated)
```
Endpoint: GET /api/cron/notify-upcoming (secured with CRON_SECRET)

Every run:
├── ExtraCharges due within 3 days → notifications + emails (idempotent via notified flag)
├── Overdue installments → notifications + emails (idempotent via notification check)
└── Signings within 1 day → notifications + emails (idempotent via notification check)

Returns: { found, notified, emailsSent, errors }
```

---

## 9. Feature Completeness Matrix

### Core Modules

| Module | CRUD | List/Filter | Detail View | Print/Export | Status |
|---|---|---|---|---|---|
| Developments | Create, Edit, Delete | Search, Status, Type filters | Full detail + lots grid | — | Complete |
| Lots | Create, Edit, Bulk Status | Search, Status filters | Via development detail | — | Complete |
| Lot Tags | Create, Edit, Delete, Bulk Assign | — | Color-coded badges | — | Complete |
| Persons | Create, Quick-Create, Edit, Toggle Active | Search, Type, Active filters | Full profile (sales, debts, payments) | — | Complete |
| Sales | Create, Cancel | Search, Status, Development filters | Installments, movements, receipts | Print view | Complete |
| Installments | Auto-generated | By sale | Status + payment tracking | — | Complete |
| Extra Charges | Create, Edit, Delete | By sale | Status + payment tracking | — | Complete |
| Cash Movements | Create | Date, Type, Development filters | Income/expense summary | — | Complete |
| Cash Balances | Auto-generate | By development, year | Monthly snapshots | — | Complete |
| Exchange Rates | Manual entry, Auto-fetch | — | Official/Blue/Crypto rates | — | Complete |
| Payment Receipts | Auto-generated | By sale/person | Full receipt detail | Email send | Complete |
| Signings | Create, Edit, Delete, Status | Date, Status, Development, Seller filters | List + Weekly calendar | — | Complete |
| Users | Create, Edit, Password, Toggle Active | Search, Role, Active filters | Role + seller config | — | Complete |
| Messages | Send, Mark Read | Inbox/Sent tabs | Unread count | — | Complete |
| Notifications | Mark Read, Mark All Read | By user | Bell dropdown | — | Complete |
| Audit Logs | Auto-created | Search, Entity, Date filters | Before/after JSON | — | Complete |
| Import | Persons, Sales | — | JSON/CSV/Excel support | — | Complete |
| Settings | Company, SMTP, Permissions, Hours | — | Tabbed config | — | Complete |
| Statistics | — | Year, Development filters | Monthly breakdown, YoY comparison | — | Complete |
| Collection | — | Multi-word person search | Pay installments/charges | — | Complete |

### Cross-Cutting Features

| Feature | Status | Notes |
|---|---|---|
| Dual currency (USD/ARS) | Complete | Real-time rates from dolarapi.com, toggle in header |
| RBAC | Complete | 4 roles, 16 permissions, DB-configurable |
| Audit trail | Complete | All mutations logged with before/after data |
| Email notifications | Complete | Receipts, overdue alerts, signing reminders |
| Cron automation | Complete | Secured endpoint for scheduled notifications |
| Responsive design | Complete | Mobile sidebar (Sheet), md: breakpoint desktop |
| Bulk operations | Complete | Lot status, tag assignment (max 200) |
| Data import | Complete | JSON, CSV, Excel formats with error reporting |
| Skeleton loading | Complete | Loading states for all major pages |
| Health check | Complete | `/api/health` with DB connectivity check |
| Security headers | Complete | X-Frame-Options, HSTS, nosniff, Permissions-Policy |
| Dark mode | Partial | Theme system in place (next-themes), CSS variables ready |

---

## 10. API Surface

### API Routes

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Auth.js handlers (login, session, logout) | Public |
| GET | `/api/cron/notify-upcoming` | Cron notifications (overdue, upcoming) | Bearer CRON_SECRET |
| GET | `/api/health` | Health check (DB connectivity, version) | Public |

### Server Actions (used via Next.js form actions / direct invocation)

All ~120 server actions are invoked directly from React Server Components or client components via `useFormState`/`useActionState`. No REST API layer — all data flows through server actions.

---

## 11. Infrastructure & Config

### Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth.js secret key |
| `CRON_SECRET` | Bearer token for cron endpoint |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email sending |

### Build & Deploy

| Setting | Value |
|---|---|
| Output | `standalone` (Docker-ready) |
| Server packages | `@prisma/adapter-pg` externalized |
| Target | ES2022, strict TypeScript |
| Module | Bundler resolution |
| Path alias | `@/*` → `./src/*` |

### Security Headers (next.config.ts)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Styling

- Tailwind CSS v4 with OKLch color space
- Windows Blue primary theme
- Fluent-style shadows
- Print media adjustments for lot cards
- Light + dark mode CSS variables defined

---

## Summary Statistics

| Metric | Count |
|---|---|
| Database tables | 20 |
| Database enums | 12 |
| Page routes | 21 |
| Server action files | 21 |
| Server action functions | ~120 |
| Data models | 18 |
| Zod schemas | 13 |
| API routes | 3 |
| UI components (shadcn) | 19 |
| Shared components | 11 |
| Page-specific components | ~65 |
| Utility libraries | 16 |
| RBAC permissions | 16 |
| Cash movement types | 18 |
| Total source files | ~200+ |
