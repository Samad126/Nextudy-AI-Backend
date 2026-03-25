import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAccessGuard } from './common/guards/jwt-access.guard.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { ResourcesModule } from './modules/resources/resources.module.js';
import { FlashcardsModule } from './modules/flashcards/flashcards.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';
import { WorkbenchesModule } from './modules/workbenches/workbenches.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { ConfigModule } from '@nestjs/config';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from './common/throttler/throttler-storage-redis.service.js';
import { RedisService } from './common/redis/redis.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redisService),
      }),
    }),
    AuthModule,
    WorkspacesModule,
    SettingsModule,
    ResourcesModule,
    FlashcardsModule,
    QuizzesModule,
    WorkbenchesModule,
    QuestionsModule,
    ChatModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAccessGuard },
  ],
})
export class AppModule {}
