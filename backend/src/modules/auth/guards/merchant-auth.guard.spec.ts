import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MerchantAuthGuard } from './merchant-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

describe('MerchantAuthGuard', () => {
  let guard: MerchantAuthGuard;
  let prisma: {
    merchantApiKey: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    verify: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      merchantApiKey: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      verify: jest.fn(),
    };
    guard = new MerchantAuthGuard(jwtService as unknown as JwtService, prisma as unknown as PrismaService);
  });

  function mockContext(headers: Record<string, string>): ExecutionContext {
    const request = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should authenticate with a valid active x-api-key', async () => {
    const rawKey = 'ql_live_secret12345';
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    prisma.merchantApiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      keyHash: hashedKey,
      branchId: 'branch-101',
      isActive: true,
      expiresAt: null,
      branch: { id: 'branch-101', businessId: 'biz-1' },
    });
    prisma.merchantApiKey.update.mockResolvedValue({});

    const context = mockContext({ 'x-api-key': rawKey });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(prisma.merchantApiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash: hashedKey },
      include: { branch: true },
    });
  });

  it('should authenticate with a valid JWT bearer token with MERCHANT role', async () => {
    jwtService.verify.mockReturnValue({
      userId: 'user-merchant-1',
      role: 'MERCHANT',
    });

    const context = mockContext({ authorization: 'Bearer valid.jwt.token' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token', expect.any(Object));
  });

  it('should reject request without api key and without auth header', async () => {
    const context = mockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
