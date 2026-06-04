# tonapi — Next.js 16 standalone, Node 24, pnpm, Prisma 7
# Build: docker build -t tonapi .
# Run:   docker run -p 3000:3000 -e DATABASE_URL=... -e NEXT_PUBLIC_TONAPI_API_KEY=... tonapi

# --- Dependencies ---
FROM node:24-alpine AS deps
RUN corepack enable pnpm && apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM node:24-alpine AS builder
RUN corepack enable pnpm && apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Prisma client (custom output: generated/prisma)
RUN pnpm prisma:generate

# Next build may import prisma; real DB is not required at image build time
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=$DATABASE_URL

ARG NEXT_PUBLIC_TONAPI_BASE_URL=https://tonapi.io
ARG NEXT_PUBLIC_TONAPI_API_KEY=
ENV NEXT_PUBLIC_TONAPI_BASE_URL=$NEXT_PUBLIC_TONAPI_BASE_URL
ENV NEXT_PUBLIC_TONAPI_API_KEY=$NEXT_PUBLIC_TONAPI_API_KEY

RUN pnpm build

# --- Production ---
FROM node:24-alpine AS runner
RUN apk add --no-cache dumb-init wget openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/generated ./generated

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=10s --start-period=90s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
