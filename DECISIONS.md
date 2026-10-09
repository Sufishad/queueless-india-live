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

---

## ADR-009: Offline Merchant Mutation Queue with Idempotent Replay via Hive

- **Status:** Accepted (M2)
- **Context:**
  Merchants frequently operate in Indian markets with intermittent 2G/3G connectivity or momentary Wi-Fi drops. Actions like `callNext`, `complete`, or `walkIn` must not fail or hang the merchant counter workflow.
- **Decision:**
  - When network mutation fails or is offline, actions are queued locally in a Hive box `offline_merchant_actions` with `{endpoint, method, payload, idempotencyKey, createdAt}`.
  - On network restoration, actions are replayed in strict FIFO sequence.
  - Each action carries an immutable `Idempotency-Key` UUID. Server rejects or absorbs duplicates (409) without double counting.
  - Concurrency lock guarantees no concurrent double-replays.
- **Trade-offs:**
  - Zero disruption to merchant calling flow during link flakiness.
  - Requires optimistic UI state updates and automatic poison-pill ejection.

---

## ADR-010: Bilingual Sequential Voice Announcements & High-Priority AudioAttributes USAGE_ALARM

- **Status:** Accepted (M2)
- **Context:**
  Citizens in noisy Indian public markets or waiting areas often miss visual banners or silent notifications.
- **Decision:**
  - Android notification channel `queueless_token_alarm_high_priority` configured with `audioAttributesUsage: AudioAttributesUsage.alarm` and `fullScreenIntent: true` to bypass silent mode and DND where permitted.
  - Sequential bilingual TTS synthesized directly on client via `FlutterTts`:
    1. Hindi (`hi-IN`): *"टोकन नंबर {n}, काउंटर {c} पर आएं"*
    2. English (`en-IN`): *"Token number {n}, please proceed to counter {c}"*
  - Responds to merchant branch `queue_settings` voice flags (`voice_hi`, `voice_en`).
- **Trade-offs:**
  - Native offline TTS requires zero telephony or audio streaming bandwidth.
  - Aggressive Android skins (MIUI, ColorOS) require user autostart guidance dialog.

---

## ADR-011: Production Android Foreground Service, DPDP Hive AES-256 Box Encryption & Network Auto-Replay

- **Status:** Accepted (M2 Fixes)
- **Context:**
  Aggressive battery optimization on Android 13/14 and OEM skins (MIUI/ColorOS) kill background apps within 2 minutes. Furthermore, offline mutation payloads containing user tokens or names stored in plain text breach DPDP Act 2023 regulations.
- **Decision:**
  - Implement a genuine Android Foreground Service (`flutter_background_service`) declared with `android:foregroundServiceType="dataSync"` and explicit permissions (`POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `USE_FULL_SCREEN_INTENT`, `WAKE_LOCK`).
  - Secure the Hive offline queue (`offline_merchant_actions`) with 256-bit AES cipher key generated via `Hive.generateSecureKey()` and persisted in Android Keystore / `FlutterSecureStorage`.
  - Wire `connectivity_plus` to automatically trigger `replayPendingActions()` when network transitions from offline to online.
  - Hard guard: Reject `token_number <= 0` at FCM parse level to eliminate token 0 phantom alerts.
  - Wire `onDidReceiveNotificationResponse` to broadcast routing events for seamless notification-to-token navigation.
- **Trade-offs:**
  - Prevents OEM task termination while maintaining strict DPDP compliance and zero manual retry effort for merchants.
