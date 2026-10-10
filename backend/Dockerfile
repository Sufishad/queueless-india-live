# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies including openssl for Prisma engines
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src/

RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2020 --moduleResolution node --esModuleInterop

# Remove development dependencies, retaining production packages and generated Prisma client
RUN npm prune --production

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl openssl

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Guarantee dist/main.js exists even if outputted to dist/src/main.js
RUN if [ -f "dist/src/main.js" ] && [ ! -f "dist/main.js" ]; then cp -r dist/src/* dist/; fi

EXPOSE 3000

# Docker healthcheck pinging root /healthz endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Apply database schema and seed pilot data on startup before running server
CMD ["sh", "-c", "npx prisma db push --skip-generate && (node dist/prisma/seed.js || true) && node dist/main.js"]
