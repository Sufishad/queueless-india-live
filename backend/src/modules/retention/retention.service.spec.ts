import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from './retention.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RetentionService (DPDP Compliance & Nightly Archival)', () => {
  let service: RetentionService;
  let prisma: {
    token: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    dailyQueueStats: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      token: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      dailyQueueStats: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
  });

  it('should archive completed/cancelled tokens older than 30 days and delete them', async () => {
    const fakeBranchDate = { branchId: 'branch-blr-1', date: new Date('2026-08-01') };
    const fakeDayTokens = [
      {
        status: 'COMPLETED',
        createdAt: new Date('2026-08-01T10:00:00Z'),
        calledAt: new Date('2026-08-01T10:15:00Z'),
        completedAt: new Date('2026-08-01T10:25:00Z'),
      },
      {
        status: 'CANCELLED',
        createdAt: new Date('2026-08-01T11:00:00Z'),
        calledAt: null,
        completedAt: null,
      },
    ];

    prisma.token.findMany
      .mockResolvedValueOnce([fakeBranchDate])
      .mockResolvedValueOnce(fakeDayTokens);

    prisma.dailyQueueStats.upsert.mockResolvedValue({ id: 'stat-1' });
    prisma.token.deleteMany.mockResolvedValue({ count: 150 });
    prisma.token.updateMany.mockResolvedValue({ count: 35 });

    const result = await service.runDataRetentionCycle(30);

    expect(result.archivedDaysCount).toBe(1);
    expect(result.deletedTokensCount).toBe(150);
    expect(result.anonymizedTokensCount).toBe(35);
    expect(prisma.dailyQueueStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          branchId: 'branch-blr-1',
          totalIssued: 2,
          totalServed: 1,
          totalCancelled: 1,
        }),
      }),
    );
    expect(prisma.token.deleteMany).toHaveBeenCalled();
    expect(prisma.token.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          customerUserId: null,
        },
      }),
    );
  });
});
