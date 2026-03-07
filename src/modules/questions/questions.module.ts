import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service.js';
import { QuestionsRepository } from './questions.repository.js';
import { QuestionsController } from './questions.controller.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { WorkbenchesModule } from '../workbenches/workbenches.module.js';

@Module({
  imports: [DatabaseModule, GeminiModule, WorkbenchesModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionsRepository],
})
export class QuestionsModule {}
