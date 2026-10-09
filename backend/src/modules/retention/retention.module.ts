import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionService } from './retention.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
