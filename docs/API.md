# QueueLess India — API Specification (REST & WebSocket)

**Version:** 1.0 (Milestone 0 Foundation)  
**Base URL:** `/api/v1`  
**WebSocket URL:** `/realtime` (Socket.IO)

---

## 1. Global Conventions

### 1.1 Headers
| Header | Description | Mandatory On |
|---|---|---|
| `Content-Type` | `application/json` | All `POST`, `PUT`, `PATCH` requests |
| `Authorization` | `Bearer <JWT_TOKEN>` | Protected endpoints |
| `Idempotency-Key` | UUID v4 unique string | `POST /branches/:id/token`, merchant mutation endpoints |
| `Accept-Language` | `en`, `hi`, `mr` | Internationalized error/status messages |

### 1.2 Standard Error Response Shape
```json
{
  "statusCode": 400,
  "message": "Validation failed or error description",
  "error": "Bad Request",
  "code": "ERR_DUPLICATE_ACTIVE_TOKEN",
  "timestamp": "2026-10-09T18:30:00.000Z",
  "path": "/api/v1/branches/f81d4fae-7dec-11d0-a765-00a0c91e6bf6/token"
}
```

---

## 2. Authentication & Authorization

### 2.1 Request OTP
`POST /auth/otp/request`  
*Rate limit:* 3 attempts per 10 minutes per mobile number.

**Request Body:**
```json
{
  "mobile": "9876543210"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully to 98XXXXXX10",
  "expiresInSec": 300
}
```

### 2.2 Verify OTP
`POST /auth/otp/verify`

**Request Body:**
```json
{
  "mobile": "9876543210",
  "otp": "452819"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "e4b6c31e-4501-4475-8025-a7b6b15e4781",
    "mobile": "98XXXXXX10",
    "name": "Arjun Sharma",
    "lang": "en",
    "roles": ["CUSTOMER"]
  }
}
```

### 2.3 Refresh Token
`POST /auth/token/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

## 3. Discovery & Branch Endpoints

### 3.1 Search & List Branches
`GET /branches`  
Public endpoint for discovering nearby businesses with live queue counters.

**Query Parameters:**
- `city` (string, optional): "Bengaluru", "Mumbai", "Delhi", "Pune"
- `category` (string, optional): `clinic`, `salon`, `bank`, `govt`, `lab`, `retail`
- `q` (string, optional): Text search query
- `lat` (float, optional): Latitude for distance sorting
- `lng` (float, optional): Longitude for distance sorting
- `page` (int, default: 1)
- `limit` (int, default: 20)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
      "businessName": "Sanjeevani Health Clinic",
      "branchName": "Indiranagar 100ft Rd",
      "category": "clinic",
      "city": "Bengaluru",
      "area": "Indiranagar",
      "distanceMeters": 450,
      "isVerified": true,
      "status": "live",
      "liveStats": {
        "nowServing": 12,
        "waitingCount": 6,
        "estWaitMin": 24,
        "activeCounters": 2
      }
    }
  ],
  "meta": {
    "total": 48,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 3.2 Get Branch Details & Services
`GET /branches/:id`

**Response (200 OK):**
```json
{
  "id": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "businessName": "Sanjeevani Health Clinic",
  "name": "Indiranagar 100ft Rd",
  "category": "clinic",
  "city": "Bengaluru",
  "address": "12, 100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, 560038",
  "lat": 12.9715987,
  "lng": 77.6409823,
  "status": "live",
  "isPaused": false,
  "openHours": {
    "open": "09:00",
    "close": "20:00"
  },
  "liveStats": {
    "nowServing": 12,
    "waitingCount": 6,
    "estWaitMin": 24,
    "nextNumbers": [13, 14, 15, 16, 17, 18],
    "activeCounters": 2
  },
  "services": [
    {
      "id": "s82194ad-32bb-41fa-97f1-88df79051402",
      "name": "General Physician Consultation",
      "avgDurationMin": 15,
      "priceInr": 400.00,
      "isActive": true
    }
  ],
  "counters": [
    {
      "id": "c1a029fe-3710-482a-9e19-548174e92711",
      "label": "Counter 1",
      "staffName": "Dr. Arvind",
      "isActive": true
    }
  ]
}
```

---

## 4. Token & Customer Endpoints

### 4.1 Join Queue (Get Token)
`POST /branches/:id/token`  
*Requires Authorization.*  
*Requires Header:* `Idempotency-Key: <UUID>`

**Request Body:**
```json
{
  "serviceId": "s82194ad-32bb-41fa-97f1-88df79051402",
  "customerName": "Arjun Sharma"
}
```

**Response (201 Created):**
```json
{
  "token": {
    "id": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
    "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
    "serviceName": "General Physician Consultation",
    "date": "2026-10-09",
    "number": 19,
    "source": "app",
    "status": "WAITING",
    "positionInQueue": 7,
    "estWaitMin": 28,
    "currentServing": 12,
    "createdAt": "2026-10-09T18:35:10.000Z"
  }
}
```

**Conflict Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "You already hold an active token (#14) at this branch today.",
  "error": "Conflict",
  "code": "ERR_ACTIVE_TOKEN_EXISTS",
  "existingTokenId": "t81e2b10-82d0-3b17-87d0-401bb6d08042"
}
```

### 4.2 Get Token Status (Polling Fallback)
`GET /tokens/:id`

**Response (200 OK):**
```json
{
  "id": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "branchName": "Sanjeevani Health Clinic",
  "number": 19,
  "status": "WAITING",
  "positionInQueue": 3,
  "estWaitMin": 12,
  "nowServing": 16,
  "calledCounterLabel": null,
  "calledAt": null
}
```

### 4.3 Customer Leaves Queue (Cancel Token)
`DELETE /tokens/:id`  
*Requires Authorization.*

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token #19 cancelled successfully.",
  "status": "CANCELLED"
}
```

---

## 5. Merchant Console Endpoints

*All endpoints in this section require role `MERCHANT` or `ADMIN`.*

### 5.1 Call Next Token
`POST /merchant/branch/:id/call-next`

**Request Body:**
```json
{
  "counterId": "c1a029fe-3710-482a-9e19-548174e92711"
}
```

**Response (200 OK):**
```json
{
  "calledToken": {
    "id": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
    "number": 14,
    "counterLabel": "Counter 1",
    "customerName": "Ramesh Gupta",
    "serviceName": "General Physician Consultation",
    "status": "CALLED",
    "calledAt": "2026-10-09T18:40:00.000Z"
  },
  "remainingWaiting": 5
}
```
*Note: If waiting queue is empty, returns 200 with `calledToken: null` without error.*

### 5.2 Recall Token (Re-announce)
`POST /merchant/branch/:id/recall`

**Request Body:**
```json
{
  "tokenId": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
  "counterId": "c1a029fe-3710-482a-9e19-548174e92711"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "recalledAt": "2026-10-09T18:42:00.000Z"
}
```

### 5.3 Complete Service
`POST /merchant/branch/:id/complete`

**Request Body:**
```json
{
  "tokenId": "t91f3a21-93e1-4c28-98e1-512aa7e09153"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": {
    "id": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
    "number": 14,
    "status": "COMPLETED",
    "durationMinutes": 14,
    "completedAt": "2026-10-09T18:54:00.000Z"
  },
  "revisedBranchEmaMin": 14.8
}
```

### 5.4 Skip Token (No-Show Flow)
`POST /merchant/branch/:id/skip`

**Request Body:**
```json
{
  "tokenId": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
  "reason": "Customer not present at counter"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "tokenId": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
  "actionTaken": "REQUEUED_TO_TAIL",
  "newSkipCount": 1,
  "message": "Token requeued to tail once. Next skip will cancel."
}
```
*(If `skip_count` was already 1, `actionTaken` will be `"CANCELLED"`).*

### 5.5 Walk-in Token (1-Tap Generation)
`POST /merchant/branch/:id/walkin`

**Request Body:**
```json
{
  "serviceId": "s82194ad-32bb-41fa-97f1-88df79051402",
  "label": "Walk-in Senior"
}
```

**Response (201 Created):**
```json
{
  "token": {
    "id": "w12e98fa-10b2-4d99-a991-88ef902b1109",
    "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
    "number": 20,
    "source": "walkin",
    "status": "WAITING",
    "positionInQueue": 6,
    "estWaitMin": 24,
    "slipPrintUrl": "/api/v1/tokens/w12e98fa-10b2-4d99-a991-88ef902b1109/slip",
    "createdAt": "2026-10-09T18:45:00.000Z"
  }
}
```

### 5.6 Pause / Resume Queue
`POST /merchant/branch/:id/pause`  
`POST /merchant/branch/:id/resume`

**Response (200 OK):**
```json
{
  "success": true,
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "isPaused": true
}
```

### 5.7 Merchant Heartbeat
`POST /merchant/branch/:id/heartbeat`

**Request Body:**
```json
{
  "counterId": "c1a029fe-3710-482a-9e19-548174e92711"
}
```

**Response (200 OK):**
```json
{
  "status": "acknowledged",
  "timestamp": "2026-10-09T18:45:30.000Z"
}
```

---

## 6. WebSocket Protocol (Socket.IO)

Connection endpoint: `/realtime`  
Transport options: `['websocket', 'polling']`

### 6.1 Client $\to$ Server Invocations

#### Subscribe to Branch Room
```json
// Event: "branch:subscribe"
{
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101"
}
```

#### Unsubscribe from Branch Room
```json
// Event: "branch:unsubscribe"
{
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101"
}
```

#### Merchant Live Heartbeat
```json
// Event: "merchant:heartbeat"
{
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "counterId": "c1a029fe-3710-482a-9e19-548174e92711"
}
```

### 6.2 Server $\to$ Client Broadcasts (Room: `branch:{branchId}`)

#### Queue Update Broadcast
```json
// Event: "queue:update"
{
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "serving": {
    "number": 14,
    "counterLabel": "Counter 1",
    "staffName": "Dr. Arvind"
  },
  "waitingCount": 5,
  "estWaitMin": 20,
  "nextNumbers": [15, 16, 17, 18, 19],
  "isPaused": false,
  "updatedAt": "2026-10-09T18:40:00.000Z"
}
```

#### Token Called Event
```json
// Event: "token:called"
{
  "tokenId": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "branchName": "Sanjeevani Health Clinic",
  "number": 14,
  "counterLabel": "Counter 1",
  "customerUserId": "e4b6c31e-4501-4475-8025-a7b6b15e4781",
  "calledAt": "2026-10-09T18:40:00.000Z"
}
```

#### Individual Token Status Change
```json
// Event: "token:status"
{
  "tokenId": "t91f3a21-93e1-4c28-98e1-512aa7e09153",
  "status": "COMPLETED",
  "timestamp": "2026-10-09T18:54:00.000Z"
}
```

#### Queue Paused / Resumed
```json
// Event: "queue:paused"
{
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101",
  "reason": "heartbeat_timeout", // or "merchant_manual"
  "message": "Queue temporarily paused. Your spot is preserved."
}
```
```json
// Event: "queue:resumed"
{
  "branchId": "b1f0928e-8db2-4d22-b5e0-3eef591d3101"
}
```

---

## 7. SSE Fallback Channel

For environments where WebSockets are blocked:
`GET /api/v1/branches/:id/stream`  
`Content-Type: text/event-stream`

Streams the identical payloads formatted as SSE events:
```
event: queue:update
data: {"branchId":"...","serving":{"number":14},"waitingCount":5,...}

event: token:called
data: {"tokenId":"...","number":14,"counterLabel":"Counter 1",...}
```

---

## 8. Compliance & Account Deletion (DPDP Act 2023)

### 8.1 Delete User Account & Anonymize Data
`POST /user/delete-account`  
*Requires Authorization.*

**Request Body:**
```json
{
  "confirm": true,
  "reason": "User request for data erasure"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All personal identifiers permanently erased in accordance with DPDP Act 2023.",
  "deletedAt": "2026-10-09T18:55:00.000Z"
}
```
