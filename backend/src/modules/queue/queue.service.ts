import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import {
  TokenStatus,
  TokenPriority,
  TokenSource,
  BranchStatus,
  Token,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MetricsService } from '../health/metrics.service';
import { getIstDateString, getIstDateMidnight } from '../../common/utils/date.util';
import { JoinQueueDto } from './dto/join-queue.dto';
import { WalkInDto } from './dto/walk-in.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  // EMA smoothing parameter: alpha = 2 / (N + 1) where N = 20
  private readonly EMA_ALPHA = 2 / (20 + 1); // ~0.095238

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  /**
   * Atomic sequential token generation using Redis Lua script.
   * Guarantees strictly atomic INCR per branch per IST day.
   */
  async generateAtomicTokenNumber(branchId: string, dateIst: string): Promise<number> {
    const redisKey = `counter:branch:${branchId}:${dateIst}`;
    const result = await this.redisService.executeScript(
      'generate_token.lua',
      [redisKey],
      ['172800'], // 48-hour TTL to comfortably outlast IST midnight
    );
    return Number(result);
  }

  /**
   * Customer joins queue for a branch service.
   * Enforces Idempotency-Key caching and strict 1 active token per branch per user rule.
   */
  async joinQueue(
    branchId: string,
    dto: JoinQueueDto,
    userId?: string,
    idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey = idempotencyKeyHeader || dto.idempotencyKey;
    const dateIstStr = getIstDateString();
    const dateIstMidnight = getIstDateMidnight();

    // 1. Check Idempotency-Key in Redis
    if (idempotencyKey) {
      const cached = await this.redisService.get(`idempotency:${idempotencyKey}`);
      if (cached) {
        this.logger.log(`Returning idempotent cached token for key: ${idempotencyKey}`);
        return JSON.parse(cached);
      }
    }

    // 2. Validate Branch & Service
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { queueSettings: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, branchId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} is invalid or inactive at this branch`);
    }

    // 3. Single Active Token Constraint per user per branch per day
    if (userId) {
      const existingActiveToken = await this.prisma.token.findFirst({
        where: {
          branchId,
          customerUserId: userId,
          date: dateIstMidnight,
          status: {
            in: [TokenStatus.WAITING, TokenStatus.CALLED, TokenStatus.IN_SERVICE],
          },
        },
      });

      if (existingActiveToken) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: `You already hold an active token (#${existingActiveToken.number}) at this branch today.`,
            code: 'ERR_ACTIVE_TOKEN_EXISTS',
            existingTokenId: existingActiveToken.id,
            existingTokenNumber: existingActiveToken.number,
            existingTokenStatus: existingActiveToken.status,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    // 4. Atomic sequence generation via Lua script
    const tokenNumber = await this.generateAtomicTokenNumber(branchId, dateIstStr);

    // 5. Persist Token in PostgreSQL
    const token = await this.prisma.token.create({
      data: {
        branchId,
        serviceId: dto.serviceId,
        date: dateIstMidnight,
        number: tokenNumber,
        customerUserId: userId || null,
        source: TokenSource.APP,
        status: TokenStatus.WAITING,
        priority: dto.priority || TokenPriority.NORMAL,
        idempotencyKey: idempotencyKey || null,
        skipCount: 0,
      },
      include: {
        service: true,
        branch: true,
      },
    });

    // 6. Calculate Queue Position & Wait Time
    const positionInQueue = await this.prisma.token.count({
      where: {
        branchId,
        date: dateIstMidnight,
        status: TokenStatus.WAITING,
        createdAt: { lte: token.createdAt },
      },
    });

    const estWaitMin = await this.calculateWaitTime(branchId, positionInQueue);

    const response = {
      token: {
        id: token.id,
        number: token.number,
        status: token.status,
        date: dateIstStr,
        source: token.source,
        priority: token.priority,
        branch: {
          id: branch.id,
          name: branch.name,
          status: branch.status,
        },
        service: {
          id: service.id,
          name: service.name,
          avgDurationMin: service.avgDurationMin,
        },
      },
      positionInQueue,
      estWaitMin,
    };

    // 7. Store in Redis for idempotency (24 hours TTL)
    if (idempotencyKey) {
      await this.redisService.set(`idempotency:${idempotencyKey}`, JSON.stringify(response), 86400);
    }

    // 8. Broadcast updated queue stats via WebSocket
    await this.broadcastQueueSnapshot(branchId);

    // 9. Increment Prometheus metrics counter
    this.metricsService?.incrementTokensIssued(branchId, token.source);

    return response;
  }

  /**
   * Merchant: Call Next Token
   * Pops next WAITING token -> CALLED, triggers WS broadcast & FCM push notification.
   */
  async callNext(branchId: string, counterId?: string) {
    const dateIstMidnight = getIstDateMidnight();

    // 1. Pop first WAITING token ordered by Priority then CreatedAt
    const nextToken = await this.prisma.token.findFirst({
      where: {
        branchId,
        date: dateIstMidnight,
        status: TokenStatus.WAITING,
      },
      orderBy: [
        { priority: 'desc' }, // EMERGENCY > SENIOR > NORMAL
        { createdAt: 'asc' },
      ],
      include: {
        branch: true,
        service: true,
      },
    });

    if (!nextToken) {
      return {
        success: true,
        message: 'Queue is empty. No waiting tokens.',
        calledToken: null,
      };
    }

    // 2. Resolve counter info
    let counterLabel = 'Counter 1';
    if (counterId) {
      const counter = await this.prisma.counter.findUnique({ where: { id: counterId } });
      if (counter) counterLabel = counter.label;
    }

    const calledAt = new Date();

    // 3. Update Token status to CALLED
    const calledToken = await this.prisma.token.update({
      where: { id: nextToken.id },
      data: {
        status: TokenStatus.CALLED,
        calledCounterId: counterId || null,
        calledAt,
      },
      include: {
        branch: true,
        service: true,
      },
    });

    // 4. WebSocket Broadcasts
    this.realtimeService.emitTokenCalled(branchId, {
      token_id: calledToken.id,
      number: calledToken.number,
      counter_label: counterLabel,
      branch_name: calledToken.branch.name,
      called_at: calledAt.toISOString(),
      customer_user_id: calledToken.customerUserId,
    });

    this.realtimeService.emitTokenStatus(branchId, {
      token_id: calledToken.id,
      status: TokenStatus.CALLED,
      updated_at: calledAt.toISOString(),
    });

    // 5. High-Priority FCM Push Notification
    await this.notificationsService.notifyTokenCalled({
      id: calledToken.id,
      number: calledToken.number,
      customerUserId: calledToken.customerUserId,
      counterLabel,
      branchName: calledToken.branch.name,
    });

    // 6. Broadcast updated queue snapshot
    await this.broadcastQueueSnapshot(branchId);

    return {
      success: true,
      calledToken,
    };
  }

  /**
   * Merchant: Recall Current Token
   * Re-announces the currently CALLED token across WebSockets and Push.
   */
  async recall(branchId: string, counterId?: string) {
    const dateIstMidnight = getIstDateMidnight();

    const currentToken = await this.prisma.token.findFirst({
      where: {
        branchId,
        date: dateIstMidnight,
        status: TokenStatus.CALLED,
        ...(counterId ? { calledCounterId: counterId } : {}),
      },
      orderBy: { calledAt: 'desc' },
      include: { branch: true, service: true },
    });

    if (!currentToken) {
      throw new NotFoundException('No currently CALLED token found to recall');
    }

    let counterLabel = 'Counter 1';
    if (currentToken.calledCounterId) {
      const counter = await this.prisma.counter.findUnique({
        where: { id: currentToken.calledCounterId },
      });
      if (counter) counterLabel = counter.label;
    }

    // Re-broadcast
    this.realtimeService.emitTokenCalled(branchId, {
      token_id: currentToken.id,
      number: currentToken.number,
      counter_label: counterLabel,
      branch_name: currentToken.branch.name,
      called_at: new Date().toISOString(),
      customer_user_id: currentToken.customerUserId,
    });

    await this.notificationsService.notifyTokenCalled({
      id: currentToken.id,
      number: currentToken.number,
      customerUserId: currentToken.customerUserId,
      counterLabel,
      branchName: currentToken.branch.name,
    });

    return {
      success: true,
      recalledToken: currentToken,
    };
  }

  /**
   * Merchant: Complete Service
   * Moves CALLED / IN_SERVICE token to COMPLETED and recalculates EMA wait time.
   */
  async complete(branchId: string, tokenId?: string) {
    const dateIstMidnight = getIstDateMidnight();

    let token: Token | null = null;
    if (tokenId) {
      token = await this.prisma.token.findUnique({ where: { id: tokenId } });
    } else {
      token = await this.prisma.token.findFirst({
        where: {
          branchId,
          date: dateIstMidnight,
          status: { in: [TokenStatus.CALLED, TokenStatus.IN_SERVICE] },
        },
        orderBy: { calledAt: 'desc' },
      });
    }

    if (!token) {
      throw new NotFoundException('No active token found to complete');
    }

    const completedAt = new Date();
    const calledAt = token.calledAt || token.createdAt;
    const durationMs = Math.max(1000, completedAt.getTime() - new Date(calledAt).getTime());
    const actualDurationMin = Math.max(1, Math.round(durationMs / 60000));

    // Update Token
    const completedToken = await this.prisma.token.update({
      where: { id: token.id },
      data: {
        status: TokenStatus.COMPLETED,
        completedAt,
      },
    });

    // Update EMA wait time for branch
    const revisedEmaMin = await this.updateServiceEma(branchId, actualDurationMin);

    // Broadcasts
    this.realtimeService.emitTokenStatus(branchId, {
      token_id: completedToken.id,
      status: TokenStatus.COMPLETED,
      updated_at: completedAt.toISOString(),
    });

    await this.broadcastQueueSnapshot(branchId);

    return {
      success: true,
      completedToken,
      actualDurationMin,
      revisedEmaMin,
    };
  }

  /**
   * Merchant: Skip / No-Show Flow
   * If skipCount == 0: increment skipCount, re-queue to end of WAITING queue.
   * If skipCount > 0: mark CANCELLED (2 no-shows = termination).
   */
  async skip(branchId: string, tokenId?: string, reason?: string) {
    const dateIstMidnight = getIstDateMidnight();

    let token: Token | null = null;
    if (tokenId) {
      token = await this.prisma.token.findUnique({ where: { id: tokenId } });
    } else {
      token = await this.prisma.token.findFirst({
        where: {
          branchId,
          date: dateIstMidnight,
          status: { in: [TokenStatus.CALLED, TokenStatus.IN_SERVICE] },
        },
        orderBy: { calledAt: 'desc' },
      });
    }

    if (!token) {
      throw new NotFoundException('No active token found to skip');
    }

    if (token.skipCount === 0) {
      // First skip -> Auto-requeue ONCE to end of queue
      const requeuedToken = await this.prisma.token.update({
        where: { id: token.id },
        data: {
          skipCount: 1,
          status: TokenStatus.WAITING,
          calledAt: null,
          calledCounterId: null,
          createdAt: new Date(), // Re-sorts token to end of queue
        },
      });

      this.realtimeService.emitTokenStatus(branchId, {
        token_id: requeuedToken.id,
        status: TokenStatus.WAITING,
        updated_at: new Date().toISOString(),
      });

      await this.broadcastQueueSnapshot(branchId);

      return {
        success: true,
        action: 'REQUEUED_TO_TAIL',
        skipCount: requeuedToken.skipCount,
        token: requeuedToken,
      };
    } else {
      // Second skip -> Permanently CANCEL
      const cancelledToken = await this.prisma.token.update({
        where: { id: token.id },
        data: {
          status: TokenStatus.CANCELLED,
        },
      });

      this.realtimeService.emitTokenStatus(branchId, {
        token_id: cancelledToken.id,
        status: TokenStatus.CANCELLED,
        updated_at: new Date().toISOString(),
      });

      await this.broadcastQueueSnapshot(branchId);

      return {
        success: true,
        action: 'CANCELLED_AFTER_TWO_SKIPS',
        skipCount: 2,
        token: cancelledToken,
      };
    }
  }

  /**
   * Merchant: Issue Walk-In Token
   * 1-tap walk-in generation for keypad-phone users/seniors. customer_user_id is null.
   */
  async walkIn(branchId: string, dto: WalkInDto) {
    const dateIstStr = getIstDateString();
    const dateIstMidnight = getIstDateMidnight();

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, branchId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} is invalid or inactive`);
    }

    // Atomic Lua sequence
    const tokenNumber = await this.generateAtomicTokenNumber(branchId, dateIstStr);

    const token = await this.prisma.token.create({
      data: {
        branchId,
        serviceId: dto.serviceId,
        date: dateIstMidnight,
        number: tokenNumber,
        customerUserId: null,
        source: TokenSource.WALKIN,
        status: TokenStatus.WAITING,
        priority: TokenPriority.NORMAL,
        skipCount: 0,
      },
      include: {
        service: true,
        branch: true,
      },
    });

    await this.broadcastQueueSnapshot(branchId);
    this.metricsService?.incrementTokensIssued(branchId, 'WALK_IN');

    return {
      success: true,
      token: {
        id: token.id,
        number: token.number,
        date: dateIstStr,
        source: token.source,
        status: token.status,
      },
      slip: {
        tokenNumber: token.number,
        branchName: branch.name,
        serviceName: service.name,
        issuedAt: token.createdAt,
      },
    };
  }

  /**
   * Pause Queue
   */
  async pauseQueue(branchId: string, reason?: string) {
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { status: BranchStatus.PAUSED },
    });

    await this.prisma.queueSettings.upsert({
      where: { branchId },
      update: { isPaused: true },
      create: { branchId, isPaused: true },
    });

    this.realtimeService.emitQueuePaused(branchId, reason);
    await this.broadcastQueueSnapshot(branchId);

    return { success: true, status: BranchStatus.PAUSED };
  }

  /**
   * Resume Queue
   */
  async resumeQueue(branchId: string) {
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { status: BranchStatus.LIVE },
    });

    await this.prisma.queueSettings.upsert({
      where: { branchId },
      update: { isPaused: false },
      create: { branchId, isPaused: false },
    });

    this.realtimeService.emitQueueResumed(branchId);
    await this.broadcastQueueSnapshot(branchId);

    return { success: true, status: BranchStatus.LIVE };
  }

  /**
   * Get Token Details (Polling fallback)
   */
  async getTokenById(tokenId: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
      include: { branch: true, service: true },
    });

    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }

    const dateIstMidnight = getIstDateMidnight();
    const positionInQueue =
      token.status === TokenStatus.WAITING
        ? await this.prisma.token.count({
            where: {
              branchId: token.branchId,
              date: dateIstMidnight,
              status: TokenStatus.WAITING,
              createdAt: { lte: token.createdAt },
            },
          })
        : 0;

    const estWaitMin =
      token.status === TokenStatus.WAITING
        ? await this.calculateWaitTime(token.branchId, positionInQueue)
        : 0;

    return {
      token,
      positionInQueue,
      estWaitMin,
    };
  }

  /**
   * Customer leaves queue
   */
  async leaveQueue(tokenId: string, userId?: string) {
    const token = await this.prisma.token.findUnique({ where: { id: tokenId } });
    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }

    if (userId && token.customerUserId && token.customerUserId !== userId) {
      throw new HttpException('Unauthorized to cancel this token', HttpStatus.FORBIDDEN);
    }

    const cancelledToken = await this.prisma.token.update({
      where: { id: tokenId },
      data: { status: TokenStatus.CANCELLED },
    });

    this.realtimeService.emitTokenStatus(token.branchId, {
      token_id: tokenId,
      status: TokenStatus.CANCELLED,
      updated_at: new Date().toISOString(),
    });

    await this.broadcastQueueSnapshot(token.branchId);

    return {
      success: true,
      message: 'Token cancelled successfully',
      token: cancelledToken,
    };
  }

  /**
   * Wait Time Calculation:
   * ceil(position_in_queue * avg_service_ema_min / active_counter_count)
   */
  async calculateWaitTime(branchId: string, positionInQueue: number): Promise<number> {
    if (positionInQueue <= 0) return 0;

    const settings = await this.prisma.queueSettings.findUnique({ where: { branchId } });
    const avgServiceEmaMin = settings?.avgServiceEmaMin || 15.0;

    const activeCounters = await this.prisma.counter.count({
      where: { branchId, isActive: true },
    });
    const effectiveCounters = Math.max(1, activeCounters);

    return Math.ceil((positionInQueue * avgServiceEmaMin) / effectiveCounters);
  }

  /**
   * Update Exponential Moving Average (EMA) of service duration:
   * new_ema = (actual_duration * alpha) + (old_ema * (1 - alpha))
   * where alpha = 2 / (20 + 1)
   */
  async updateServiceEma(branchId: string, actualDurationMin: number): Promise<number> {
    const settings = await this.prisma.queueSettings.findUnique({ where: { branchId } });
    const oldEma = settings?.avgServiceEmaMin || 15.0;

    const newEma = actualDurationMin * this.EMA_ALPHA + oldEma * (1 - this.EMA_ALPHA);
    const roundedEma = parseFloat(newEma.toFixed(2));

    await this.prisma.queueSettings.upsert({
      where: { branchId },
      update: { avgServiceEmaMin: roundedEma },
      create: { branchId, avgServiceEmaMin: roundedEma },
    });

    return roundedEma;
  }

  /**
   * Broadcast complete live queue snapshot to room branch:{id}
   */
  async broadcastQueueSnapshot(branchId: string): Promise<void> {
    const dateIstMidnight = getIstDateMidnight();

    // 1. Current serving token
    const servingToken = await this.prisma.token.findFirst({
      where: {
        branchId,
        date: dateIstMidnight,
        status: { in: [TokenStatus.CALLED, TokenStatus.IN_SERVICE] },
      },
      orderBy: { calledAt: 'desc' },
    });

    // 2. Waiting count
    const waitingTokens = await this.prisma.token.findMany({
      where: {
        branchId,
        date: dateIstMidnight,
        status: TokenStatus.WAITING,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      select: { number: true },
    });

    const waitingCount = waitingTokens.length;
    const nextNumbers = waitingTokens.slice(0, 5).map((t) => t.number);

    // 3. Active counters & Wait time
    const activeCounters = await this.prisma.counter.count({
      where: { branchId, isActive: true },
    });

    const estWaitMin = await this.calculateWaitTime(branchId, waitingCount);

    // Record Prometheus metrics
    this.metricsService?.setQueueWaitTime(branchId, estWaitMin * 60);

    const snapshotPayload = {
      branchId,
      serving: servingToken ? servingToken.number : null,
      waiting_count: waitingCount,
      est_wait_min: estWaitMin,
      next_numbers: nextNumbers,
      active_counters: Math.max(1, activeCounters),
      updated_at: new Date().toISOString(),
    };

    // Invalidate Redis snapshot cache on state changes
    const snapshotKey = `queue:snapshot:${branchId}:${getIstDateString()}`;
    await this.redisService.set(snapshotKey, JSON.stringify(snapshotPayload), 1);

    this.realtimeService.emitQueueUpdate(branchId, snapshotPayload);
  }

  /**
   * Milestone 3 Performance & Caching:
   * GET live queue state snapshot with 1-second Redis cache to prevent DB overload under load
   */
  async getQueueStateSnapshot(branchId: string) {
    const dateIstStr = getIstDateString();
    const snapshotKey = `queue:snapshot:${branchId}:${dateIstStr}`;

    // 1. Check Redis 1-sec snapshot cache
    const cached = await this.redisService.get(snapshotKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback to fresh calculation if parse fails
      }
    }

    // 2. Fetch fresh queue state from DB
    const dateIstMidnight = getIstDateMidnight();

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, status: true },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const servingToken = await this.prisma.token.findFirst({
      where: {
        branchId,
        date: dateIstMidnight,
        status: { in: [TokenStatus.CALLED, TokenStatus.IN_SERVICE] },
      },
      orderBy: { calledAt: 'desc' },
      select: { number: true, calledCounterId: true },
    });

    const waitingTokens = await this.prisma.token.findMany({
      where: {
        branchId,
        date: dateIstMidnight,
        status: TokenStatus.WAITING,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: { number: true },
    });

    const waitingCount = waitingTokens.length;
    const nextNumbers = waitingTokens.slice(0, 5).map((t) => t.number);

    const activeCounters = await this.prisma.counter.count({
      where: { branchId, isActive: true },
    });

    const estWaitMin = await this.calculateWaitTime(branchId, waitingCount);

    const snapshot = {
      branchId: branch.id,
      branchName: branch.name,
      isPaused: branch.status === BranchStatus.PAUSED,
      serving: servingToken ? servingToken.number : null,
      counter: servingToken?.calledCounterId || null,
      waiting_count: waitingCount,
      est_wait_min: estWaitMin,
      next_numbers: nextNumbers,
      active_counters: Math.max(1, activeCounters),
      updated_at: new Date().toISOString(),
    };

    // Cache in Redis for 1 second (high throughput buffer)
    await this.redisService.set(snapshotKey, JSON.stringify(snapshot), 1);

    return snapshot;
  }

  /**
   * Milestone 3 Performance & Caching:
   * Branch Discovery with 5-minute Redis Cache (300 seconds TTL)
   */
  async getDiscoveryBranches(city?: string, category?: string, search?: string) {
    const cityKey = (city || 'all').toLowerCase();
    const catKey = (category || 'all').toLowerCase();
    const searchKey = (search || 'all').toLowerCase();
    const cacheKey = `branch:discovery:${cityKey}:${catKey}:${searchKey}`;

    // 1. Check Redis 5-minute cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback to fresh query
      }
    }

    // 2. Query Postgres
    const where: any = {
      status: { in: [BranchStatus.LIVE, BranchStatus.PAUSED] },
    };

    if (city && city.toLowerCase() !== 'all') {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (category && category.toLowerCase() !== 'all') {
      where.business = { category };
    }

    if (search && search.trim().length > 0 && search.toLowerCase() !== 'all') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
      ];
    }

    const branches = await this.prisma.branch.findMany({
      where,
      include: {
        business: true,
        services: { where: { isActive: true } },
        queueSettings: true,
        _count: {
          select: {
            tokens: {
              where: {
                date: getIstDateMidnight(),
                status: TokenStatus.WAITING,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = branches.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.business?.category || 'RETAIL',
      businessName: b.business?.name,
      address: b.address,
      area: b.area,
      city: b.city,
      lat: Number(b.lat),
      lng: Number(b.lng),
      status: b.status,
      waitingCount: b._count?.tokens || 0,
      services: b.services.map((s) => ({
        id: s.id,
        name: s.name,
        avgDurationMin: s.avgDurationMin,
        priceInr: Number(s.priceInr),
      })),
      settings: b.queueSettings,
    }));

    // Cache in Redis with 5-minute (300s) TTL
    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }
}
