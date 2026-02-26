# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**Currency Exchange Rates:**
- dolarapi.com - Free, unauthenticated API for USD/ARS rates
  - Endpoint: `https://dolarapi.com/v1/dolares`
  - SDK/Client: Fetch API (native)
  - Auth: None (public API)
  - Usage: `src/lib/exchange-rate.ts` → `fetchDolarApiRates()`
  - Rates fetched: oficial (buy/sell), blue (buy/sell), cripto (buy/sell)
  - Caching: 1 hour browser cache via `next: { revalidate: 3600 }`
  - Fallback: Bluelytics API (`api.bluelytics.com.ar/v2/latest`) mentioned as alternative in schema

**Email Delivery:**
- SMTP Generic (configurable)
  - SDK/Client: nodemailer 7.0.13
  - Auth: Username/password via `SMTP_USER` and `SMTP_PASS` env vars
  - Configuration: `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM` (all in `.env`)
  - Usage: `src/lib/email.ts` → `sendEmail()`
  - Fallback: Can load config from database `SystemConfig` model (keys: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`)
  - Common providers: Gmail, SendGrid, Mailgun, or self-hosted Postfix

**Cron Job Execution:**
- External scheduler (not integrated, must be triggered externally)
  - Endpoint: `GET /api/cron/notify-upcoming`
  - Auth: Bearer token via `CRON_SECRET` env var (header: `Authorization: Bearer {CRON_SECRET}`)
  - Suggested providers: EasyCron, GitHub Actions, AWS EventBridge, cPanel, systemd timer, or Docker cron image
  - No webhook callbacks; endpoint returns JSON with execution results

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: Via `DATABASE_URL` env var (format: `postgresql://user:password@host:port/database`)
  - Client: Prisma ORM 7.4.1 with `@prisma/adapter-pg` for connection pooling
  - Schema: 16+ models defined in `prisma/schema.prisma`
  - Key tables:
    - Users, Roles/Permissions
    - Developments, Lots, Persons
    - Sales, Installments, ExtraCharges
    - CashMovements, CashBalances
    - SigningSlots, Messages, Notifications
    - AuditLogs, ExchangeRates, SystemConfig

**File Storage:**
- Local filesystem only
  - Public assets: `./public/` directory served by Next.js
  - No S3, GCS, or external blob storage configured
  - Image URLs in models (e.g., `Lot.imageUrl`, `Development.imageUrl`) point to relative paths or full URLs
  - CSV/Excel imports: Parsed in-memory via papaparse + xlsx, no file persistence layer

**Caching:**
- No external cache layer (Redis, Memcached) detected
- Browser caching: Utilized for exchange rate API (`next: { revalidate: 3600 }`)
- Prisma query caching: None explicitly configured (implicit ORM-level caching)

## Authentication & Identity

**Auth Provider:**
- Custom implementation via Auth.js (NextAuth v5)
  - Credentials provider: Email + password with bcryptjs hashing
  - No OAuth2 (Google, GitHub, Microsoft)
  - Session storage: JWT (signed with `AUTH_SECRET`)
  - Session lifetime: Default 30 days (configurable)
  - Role-based access control (RBAC): 4 roles in `User.role` enum
    - SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA
  - Implementation: `src/lib/auth.ts`, `src/lib/auth.config.ts`

**Password Management:**
- Hashing: bcryptjs v3 (bcrypt implementation)
  - Cost factor: Default (10-12 rounds)
  - Comparison: `bcrypt.compare(password, hashedPassword)`
- Reset flow: Not detected (no password reset endpoint found)
- Seed/Initial: Default admin created via `prisma/seed.ts` with configurable password via `SEED_ADMIN_PASSWORD` env var

**Authorization:**
- RBAC implemented in middleware and server actions
  - File: `src/lib/rbac.ts`
  - Guard: `src/lib/auth-guard.ts` (wrapper for server components/actions)
  - Enforced at: Page level (`src/middleware.ts`), API routes, Server Actions
  - No granular object-level permissions (row-level security not in ORM layer)

## Monitoring & Observability

**Error Tracking:**
- Not detected
  - No Sentry, Rollbar, or error aggregation service integrated
  - Errors logged to console only

**Logs:**
- Console-only logging
  - In development: Full stack traces and debug logs
  - In production: Logs to stdout (container logs accessible via Docker/K8s)
  - Key log prefixes: `[email]`, `[cron]`, `[auth]`
  - Structured logging: Not implemented (no Winston, Pino, or bunyan)

**Health Checks:**
- HTTP endpoint: `GET /api/health`
  - Responds with HTTP 200 if service is alive
  - Used by Docker HEALTHCHECK
  - No database connectivity check (just server responsiveness)

**Audit Trail:**
- Database-backed audit log (`AuditLog` model in Prisma)
  - Tracks: User ID, action (CREATE/UPDATE/DELETE), entity type, entity ID, old/new data (JSON), IP address, timestamp
  - Queryable via `src/server/models/audit-log.model.ts`
  - Used for compliance and user activity tracking

## CI/CD & Deployment

**Hosting:**
- Docker containerization via multi-stage `Dockerfile`
  - Base: Node 22-Alpine
  - Stages: Dependencies → Build → Production
  - Standalone mode: Single bundle with no external HTTP framework
  - Port: 3000 (configurable via `PORT` env var)
- Docker Compose for local development (`docker-compose.yml`)
  - Services: PostgreSQL 16 + Next.js app
  - Network: Internal Docker network
  - Health checks: pg_isready for DB, wget for app health

**CI Pipeline:**
- Not detected in codebase
  - No GitHub Actions, GitLab CI, CircleCI config found
  - Must be configured separately or rely on deployment platform

**Build Artifacts:**
- Standalone Next.js bundle in `.next/standalone/`
  - Includes: Server code, static assets, Prisma client
  - Size: ~100-150MB uncompressed (typical for Node + Next.js)
  - Runtime requirements: Node 22, PostgreSQL connection

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (CRITICAL)
- `AUTH_SECRET` - JWT signing secret (CRITICAL; should be 32+ chars)
- `AUTH_URL` - App base URL for Auth.js redirects (e.g., `https://app.example.com`)
- `CRON_SECRET` - Cron job bearer token (CRITICAL; should be 32+ chars hex)
- `SMTP_HOST` - Email server hostname
- `SMTP_PORT` - Email server port (usually 587 or 465)
- `SMTP_USER` - Email account username
- `SMTP_PASS` - Email account password
- `EMAIL_FROM` - Sender email address and display name

**Optional env vars:**
- `SEED_ADMIN_PASSWORD` - Override default admin password in seed script
- `NEXT_TELEMETRY_DISABLED=1` - Disable Next.js telemetry (set in Docker)
- `NODE_ENV=production` - Set in production builds

**Secrets location:**
- `.env` file (git-ignored via `.gitignore`)
- Docker Compose: Via environment section and `${VAR_NAME}` interpolation
- Kubernetes/Cloud: Via secrets manager (ConfigMaps for non-sensitive config, Secrets for credentials)

## Webhooks & Callbacks

**Incoming:**
- Cron notifications: `GET /api/cron/notify-upcoming`
  - No true webhook body; triggered by external scheduler
  - Returns JSON summary of notifications created and emails sent
  - Used for: Upcoming extra charges, overdue installments, upcoming signing slots

**Outgoing:**
- Email notifications sent via nodemailer SMTP
  - Triggers: Cron job detects due dates 3 days ahead
  - Recipients: Buyers (via Person.email), sellers (via User.email)
  - Templates: HTML email templates defined in `src/lib/email-templates.ts`
  - No webhook-style callbacks to external services

**Internal APIs:**
- Server Actions (RPC-style endpoints)
  - No traditional REST API (uses Next.js Server Actions)
  - Client-side mutations via `@/server/actions/*` imports
  - Authentication: Session middleware in `src/middleware.ts`

## Rate Limiting & Security

**Rate Limiting:**
- Not detected
  - No global rate limiter middleware
  - Cron endpoint protected only by bearer token, not rate-limited

**Security Headers:**
- Configured in `next.config.ts`:
  - `X-Frame-Options: DENY` - Prevent clickjacking
  - `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin` - Limit referer leakage
  - `Strict-Transport-Security: max-age=31536000` - Force HTTPS (1 year)
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Disable unused APIs

**CORS:**
- Not configured (likely same-origin only, no cross-origin requests expected)

---

*Integration audit: 2026-02-26*
