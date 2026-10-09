# QueueLess India — System Architecture Document

**Version:** 1.0 (Milestone 0 Foundation)  
**Target Market:** India (Bengaluru, Mumbai, Delhi, Pune)  
**Tagline:** *"Line mein nahi, time par"*

---

## 1. System Overview

QueueLess India is a digital queue and live-token management platform engineered for Indian market constraints: low-end Android smartphones (Android 8+, 2GB RAM), volatile 2G/3G wireless networks, zero-hardware merchant operations, and regulatory compliance under the Digital Personal Data Protection (DPDP) Act 2023.

The platform eliminates physical waiting queues across outpatient clinics, salons, bank branches, government desks (RTO), and diagnostic labs. It provides:
1. **Server-Authoritative Realtime State:** Duplication-proof, atomic token issuance.
2. **Multi-Tier Realtime Distribution:** Socket.IO WebSocket with automatic Server-Sent Events (SSE) and adaptive polling fallbacks.
3. **High-Contrast Digital Signage:** TV mode operating on merchant web/mobile browsers without dedicated appliances.
4. **Resilient Background Calling:** High-priority push notifications integrated with Android Alarm audio channels and bilingual on-device text-to-speech (`hi-IN` and `en-IN`).

---

## 2. High-Level Architecture Diagram

```
                             ┌────────────────────────────────────────────────────────┐
                             │                     CLIENT SURFACES                    │
                             │  • Flutter Mobile App (Customer + Merchant Mode)       │
                             │  • Flutter Fullscreen TV Calling Board (43" Display)  │
                             │  • React + Vite Admin Dashboard (Web)                  │
                             └───────────────────────────┬────────────────────────────┘
                                                         │ HTTPS (TLS 1.3) / WSS
                                                         ▼
                             ┌────────────────────────────────────────────────────────┐
                             │              REVERSE PROXY / EDGE GATEWAY              │
                             │  - Rate Limiting (Mobile OTP & Token endpoints)        │
                             │  - TLS Termination & Brotli/Gzip Compression           │
                             │  - Log Masking Proxy (DPDP Sanitization)               │
                             └───────────────────────────┬────────────────────────────┘
                                                         │
                                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             NESTJS BACKEND CLUSTER (Node.js + TS)                                         │
│                                                                                                                           │
│ ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────────────────────────────────┐ │
│ │        REST API           │   │     WEBSOCKET GATEWAY     │   │                    QUEUE ENGINE                       │ │
│ │  - /api/v1/auth           │   │    (Socket.IO Server)     │   │  - Atomic Sequence Generator (Redis Lua Script)       │ │
│ │  - /api/v1/branches       │   │  - Room: `branch:{id}`    │   │  - EMA Wait-Time Estimator                            │ │
│ │  - /api/v1/tokens         │   │  - Heartbeat monitor      │   │  - Lifecycle State Machine Engine                     │ │
│ │  - /api/v1/merchant       │   │  - Fallback: SSE & Poll   │   │  - Merchant Inactivity Circuit Breaker (5 min timeout)│ │
│ │  - /api/v1/admin          │   │                           │   │  - No-show Re-queue Orchestrator (1x max)             │ │
│ └─────────────┬─────────────┘   └─────────────▲─────────────┘   └───────────────────────────┬───────────────────────────┘ │
└───────────────┼───────────────────────────────┼─────────────────────────────────────────────┼─────────────────────────────┘
                │                               │                                             │
                ▼                               ▼                                             ▼
┌─────────────────────────────────┐ ┌───────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│        POSTGRESQL 15+           │ │                 REDIS 7+                  │ │              EXTERNAL SERVICES          │
│       (System of Record)        │ │           (Hot Path & Pub/Sub)            │ │                                         │
│  - Relational Models            │ │  - Atomic Counters (`counter:...`)        │ │  - Firebase Cloud Messaging (FCM v1)    │
│  - Historical Durability        │ │  - Waiting Queue Lists (`queue:...`)      │ │  - SMS Gateway (MSG91 / Gupshup)        │
│  - Strict Unique Constraints    │ │  - Heartbeat Hashes (`merchant:hb:...`)   │ │  - Mappls Geocoding & Nearby Search     │
│  - DPDP Data Deletion Engine    │ │  - Pub/Sub Channel (`channel:branch:...`) │ │  - Native Android Text-to-Speech Engine │
│  - AOF Persistence Guaranteed   │ │  - AOF `everysec` + Snapshot Durability   │ │  - Razorpay SDK (v1.5 Payments)         │
└─────────────────────────────────┘ └───────────────────────────────────────────┘ └─────────────────────────────────────────┘
```

---

## 3. Core Modules & Responsibilities

### 3.1 Backend (NestJS + TypeScript)
- **`AuthModule`:** Mobile OTP authentication flow (3 requests per 10 minutes limit, 6-digit cryptographic OTP, 5-minute expiry). Issues short-lived JWTs ($\le 24$ hours) with rotating refresh tokens.
- **`BranchModule`:** Geolocation-indexed discovery (Mappls / PostgreSQL postGIS coordinates), branch profile retrieval, operating hours validation, and live queue status snapshots.
- **`QueueModule`:** The core state machine and sequence generator. Executes atomic Redis Lua scripts to generate incremental token numbers per IST calendar day and synchronizes with PostgreSQL transactions. Calculates Exponential Moving Average (EMA) wait times.
- **`TokenModule`:** Handles customer join operations with mandatory idempotency keys (`Idempotency-Key` header). Enforces branch concurrency constraints (maximum 1 active token per branch per user per day).
- **`MerchantModule`:** Operations console: `call-next`, `recall`, `complete`, `skip` (no-show), `pause`, `resume`, and one-tap `walkin` tokens. Manages counters and services configurations.
- **`RealtimeModule`:** Socket.IO gateway handling room subscriptions (`branch:{id}`), client connection health, fallback SSE stream, and Redis Pub/Sub broadcast distribution.
- **`NotificationsModule`:** Direct integration with Firebase Cloud Messaging (FCM HTTP v1) sending high-priority data payloads targeted at Android notification channels configured for alarm audio playback.
- **`AdminModule`:** Platform health, compliance auditing, merchant verification flag management, and emergency branch kill switches.

### 3.2 Mobile Client (Flutter Monorepo)
A single Flutter codebase running on Android 8.0+ (API 26+) and iOS, maintaining a compiled Android App Bundle (AAB) size $< 15\text{ MB}$.
- **Customer Surface:** Public discovery without forced login $\to$ OTP verification $\to$ service selection $\to$ ticket view $\to$ live 4-step progress tracker $\to$ background calling alert.
- **Merchant Surface:** Counter selection $\to$ Calling Board with one-touch controls $\to$ 1-tap walk-in generation with large-numeral receipt display $\to$ branch pause/resume controls.
- **TV Display Mode:** Landscape presentation layout with high-contrast JetBrains Mono numerals legible on 43" displays from 5 meters away.

### 3.3 Admin Dashboard (React + Vite)
Responsive single-page web application providing operational observability, KYC/GST/DataSafe compliance review, and real-time branch status overrides.

---

## 4. Queue State Machine & Engine Mechanics

### 4.1 Token Lifecycle State Transitions

```
                    ┌─────────────┐
                    │   WAITING   │◄──────────────┐ (Auto-requeue once: skip_count = 1)
                    └──────┬──────┘               │
                           │                      │
                  call-next│                      │
                           ▼                      │
  ┌─────────────┐   ┌─────────────┐   skip (1st)  │
  │  CANCELLED  │   │   CALLED    ├───────────────┘
  └─────────────┘   └──────┬──────┘
         ▲                 │
         │ customer leaves │ merchant starts service
         │ or skip (2nd)   ▼
         │          ┌─────────────┐
         └──────────┤ IN_SERVICE  │
                    └──────┬──────┘
                           │
                  complete │
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │
                    └─────────────┘
```

1. **`WAITING`:** Token issued and added to the chronological waiting list.
2. **`CALLED`:** Popped by counter staff. Broadcasts `token:called` event and dispatches high-priority push notification.
3. **`IN_SERVICE`:** Citizen is physically at the counter; service is underway.
4. **`COMPLETED`:** Service finished. Duration recorded to update the branch service EMA.
5. **`NO_SHOW` $\to$ Re-queue:** If citizen fails to appear, merchant skips. If `skip_count == 0`, token is placed at the tail of the `WAITING` queue with `skip_count = 1`. If `skip_count >= 1`, token transitions permanently to `CANCELLED`.
6. **`CANCELLED`:** Customer leaves voluntarily, or token is terminated after repeated no-shows.

### 4.2 Sequence Number Generation (Atomicity & Durability)
Duplicate token numbers within the same branch on the same calendar day represent a critical failure (P0).
- Sequence numbers restart at `1` at midnight Indian Standard Time (`Asia/Kolkata`, UTC+05:30).
- **Redis Atomic Key:** `counter:branch:{branchId}:{YYYY-MM-DD}`
- An atomic Redis Lua script executes the sequence increment and queue addition:
  ```lua
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
      redis.call('EXPIRE', KEYS[1], 172800) -- 48 hours TTL
  end
  redis.call('RPUSH', KEYS[2], ARGV[1]) -- Token ID pushed to waiting list
  return current
  ```
- **PostgreSQL Durability:** The generated number is committed in the same API transaction. PostgreSQL enforces a composite unique constraint: `UNIQUE(branch_id, date, number)`.

### 4.3 Estimated Wait Time Calculation
$$\text{est\_wait\_min} = \left\lceil \frac{\text{position\_in\_queue} \times \text{avg\_service\_ema\_min}}{\max(1, \text{active\_counter\_count})} \right\rceil$$

Where:
- $\text{position\_in\_queue}$: 1-based index of the token in the `WAITING` state for the branch.
- $\text{active\_counter\_count}$: Number of counters currently marked active with recent heartbeat.
- $\text{avg\_service\_ema\_min}$: Exponential Moving Average computed across the last 20 completed tokens:
  $$\text{EMA}_t = \alpha \times \text{Duration}_t + (1 - \alpha) \times \text{EMA}_{t-1} \quad (\alpha = 0.1)$$
  Seeded initially from `Service.avg_duration_min`.

### 4.4 Merchant Heartbeat & Inactivity Circuit Breaker
- Merchant console emits `merchant:heartbeat` every 60 seconds.
- Backend tracks `QueueSettings.last_heartbeat_at`.
- A background worker scans for active branches with no heartbeat for $\ge 300\text{ seconds}$ (5 minutes) during open hours.
- If triggered:
  1. Branch status switches to `paused`.
  2. `queue:paused` event broadcasted via WebSocket room and FCM.
  3. Waiting customers receive alert: *"Queue paused due to temporary counter inactivity. Your slot is preserved."*

---

## 5. Network Resilience & Realtime Fallback Strategy

To guarantee reliable operation on 2G/3G connections in Indian tier-2/tier-3 cities:

```
┌────────────────────────────────────────────────────────┐
│              1. WEBSOCKET (WSS - Socket.IO)            │
│  - Target: p95 latency < 500ms                         │
│  - Transports: ['websocket']                           │
└──────────────────────────┬─────────────────────────────┘
                           │ On transport failure or timeout
                           ▼
┌────────────────────────────────────────────────────────┐
│           2. SERVER-SENT EVENTS (SSE Fallback)         │
│  - HTTP persistent text/event-stream connection        │
│  - Low header overhead, firewall-friendly              │
└──────────────────────────┬─────────────────────────────┘
                           │ On network drop or 3G throttling
                           ▼
┌────────────────────────────────────────────────────────┐
│            3. ADAPTIVE SHORT POLLING (REST)            │
│  - Interval: 15s (active token) / 30s (discovery)      │
│  - GET /tokens/:id with ETag support                   │
└────────────────────────────────────────────────────────┘
```

- **Reconnection Protocol:** On network restoration, the client executes a single snapshot query (`GET /branches/:id`) to reconcile full state rather than replaying missed historical events.
- **UI Connectivity Indicator:** Real-time visual badge (`LIVE` in Emerald `#10B981` vs `RECONNECTING` in Amber `#FBBF24`).

---

## 6. Calling Alert & Audio Pipeline

The calling alert is the critical interaction loop:
1. **Merchant Action:** Merchant taps **Call Next**.
2. **WebSocket & FCM Dispatch:** Backend emits `token:called` over WebSocket and sends high-priority FCM payload simultaneously.
3. **Android Audio Channel:** Notification configured on the Android Alarm Stream (`AudioAttributes.USAGE_ALARM`), triggering sound playback even if the device is set to silent or vibration mode (subject to OS permissions).
4. **Bilingual Text-to-Speech:** Device-native TTS engine generates sequential audio:
   - Hindi: *"टोकन नंबर [X], काउंटर नंबर [Y] पर आएं"*
   - English: *"Token number [X], please proceed to Counter [Y]"*
5. **Acknowledgment Window:** If unacknowledged within 3 minutes, the merchant UI displays a "No response" indicator.

---

## 7. Security & Compliance (DPDP Act 2023)

1. **Data Minimization:** Only mobile number and optional name collected for queue tokens.
2. **Log Sanitization:** All server logs scrub personal identifiers. Mobile numbers are masked via custom logging interceptors:
   $$\text{9876543210} \implies \text{98XXXXXX10}$$
3. **Right to Erasure:** Complete automated data deletion endpoint (`POST /api/v1/user/delete-account`) permanently purges or anonymizes user records.
4. **Reviewer Demo Sandbox:** Pre-seeded reviewer account (`9000000001` / `demo1234`) with self-advancing virtual queue enables full Play Store review testing in under 60 seconds.
