# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- TypeScript 5.7 - Type-safe application code and all shared modules
- JavaScript (ES2022) - Build configuration and tooling

**Secondary:**
- SQL - PostgreSQL database queries (abstracted through Prisma ORM)
- HTML/CSS - Rendered via React and Tailwind CSS

## Runtime

**Environment:**
- Node.js 22 (Alpine Linux variant in Docker)
- Next.js 15 with App Router (SSR/SSG hybrid)
- Deployed as standalone Node.js server (no external HTTP layer)

**Package Manager:**
- npm 10.x (inferred from Node 22)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 15.5.12 - Full-stack React metaframework with App Router
- React 19 - UI component library
- React DOM 19 - DOM rendering

**UI & Styling:**
- shadcn/ui - Headless component library (Radix UI primitives)
- Tailwind CSS 4 - Utility-first CSS framework
- Lucide React 0.500 - Icon library (500+ icons)

**Forms & Validation:**
- React Hook Form 7.71.2 - Form state management
- @hookform/resolvers 3.10.0 - Schema resolver integration
- Zod 3.25.76 - Runtime schema validation and type inference

**State Management:**
- Zustand 5 - Lightweight client-side state (if used; primary reliance on React Server Components)
- next-themes 0.4.6 - Theme persistence (light/dark mode)

**Authentication:**
- NextAuth.js (Auth.js) 5.0.0-beta.30 - OAuth/credential authentication
  - Providers: Credentials (email/password with bcrypt)
  - Session strategy: JWT
  - Adapter: None (credentials-only, no external OAuth providers)

**Data Access:**
- Prisma ORM 7.4.1 - Database query builder and schema migration
- @prisma/adapter-pg 7.4.1 - PostgreSQL-native connection pooling adapter
- @prisma/client 7.4.1 - Generated database client

**Testing:**
- Not detected in package.json (no Jest, Vitest, or testing frameworks)

**Build/Dev:**
- Turbopack (via `next dev --turbopack`) - Next.js built-in bundler acceleration
- TypeScript compiler - Type checking (no separate tsc runs in scripts)
- ESLint 9 - Code linting
  - eslint-config-next 15.5.12 - Next.js recommended rules
  - @eslint/eslintrc 3 - Flat config compatibility
- tsx 4 - TypeScript execution (used for Prisma seed: `npx tsx prisma/seed.ts`)

## Key Dependencies

**Critical:**
- `@prisma/adapter-pg` 7.4.1 - Enables PostgreSQL server-side connection pooling; required at runtime (marked in `next.config.ts` as `serverExternalPackages`)
- `next-auth` 5.0.0-beta.30 - Session management and credential verification
- `bcryptjs` 3 - Password hashing for secure credential storage

**Infrastructure:**
- `dotenv` 16 - Environment variable loading from `.env`
- `nodemailer` 7.0.13 - SMTP email sending with configurable transporter

**Data Processing:**
- `papaparse` 5.5.3 - CSV parsing and generation (for bulk import)
- `xlsx` 0.18.5 - Excel/XLSX file reading (for bulk import)
- `docx` 9.6.0 (dev only) - Word document generation (if needed for reports)

**UI Utilities:**
- `class-variance-authority` 0.7 - CSS class composition for component variants
- `clsx` 2 - Conditional CSS class concatenation
- `tailwind-merge` 3 - Merge Tailwind CSS classes without duplicates
- `date-fns` 4 - Date formatting and manipulation
- `sonner` 2.0.7 - Toast notifications (non-intrusive alerts)
- `radix-ui` 1.4.3 - Unstyled, accessible component primitives (foundation for shadcn/ui)

## Configuration

**Environment:**
- Configured via `.env` file (see `.env.example` for template)
- Critical variables:
  - `DATABASE_URL` - PostgreSQL connection string (required at build and runtime)
  - `AUTH_SECRET` - JWT signing secret (generated via `openssl rand -base64 32`)
  - `AUTH_URL` - Application base URL for Auth.js callbacks
  - `CRON_SECRET` - Bearer token for cron job authentication
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - Email configuration
  - `SEED_ADMIN_PASSWORD` - Optional override for initial admin password in database seed

**Build:**
- `next.config.ts` - Next.js configuration with:
  - Output mode: `standalone` (Docker-ready single bundle)
  - Server external packages: `["@prisma/adapter-pg"]`
  - Security headers: X-Frame-Options, HSTS, X-Content-Type-Options, Permissions-Policy
- `tsconfig.json` - TypeScript configuration:
  - Target: ES2022
  - Path alias: `@/*` → `./src/*`
  - Strict mode enabled
- `eslint.config.mjs` - ESLint flat config extending Next.js core rules and TypeScript
- `postcss.config.mjs` - PostCSS with Tailwind CSS plugin

## Platform Requirements

**Development:**
- Node.js 22+ (Alpine preferred for consistency)
- Docker & Docker Compose (optional but recommended)
- PostgreSQL 16 (via Docker Compose or external)
- npm or yarn for package management

**Production:**
- Deployment target: Docker container (multi-stage build via `Dockerfile`)
  - Base image: Node 22-Alpine
  - Standalone server output
  - Health checks: `/api/health` endpoint (HTTP 200)
  - User: Non-root `nextjs:nodejs` (uid 1001)
  - Exposed port: 3000
- PostgreSQL 16+ database (separate service or managed cloud)
- SMTP server (Gmail, SendGrid, Mailgun, or local Postfix)
- Optional: Reverse proxy (nginx/Caddy) for SSL/TLS termination

## Runtime Notes

- **No external CDN**: All assets served from Next.js
- **Database connection pooling**: Via `@prisma/adapter-pg` (PrismaPg) with configurable timeouts
- **Email delivery**: Nodemailer with SMTP (no third-party email service SDK required)
- **Exchange rates**: Fetched client-side from `dolarapi.com` (no server-side caching; 1-hour browser cache)
- **Cron jobs**: Implemented as HTTP GET endpoints secured via `CRON_SECRET` header (external trigger required, e.g., EasyCron or GitHub Actions)

---

*Stack analysis: 2026-02-26*
