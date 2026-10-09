# QueueLess India — Architecture Decision Records (ADRs)

All foundational architectural decisions are logged here with context, alternatives considered, trade-offs, and consequences.

---

## ADR-001: Server-Authoritative Queue State & Redis Atomic Lua Counter

- **Status:** Accepted (M0)
- **Context:**
  In a physical-to-digital queue system, duplicate token numbers, out-of-order calls, or desynchronized queue lengths cause severe operational disruption and customer disputes at merchant counters.
- **Decision:**
  Queue state authority is strictly server-side. Token numbers restart at 1 per branch per IST day (`Asia/Kolkata`). Sequence numbering is implemented using an atomic Redis `INCR` key (`counter:branch:{id}:{date_ist}`) encapsulated in a Lua script, backed immediately by PostgreSQL transactional persistence with a composite constraint `UNIQUE(branch_id, date, number)`.
- **Alternatives Considered:**
  1. *PostgreSQL sequence per branch per day:* Heavy DDL churn creating and dropping sequences daily.
  2. *PostgreSQL `SELECT MAX(number) ... FOR UPDATE`:* High row-lock contention under concurrent queue joins, degrades p95 latency.
- **Trade-offs:**
  - Fast atomic execution in memory with sub-millisecond sequencing.
  - Requires Redis persistence configuration (`appendonly yes`, `appendfsync everysec`) and cold-boot recovery script from PostgreSQL.

---

## ADR-002: Dual-Storage Strategy (PostgreSQL as System of Record, Redis as Hot Path)

- **Status:** Accepted (M0)
- **Context:**
  The platform must handle high-throughput live queue tracking (thousands of concurrent reads per branch room) while maintaining historical integrity for billing, auditing, analytics, and DPDP compliance.
- **Decision:**
  - **PostgreSQL 15+:** The authoritative system of record. Stores relational entities (Users, Businesses, Branches, Services, Counters, Tokens, Notifications) with ACID transactions and schema constraints.
  - **Redis 7+:** The volatile hot-path and coordination layer. Stores active token counters, in-memory waiting lists (`RPUSH`/`LPOP`), merchant heartbeat timestamps, and Redis Pub/Sub channels for WebSocket fan-out.
- **Trade-offs:**
  - High read throughput and minimal DB load during live operations.
  - Requires deliberate write-through synchronization to prevent cache drift.

---

## ADR-003: Multi-Tier Realtime Fallback (WebSocket $\to$ SSE $\to$ Adaptive Polling)

- **Status:** Accepted (M0)
- **Context:**
  Indian tier-2 and tier-3 telecom networks feature frequent cell handovers, high packet loss, carrier-grade NATs, and aggressive proxy firewalls that often drop long-lived WebSocket connections.
- **Decision:**
  Implement a three-tiered realtime fallback system:
  1. Primary: Socket.IO WebSocket (`transports: ['websocket']`).
  2. Secondary: Server-Sent Events (SSE) via `/api/v1/branches/:id/stream`.
  3. Tertiary: Adaptive short-polling (`GET /tokens/:id`) every 15s when active in queue, 30s when browsing.
  On reconnect, clients fetch a single snapshot (`GET /branches/:id`) rather than replaying historical events.
- **Trade-offs:**
  - Exceptional resilience across 2G/3G networks.
  - Client state machine must monitor transport health and update the UI indicator honestly (`LIVE` green vs `RECONNECTING` amber).

---

## ADR-004: Single Flutter Codebase for Customer, Merchant, and TV Calling Board

- **Status:** Accepted (M0)
- **Context:**
  Building separate native codebases for Customer, Merchant, and TV Signage drastically increases maintenance overhead and delays delivery.
- **Decision:**
  Unify all client surfaces into a single Flutter codebase with modular architecture:
  - Customer interface (optimized for Android 8+, 2GB RAM, $< 15\text{ MB}$ AAB).
  - Merchant console (counter switching, call/skip/pause operations).
  - Fullscreen TV Calling Board mode (responsive landscape layout, high-contrast JetBrains Mono typography legible on 43" displays from 5 meters away).
- **Trade-offs:**
  - Single team, unified design system tokens, shared networking and serialization models.
  - Requires responsive layout adaptations and strict tree-shaking to keep APK/AAB size below 15 MB.

---

## ADR-005: Low-End Android Background Calling Alert via Alarm Audio Stream & Bilingual TTS

- **Status:** Accepted (M0)
- **Context:**
  Aggressive Android OEM battery managers (Xiaomi MIUI, Oppo ColorOS, Vivo FuntouchOS) kill background processes and suppress standard notification chimes when phones are muted or locked.
- **Decision:**
  - Dispatch FCM High-Priority Data Messages targeting an Android Notification Channel bound to `AudioAttributes.USAGE_ALARM`.
  - Trigger device-native Text-to-Speech (TTS) sequentially in Hindi and English:
    *"टोकन नंबर [X], काउंटर नंबर [Y] पर आएं"* followed by *"Token number [X], please proceed to Counter [Y]"*.
  - Provide a 3-minute acknowledgement window before flagging the token as "unresponsive" on the merchant console.
- **Trade-offs:**
  - Ensures citizens do not miss their turn even if the phone is pocketed or set to silent mode.
  - Requires explicit notification and alarm permissions on newer Android versions.

---

## ADR-006: DPDP Act 2023 Compliance & Privacy-by-Design

- **Status:** Accepted (M0)
- **Context:**
  India's Digital Personal Data Protection Act (2023) imposes strict compliance on data minimization, purpose limitation, log hygiene, and citizens' right to erasure.
- **Decision:**
  - Never log plain-text phone numbers or tokens in server logs (mask to `98XXXXXX21` using a custom NestJS logging interceptor).
  - Collect minimal data: mobile number and optional display name only.
  - Provide an automated, synchronous data deletion endpoint (`POST /api/v1/user/delete-account`) that anonymizes historical records and purges active tokens.
- **Trade-offs:**
  - Eliminates regulatory risk and satisfies Google Play Store Data Safety disclosure.
  - Log debugging requires searching by masked hashes or internal UUIDs rather than raw phone numbers.

---

## ADR-007: Exponential Moving Average (EMA) for Dynamic Wait-Time Estimation

- **Status:** Accepted (M0)
- **Context:**
  Fixed static service durations lead to wildly inaccurate wait times when consultations run over or under time.
- **Decision:**
  Dynamic wait time is calculated as:
  $$\text{est\_wait\_min} = \left\lceil \frac{\text{position\_in\_queue} \times \text{avg\_service\_ema\_min}}{\max(1, \text{active\_counter\_count})} \right\rceil$$
  Where `avg_service_ema_min` is updated on every completed service:
  $$\text{EMA}_t = \alpha \times \text{Duration}_t + (1 - \alpha) \times \text{EMA}_{t-1} \quad (\alpha = 0.1)$$
  Calculated across the last 20 completed tokens, seeded from the merchant's configured default service duration.
- **Trade-offs:**
  - Self-healing estimate that adapts dynamically to doctor/stylist pacing throughout the day.
  - Requires tracking actual service durations in `tokens.completed_at - tokens.called_at`.

---

## ADR-008: Merchant 5-Minute Heartbeat Timeout with Auto-Pause Circuit Breaker

- **Status:** Accepted (M0)
- **Context:**
  If a merchant abruptly closes shop, loses power, or disconnects without pausing their queue, waiting citizens continue to arrive and wait for ghost counters.
- **Decision:**
  The merchant console sends a heartbeat ping (`merchant:heartbeat`) every 60 seconds. A background worker inspects active branches. If no heartbeat is received for 5 minutes during operating hours:
  1. The branch queue status is automatically switched to `paused`.
  2. A `queue:paused` event is broadcast via WebSocket and FCM to all active token holders.
- **Trade-offs:**
  - Protects customer experience and prevents platform trust erosion.
  - Merchant must reopen the console to resume the queue when connectivity is restored.
