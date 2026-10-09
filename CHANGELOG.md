# Changelog

All notable changes to QueueLess India will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - Milestone 3 (M3: Scalability, Production Hardening & DPDP Compliance)

### Added
- **DPDP Act 2023 Data Retention & Purge (`RetentionService`)**:
  - Nightly cron job (`@Cron('0 2 * * *')`) scheduled at 02:00 IST.
  - Automatic purging of `COMPLETED`, `CANCELLED`, and `NO_SHOW` tokens older than 30 days.
  - Aggregation of daily branch operations into `DailyQueueStats` (total tokens issued, served, cancelled, no-show, avg wait and service times) for compliant historical analytics.
  - Right to Erasure anonymization clearing `customer_user_id` on remaining historical records.
- **Multi-Layer Redis Rate Limiting (`RateLimitService`)**:
  - Atomic Redis sliding-window check with sub-millisecond evaluation.
  - OTP endpoint protection: max 3 requests per 10 mins per mobile, 10 per hour per IP (Reviewer `9000000001` bypass).
  - Queue join protection: max 5 joins per hour per customer/IP (`ratelimit:queue:join:<userId>`).
  - Merchant console protection: max 100 actions per minute per branch (`ratelimit:merchant:branch:<branchId>`).
- **Health Checks & Observability (`HealthModule`)**:
  - `GET /healthz`: Liveness probe verifying PostgreSQL and Redis latency and connectivity.
  - `GET /readyz`: Readiness probe asserting queue engine, Redis Lua script availability, and database readiness.
  - `GET /metrics`: Prometheus metrics scraping endpoint reporting `tokens_issued_total`, `queue_wait_time_seconds`, `fcm_delivered_total`, and `http_requests_total`.
  - Metrics interceptor (`MetricsInterceptor`) tracking route execution latency across all endpoints.
  - DPDP Sentry exception filter (`SentryExceptionFilter`) scrubbing Indian mobile numbers (`98XXXX3210`), JWTs, Bearer headers, and OTP/PIN secrets from error payloads.
- **Performance & Dual Caching Hierarchy**:
  - Redis cache for branch discovery (`cache:branches:discovery:<city>:<category>:<search>`) with 5-minute TTL.
  - High-frequency 1-second Redis snapshot cache (`cache:queue:snapshot:<branchId>`) shielding PostgreSQL from poll storms.
- **Security Hardening**:
  - Helmet middleware with strict Content Security Policy (CSP) blocking external scripts and object embeds.
  - Strict CORS whitelist restricting admin API access to designated admin origins.
  - Dual Merchant Authentication Guard (`MerchantAuthGuard`): supports both SHA-256 hashed API keys (`x-api-key`) and JWT Bearer tokens.
  - Refresh token rotation with Redis SHA-256 blacklist (`jwt:blacklist:<hash>`) with 7-day TTL.
- **Staging Deployment & Pilots**:
  - Production multi-stage `Dockerfile` for NestJS backend with integrated `/healthz` container healthcheck.
  - Production `docker-compose.staging.yml` containerizing PostgreSQL 16 (tuned connection pool), Redis 7 (AOF), Backend, and Admin Web.
  - GitHub Actions CI/CD workflow (`.github/workflows/ci-cd.yml`) for automated linting, test suites, Docker image builds, and staging deployments.
  - Staging database seed script (`backend/prisma/seed.ts`) populating 5 pilot branches across Bengaluru, Mumbai, and Pune (Apollo Clinics, Dr. Mohan's Diabetes, RTO KA-01, Lilavati OPD, Poona Hospital) with counters, services, API keys, and test tokens.
- **Capacity Planning & Load Testing**:
  - Comprehensive k6 load test script (`load-tests/k6-queue-load.js`) simulating 10,000 concurrent virtual users across 100 pilot branches.
  - Architectural capacity analysis and horizontal scaling documentation in `DECISIONS.md` (ADR-015).

---

## [0.2.1] - Milestone 2 Fixes (M2: Critical Production Blockers)

### Fixed (Critical Production Blockers)
- **AndroidManifest.xml**: Added runtime & foreground service permissions (`POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `USE_FULL_SCREEN_INTENT`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`) and declared Android `dataSync` ForegroundService.
- **Genuine Android Foreground Service**: Integrated `flutter_background_service` in `LiveForegroundService` with notification channel `queueless_foreground_live_service` to prevent MIUI/ColorOS background termination.
- **Token Number 0 Guard**: Enforced strict validation in `CallingAlertService` (`tokenNumber <= 0` early return/rejection) preventing spurious 0-token alarms.
- **Hive AES-256 Box Encryption**: Protected offline actions Hive storage with 256-bit AES cipher key managed in `SecureStorageService` / Android Keystore for DPDP Act 2023 compliance.
- **Notification Tap Handler**: Added notification payload router stream in `CallingAlertService` directing users straight to active token screen on tap.
- **Connectivity Auto-Replay**: Hooked `connectivity_plus` stream in `OfflineActionQueueService` to trigger automatic replay of offline merchant mutations on network restoration.

### Fixed
- **I18n Extraction**: Externalized all customer UI strings into ARB localization bundles (`app_en.arb`, `app_hi.arb`, `app_mr.arb`) with complete Hindi and Marathi translations and generated typed `AppLocalizations`.
- **Accessibility**: Added screen-reader `Semantics` with `liveRegion: true` on ticket status announcements and descriptive token number/step progress announcements.
- **Deprecation Cleanup**: Migrated all Flutter color `.withOpacity()` calls to `.withValues(alpha:)` and converted widget constructors to `super.key`.

### Added
- **Design System & Theme (`apps/mobile/lib/core/theme/`)**:
  - Dark Theme palette: Base `#0B0F19`, Panel `#121A2B`, Card `#162032`, Electric Orange `#F97316` (primary), Emerald `#10B981` (live/success), Alert `#EF4444`.
  - Typography: Bricolage Grotesque (headings), Manrope (body), JetBrains Mono (high-contrast token numbers and telemetry).
- **Core Infrastructure (`apps/mobile/lib/core/`)**:
  - Dio network client with `AuthInterceptor` (automatic JWT bearer attachment, 401 token refresh handling, and UUID `Idempotency-Key` headers).
  - Secure storage wrapper (`FlutterSecureStorage` with Android encrypted shared preferences).
  - Socket.IO realtime client (`SocketService`) with room subscriptions (`branch:subscribe`), reconnect recovery, and event streams (`queue:update`, `token:called`, `token:status`, `queue:paused`, `queue:resumed`).
  - Riverpod `BranchLiveQueueNotifier` for active branch live state.
- **Authentication Feature (`apps/mobile/lib/features/auth/`)**:
  - Mobile OTP login screen with +91 validation, 6-digit PIN verification, and Play Store Reviewer account bypass shortcut (`9000000001` / `123456`).
- **Customer Discovery & Join Flow (`apps/mobile/lib/features/customer/`)**:
  - Discovery Screen with live search bar, launch city chips (Bengaluru, Mumbai, Delhi, Pune), category chips, and live queue telemetry cards.
  - Branch Card widget displaying Now Serving #, Waiting, and Est. Wait in JetBrains Mono with live pulsing indicators.
  - Join Queue bottom sheet with service selector, customer name input, senior citizen priority toggle, and idempotency protection.
  - **TokenTicketWidget**: Hero perforated digital ticket with custom notch clipper, dashed perforation line, glowing JetBrains Mono token number (#), live wait telemetry, QR code stub, and 4-step progress tracker (`WAITING` -> `CALLED` -> `IN SERVICE` -> `COMPLETED`).
- **Calling Alert Service & Audio Engine (`apps/mobile/lib/core/services/calling_alert_service.dart`)**:
  - Android notification channel `queueless_token_alarm_high_priority` with `AudioAttributesUsage.alarm` and `fullScreenIntent: true` to ring over silent/DND where OS permits.
  - Active token foreground service with continuous notification (`QueueLess live — you are #14, 3 ahead`) preventing background OS task killing.
  - Sequential bilingual TTS synthesizer: speaks Hindi first (`hi-IN`: "टोकन नंबर {n}, काउंटर {c} पर आएं"), then English (`en-IN`: "Token number {n}, please proceed to counter {c}"), strictly respecting branch voice flags.
  - OEM Autostart Guidance Dialog (`autostart_guidance_dialog.dart`) for MIUI/HyperOS, ColorOS, and FuntouchOS.
- **Merchant Console (`apps/mobile/lib/features/merchant/`)**:
  - Calling board featuring current called token in JetBrains Mono, active counter chips, next-up queue, waiting count, and completed count.
  - Optimistic actions with REST mapping and error rollbacks: `Call Next` (primary), `Recall`, `Complete`, `Skip / No-Show`, and `Pause / Resume Queue`.
  - 1-Tap Walk-In modal (`WalkInDialog`) with senior priority toggle and service selector.
  - **Offline Action Queue (`offline_action_queue_service.dart`)**: Hive persistent storage with FIFO sequential replay, mutex concurrency locking, idempotency key transmission, and poison-pill ejection.
- **TV Calling Board Mode (`tv_calling_board_screen.dart`)**:
  - Fullscreen landscape mode with `wakelock_plus` screen wake lock for Android TV dongles and merchant wall monitors.
  - Realtime `LIVE` / `RECONNECTING` status pills with automatic Socket.IO reconnection.
  - Giant JetBrains Mono token display ($\ge 96\text{sp}$) legible from 5+ meters away.
- **QR Standee Generator (`qr_standee_pdf_service.dart`)**:
  - A4 Printable PDF generation using `pdf` & `printing` with brand header, vector QR deep-link (`https://queueless.in/b/{id}`), 3-step customer guide, and tagline *"Line mein nahi, time par"*.
- **Unit Tests (`apps/mobile/test/`)**:
  - `offline_action_queue_test.dart`: Verifies FIFO replay, idempotency deduplication, and concurrency safety.
  - `calling_alert_tts_test.dart`: Verifies sequential bilingual TTS ordering (`hi-IN` then `en-IN`) and voice flag gating.

## [0.2.0] - Milestone 1 (M1: Backend Core & Realtime)

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
