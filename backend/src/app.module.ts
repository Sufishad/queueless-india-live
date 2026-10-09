import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    RealtimeModule,
    NotificationsModule,
    QueueModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
