import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('AuthService (OTP & Rate Limiting)', () => {
  let service: AuthService;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: any;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const mockPrisma = {
      user: {
        upsert: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RedisService, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    redisService = module.get(RedisService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  describe('requestOtp - Rate Limiting Logic', () => {
    const mobile = '9876543210';

    it('should successfully issue OTP on first request and set 10-minute expiry', async () => {
      redisService.incr.mockResolvedValue(1);
      redisService.expire.mockResolvedValue(1);
      redisService.set.mockResolvedValue('OK');

      const result = await service.requestOtp(mobile);

      expect(redisService.incr).toHaveBeenCalledWith(`otp:rate:${mobile}`);
      expect(redisService.expire).toHaveBeenCalledWith(`otp:rate:${mobile}`, 600);
      expect(redisService.set).toHaveBeenCalledWith(
        `otp:code:${mobile}`,
        expect.stringMatching(/^\d{6}$/),
        300,
      );
      expect(result.success).toBe(true);
      expect(result.expiresInSec).toBe(300);
      expect(result.message).toContain('98XXXX3210');
    });

    it('should successfully issue OTP on second and third requests', async () => {
      redisService.incr.mockResolvedValue(2);
      redisService.set.mockResolvedValue('OK');

      const result2 = await service.requestOtp(mobile);
      expect(result2.success).toBe(true);

      redisService.incr.mockResolvedValue(3);
      const result3 = await service.requestOtp(mobile);
      expect(result3.success).toBe(true);
    });

    it('should throw 429 Too Many Requests when exceeding 3 requests per 10 minutes', async () => {
      redisService.incr.mockResolvedValue(4);
      redisService.ttl.mockResolvedValue(480); // 8 minutes remaining

      await expect(service.requestOtp(mobile)).rejects.toThrow(HttpException);

      try {
        await service.requestOtp(mobile);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Too many OTP requests. Maximum 3 attempts allowed');
      }

      // Redis OTP storage should not have been called on 4th attempt
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should generate pre-seeded OTP 123456 for reviewer demo account 9000000001', async () => {
      redisService.incr.mockResolvedValue(1);
      redisService.expire.mockResolvedValue(1);
      redisService.set.mockResolvedValue('OK');

      const result = await service.requestOtp('9000000001');

      expect(redisService.set).toHaveBeenCalledWith('otp:code:9000000001', '123456', 300);
      expect(result.devOtp).toBe('123456');
    });
  });

  describe('verifyOtp', () => {
    const mobile = '9876543210';
    const validOtp = '654321';

    it('should verify valid OTP, upsert user, and return JWT + Refresh Token', async () => {
      redisService.get.mockResolvedValue(validOtp);
      redisService.del.mockResolvedValue(1);

      prismaService.user.upsert.mockResolvedValue({
        id: 'user-uuid-1',
        mobile,
        name: null,
        lang: 'en',
        roles: ['CUSTOMER'],
      });

      jwtService.sign
        .mockReturnValueOnce('mock_access_token')
        .mockReturnValueOnce('mock_refresh_token');

      const result = await service.verifyOtp(mobile, validOtp);

      expect(redisService.del).toHaveBeenCalledWith(`otp:code:${mobile}`);
      expect(prismaService.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { mobile },
        }),
      );
      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe('mock_refresh_token');
      expect(result.user.mobile).toBe('98XXXX3210');
    });

    it('should throw UnauthorizedException if OTP does not match', async () => {
      redisService.get.mockResolvedValue('654321');

      await expect(service.verifyOtp(mobile, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should authenticate reviewer account using demo PIN demo1234', async () => {
      prismaService.user.upsert.mockResolvedValue({
        id: 'reviewer-uuid',
        mobile: '9000000001',
        name: 'App Store Reviewer',
        lang: 'en',
        roles: ['CUSTOMER'],
      });

      jwtService.sign
        .mockReturnValueOnce('mock_reviewer_jwt')
        .mockReturnValueOnce('mock_reviewer_refresh');

      const result = await service.verifyOtp('9000000001', 'demo1234');

      expect(result.accessToken).toBe('mock_reviewer_jwt');
      expect(result.user.mobile).toBe('90XXXX0001');
    });
  });
});
