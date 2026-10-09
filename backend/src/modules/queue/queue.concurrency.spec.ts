import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TokenStatus, TokenSource, TokenPriority, BranchStatus } from '@prisma/client';

describe('Queue Concurrency (Atomic Sequence & DB Constraint)', () => {
  let queueService: QueueService;

  // In-memory simulated PostgreSQL store enforcing @@unique([branchId, date, number])
  const databaseTokensStore: Map<string, any> = new Map();
  let atomicRedisDailyCounter = 0;

  beforeEach(async () => {
    databaseTokensStore.clear();
    atomicRedisDailyCounter = 0;

    const mockPrisma: any = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'branch-bengaluru-clinic-1',
          name: 'Koramangala Health Hub',
          status: BranchStatus.LIVE,
        }),
      },
      service: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'service-opd-general',
          branchId: 'branch-bengaluru-clinic-1',
          name: 'General Consultation',
          avgDurationMin: 15,
          isActive: true,
        }),
      },
      token: {
        // Enforces active token check per user
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          for (const token of databaseTokensStore.values()) {
            if (
              token.branchId === where.branchId &&
              token.customerUserId === where.customerUserId &&
              ['WAITING', 'CALLED', 'IN_SERVICE'].includes(token.status)
            ) {
              return token;
            }
          }
          return null;
        }),
        // Simulates PostgreSQL INSERT enforcing @@unique([branchId, date, number])
        create: jest.fn().mockImplementation(async ({ data }) => {
          const dateStr = data.date.toISOString().split('T')[0];
          const uniqueCompositeKey = `${data.branchId}#${dateStr}#${data.number}`;

          // If duplicate key exists, simulate PostgreSQL error code P2002
          if (databaseTokensStore.has(uniqueCompositeKey)) {
            const error: any = new Error(
              `Unique constraint failed on the fields: (\`branch_id\`,\`date\`,\`number\`)`,
            );
            error.code = 'P2002';
            error.meta = { target: ['branch_id', 'date', 'number'] };
            throw error;
          }

          const createdToken = {
            id: `tok-uuid-${Math.random().toString(36).substring(2, 9)}`,
            ...data,
            createdAt: new Date(),
            branch: {
              id: data.branchId,
              name: 'Koramangala Health Hub',
              status: BranchStatus.LIVE,
            },
            service: {
              id: data.serviceId,
              name: 'General Consultation',
              avgDurationMin: 15,
            },
          };

          databaseTokensStore.set(uniqueCompositeKey, createdToken);
          return createdToken;
        }),
        count: jest.fn().mockImplementation(async () => databaseTokensStore.size),
        findMany: jest.fn().mockImplementation(async () => Array.from(databaseTokensStore.values())),
      },
      counter: {
        count: jest.fn().mockResolvedValue(2),
      },
      queueSettings: {
        findUnique: jest.fn().mockResolvedValue({ avgServiceEmaMin: 15.0 }),
      },
    };

    const mockRedis: any = {
      // Simulates Redis single-threaded atomic Lua script INCR execution
      executeScript: jest.fn().mockImplementation(async (scriptName, keys, args) => {
        if (scriptName === 'generate_token.lua') {
          atomicRedisDailyCounter += 1;
          return atomicRedisDailyCounter;
        }
        return 1;
      }),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const mockRealtime: any = {
      emitQueueUpdate: jest.fn(),
      emitTokenCalled: jest.fn(),
      emitTokenStatus: jest.fn(),
    };

    const mockNotifications: any = {
      sendPushNotification: jest.fn(),
      notifyTokenCalled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    queueService = module.get<QueueService>(QueueService);
  });

  it('should handle 50 SIMULTANEOUS join requests with 100% unique sequential tokens and NO duplicate constraint errors', async () => {
    const branchId = 'branch-bengaluru-clinic-1';
    const serviceId = 'service-opd-general';
    const CONCURRENT_REQUESTS = 50;

    // Create 50 distinct requests from 50 different users simultaneously
    const joinPromises = Array.from({ length: CONCURRENT_REQUESTS }, (_, index) => {
      const userId = `user-citizen-${index + 1}`;
      const idempotencyKey = `idem-key-${index + 1}-${Date.now()}`;
      return queueService.joinQueue(
        branchId,
        {
          serviceId,
          customerName: `Citizen ${index + 1}`,
          priority: TokenPriority.NORMAL,
          idempotencyKey,
        },
        userId,
      );
    });

    // Execute all 50 join requests in parallel
    const results = await Promise.all(joinPromises);

    // 1. Verify all 50 requests succeeded
    expect(results.length).toBe(CONCURRENT_REQUESTS);

    // 2. Extract token numbers
    const issuedNumbers = results.map((res) => res.token.number);

    // 3. Verify that all 50 issued token numbers are strictly UNIQUE
    const uniqueNumbersSet = new Set(issuedNumbers);
    expect(uniqueNumbersSet.size).toBe(CONCURRENT_REQUESTS);

    // 4. Verify that the sequence is strictly 1 to 50 without gaps or duplicates
    const sortedNumbers = [...issuedNumbers].sort((a, b) => a - b);
    const expectedSequence = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => i + 1);
    expect(sortedNumbers).toEqual(expectedSequence);

    // 5. Verify the simulated PostgreSQL database store has exactly 50 records
    expect(databaseTokensStore.size).toBe(CONCURRENT_REQUESTS);

    // 6. Confirm that zero unique constraint violations occurred
    const databaseStoredNumbers = Array.from(databaseTokensStore.values()).map((t) => t.number);
    const sortedDbNumbers = databaseStoredNumbers.sort((a, b) => a - b);
    expect(sortedDbNumbers).toEqual(expectedSequence);
  });
});
