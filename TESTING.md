# Smoke Test Checklist — Sistema Inmobiliaria MVP

Run through each section before deploying to production.
Mark each item as you verify it.

---

## 1. Authentication & Authorization

- [ ] Login with valid credentials → redirects to `/dashboard`
- [ ] Login with wrong password → shows error message
- [ ] Login with inactive user → shows error message
- [ ] Access `/dashboard` without session → redirects to `/login`
- [ ] COBRANZA role: can access cobranza, cannot access configuracion
- [ ] FINANZAS role: can access caja, cannot manage developments
- [ ] SUPER_ADMIN role: full access to all pages
- [ ] Logout → redirects to `/login`, session cleared

## 2. Dashboard

- [ ] 4 KPI cards display with correct numbers
- [ ] Recent sales table shows latest 5 sales
- [ ] Upcoming signings shows next 10 entries
- [ ] Overdue installments table shows past-due items
- [ ] All links navigate to correct detail pages

## 3. Developments (Desarrollos)

- [ ] List page shows all developments with stat cards
- [ ] Create new development → fills form → saves successfully
- [ ] Slug auto-generated from name
- [ ] Edit development → changes persist
- [ ] Development detail shows lot inventory
- [ ] Create lot within development → appears in grid/table
- [ ] Edit lot details (block, area, price)
- [ ] Add/remove tags on lots
- [ ] Cannot delete development that has lots with sales

## 4. Persons (Personas)

- [ ] List page shows persons with type filter (CLIENTE/PROVEEDOR)
- [ ] Create CLIENTE → fills all fields → saves
- [ ] Create PROVEEDOR → type correctly set
- [ ] DNI/CUIT uniqueness enforced (duplicate shows error)
- [ ] Edit person → changes persist
- [ ] Toggle active/inactive
- [ ] Person detail shows sales history

## 5. Sales (Ventas) — CRITICAL FLOW

### 5a. Normal Sale (Installments)
- [ ] Select development → lot dropdown filters correctly
- [ ] Only DISPONIBLE/RESERVADO lots appear
- [ ] Fill buyer, price, installments count, dates
- [ ] Installment preview calculates correctly
- [ ] Submit → sale created, lot status changes to VENDIDO
- [ ] Sale detail shows all generated installments
- [ ] Installment amounts match (totalPrice - downPayment) / installments

### 5b. Contado Sale
- [ ] Create sale with 0 installments, status CONTADO
- [ ] Lot status changes to CONTADO
- [ ] No installments generated

### 5c. Cesion (Provider with lot)
- [ ] Create sale with CESION status, price 0
- [ ] Lot status changes to PERMUTA

### 5d. Cancel Sale
- [ ] Cancel an active sale → lot reverts to DISPONIBLE
- [ ] Cannot cancel already cancelled sale

## 6. Payments (Cobranza) — CRITICAL FLOW

### 6a. Pay Regular Installment
- [ ] Search person → shows their active sales
- [ ] Select installment → shows amount due
- [ ] Pay in USD → CashMovement created with usdIncome
- [ ] Pay in ARS → CashMovement created with arsIncome
- [ ] Partial payment → installment status becomes PARCIAL
- [ ] Full payment → installment status becomes PAGADA
- [ ] Receipt auto-generated after payment
- [ ] Cannot pay more than remaining balance

### 6b. Pay Extra Charge (Refuerzo)
- [ ] Pay extra charge → CashMovement created
- [ ] Full payment triggers installment recalculation
- [ ] Remaining installments show updated amounts
- [ ] originalAmount preserved on recalculated installments

### 6c. All Installments Paid
- [ ] When last installment paid → sale status becomes COMPLETADA

## 7. Cash Management (Caja)

- [ ] Summary cards show correct income/expense totals
- [ ] Filter by date range works
- [ ] Filter by movement type works
- [ ] Filter by development works
- [ ] Create manual movement (SUELDO, GASTO_OFICINA, etc.)
- [ ] Currency validation: cannot mix ARS+USD (except CAMBIO type)
- [ ] CAMBIO type allows both ARS and USD amounts
- [ ] Balance tab shows monthly snapshots

## 8. Signing Slots (Firmas)

- [ ] List view shows upcoming signings
- [ ] Create signing slot with date, time, lot info
- [ ] Edit signing details
- [ ] Change status (PENDIENTE → CONFIRMADA → COMPLETADA)
- [ ] Calendar week view displays correctly

## 9. Statistics (Estadisticas)

- [ ] Monthly income/expense table renders
- [ ] Year filter works
- [ ] Development filter works
- [ ] Collection rate shows percentage
- [ ] YoY comparison shows 4 metrics

## 10. Configuration (Configuracion)

- [ ] Users tab: list all users
- [ ] Create new user with role assignment
- [ ] Change user password
- [ ] Toggle user active/inactive
- [ ] Toggle seller status and commission rate
- [ ] Permissions tab shows role-permission matrix

## 11. Notifications & Messages

- [ ] Notification bell shows unread count
- [ ] Click bell → dropdown shows recent notifications
- [ ] Mark notification as read
- [ ] Mark all as read
- [ ] Send internal message to another user
- [ ] Recipient sees message in inbox

## 12. Audit Log

- [ ] Audit page shows operations log
- [ ] Filter by entity type
- [ ] Filter by date range
- [ ] Search by content

## 13. Infrastructure

- [ ] `/api/health` returns `{"status":"ok","database":"connected"}`
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] App loads correctly after `npm start`

---

## Quick Regression After Any Change

1. [ ] Login works
2. [ ] Create a sale → installments generated
3. [ ] Pay an installment → receipt generated
4. [ ] Dashboard KPIs update
5. [ ] Build succeeds
