# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Exchange Rate (Financial):**
- dolarapi.com - Free API for USD/ARS exchange rates
  - Endpoint: `https://dolarapi.com/v1/dolares`
  - SDK/Client: Native fetch() with 1-hour cache (revalidate: 3600)
  - Returns: Oficial (compra/venta), Blue (compra/venta), Cripto (compra/venta)
  - Implementation: `src/lib/exchange-rate.ts` (fetchDolarApiRates)
  - No API key required
  - Fallback: Manual exchange rate entry via `createManualExchangeRate` action
  - Response types: `src/lib/exchange-rate.ts` (DolarApiRate interface)

**Alternative Rate Source (commented in schema):**
- bluelytics.com.ar - Alternative Argentine dollar rates API
  - Status: Referenced but not implemented (see `prisma/schema.prisma` line 140)
  - Endpoint: `https://api.bluelytics.com.ar/v2/latest`
  - No API key required

## Data Storage

**Databases:**
- PostgreSQL (primary)
  - Connection string: DATABASE_URL env var
  - Client: @prisma/adapter-pg (with connection pooling)
  - Connection timeout: 5 seconds
  - Idle timeout: 5 minutes
  - ORM: Prisma 7.4.1
  - Generated client: `src/generated/prisma/client`

**File Storage:**
- Local filesystem only - Images/files stored as URLs in database
  - Example fields: Development.imageUrl, SystemConfig values (paths to /uploads)
  - No cloud storage integration (S3, GCS, etc.)

**Caching:**
- Next.js built-in caching (fetch revalidation)
  - Exchange rate: 1-hour cache (revalidate: 3600)
- Prisma query caching: None (relies on database)

## Authentication & Identity

**Auth Provider:**
- Auth.js v5 (next-auth) - Custom implementation
  - Strategy: Credentials provider (email/password)
  - Configuration: `src/lib/auth.config.ts` and `src/lib/auth.ts`
  - Password hashing: bcryptjs (v3)
  - Session strategy: JWT
  - Database adapter: None (credentials stored in User model, managed manually)
  - No OAuth providers integrated (GitHub, Google, etc.)
  - User model: `src/server/models/user.model.ts`

**Authorization:**
- Role-Based Access Control (RBAC)
  - Roles: SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA
  - Permission checking: `src/lib/auth-guard.ts` (requirePermission)
  - Permissions stored in: RolePermission model and checked via middleware
  - Field-level visibility enforced in: Application layer (middleware), not database

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logs:**
- console.log / console.error only
  - Email logs: `[email] Email sent to...`, `[email] Failed to send email...`
  - Exchange rate logs: Error logging in catch blocks
  - No structured logging or log aggregation service

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase - Could be Vercel, Docker, Node.js VPS, etc.
- Output format: Next.js standalone (docker-safe)

**CI Pipeline:**
- Not detected - No .github/workflows, .gitlab-ci.yml, Jenkinsfile, or similar

**Deployment Environment:**
- .env file required for: DATABASE_URL, AUTH_SECRET, AUTH_URL, CRON_SECRET, SMTP_* vars
- NODE_ENV detection for production mode

## Environment Configuration

**Required env vars:**
- DATABASE_URL - PostgreSQL connection string (critical)
- AUTH_SECRET - Secure random string for Auth.js (critical)
- AUTH_URL - Base URL of app, e.g., http://localhost:3000 (critical)
- CRON_SECRET - Bearer token for cron job authentication

**Optional env vars:**
- SMTP_HOST - SMTP server hostname (default: smtp.gmail.com)
- SMTP_PORT - SMTP port (default: 587)
- SMTP_USER - SMTP authentication email
- SMTP_PASS - SMTP authentication password
- EMAIL_FROM - Email sender address (default: noreply@sistema.com)
- SEED_ADMIN_PASSWORD - Override default admin password for Prisma seeding
- NODE_ENV - production | development (defaults to development)

**Secrets location:**
- .env file (git-ignored)
- SystemConfig table (dynamic SMTP configuration at runtime)
- User passwords: Hashed with bcryptjs in users.password column

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints in codebase

**Outgoing:**
- Email notifications (not webhooks)
  - Payment receipt emails: `src/server/actions/payment-receipt.actions.ts`
  - Extra charge alerts: ExtraCharge.notified flag and email logic (referenced in schema)
  - No external webhook calls

## Third-Party Services Summary

**Free Services (No Cost, No Signup):**
- dolarapi.com - Exchange rates (public API, no auth)

**Paid Services (Potentially Required):**
- SMTP email (via Nodemailer) - Requires email provider (Gmail, SendGrid, custom SMTP server)
- PostgreSQL database - Cloud or self-hosted

**Not Integrated:**
- Payment processors (Stripe, MercadoPago, etc.)
- SMS notifications (Twilio, AWS SNS, etc.)
- Cloud storage (AWS S3, Google Cloud Storage, etc.)
- Analytics (Google Analytics, Mixpanel, etc.)
- Video hosting (Vimeo, YouTube, etc.)

## Architecture Notes

**Request Flow:**
1. Client request → Next.js Route Handler or Server Action
2. Auth check via `auth()` (Auth.js session)
3. Permission check via `requirePermission()` (RBAC)
4. Validation via Zod schemas
5. Database query via Prisma
6. Email sent via Nodemailer (optional, for receipts/notifications)
7. Exchange rate fetched from dolarapi.com (on-demand or cached)

**Critical Dependencies:**
- PostgreSQL database (blocks entire application)
- AUTH_SECRET (session security)
- DATABASE_URL (data access)

---

*Integration audit: 2026-02-25*
