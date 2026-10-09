import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyService } from './privacy.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('PrivacyService (DPDP Section 12 Right to Erasure)', () => {
  let service: PrivacyService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      token: {
        updateMany: jest.fn(),
      },
      notification: {
        deleteMany: jest.fn(),
      },
    };

    redis = {
      getClient: jest.fn().mockReturnValue({
        keys: jest.fn().mockResolvedValue(['jwt:token:user-1']),
        del: jest.fn().mockResolvedValue(1),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
  });

  it('should throw NotFoundException if user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.deleteAccount('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should cancel active tokens, sever historical token PII, and delete user under DPDP Act', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr-123',
      mobile: '9876543210',
      name: 'Rohan Sharma',
    });

    prisma.token.updateMany.mockResolvedValue({ count: 2 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 5 });
    prisma.user.delete.mockResolvedValue({ id: 'usr-123' });

    const result = await service.deleteAccount('usr-123');

    expect(result.success).toBe(true);
    expect(result.message).toContain('DPDP Act 2023');

    // 1. Check active tokens cancelled
    expect(prisma.token.updateMany).toHaveBeenCalledWith({
      where: {
        customerUserId: 'usr-123',
        status: { in: ['WAITING', 'CALLED'] },
      },
      data: { status: 'CANCELLED' },
    });

    // 2. Check historical tokens anonymized
    expect(prisma.token.updateMany).toHaveBeenCalledWith({
      where: { customerUserId: 'usr-123' },
      data: { customerUserId: null },
    });

    // 3. Check notifications deleted
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'usr-123' },
    });

    // 4. Check user profile deleted
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'usr-123' },
    });
  });
});
