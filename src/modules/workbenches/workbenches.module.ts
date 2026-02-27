import { Module } from '@nestjs/common';
import { WorkbenchesService } from './workbenches.service.js';
import { WorkbenchesController } from './workbenches.controller.js';

@Module({
  controllers: [WorkbenchesController],
  providers: [WorkbenchesService],
})
export class WorkbenchesModule {}
