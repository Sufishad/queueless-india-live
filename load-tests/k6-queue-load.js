import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom k6 metrics
const tokenJoinsCounter = new Counter('tokens_issued_count');
const statePollsCounter = new Counter('queue_state_polls_count');
const merchantActionsCounter = new Counter('merchant_actions_count');
const failureRate = new Rate('failed_requests_rate');
const joinDurationTrend = new Trend('join_queue_duration_ms');
const statePollDurationTrend = new Trend('state_poll_duration_ms');

// 10,000 concurrent users load simulation profile
export const options = {
  scenarios: {
    // 1. Customer User Journey: 9,000 VUs exploring, joining queues, and polling live state
    customer_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 2000 },   // Warm-up ramp
        { duration: '1m', target: 5000 },    // Mid-tier morning rush
        { duration: '2m', target: 9000 },    // Peak OPD/lunch rush (9,000 concurrent customers)
        { duration: '2m', target: 9000 },    // Sustained peak load
        { duration: '30s', target: 1000 },   // Cool-down ramp
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'customerScenario',
    },
    // 2. Merchant Operators & TV Boards: 1,000 VUs across 100 branches (calling, completing, TV polling)
    merchant_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 300 },
        { duration: '1m', target: 1000 },    // 1,000 active merchant counters & TV boards
        { duration: '3m', target: 1000 },    // Sustained operation
        { duration: '30s', target: 100 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'merchantScenario',
    },
  },
  thresholds: {
    // 95% of all requests must complete within 250ms (Indian 3G/4G target)
    http_req_duration: ['p(95)<250', 'p(99)<600'],
    // HTTP failure rate must stay strictly under 1% under peak concurrency
    'http_req_failed': ['rate<0.01'],
    'join_queue_duration_ms': ['p(95)<200'],
    'state_poll_duration_ms': ['p(95)<50'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 100 Simulated Branches distributed across Bengaluru, Mumbai, Pune
const BRANCH_IDS = Array.from({ length: 100 }, (_, i) => `branch-pilot-${String(i + 1).padStart(3, '0')}`);

export function customerScenario() {
  const vuId = __VU;
  const iteration = __ITER;
  const branchIndex = (vuId + iteration) % BRANCH_IDS.length;
  const branchId = BRANCH_IDS[branchIndex];

  // Step 1: Branch Discovery (Cached in Redis - 5m TTL)
  const discoveryRes = http.get(`${BASE_URL}/api/v1/branches?city=Bengaluru`, {
    tags: { name: 'GetDiscoveryBranches' },
  });
  check(discoveryRes, {
    'discovery status is 200': (r) => r.status === 200,
  });

  // Step 2: Poll Live Queue State Snapshot (Cached in Redis - 1s TTL)
  const pollStart = Date.now();
  const stateRes = http.get(`${BASE_URL}/api/v1/branches/${branchId}/state`, {
    tags: { name: 'GetQueueStateSnapshot' },
  });
  statePollDurationTrend.add(Date.now() - pollStart);
  statePollsCounter.add(1);

  check(stateRes, {
    'state poll status is 200': (r) => r.status === 200,
  });

  // Step 3: Join Live Queue (Every 5th iteration simulates a new customer joining)
  if (iteration % 5 === 0) {
    const idempotencyKey = `idemp-${vuId}-${iteration}-${Date.now()}`;
    const payload = JSON.stringify({
      serviceId: `srv-${branchId}-01`,
      source: 'APP',
    });

    const joinStart = Date.now();
    const joinRes = http.post(`${BASE_URL}/api/v1/branches/${branchId}/token`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'X-Forwarded-For': `10.10.${(vuId >> 8) & 255}.${vuId & 255}`,
      },
      tags: { name: 'JoinQueue' },
    });
    joinDurationTrend.add(Date.now() - joinStart);

    const isSuccess = check(joinRes, {
      'join status is 201 or 429 (rate-limited)': (r) => r.status === 201 || r.status === 429,
    });

    if (isSuccess && joinRes.status === 201) {
      tokenJoinsCounter.add(1);
      try {
        const body = JSON.parse(joinRes.body);
        const tokenId = body.token?.id || body.id;

        // Step 4: Token Polling Fallback check (simulates client waiting in queue)
        if (tokenId) {
          sleep(1);
          const tokenRes = http.get(`${BASE_URL}/api/v1/tokens/${tokenId}`, {
            tags: { name: 'GetTokenPollingFallback' },
          });
          check(tokenRes, {
            'token poll status is 200': (r) => r.status === 200,
          });
        }
      } catch (e) {
        failureRate.add(1);
      }
    } else if (joinRes.status >= 500) {
      failureRate.add(1);
    }
  }

  // Realistic user think time between poll cycles
  sleep(Math.random() * 2 + 1);
}

export function merchantScenario() {
  const vuId = __VU;
  const branchIndex = vuId % BRANCH_IDS.length;
  const branchId = BRANCH_IDS[branchIndex];
  const apiKey = `ql_live_merchant_key_branch_${String(branchIndex + 1).padStart(3, '0')}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };

  // Merchant action: Call Next Token
  const callRes = http.post(
    `${BASE_URL}/api/v1/merchant/branch/${branchId}/call-next`,
    JSON.stringify({ counterId: `counter-${branchId}-1` }),
    { headers, tags: { name: 'MerchantCallNext' } },
  );

  check(callRes, {
    'call-next status is 200 or 400 (empty queue)': (r) => r.status === 200 || r.status === 400 || r.status === 404,
  });

  merchantActionsCounter.add(1);
  sleep(5); // Average 5 seconds between merchant counter actions
}
