import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TokenStatus } from '@prisma/client';
import { SanitizeLogsInterceptor } from '../../common/interceptors/sanitize-logs.interceptor';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * DPDP Act 2023 Section 12: Right to Erasure
   * Permanently deletes user PII, cancels active tokens, and anonymizes history.
   */
  async deleteAccount(userId: string): Promise<{ success: boolean; message: string; erasedAt: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const maskedPhone = SanitizeLogsInterceptor.maskPhoneNumber(user.mobile);
    this.logger.log(`Executing DPDP Right to Erasure for user ${maskedPhone} (${user.id})`);

    // 1. Cancel any active tokens held by this user
    await this.prisma.token.updateMany({
      where: {
        customerUserId: userId,
        status: { in: [TokenStatus.WAITING, TokenStatus.CALLED] },
      },
      data: {
        status: TokenStatus.CANCELLED,
      },
    });

    // 2. Anonymize historical tokens (sever PII link)
    await this.prisma.token.updateMany({
      where: { customerUserId: userId },
      data: { customerUserId: null },
    });

    // 3. Delete notification records
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // 4. Invalidate all Redis sessions / cached tokens for this user
    try {
      const keys = await this.redis.getClient().keys(`*:${userId}`);
      if (keys.length > 0) {
        await this.redis.getClient().del(...keys);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to clear Redis keys for user ${userId}: ${err.message}`);
    }

    // 5. Delete or sanitize user profile
    await this.prisma.user.delete({
      where: { id: userId },
    });

    this.logger.log(`Successfully completed DPDP erasure for ${maskedPhone}`);

    return {
      success: true,
      message: 'Your account and personal data have been completely erased under DPDP Act 2023.',
      erasedAt: new Date().toISOString(),
    };
  }
}
