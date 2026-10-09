# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src/

RUN npm run build

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production --legacy-peer-deps
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Docker healthcheck pinging root /healthz endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["node", "dist/main.js"]
