# ==============================================
# TSQM-n แม่ฟ้าหลวง
# Docker Multi-stage Build (Debian Slim for Prisma compatibility)
# App Port: 9901
# ==============================================

# Base image - Node.js 20 LTS (Debian Bookworm Slim)
FROM node:20-bookworm-slim AS base

# ------------------------------------------------
# deps: install OS deps + Node deps
# ------------------------------------------------
FROM base AS deps

# OS packages needed by Prisma/Node runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     openssl \
     ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (include dev deps for build/prisma generate)
RUN npm ci --only=production=false

# ------------------------------------------------
# builder: build Next.js + generate prisma client
# ------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Clear old Prisma client and regenerate for correct platform
RUN rm -rf node_modules/.prisma node_modules/@prisma/client
RUN npx prisma generate

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ------------------------------------------------
# runner: minimal runtime image
# ------------------------------------------------
FROM base AS runner
WORKDIR /app

# OS packages needed at runtime (Prisma engine loads here)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     openssl \
     ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user with HOME directory
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --home /home/nextjs nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma Client (BOTH @prisma/client AND .prisma are required!)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Prisma CLI for migrations (needed for docker exec prisma migrate deploy)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Create uploads directory with proper permissions
RUN mkdir -p /app/public/uploads/evidence \
  && chown -R nextjs:nodejs /app/public/uploads

# Switch to non-root user
USER nextjs
ENV HOME=/home/nextjs

# Expose port
EXPOSE 9901

# Environment variables
ENV PORT=9901
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9901/ || exit 1

# Start the application (Next standalone provides server.js)
CMD ["node", "server.js"]
