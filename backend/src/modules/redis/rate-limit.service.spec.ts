import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from './redis.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redisService: {
    incr: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
    getClient: jest.Mock;
  };

  beforeEach(async () => {
    redisService = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      getClient: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  it('should allow requests within limit and set TTL on first request', async () => {
    redisService.incr.mockResolvedValue(1);
    redisService.expire.mockResolvedValue(1);
    redisService.ttl.mockResolvedValue(60);

    const check = await service.checkRateLimit('test:key', 5, 60);

    expect(check.allowed).toBe(true);
    expect(check.current).toBe(1);
    expect(redisService.incr).toHaveBeenCalledWith('test:key');
    expect(redisService.expire).toHaveBeenCalledWith('test:key', 60);
  });

  it('should reject requests exceeding limit with 429 Too Many Requests', async () => {
    redisService.incr.mockResolvedValue(6);
    redisService.ttl.mockResolvedValue(45);

    await expect(
      service.enforceRateLimit('test:key', 5, 60, 'Rate limit exceeded'),
    ).rejects.toThrow(HttpException);

    try {
      await service.enforceRateLimit('test:key', 5, 60, 'Rate limit exceeded');
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toBe('Rate limit exceeded');
    }
  });
});
