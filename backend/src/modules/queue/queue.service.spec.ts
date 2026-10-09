import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { QueueService } from './queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TokenStatus, TokenSource, TokenPriority, BranchStatus } from '@prisma/client';

describe('QueueService (State Machine & Logic)', () => {
  let service: QueueService;
  let prisma: any;
  let redis: any;
  let realtime: any;
  let notifications: any;

  const mockBranchId = 'branch-uuid-1';
  const mockServiceId = 'service-uuid-1';

  beforeEach(async () => {
    prisma = {
      branch: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      service: {
        findFirst: jest.fn(),
      },
      token: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      counter: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      queueSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    redis = {
      executeScript: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    realtime = {
      emitQueueUpdate: jest.fn(),
      emitTokenCalled: jest.fn(),
      emitTokenStatus: jest.fn(),
      emitQueuePaused: jest.fn(),
      emitQueueResumed: jest.fn(),
    };

    notifications = {
      sendPushNotification: jest.fn(),
      notifyTokenCalled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: RealtimeService, useValue: realtime },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  describe('Skip / No-Show Logic (Auto-requeue once, then cancel)', () => {
    it('should re-queue to tail of queue on FIRST skip (skipCount = 0 -> 1, status = WAITING)', async () => {
      const activeToken = {
        id: 'token-uuid-101',
        branchId: mockBranchId,
        number: 14,
        status: TokenStatus.CALLED,
        skipCount: 0,
        calledAt: new Date(),
        calledCounterId: 'counter-1',
      };

      prisma.token.findUnique.mockResolvedValue(activeToken);
      prisma.token.findFirst.mockResolvedValue(activeToken);
      prisma.token.update.mockResolvedValue({
        ...activeToken,
        skipCount: 1,
        status: TokenStatus.WAITING,
        calledAt: null,
        calledCounterId: null,
      });

      // Mocks for snapshot
      prisma.token.findMany.mockResolvedValue([]);
      prisma.counter.count.mockResolvedValue(1);

      const result = await service.skip(mockBranchId, activeToken.id);

      expect(result.success).toBe(true);
      expect(result.action).toBe('REQUEUED_TO_TAIL');
      expect(result.skipCount).toBe(1);
      expect(prisma.token.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: activeToken.id },
          data: expect.objectContaining({
            skipCount: 1,
            status: TokenStatus.WAITING,
            calledAt: null,
            calledCounterId: null,
          }),
        }),
      );
      expect(realtime.emitTokenStatus).toHaveBeenCalledWith(
        mockBranchId,
        expect.objectContaining({
          token_id: activeToken.id,
          status: TokenStatus.WAITING,
        }),
      );
    });

    it('should permanently CANCEL token on SECOND skip (skipCount = 1 -> cancelled)', async () => {
      const skippedOnceToken = {
        id: 'token-uuid-101',
        branchId: mockBranchId,
        number: 14,
        status: TokenStatus.CALLED,
        skipCount: 1, // Already skipped once
        calledAt: new Date(),
      };

      prisma.token.findUnique.mockResolvedValue(skippedOnceToken);
      prisma.token.findFirst.mockResolvedValue(skippedOnceToken);
      prisma.token.update.mockResolvedValue({
        ...skippedOnceToken,
        status: TokenStatus.CANCELLED,
      });

      // Mocks for snapshot
      prisma.token.findMany.mockResolvedValue([]);
      prisma.counter.count.mockResolvedValue(1);

      const result = await service.skip(mockBranchId, skippedOnceToken.id);

      expect(result.success).toBe(true);
      expect(result.action).toBe('CANCELLED_AFTER_TWO_SKIPS');
      expect(result.skipCount).toBe(2);
      expect(prisma.token.update).toHaveBeenCalledWith({
        where: { id: skippedOnceToken.id },
        data: { status: TokenStatus.CANCELLED },
      });
      expect(realtime.emitTokenStatus).toHaveBeenCalledWith(
        mockBranchId,
        expect.objectContaining({
          token_id: skippedOnceToken.id,
          status: TokenStatus.CANCELLED,
        }),
      );
    });

    it('should throw NotFoundException if no active token is found to skip', async () => {
      prisma.token.findFirst.mockResolvedValue(null);

      await expect(service.skip(mockBranchId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Merchant callNext, recall, and complete', () => {
    it('should pop next WAITING token, mark CALLED, and trigger realtime + push', async () => {
      const waitingToken = {
        id: 'token-uuid-1',
        number: 12,
        branchId: mockBranchId,
        customerUserId: 'user-1',
        status: TokenStatus.WAITING,
        branch: { id: mockBranchId, name: 'Apollo Clinic' },
        service: { id: mockServiceId, name: 'General OPD' },
      };

      prisma.token.findFirst.mockResolvedValueOnce(waitingToken);
      prisma.counter.findUnique.mockResolvedValueOnce({ id: 'c-1', label: 'Doctor Cabin 1' });
      prisma.token.update.mockResolvedValueOnce({
        ...waitingToken,
        status: TokenStatus.CALLED,
        calledCounterId: 'c-1',
        calledAt: new Date(),
      });

      prisma.token.findMany.mockResolvedValue([]);
      prisma.counter.count.mockResolvedValue(1);

      const result = await service.callNext(mockBranchId, 'c-1');

      expect(result.success).toBe(true);
      expect(result.calledToken?.status).toBe(TokenStatus.CALLED);
      expect(realtime.emitTokenCalled).toHaveBeenCalledWith(
        mockBranchId,
        expect.objectContaining({
          number: 12,
          counter_label: 'Doctor Cabin 1',
        }),
      );
      expect(notifications.notifyTokenCalled).toHaveBeenCalledWith(
        expect.objectContaining({
          number: 12,
          counterLabel: 'Doctor Cabin 1',
        }),
      );
    });

    it('should complete token and recalculate EMA wait time', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const calledToken = {
        id: 'token-1',
        calledAt: tenMinutesAgo,
        createdAt: tenMinutesAgo,
        status: TokenStatus.CALLED,
      };

      prisma.token.findUnique.mockResolvedValueOnce(calledToken);
      prisma.token.findFirst.mockResolvedValueOnce(calledToken);
      prisma.token.update.mockResolvedValueOnce({
        ...calledToken,
        status: TokenStatus.COMPLETED,
        completedAt: new Date(),
      });
      prisma.queueSettings.findUnique.mockResolvedValue({ avgServiceEmaMin: 15.0 });
      prisma.queueSettings.upsert.mockResolvedValue({});
      prisma.token.findMany.mockResolvedValue([]);
      prisma.counter.count.mockResolvedValue(1);

      const result = await service.complete(mockBranchId, 'token-1');

      expect(result.success).toBe(true);
      expect(result.actualDurationMin).toBe(10);
      // EMA formula: (10 * 2/21) + (15 * 19/21) = 0.952 + 13.571 = ~14.52
      expect(result.revisedEmaMin).toBeCloseTo(14.52, 1);
    });
  });

  describe('Join Queue validation and conflict checks', () => {
    it('should reject second active token from same user with 409 Conflict', async () => {
      prisma.branch.findUnique.mockResolvedValue({
        id: mockBranchId,
        name: 'Apollo Clinic',
        status: BranchStatus.LIVE,
      });
      prisma.service.findFirst.mockResolvedValue({
        id: mockServiceId,
        branchId: mockBranchId,
        name: 'OPD',
        isActive: true,
      });

      // Existing active token found
      prisma.token.findFirst.mockResolvedValue({
        id: 'existing-token-id',
        number: 5,
        status: TokenStatus.WAITING,
      });

      await expect(
        service.joinQueue(
          mockBranchId,
          { serviceId: mockServiceId },
          'user-already-in-queue',
        ),
      ).rejects.toThrow(HttpException);

      try {
        await service.joinQueue(
          mockBranchId,
          { serviceId: mockServiceId },
          'user-already-in-queue',
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
        expect(err.getResponse().code).toBe('ERR_ACTIVE_TOKEN_EXISTS');
      }
    });
  });

  describe('Kill-Switch / Queue Pause & Resume controls', () => {
    it('should pause branch queue, persist settings, and emit realtime broadcast to waiting tokens', async () => {
      prisma.branch.update.mockResolvedValue({
        id: mockBranchId,
        status: BranchStatus.PAUSED,
      });
      prisma.queueSettings.upsert.mockResolvedValue({
        branchId: mockBranchId,
        isPaused: true,
      });
      jest.spyOn(service, 'broadcastQueueSnapshot').mockResolvedValue(undefined);

      const result = await service.pauseQueue(
        mockBranchId,
        'Power outage in sector 4. Emergency maintenance in progress.',
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe(BranchStatus.PAUSED);
      expect(prisma.branch.update).toHaveBeenCalledWith({
        where: { id: mockBranchId },
        data: { status: BranchStatus.PAUSED },
      });
      expect(prisma.queueSettings.upsert).toHaveBeenCalledWith({
        where: { branchId: mockBranchId },
        update: { isPaused: true },
        create: { branchId: mockBranchId, isPaused: true },
      });
      expect(realtime.emitQueuePaused).toHaveBeenCalledWith(
        mockBranchId,
        'Power outage in sector 4. Emergency maintenance in progress.',
      );
    });

    it('should resume branch queue, restore LIVE status, and broadcast resumption event', async () => {
      prisma.branch.update.mockResolvedValue({
        id: mockBranchId,
        status: BranchStatus.LIVE,
      });
      prisma.queueSettings.upsert.mockResolvedValue({
        branchId: mockBranchId,
        isPaused: false,
      });
      jest.spyOn(service, 'broadcastQueueSnapshot').mockResolvedValue(undefined);

      const result = await service.resumeQueue(mockBranchId);

      expect(result.success).toBe(true);
      expect(result.status).toBe(BranchStatus.LIVE);
      expect(prisma.branch.update).toHaveBeenCalledWith({
        where: { id: mockBranchId },
        data: { status: BranchStatus.LIVE },
      });
      expect(prisma.queueSettings.upsert).toHaveBeenCalledWith({
        where: { branchId: mockBranchId },
        update: { isPaused: false },
        create: { branchId: mockBranchId, isPaused: false },
      });
      expect(realtime.emitQueueResumed).toHaveBeenCalledWith(mockBranchId);
    });
  });
});
