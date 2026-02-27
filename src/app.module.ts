import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './common/database/database.module.js';
import { APP_FILTER } from '@nestjs/core';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { ResourcesModule } from './modules/resources/resources.module.js';
import { FlashcardsModule } from './modules/flashcards/flashcards.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';
import { WorkbenchesModule } from './modules/workbenches/workbenches.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
  ],
})
export class AppModule {}
