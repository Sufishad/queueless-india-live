import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * POST /api/v1/branches/:id/token
   * Join live queue. Idempotency-Key header is supported.
   * If authenticated, binds token to customer user ID and enforces 1 active token rule.
   */
  @Post('branches/:id/token')
  @HttpCode(HttpStatus.CREATED)
  async joinQueue(
    @Param('id') branchId: string,
    @Body() dto: JoinQueueDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
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
