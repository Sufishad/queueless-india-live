import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { CallNextDto } from './dto/call-next.dto';
import { CompleteTokenDto } from './dto/complete-token.dto';
import { SkipTokenDto } from './dto/skip-token.dto';
import { WalkInDto } from './dto/walk-in.dto';

@Controller('merchant/branch/:id')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MerchantController {
  constructor(private readonly queueService: QueueService) {}

  @Post('call-next')
  @HttpCode(HttpStatus.OK)
  async callNext(@Param('id') branchId: string, @Body() dto: CallNextDto) {
    return this.queueService.callNext(branchId, dto.counterId);
  }

  @Post('recall')
  @HttpCode(HttpStatus.OK)
  async recall(@Param('id') branchId: string, @Body() dto: CallNextDto) {
    return this.queueService.recall(branchId, dto.counterId);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') branchId: string, @Body() dto: CompleteTokenDto) {
    return this.queueService.complete(branchId, dto.tokenId);
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  async skip(@Param('id') branchId: string, @Body() dto: SkipTokenDto) {
    return this.queueService.skip(branchId, dto.tokenId, dto.reason);
  }

  @Post('walkin')
  @HttpCode(HttpStatus.CREATED)
  async walkIn(@Param('id') branchId: string, @Body() dto: WalkInDto) {
    return this.queueService.walkIn(branchId, dto);
  }

  @Post('pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('id') branchId: string, @Body('reason') reason?: string) {
    return this.queueService.pauseQueue(branchId, reason);
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('id') branchId: string) {
    return this.queueService.resumeQueue(branchId);
  }
}
