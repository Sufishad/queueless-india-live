import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  Req,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { JoinQueueDto } from './dto/join-queue.dto';

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  /**
   * GET /api/v1/branches
   * Branch discovery endpoint cached in Redis for 5 minutes (300s TTL)
   */
  @Get('branches')
  async getDiscoveryBranches(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.getDiscoveryBranches(city, category, search);
  }

  /**
   * GET /api/v1/branches/:id/state
   * Real-time live queue snapshot cached in Redis for 1 second (high throughput buffer)
   */
  @Get('branches/:id/state')
  async getQueueState(@Param('id') branchId: string) {
    return this.queueService.getQueueStateSnapshot(branchId);
  }

  /**
   * POST /api/v1/branches/:id/token
   * Join live queue. Idempotency-Key header is supported.
   * Rate limited: 5 joins per hour per user/IP to prevent spam joins.
   */
  @Post('branches/:id/token')
  @HttpCode(HttpStatus.CREATED)
  async joinQueue(
    @Param('id') branchId: string,
    @Body() dto: JoinQueueDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId || req?.user?.sub;
    const clientIp =
      (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req?.ip ||
      'anon';

    // Milestone 3: Rate Limiting - Token join: 5 per hour per user
    const rateLimitKey = `ratelimit:join:user:${userId || clientIp}`;
    await this.rateLimitService.enforceRateLimit(
      rateLimitKey,
      5,
      3600,
      'Maximum 5 queue joins per hour allowed. Please try again later.',
    );

    return this.queueService.joinQueue(branchId, dto, userId, idempotencyKeyHeader);
  }

  /**
   * GET /api/v1/tokens/:id
   * Get token status (polling fallback when WebSocket is unavailable)
   */
  @Get('tokens/:id')
  async getToken(@Param('id') tokenId: string) {
    return this.queueService.getTokenById(tokenId);
  }

  /**
   * DELETE /api/v1/tokens/:id
   * Customer leaves queue
   */
  @Delete('tokens/:id')
  async leaveQueue(@Param('id') tokenId: string, @Req() req?: any) {
    const userId = req?.user?.userId;
    return this.queueService.leaveQueue(tokenId, userId);
  }
}
