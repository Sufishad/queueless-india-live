# Changelog

All notable changes to QueueLess India will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Milestone 1 (M1: Backend Core & Realtime) [In-Progress]

### Added
- **Prisma & Redis Infrastructure**:
  - `PrismaService` (`backend/src/modules/prisma/prisma.service.ts`) with graceful shutdown lifecycle.
  - `RedisService` (`backend/src/modules/redis/redis.service.ts`) with dynamic Lua script execution from `scripts/` directory and memory caching.
  - Baseline atomic sequence Lua script (`backend/scripts/atomic_sequence.lua`).
- **OTP Auth Module**:
  - `POST /api/v1/auth/otp/request` with rate-limiting (3 requests per 10 mins per mobile via Redis) and 5-min TTL.
  - `POST /api/v1/auth/otp/verify` issuing 24h JWT + 7d Refresh token and upserting user in PostgreSQL.
  - Pre-seeded reviewer account bypass (`9000000001` with `demo1234` / `123456`) per Master Spec Section 11.
  - `POST /api/v1/auth/token/refresh` for rotating JWT tokens.
  - `JwtAuthGuard` and `JwtStrategy` for route security.
- **DPDP Compliance & Log Sanitization**:
  - `SanitizeLogsInterceptor` (`backend/src/common/interceptors/sanitize-logs.interceptor.ts`) applied globally to sanitize logs and HTTP responses, masking mobile numbers (e.g. `9876543210` $\to$ `98XXXX3210`) and scrubbing JWT tokens.
- **Unit Tests**:
  - 14 tests across `auth.service.spec.ts` and `sanitize-logs.interceptor.spec.ts` verifying OTP rate limits, reviewer auth, and recursive phone/token masking.

- **Queue Engine Module & Atomic Sequence**:
  - Redis Lua script (`backend/scripts/generate_token.lua`) for atomic, duplicate-free daily token increment per branch room.
  - `POST /api/v1/branches/:id/token` with Idempotency-Key caching in Redis, active token conflict validation (409), and Postgres persistence.
  - Wait time estimation using Exponential Moving Average (EMA) ($\alpha = 2 / 21$) based on completed service durations and active counters.
  - Merchant state machine: `callNext`, `recall`, `complete`, `skip` (auto-requeue once to end of queue, second skip cancels), `walkIn` (keypad phone / senior tokens), `pauseQueue`, `resumeQueue`.
- **Realtime Gateway & Push Notifications**:
  - Socket.IO gateway (`backend/src/modules/realtime/`) broadcasting to rooms `branch:{id}` for events `queue:update`, `token:called`, `token:status`, `queue:paused`, `queue:resumed`.
  - Notifications service (`backend/src/modules/notifications/`) handling mock FCM high-priority alarm-channel notifications with bilingual Hindi/English alert templates.
- **Unit & Concurrency Tests**:
  - `queue.concurrency.spec.ts`: 50 simultaneous join requests verified for strictly unique sequential numbers ($1 \dots 50$) and 0 unique database constraint violations.
  - `queue.service.spec.ts`: Full state machine tests for skip/no-show (re-queue $\to$ cancel), call-next, recall, complete, and EMA calculations.

## [0.1.0] - Milestone 0 (M0: Foundation, Architecture & Contracts)

### Added
- Comprehensive architecture specification (`docs/ARCHITECTURE.md`) covering server-authoritative queue engine, multi-tier realtime fallback (WebSocket $\to$ SSE $\to$ adaptive polling), low-end Android audio alarm notifications, bilingual TTS (`hi` + `en`), and DPDP Act 2023 compliance.
- REST and WebSocket contract specification (`docs/API.md`) defining endpoints under `/api/v1` and Socket.IO events for room `branch:{id}` with strict error shapes.
- Architecture Decision Records (`DECISIONS.md` and `docs/DECISIONS.md`) logging ADR-001 through ADR-008.
- PostgreSQL relational data model with Prisma schema (`backend/prisma/schema.prisma`), strictly enforcing `UNIQUE(branch_id, date, number)` composite constraint and tracking `skip_count` and `idempotency_key`.
- Backend NestJS workspace scaffolding (`backend/package.json`, `backend/tsconfig.json`, `backend/src/main.ts`, `backend/src/app.module.ts`).
- Mobile Flutter workspace scaffolding (`apps/mobile/pubspec.yaml`, `apps/mobile/lib/main.dart` with brand color system).
- Platform Admin web workspace scaffolding (`apps/admin_web/package.json`, `apps/admin_web/vite.config.ts`, `apps/admin_web/src/App.tsx`).
