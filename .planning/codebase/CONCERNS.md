# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**Large Form Component:**
- Issue: `src/app/(dashboard)/ventas/_components/sale-form.tsx` (782 lines) and `src/app/(dashboard)/estadisticas/page.tsx` (773 lines) combine logic, state management, and rendering in single files
- Files: `src/app/(dashboard)/ventas/_components/sale-form.tsx`, `src/app/(dashboard)/estadisticas/page.tsx`
- Impact: Difficult to test, refactor, or reuse form logic; increases maintenance burden
- Fix approach: Extract validation, calculation logic into separate utility functions; break form into smaller sub-components for field groups

**Console Logging in Production Code:**
- Issue: Multiple `console.log()` and `console.error()` statements throughout action handlers and API routes
- Files: `src/server/actions/audit-log.actions.ts`, `src/server/actions/cash-movement.actions.ts`, `src/lib/email.ts`, `src/app/api/cron/notify-upcoming/route.ts` (multiple locations)
- Impact: Logs expose system state in production; difficult to disable by environment
- Fix approach: Replace with structured logging library (e.g., Winston, Pino) that respects `NODE_ENV`; remove debug logs from error paths

**Missing Test Suite:**
- Issue: No unit or integration tests in codebase; only TESTING.md smoke test checklist
- Files: `TESTING.md` (manual checklist only), no `*.test.ts` or `*.spec.ts` files
- Impact: Cannot verify refactoring, catch regressions, or confidently deploy changes
- Fix approach: Add Jest/Vitest config, start with critical paths: `lib/installment-generator.ts`, `lib/installment-recalculator.ts`, `server/actions/payment.actions.ts`

**Duplicate Validation Logic:**
- Issue: Installment amount validation logic appears in multiple places: `sale-form.tsx` (preview calculation), `sale.actions.ts` (server validation), `installment-generator.ts` (generation)
- Files: `src/app/(dashboard)/ventas/_components/sale-form.tsx`, `src/server/actions/sale.actions.ts`, `src/lib/installment-generator.ts`
- Impact: Risk of inconsistency; changes to logic need updates in 3+ places
- Fix approach: Consolidate into single `calculateInstallmentPlan()` utility function used by all three

## Known Bugs

**Decimal Serialization Gap:**
- Symptoms: Prisma Decimal type returns JavaScript `Decimal` objects that don't serialize to JSON; workaround is manual Number() conversion
- Files: `src/server/actions/sale.actions.ts` (lines 40-63), `src/server/actions/payment.actions.ts` (manual conversions throughout)
- Trigger: Any action that fetches Decimals from Prisma and returns via Server Action
- Workaround: Every query manually converts: `Number(sale.totalPrice)`. Risk: Inconsistent application across actions

**Missing CreatedBy in SigningSlot Creation:**
- Symptoms: SigningSlot model includes `createdById` field but schema allows it to be nullable; API may not be setting it
- Files: `src/prisma/schema.prisma` (line 592: `createdById String?`), `src/server/actions/` (check signing creation)
- Trigger: Create signing slot via API/UI without explicit createdById assignment
- Workaround: Frontend must pass userId explicitly; no server-side default

**Exchange Rate Race Condition:**
- Symptoms: If multiple cash movements are recorded on same day before ExchangeRate record is created, movements may have null exchangeRateId
- Files: `src/server/models/exchange-rate.model.ts`, `src/server/actions/payment.actions.ts` (line 99-115 fetches rate without create-if-missing fallback)
- Trigger: Large volume of payments on day before exchange rate cron runs
- Workaround: Manual ExchangeRate entry via admin panel; cron ensures daily consistency

## Security Considerations

**CRON_SECRET Hardcoded in Comparison:**
- Risk: `process.env.CRON_SECRET` compared as plain string in `src/app/api/cron/notify-upcoming/route.ts` line 49; timing attack possible with bearer token
- Files: `src/app/api/cron/notify-upcoming/route.ts` (line 49)
- Current mitigation: Environment variable not exposed in code; short token acceptable for internal cron
- Recommendations: Use `crypto.timingSafeEqual()` for token comparison; document CRON_SECRET requirement in deployment guide

**No Rate Limiting on Public APIs:**
- Risk: `/api/health` and cron endpoint accessible without rate limiting; DoS potential
- Files: `src/app/api/health/route.ts`, `src/app/api/cron/notify-upcoming/route.ts`
- Current mitigation: Health endpoint read-only; cron endpoint has bearer token check
- Recommendations: Add rate limiting middleware (e.g., `Ratelimit` from Upstash) to `/api/*` routes; document expected request frequency

**No CSRF Protection on POST Actions:**
- Risk: Server Actions via form submission do not include CSRF token validation
- Files: All `src/app/(dashboard)/**/*-form.tsx` components
- Current mitigation: Next.js Server Action origin validation handles some cases; Auth.js session implicit CSRF
- Recommendations: Verify Next.js 15 CSRF protection is enabled; test cross-origin form submissions

**Email Configuration from SystemConfig:**
- Risk: SMTP credentials stored in SystemConfig table as plain text (not encrypted at rest)
- Files: `src/lib/email.ts` (lines 32-41 read from DB), `src/app/(dashboard)/configuracion/_components/system-config-section.tsx`
- Current mitigation: Credentials can also come from environment variables (fallback)
- Recommendations: Encrypt SMTP_PASS field in database; use environment variables for production instead

**No Permission Check on Email Sending:**
- Risk: `sendEmail()` utility is public; any Server Action can send emails without audit
- Files: `src/lib/email.ts` (no permission check), called from cron, payment receipt, import routes
- Current mitigation: Email only sent from internal routes; no user-facing email endpoint
- Recommendations: Add logger call to email sending to track who triggered sends; implement allowlist of email types per role

## Performance Bottlenecks

**N+1 Query on Person.findById:**
- Problem: `findById` fetches all sales with nested installments/extraCharges without pagination; `take: 50` on cashMovements only
- Files: `src/server/models/person.model.ts` (lines 33-57)
- Cause: Full join on sales with all installments for a person with 100+ sales causes large data transfer
- Improvement path: Add `take/skip` pagination to `sales` relation; paginate cash movements separately; lazy-load sections in UI

**Statistics Page Full-Year Query:**
- Problem: `src/app/(dashboard)/estadisticas/page.tsx` (773 lines) fetches all CashMovements for a year without pagination
- Files: `src/app/(dashboard)/estadisticas/page.tsx` (line 100+)
- Cause: Queries all movements for 12-month calculation; no index on (date, type) combo for filtering
- Improvement path: Add `CashMovement` index `@@index([date, type])` in Prisma; paginate or use aggregation queries

**Cron Query Without Pagination:**
- Problem: `cronModel.findUpcomingExtraCharges()` and `findUpcomingInstallments()` do not limit result set
- Files: `src/server/models/cron.model.ts` (lines 8-38, 59-88)
- Cause: If thousands of overdue items exist, cron processes all in single batch; memory + timeout risk
- Improvement path: Add `take: 100` with offset-based pagination; break into multiple cron jobs or chunk processing

**Installment Recalculation in Transaction:**
- Problem: `recalculateInstallments()` updates all unpaid installments in transaction without batching
- Files: `src/lib/installment-recalculator.ts` (lines 36-52)
- Cause: Sale with 360 unpaid installments = 360 individual update operations in transaction
- Improvement path: Use raw SQL `UPDATE ... WHERE` instead; or batch by 50 updates per transaction

**Audit Log Not Indexed by User:**
- Problem: `AuditLog` has index on `[entity, entityId]` and `[userId]` separately but not useful for "recent actions by user" query
- Files: `src/prisma/schema.prisma` (lines 690-692)
- Cause: Queries like "show all CREATEs by userId" must scan entire table
- Improvement path: Add composite index `@@index([userId, createdAt])` to Prisma schema

## Fragile Areas

**Multi-Lot Sales (groupId):**
- Files: `src/prisma/schema.prisma` (line 328), `src/server/actions/sale.actions.ts` (not fully tested in smoke tests)
- Why fragile: `groupId` field in Sale allows linking multiple lot sales to one payment plan, but no UI for managing groups; creation only via import
- Safe modification: Add test case for groupId scenarios before refactoring; ensure installment generation works with grouped sales
- Test coverage: No explicit tests for grouped sale installment splitting; smoke test coverage: None

**Extra Charge Recalculation:**
- Files: `src/lib/installment-recalculator.ts`, `src/server/actions/payment.actions.ts` (lines 230-270 call it)
- Why fragile: `originalAmount` preservation logic assumes first recalculation; second refuerzo payment may corrupt data if logic not tested
- Safe modification: Write integration test for: pay ExtraCharge → verify installments recalculated → pay second ExtraCharge → verify data consistency
- Test coverage: No unit tests; smoke test coverage: Partial (6b only)

**Lot Status Transitions:**
- Files: `src/prisma/schema.prisma` (lines 207-215: 7 statuses), `src/server/actions/sale.actions.ts` (lines 67-79: mapSaleStatusToLotStatus)
- Why fragile: Lot status determined by Sale.status but no validation prevents invalid transitions (e.g., VENDIDO → DISPONIBLE); cascade deletes Sale but not inverse
- Safe modification: Add `enum LotStatusTransition` with allowed state changes; add guard in sale cancel action
- Test coverage: No explicit state machine tests

**Exchange Rate Lookup:**
- Files: `src/server/actions/payment.actions.ts` (lines 99-115: `getExchangeRateForCurrency`)
- Why fragile: If exchange-rate.actions.ts `getOrCreateLatestRate()` fails, payment creation may fail silently with no fallback
- Safe modification: Add fallback to last-known rate or manual_rate override; document behavior
- Test coverage: No error case tests

**Cron Notification Duplicate Prevention:**
- Files: `src/server/models/cron.model.ts` (lines 94-102: hasOverdueNotification uses findFirst), `src/app/api/cron/notify-upcoming/route.ts` (lines 73-85)
- Why fragile: Duplicate prevention relies on database query order; if cron runs concurrently, both may create notification before either marks notified=true
- Safe modification: Use database-level constraint or row-level lock; add unique index `@@index([referenceType, referenceId, type])` to Notification
- Test coverage: No concurrency tests

## Scaling Limits

**Database: Installment Growth:**
- Current capacity: Schema supports unlimited installments per sale; no archival strategy
- Limit: Real estate business with 1000 sales × 360 installments each = 360K records; queries on this table will slow
- Scaling path: Implement installment archival after sale completes; add `archivedAt` field; query only active sales' installments

**Cron Email Sending:**
- Current capacity: Single-threaded cron endpoint sends one email per notification; 1000 notifications = 1000 sequential sendEmail() calls
- Limit: If SMTP slow or email list grows, cron may timeout (serverless timeout ~30s)
- Scaling path: Move to background queue (Bull, BullMQ, Inngest); return job IDs from cron endpoint

**Cash Movement Table:**
- Current capacity: 14 movement types, no partitioning or archival
- Limit: Statistics page queries all movements for a year; with 10 years data = millions of rows = slow aggregation
- Scaling path: Add `createdAt` index; implement materialized view for monthly balances; partition by year

**User Permissions Cache:**
- Current capacity: `checkPermissionDb()` in `src/lib/rbac.ts` queries RolePermission table on every protected action
- Limit: No caching; with 100+ concurrent users = 100+ DB queries per action
- Scaling path: Add in-memory cache (Redis or Node `lru-cache`) with 5-minute TTL; invalidate on permission change

**Notification System:**
- Current capacity: Each notification is individual database record
- Limit: 100+ active users = 100 notifications per cron run = unbounded growth in Notification table
- Scaling path: Add `grouping` field to consolidate similar notifications; implement read-only archive table

## Dependencies at Risk

**next-auth v5 Beta:**
- Risk: Using `5.0.0-beta.30` in production; breaking changes possible before stable release
- Impact: Login flow, session handling, custom providers all at risk
- Migration plan: Pin version in package.json; set up notifications for beta updates; test after each minor version; plan migration to stable v5.0.0 before GA cutoff

**Nodemailer for Email:**
- Risk: No built-in retry logic or delivery confirmation; SMTP errors fail silently if not caught
- Impact: Users don't receive payment receipts or alerts; no observability
- Migration plan: Switch to AWS SES, SendGrid, or Postmark (with retry logic) for production; keep Nodemailer for dev

**Excel Import (papaparse + xlsx):**
- Risk: `papaparse@5.5.3` and `xlsx@0.18.5` are third-party parsers with security surface; no regular updates in lock file
- Impact: Malformed files could crash import; no protection against billion-laughs attack in XML
- Migration plan: Upgrade to latest versions; add file size limit (max 10MB); add timeout to parser

## Missing Critical Features

**Error Notification to Users:**
- Problem: When payment fails, user isn't notified; only appears in system logs
- Blocks: Users can't self-serve payment troubleshooting; must contact admin
- Recommendation: Add `Notification` record when payment fails; send email to person with error + support contact

**Installment Payment Plan Modification:**
- Problem: Once sale created, cannot modify installment dates/amounts without manual SQL
- Blocks: Changes to payment schedules (e.g., add 3-month grace period) require DB intervention
- Recommendation: Add UI to edit installment due dates and amounts before first payment

**Batch Payment Processing:**
- Problem: Must pay installments one-at-a-time via UI; no bulk payment file import
- Blocks: Large batches (bank transfers) require manual entry
- Recommendation: Add batch payment import (bank statement reconciliation) in caja module

**Two-Factor Authentication:**
- Problem: Users authenticate with email + password only
- Blocks: Account compromise risk; no MFA option
- Recommendation: Add TOTP or email-based OTP via Auth.js extension

## Test Coverage Gaps

**Installment Generator Edge Cases:**
- What's not tested: Month boundary conditions (Feb in leap year, 31st of short months), year wraparound
- Files: `src/lib/installment-generator.ts` (lines 50-81: collectionDay clamping logic)
- Risk: Collection day clamping may produce off-by-one errors in edge months
- Priority: High (financial calculation)

**Payment Decimal Precision:**
- What's not tested: Rounding errors in payment splits; USD to ARS conversion precision
- Files: `src/server/actions/payment.actions.ts` (currency conversion math), `src/lib/format.ts`
- Risk: Penny rounding accumulates; USD $0.01 converted to ARS may lose precision
- Priority: High (financial data integrity)

**Cascade Delete Behavior:**
- What's not tested: Deleting development with 1000+ lots and associated sales/installments
- Files: `src/prisma/schema.prisma` (cascade deletes on Lot, Installment, etc.), `src/server/actions/development.actions.ts`
- Risk: Cascade may lock database or timeout; no transaction protection
- Priority: Medium (operational safety)

**Permission Matrix Consistency:**
- What's not tested: Ensure every protected action checks correct permission; no orphaned permissions
- Files: `src/lib/auth-guard.ts`, all `src/server/actions/*.ts` files
- Risk: Permission checks may be bypassed; unused permissions confuse admins
- Priority: Medium (security)

**Concurrent Cron Runs:**
- What's not tested: Two cron requests simultaneous on same item (duplicate email risk)
- Files: `src/app/api/cron/notify-upcoming/route.ts` (no concurrency control)
- Risk: notified flag may not prevent duplicates if two requests check simultaneously
- Priority: Medium (data consistency)

**Import Duplicate Handling:**
- What's not tested: Re-import same CSV twice; edge case: DNI=null (no duplicate check)
- Files: `src/server/actions/import.actions.ts` (lines 159-186: DNI uniqueness check)
- Risk: Persons with null DNI can be imported multiple times
- Priority: Low (import UX)

---

*Concerns audit: 2026-02-26*
