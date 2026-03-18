import { Module } from '@nestjs/common';
import { WorkbenchesService } from './workbenches.service.js';
import { WorkbenchesController } from './workbenches.controller.js';
import { WorkbenchesRepository } from './workbenches.repository.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';

@Module({
  imports: [DatabaseModule, GeminiModule],
  controllers: [WorkbenchesController],
  providers: [WorkbenchesService, WorkbenchesRepository],
  exports: [WorkbenchesService, WorkbenchesRepository],
})
export class WorkbenchesModule {}
