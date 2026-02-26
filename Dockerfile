# =============================================================================
# Sistema Inmobiliaria — Multi-stage Docker Build
# =============================================================================

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (public dir may not exist)
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + generated client (needed at runtime for adapter-pg)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
