import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service.js';
import { QuizzesController } from './quizzes.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { QuizGradingService } from './quiz-grading.service.js';
import { QuizzesRepository } from './quizzes.repository.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';

@Module({
  imports: [DatabaseModule, WorkspacesModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizGradingService, QuizzesRepository],
})
export class QuizzesModule {}
