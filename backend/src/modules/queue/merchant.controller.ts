import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { MerchantAuthGuard } from '../auth/guards/merchant-auth.guard';
import { CallNextDto } from './dto/call-next.dto';
import { CompleteTokenDto } from './dto/complete-token.dto';
import { SkipTokenDto } from './dto/skip-token.dto';
import { WalkInDto } from './dto/walk-in.dto';

@Controller(['merchant/branch/:id', 'branches/:id'])
@UseGuards(MerchantAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MerchantController {
  constructor(
    private readonly queueService: QueueService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  private async assertBranchRateLimit(branchId: string): Promise<void> {
    // Milestone 3: Merchant actions: 100 per minute per branch
    const key = `ratelimit:merchant:branch:${branchId}`;
    await this.rateLimitService.enforceRateLimit(
      key,
      100,
      60,
      'Merchant action rate limit exceeded. Maximum 100 actions per minute allowed.',
    );
  }

  @Post('call-next')
  @HttpCode(HttpStatus.OK)
  async callNext(@Param('id') branchId: string, @Body() dto: CallNextDto) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.callNext(branchId, dto.counterId);
  }

  @Post('recall')
  @HttpCode(HttpStatus.OK)
  async recall(@Param('id') branchId: string, @Body() dto: CallNextDto) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.recall(branchId, dto.counterId);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') branchId: string, @Body() dto: CompleteTokenDto) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.complete(branchId, dto.tokenId);
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  async skip(@Param('id') branchId: string, @Body() dto: SkipTokenDto) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.skip(branchId, dto.tokenId, dto.reason);
  }

  @Post('walkin')
  @HttpCode(HttpStatus.CREATED)
  async walkIn(@Param('id') branchId: string, @Body() dto: WalkInDto) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.walkIn(branchId, dto);
  }

  @Post('pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('id') branchId: string, @Body('reason') reason?: string) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.pauseQueue(branchId, reason);
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('id') branchId: string) {
    await this.assertBranchRateLimit(branchId);
    return this.queueService.resumeQueue(branchId);
  }
}
