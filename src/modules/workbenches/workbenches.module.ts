import { Module } from '@nestjs/common';
import { WorkbenchesService } from './workbenches.service.js';
import { WorkbenchesController } from './workbenches.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkbenchesController],
  providers: [WorkbenchesService],
})
export class WorkbenchesModule {}
