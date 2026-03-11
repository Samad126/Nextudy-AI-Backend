import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module.js';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtAccessGuard } from './common/guards/jwt-access.guard.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
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

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    ResourcesModule,
    FlashcardsModule,
    QuizzesModule,
    WorkbenchesModule,
    SettingsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    QuestionsModule,
    ChatModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAccessGuard,
    },
  ],
})
export class AppModule {}
