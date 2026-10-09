import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TokenStatus } from '@prisma/client';

export interface RetentionCycleResult {
  deletedTokensCount: number;
  anonymizedTokensCount: number;
  archivedDaysCount: number;
  executedAt: string;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily retention & DPDP compliance cron job
   * Runs every night at 02:00 IST (UTC 20:30)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyRetentionCron(): Promise<RetentionCycleResult> {
    this.logger.log('[Retention] Starting scheduled DPDP data retention & archiving cycle...');
    return this.runDataRetentionCycle(30);
  }

  /**
   * Executes data retention & purge cycle:
   * 1. Archives daily stats for all closed dates prior to cutoff
   * 2. Deletes COMPLETED and CANCELLED tokens older than retentionDays (default 30 days)
   * 3. Anonymizes customerUserId in remaining old tokens (DPDP Act right to erasure)
   */
  async runDataRetentionCycle(retentionDays = 30): Promise<RetentionCycleResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    cutoffDate.setHours(0, 0, 0, 0);

    this.logger.log(`[Retention] Executing purge cycle with cutoff: ${cutoffDate.toISOString()}`);

    // 1. Archive daily queue statistics before purging
    const archivedDaysCount = await this.archiveDailyQueueStats(cutoffDate);

    // 2. Delete COMPLETED / CANCELLED tokens older than cutoff
    const deleteResult = await this.prisma.token.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: [TokenStatus.COMPLETED, TokenStatus.CANCELLED, TokenStatus.NO_SHOW] },
      },
    });

    // 3. Anonymize customer_user_id in remaining tokens older than cutoff (Right to Erasure)
    const anonymizeResult = await this.prisma.token.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        customerUserId: { not: null },
      },
      data: {
        customerUserId: null,
      },
    });

    const result: RetentionCycleResult = {
      deletedTokensCount: deleteResult.count,
      anonymizedTokensCount: anonymizeResult.count,
      archivedDaysCount,
      executedAt: new Date().toISOString(),
    };

    this.logger.log(
      `[Retention] Completed: deleted ${result.deletedTokensCount} tokens, ` +
        `anonymized ${result.anonymizedTokensCount} PII references, ` +
        `archived ${result.archivedDaysCount} branch-days.`,
    );

    return result;
  }

  /**
   * Aggregates completed day metrics and archives them to daily_queue_stats table
   */
  async archiveDailyQueueStats(beforeDate: Date): Promise<number> {
    // Find unique branch + date combinations for tokens prior to beforeDate
    const branchDates = await this.prisma.token.findMany({
      where: {
        createdAt: { lt: beforeDate },
      },
      select: {
        branchId: true,
        date: true,
      },
      distinct: ['branchId', 'date'],
    });

    let archivedCount = 0;

    for (const record of branchDates) {
      const tokensForDay = await this.prisma.token.findMany({
        where: {
          branchId: record.branchId,
          date: record.date,
        },
        select: {
          status: true,
          calledAt: true,
          completedAt: true,
          createdAt: true,
        },
      });

      if (tokensForDay.length === 0) continue;

      const totalIssued = tokensForDay.length;
      const totalServed = tokensForDay.filter((t) => t.status === TokenStatus.COMPLETED).length;
      const totalCancelled = tokensForDay.filter((t) => t.status === TokenStatus.CANCELLED).length;
      const totalNoShow = tokensForDay.filter((t) => t.status === TokenStatus.NO_SHOW).length;

      // Calculate average wait time (minutes from created to called)
      const waitTimes: number[] = [];
      const serviceTimes: number[] = [];

      for (const t of tokensForDay) {
        if (t.calledAt && t.createdAt) {
          const waitMin = Math.max(0, (t.calledAt.getTime() - t.createdAt.getTime()) / 60000);
          waitTimes.push(waitMin);
        }
        if (t.completedAt && t.calledAt) {
          const serviceMin = Math.max(0, (t.completedAt.getTime() - t.calledAt.getTime()) / 60000);
          serviceTimes.push(serviceMin);
        }
      }

      const avgWaitMin = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
      const avgServiceMin = serviceTimes.length > 0 ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0;

      await this.prisma.dailyQueueStats.upsert({
        where: {
          branch_date_stats_unique: {
            branchId: record.branchId,
            date: record.date,
          },
        },
        create: {
          branchId: record.branchId,
          date: record.date,
          totalIssued,
          totalServed,
          totalCancelled,
          totalNoShow,
          avgWaitMin: Math.round(avgWaitMin * 10) / 10,
          avgServiceMin: Math.round(avgServiceMin * 10) / 10,
        },
        update: {
          totalIssued,
          totalServed,
          totalCancelled,
          totalNoShow,
          avgWaitMin: Math.round(avgWaitMin * 10) / 10,
          avgServiceMin: Math.round(avgServiceMin * 10) / 10,
        },
      });

      archivedCount++;
    }

    return archivedCount;
  }
}
