import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Atomic sliding/fixed window rate limit check backed by Redis INCR + EXPIRE
   */
  async checkRateLimit(
    key: string,
    maxLimit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      const client = this.redis.getClient();
      if (!client) {
        // Fallback if Redis is unavailable during local dev
        return { allowed: true, current: 1, remaining: maxLimit - 1, retryAfterSeconds: 0 };
      }

      const count = await this.redis.incr(key);

      // On first request in window, set expiry
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      const ttl = await this.redis.ttl(key);
      const retryAfter = Math.max(1, ttl > 0 ? ttl : windowSeconds);

      if (count > maxLimit) {
        this.logger.warn(`[RateLimit] Breached for key=${key} (${count}/${maxLimit}, retryAfter=${retryAfter}s)`);
        return {
          allowed: false,
          current: count,
          remaining: 0,
          retryAfterSeconds: retryAfter,
        };
      }

      return {
        allowed: true,
        current: count,
        remaining: Math.max(0, maxLimit - count),
        retryAfterSeconds: 0,
      };
    } catch (err: any) {
      this.logger.error(`[RateLimit] Redis rate limit check error: ${err.message}. Fail open.`);
      return { allowed: true, current: 1, remaining: maxLimit, retryAfterSeconds: 0 };
    }
  }

  /**
   * Assert rate limit and throw HttpException with status 429 and Retry-After header
   */
  async enforceRateLimit(
    key: string,
    maxLimit: number,
    windowSeconds: number,
    customErrorMessage?: string,
  ): Promise<void> {
    const res = await this.checkRateLimit(key, maxLimit, windowSeconds);
    if (!res.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            customErrorMessage ||
            `Rate limit exceeded. Too many requests. Please try again in ${res.retryAfterSeconds} seconds.`,
          retryAfter: res.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
