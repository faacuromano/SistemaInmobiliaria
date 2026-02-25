# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Exchange Rate Dependency:**
- Issue: System depends on external API (dolarapi.com) for daily exchange rates. If API is down, payments cannot be processed accurately.
- Files: `src/lib/exchange-rate.ts`, `src/server/actions/exchange-rate.actions.ts`
- Impact: Payment recording requires a valid exchange rate. No fallback mechanism if API fails.
- Fix approach: Implement automatic retry logic with exponential backoff. Cache rates locally. Allow manual rate entry without requiring API.

**Decimal Serialization Pattern:**
- Issue: Prisma Decimal fields must be manually serialized to numbers in server actions before sending to client. This is repeated across multiple files with boilerplate code.
- Files: `src/server/actions/exchange-rate.actions.ts`, `src/server/actions/payment-receipt.actions.ts`, `src/server/actions/sale.actions.ts`
- Impact: Easy to forget serialization, causing serialization errors on client. No type safety across serialization boundary.
- Fix approach: Create a generic serialization utility that handles all Decimal fields automatically based on Prisma schema introspection.

**Nested Transaction Handling in Payment Logic:**
- Issue: In `src/server/actions/payment.actions.ts`, the `payExtraCharge()` function calls `recalculateInstallments()` outside the transaction (line 293-294). If recalculation fails, the payment has already been recorded and committed.
- Files: `src/server/actions/payment.actions.ts` (lines 244-313), `src/lib/installment-recalculator.ts` (lines 14-53)
- Impact: Orphaned payment records if recalculation fails. Data inconsistency between paid charges and installment amounts.
- Fix approach: Move recalculation logic into the transaction, or wrap the entire flow in a distributed transaction pattern.

## Known Bugs

**Overpayment Detection on Mixed-Currency Transactions:**
- Symptoms: If an installment has `paidAmount=0` and `paidInCurrency=NULL`, paying it in a different currency than the original sale currency may allow overpayment due to rounding or rate differences.
- Files: `src/server/actions/payment.actions.ts` (lines 84-91)
- Trigger: Pay an installment in ARS when sale is in USD, with an unfavorable exchange rate that makes the equivalent exceed the installment amount.
- Workaround: Pre-calculate equivalent amount in UI before submission. System validates amount per line 85-89 but doesn't account for currency conversion.

**Multi-Lot Sales (groupId) Not Validated:**
- Symptoms: A sale can reference a `groupId` but there is no constraint ensuring all sales in a group have the same payment plan (installments, due dates, amounts).
- Files: `prisma/schema.prisma` (line 328), `src/server/actions/sale.actions.ts`, `src/server/actions/import.actions.ts`
- Trigger: Create two sales with same groupId but different `firstInstallmentMonth` or `collectionDay`.
- Workaround: None. Frontend must enforce validation; DB has no integrity checks.

**Installment Status Computation (VENCIDA):**
- Symptoms: Overdue status is computed client-side in `getSaleById()` by comparing `dueDate < today`. If user's system clock is wrong or API is called at different times, status can fluctuate.
- Files: `src/server/actions/sale.actions.ts` (lines 26-34)
- Trigger: Access the same sale at 23:59 and 00:01 across day boundary.
- Workaround: Rely on consistent system time. No server-side status caching.

## Security Considerations

**No Rate-Limiting on Authentication:**
- Risk: The login endpoint (`src/app/api/auth/[...nextauth]/route.ts`) has no rate-limiting. Brute-force attacks on user accounts are possible.
- Files: `src/lib/auth.ts`, `src/lib/auth.config.ts`
- Current mitigation: None. Auth.js provides session management but not DDoS/brute-force protection.
- Recommendations: Implement rate-limiting middleware (e.g., via upstash/redis or a middleware library). Add account lockout after N failed attempts.

**Email Sending Has No Retry or Verification:**
- Risk: `sendEmail()` in `src/lib/email.ts` has no delivery confirmation. Failed emails are logged but not retried, causing silent delivery failures.
- Files: `src/lib/email.ts`, `src/server/actions/payment-receipt.actions.ts`, `src/app/api/cron/notify-upcoming/route.ts`
- Current mitigation: Catch and log errors, but no alerting to admin if email fails.
- Recommendations: Implement a queue-based email system (e.g., Bull, Resend with retry). Track email delivery status in the DB.

**Audit Logs Not Immutable:**
- Risk: AuditLog records can be deleted by SUPER_ADMIN. No append-only constraint or signature verification.
- Files: `prisma/schema.prisma` (lines 677-693), `src/server/models/audit-log.model.ts`
- Current mitigation: None. Audit logs are a regular table.
- Recommendations: Implement an append-only audit log table with no DELETE permissions. Consider cryptographic signatures.

**Cron Endpoint Secured Only by Secret Header:**
- Risk: The `/api/cron/notify-upcoming` endpoint only validates a Bearer token in the Authorization header. If the token is exposed, anyone can trigger notifications.
- Files: `src/app/api/cron/notify-upcoming/route.ts` (line 48)
- Current mitigation: Expects `process.env.CRON_SECRET` to be set. No HTTPS enforcement visible.
- Recommendations: Use IP whitelisting if cron is run from a fixed IP. Consider HMAC signing of requests. Add request timestamp validation.

## Performance Bottlenecks

**No Pagination on Cash Movements List:**
- Problem: `src/server/models/cash-movement.model.ts` likely loads all movements without pagination. With thousands of transactions, this will cause memory and query performance issues.
- Files: `src/server/models/cash-movement.model.ts`
- Cause: Schema design allows unbounded queries without explicit LIMIT.
- Improvement path: Implement cursor-based pagination. Add default LIMIT of 100. Pre-calculate summary statistics (totals by type/month) in `CashBalance` snapshots.

**Exchange Rate Fetch on Every Payment:**
- Problem: `getTodayExchangeRate()` queries the database on every payment, then makes an API call if not found. In high-volume payment recording, this becomes a bottleneck.
- Files: `src/server/actions/exchange-rate.actions.ts` (lines 27-50)
- Cause: No caching strategy. Each payment needs a rate.
- Improvement path: Cache exchange rates in memory or Redis for 1 hour. Batch rate lookups. Pre-fetch rates at midnight.

**Installation Recalculation Not Indexed:**
- Problem: `recalculateInstallments()` queries all unpaid installments for a sale without indexed filtering. With many installments, this becomes slow.
- Files: `src/lib/installment-recalculator.ts` (line 19)
- Cause: Query relies on (saleId, status) filtering; indexes exist but not optimized for this pattern.
- Improvement path: Add composite index on (saleId, status). Consider caching installment totals.

## Fragile Areas

**Import Batch Processing:**
- Files: `src/server/actions/import.actions.ts`
- Why fragile: Each row is processed independently without rollback. If row 100 fails after rows 1-99 succeed, the batch is partially imported with no undo.
- Safe modification: Wrap entire batch in a transaction with rollback. Return early on first critical error. Add a "dry run" mode to preview before commit.
- Test coverage: No test file for import. Edge cases like duplicate DNI/CUIT, missing developments, invalid installment months are only caught at runtime.

**Installment Generator Date Logic:**
- Files: `src/lib/installment-generator.ts` (lines 49-68)
- Why fragile: Uses `new Date(baseYear, targetMonth, day)` which can cause off-by-one errors with month overflow. If collectionDay=31 and target month has only 30 days, the behavior is browser-dependent.
- Safe modification: Use a date library (date-fns, Day.js) for month-end handling. Test with edge cases: Feb 28/29, months with 30 days.
- Test coverage: No test file visible. Missing tests for: leap years, Feb 29 collection day, year boundaries.

**Payment Status Transition Logic:**
- Files: `src/server/actions/payment.actions.ts` (lines 140-159), `src/server/actions/extra-charge.actions.ts`
- Why fragile: Status transitions (PENDIENTE → PAGADA, or → PARCIAL) are determined by simple amount comparison. No validation of status history or preventing backwards transitions.
- Safe modification: Add explicit status transition rules. Prevent PAGADA → PENDIENTE. Log all transitions.
- Test coverage: No visible test for edge case: paying 0.01 USD on a 1000 USD installment should set status to PARCIAL, not PAGADA. Rounding errors could cause this.

## Scaling Limits

**Single PostgreSQL Instance:**
- Current capacity: Design assumes single DB with no replication. Concurrent writes to CashMovement during peak collection hours (month-end) will see lock contention.
- Limit: System supports ~100 users. At 10 transactions/min during peak, expect slowdowns.
- Scaling path: Implement read replicas for reporting. Use connection pooling (PgBouncer). Partition CashMovement by month.

**Notification Broadcasting Without Queue:**
- Current capacity: Cron job iterates all notifications and sends emails synchronously. With 1000+ notifications, this times out.
- Limit: Breaks around 500 simultaneous notifications.
- Scaling path: Move email sending to a queue (Bull, RabbitMQ). Make notifications async.

**No Rate Aggregation:**
- Current capacity: Each payment query refreshes exchange rates from API. At 50 payments/minute, this causes N+1 API calls.
- Limit: API rate limits (dolarapi.com) are not enforced.
- Scaling path: Cache rates per minute in Redis. Implement application-level rate limiting.

## Dependencies at Risk

**dolarapi.com Availability:**
- Risk: External API with no SLA. If down, payment recording stalls.
- Impact: Entire cash module breaks. Users cannot process payments.
- Migration plan: Add fallback to bluelytics.com.ar API. Store last-known-good rates locally. Allow manual override for critical payments.

**Auth.js v5:**
- Risk: Auth.js is in active development. Callback signature may change between versions.
- Impact: Authentication breaks on upgrade.
- Migration plan: Pin to exact version in package.json. Run integration tests before upgrading.

**Prisma Schema Evolution:**
- Risk: Schema is at v0.7 but has no migration validation tests. Changing field types or constraints could break deployed instances.
- Impact: Rollback path unclear. No migration testing in CI.
- Migration plan: Add Prisma migration tests. Use `prisma migrate status` in CI. Require manual approval for breaking changes.

## Missing Critical Features

**No Backup/Recovery Mechanism:**
- Problem: No documentation on backup strategy. No disaster recovery procedure.
- Blocks: Business continuity. Data loss scenarios unhandled.

**No Password Recovery Flow:**
- Problem: Users cannot reset forgotten passwords. Only SUPER_ADMIN can reset via direct DB edit.
- Blocks: User account recovery if email-based reset is needed.

**No Audit Trail for Data Corrections:**
- Problem: AuditLog captures creation, but corrections to installment amounts (via refuerzo recalculation) are not logged separately.
- Blocks: Compliance with financial record-keeping. No trail of who changed what amount and why.

**No Installment Partial Payment Tracking:**
- Problem: When status is PARCIAL, there's no record of which payment dates contributed to paidAmount. Multiple partial payments are aggregated without history.
- Blocks: Detailed payment history reports and reconciliation.

## Test Coverage Gaps

**Payment Recalculation Logic:**
- What's not tested: `recalculateInstallments()` edge cases: zero installments, negative amounts, rounding errors, concurrent recalculations.
- Files: `src/lib/installment-recalculator.ts`
- Risk: Silent calculation errors could lead to overstated or understated installment amounts. No alert if recalculation fails mid-transaction.
- Priority: **High** — This directly affects financial calculations.

**Exchange Rate Fallback:**
- What's not tested: Behavior when dolarapi.com returns 500, 429, or times out. Current code returns null but downstream code may not handle it.
- Files: `src/lib/exchange-rate.ts`, `src/server/actions/exchange-rate.actions.ts`
- Risk: Payments recorded with NULL exchangeRateId cannot be reconciled later.
- Priority: **High** — Production will hit this eventually.

**Multi-Lot Sales (groupId):**
- What's not tested: Creating two sales with same groupId, different due dates. Paying one and checking if totals match.
- Files: `src/server/actions/sale.actions.ts`, `src/server/actions/import.actions.ts`
- Risk: Incomplete implementation. No validation that grouped sales have synchronized payment plans.
- Priority: **Medium** — Feature is flagged in schema but not enforced.

**Import Batch Rollback:**
- What's not tested: Partial import failure. Creating 50 persons, 50 sales, then sales row 48 fails due to missing lot. Check that persons 1-47 and sales 1-47 are still in DB.
- Files: `src/server/actions/import.actions.ts`
- Risk: Corrupted data state if batch import partially succeeds.
- Priority: **Medium** — Affects data integrity on high-volume imports.

**Cron Idempotency:**
- What's not tested: Running notify-upcoming twice in same hour. Check that notifications are not duplicated.
- Files: `src/app/api/cron/notify-upcoming/route.ts`
- Risk: Users receive duplicate notifications.
- Priority: **Low** — Uses `notified` flag but no explicit test for edge case of same charge notified in two different cron runs in same minute.

---

*Concerns audit: 2026-02-25*
