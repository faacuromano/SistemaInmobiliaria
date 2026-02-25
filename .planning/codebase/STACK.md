# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5.7 - Full codebase (frontend and backend)
- JavaScript (ES2022) - Generated output target

**Secondary:**
- SQL - PostgreSQL queries via Prisma ORM

## Runtime

**Environment:**
- Node.js (no specific version pinned, inferred from Next.js 15 requirements)

**Package Manager:**
- npm (implied from package.json structure)
- Lockfile: present (package-lock.json exists in git-tracked files)

## Frameworks

**Core:**
- Next.js 15.5.12 - Full-stack React framework with App Router (output: standalone)
- React 19 - UI library
- React DOM 19 - DOM rendering

**Authentication:**
- Auth.js (next-auth) 5.0.0-beta.30 - Session & JWT-based authentication with Credentials provider

**Form & Validation:**
- React Hook Form 7.71.2 - Form state management
- Zod 3.25.76 - Schema validation (used in all server actions and API routes)
- @hookform/resolvers 3.10.0 - Integration between React Hook Form and Zod

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind
- shadcn/ui (via Radix UI) - Component library built on Radix primitives
- Radix UI 1.4.3 - Unstyled, accessible component primitives
- Lucide React 0.500 - Icon library
- clsx 2 - Utility for conditional className composition
- class-variance-authority 0.7 - Type-safe variant management for components
- tailwind-merge 3 - Merge Tailwind classes intelligently
- Sonner 2.0.7 - Toast notifications library
- next-themes 0.4.6 - Theme management (light/dark mode)

**State Management:**
- Zustand 5 - Client-side state management (lightweight alternative to Redux)

**Date & Time:**
- date-fns 4 - Date manipulation and formatting

**Utilities:**
- bcryptjs 3 - Password hashing for authentication
- dotenv 16 - Environment variable loading

## Database & ORM

**Database:**
- PostgreSQL - Relational database (connectionString via DATABASE_URL)

**ORM & Client:**
- Prisma 7.4.1 - ORM and query builder
- @prisma/client 7.4.1 - Prisma client library
- @prisma/adapter-pg 7.4.1 - PostgreSQL adapter with connection pooling
  - Connection timeout: 5 seconds
  - Idle timeout: 5 minutes (300 seconds)
  - Schema location: `prisma/schema.prisma`
  - Generated client location: `src/generated/prisma/client`

## Email

**Service:**
- Nodemailer 7.0.13 - SMTP email delivery
  - Configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM from .env
  - Falls back to SystemConfig table for dynamic SMTP settings (`smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`)
  - Dynamic import pattern to avoid build-time errors if not installed

## Development Tools

**Build & Dev Server:**
- Turbopack (--turbopack flag) - Next.js bundler for dev server
- tsx 4 - TypeScript execution for Node.js scripts (used for Prisma seed)

**Linting & Formatting:**
- ESLint 9 - Code linting
- eslint-config-next 15.5.12 - Next.js ESLint configuration

**Type Checking:**
- TypeScript 5.7 with strict mode enabled
- Compiler target: ES2022
- Module system: ESM (esnext)

**Type Definitions:**
- @types/node 22 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions
- @types/bcryptjs 2 - bcryptjs type definitions
- @types/nodemailer 7.0.11 - Nodemailer type definitions

## Configuration

**Environment:**
- .env file required with: DATABASE_URL, AUTH_SECRET, AUTH_URL, CRON_SECRET, SMTP_* variables
- Environment-aware: NODE_ENV detection for production vs development Prisma singleton

**Build:**
- tsconfig.json configured with strict: true, noEmit: true, moduleResolution: bundler
- Path alias: @/* → ./src/*
- Next.js App Router (no Pages Router)
- Output format: standalone (for Docker/containerized deployment)
- External packages: ["@prisma/adapter-pg"] (server-side only)

**Database:**
- Prisma seed script: npx tsx prisma/seed.ts
- Schema version: 0.7 (as of 2026-02-24)

## Platform Requirements

**Development:**
- Node.js runtime
- PostgreSQL database instance
- Environment variables file (.env)

**Production:**
- Node.js runtime
- PostgreSQL database (remote or containerized)
- Standalone Next.js server (docker-safe with output: standalone)
- PORT environment variable (inferred from Next.js defaults)
- NODE_ENV=production

---

*Stack analysis: 2026-02-25*
