import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SanitizeLogsInterceptor } from '../../common/interceptors/sanitize-logs.interceptor';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Reviewer demo credentials per Section 11 of Master Spec
  private readonly REVIEWER_MOBILE = '9000000001';
  private readonly REVIEWER_PIN = 'demo1234';
  private readonly REVIEWER_OTP = '123456';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Request OTP for a given 10-digit mobile number.
   * Rate limited to 3 requests per 10 minutes (600 seconds).
   * OTP stored in Redis with 5 minutes (300 seconds) TTL.
   */
  async requestOtp(mobile: string): Promise<{ success: boolean; message: string; expiresInSec: number; devOtp?: string }> {
    const rateLimitKey = `otp:rate:${mobile}`;
    const otpCodeKey = `otp:code:${mobile}`;

    // 1. Rate limit check (3 requests per 10 minutes)
    const attempts = await this.redisService.incr(rateLimitKey);
    if (attempts === 1) {
      await this.redisService.expire(rateLimitKey, 600);
    }

    if (attempts > 3) {
      const ttl = await this.redisService.ttl(rateLimitKey);
      const remainingMinutes = Math.max(1, Math.ceil(ttl / 60));
      this.logger.warn(`OTP rate limit exceeded for ${SanitizeLogsInterceptor.maskPhoneNumber(mobile)}`);
      throw new HttpException(
        `Too many OTP requests. Maximum 3 attempts allowed. Please retry after ${remainingMinutes} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Generate 6-digit OTP
    let otp: string;
    if (mobile === this.REVIEWER_MOBILE) {
      otp = this.REVIEWER_OTP;
    } else {
      otp = crypto.randomInt(100000, 1000000).toString();
    }

    // 3. Store OTP in Redis with 5-minute TTL (300 seconds)
    await this.redisService.set(otpCodeKey, otp, 300);

    const maskedMobile = SanitizeLogsInterceptor.maskPhoneNumber(mobile);
    this.logger.log(`OTP generated successfully for ${maskedMobile} (Attempt ${attempts}/3)`);

    const response: { success: boolean; message: string; expiresInSec: number; devOtp?: string } = {
      success: true,
      message: `OTP sent successfully to ${maskedMobile}`,
      expiresInSec: 300,
    };

    // Include devOtp when in non-production environment for local/staging developer velocity
    if (process.env.NODE_ENV !== 'production') {
      response.devOtp = otp;
    }

    return response;
  }

  /**
   * Verify OTP and issue JWT (24h) + Refresh Token (7d).
   * Upserts the user record in PostgreSQL via Prisma.
   */
  async verifyOtp(mobile: string, otp: string) {
    const otpCodeKey = `otp:code:${mobile}`;

    // 1. Check Reviewer demo account bypass
    const isReviewer =
      mobile === this.REVIEWER_MOBILE &&
      (otp === this.REVIEWER_PIN || otp === this.REVIEWER_OTP);

    if (!isReviewer) {
      const storedOtp = await this.redisService.get(otpCodeKey);
      if (!storedOtp || storedOtp !== otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Consume OTP on successful verification
      await this.redisService.del(otpCodeKey);
    }

    // 2. Upsert User in PostgreSQL
    const user = await this.prisma.user.upsert({
      where: { mobile },
      update: { lastSeenAt: new Date() },
      create: {
        mobile,
        roles: ['CUSTOMER'],
        lang: 'en',
        lastSeenAt: new Date(),
      },
    });

    // 3. Generate JWT tokens
    const payload = {
      sub: user.id,
      mobile: user.mobile,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    this.logger.log(
      `User ${SanitizeLogsInterceptor.maskPhoneNumber(user.mobile)} authenticated successfully (User ID: ${user.id})`,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        mobile: SanitizeLogsInterceptor.maskPhoneNumber(user.mobile),
        name: user.name,
        lang: user.lang,
        roles: user.roles,
      },
    };
  }

  /**
   * Refresh expired access token using valid refresh token.
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newPayload = {
        sub: payload.sub,
        mobile: payload.mobile,
        roles: payload.roles,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '24h' });
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
