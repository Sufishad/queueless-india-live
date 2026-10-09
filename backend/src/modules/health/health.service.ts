import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
  };
}

export interface ReadyStatus {
  ready: boolean;
  timestamp: string;
  queueEngine: 'operational' | 'disabled';
  database: 'ready' | 'not_ready';
  redis: 'ready' | 'not_ready';
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Liveness probe (GET /healthz):
   * Verifies Postgres and Redis socket responsiveness
   */
  async checkHealth(): Promise<HealthStatus> {
    const dbStart = Date.now();
    let dbStatus: 'up' | 'down' = 'up';
    let dbError: string | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e: any) {
      dbStatus = 'down';
      dbError = e.message;
      this.logger.error(`[HealthCheck] Database check failed: ${e.message}`);
    }
    const dbLatencyMs = Date.now() - dbStart;

    const redisStart = Date.now();
    let redisStatus: 'up' | 'down' = 'up';
    let redisError: string | undefined;

    try {
      const client = this.redis.getClient();
      if (client) {
        const ping = await client.ping();
        if (ping !== 'PONG') {
          redisStatus = 'down';
          redisError = `Unexpected PING response: ${ping}`;
        }
      } else {
        redisStatus = 'down';
        redisError = 'Redis client uninitialized';
      }
    } catch (e: any) {
      redisStatus = 'down';
      redisError = e.message;
      this.logger.error(`[HealthCheck] Redis check failed: ${e.message}`);
    }
    const redisLatencyMs = Date.now() - redisStart;

    const overallStatus: 'ok' | 'degraded' | 'down' =
      dbStatus === 'up' && redisStatus === 'up'
        ? 'ok'
        : dbStatus === 'up' || redisStatus === 'up'
          ? 'degraded'
          : 'down';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
          ...(redisError ? { error: redisError } : {}),
        },
      },
    };
  }

  /**
   * Readiness probe (GET /readyz):
   * Confirms queue state authority and connection pools are ready to serve incoming traffic
   */
  async checkReadiness(): Promise<ReadyStatus> {
    const health = await this.checkHealth();
    const ready =
      health.checks.database.status === 'up' && health.checks.redis.status === 'up';

    return {
      ready,
      timestamp: new Date().toISOString(),
      queueEngine: ready ? 'operational' : 'disabled',
      database: health.checks.database.status === 'up' ? 'ready' : 'not_ready',
      redis: health.checks.redis.status === 'up' ? 'ready' : 'not_ready',
    };
  }
}
