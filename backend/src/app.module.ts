import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueueModule } from './modules/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { RetentionModule } from './modules/retention/retention.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    RealtimeModule,
    NotificationsModule,
    QueueModule,
    HealthModule,
    RetentionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
