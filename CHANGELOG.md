# Changelog

All notable changes to QueueLess India will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Milestone 0 (M0: Foundation, Architecture & Contracts) [In-Progress]

### Added
- Comprehensive architecture specification (`docs/ARCHITECTURE.md`) covering server-authoritative queue engine, multi-tier realtime fallback (WebSocket $\to$ SSE $\to$ adaptive polling), low-end Android audio alarm notifications, bilingual TTS (`hi` + `en`), and DPDP Act 2023 compliance.
- REST and WebSocket contract specification (`docs/API.md`) defining endpoints under `/api/v1` and Socket.IO events for room `branch:{id}` with strict error shapes.
- Architecture Decision Records (`DECISIONS.md` and `docs/DECISIONS.md`) logging ADR-001 through ADR-008.
- PostgreSQL relational data model with Prisma schema (`backend/prisma/schema.prisma`), strictly enforcing `UNIQUE(branch_id, date, number)` composite constraint and tracking `skip_count` and `idempotency_key`.
- Backend NestJS workspace scaffolding (`backend/package.json`, `backend/tsconfig.json`, `backend/src/main.ts`, `backend/src/app.module.ts`).
- Mobile Flutter workspace scaffolding (`apps/mobile/pubspec.yaml`, `apps/mobile/lib/main.dart` with brand color system).
- Platform Admin web workspace scaffolding (`apps/admin_web/package.json`, `apps/admin_web/vite.config.ts`, `apps/admin_web/src/App.tsx`).
