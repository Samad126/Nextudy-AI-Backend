import { Test, TestingModule } from '@nestjs/testing';
import { WorkbenchesController } from './workbenches.controller.js';
import { WorkbenchesService } from './workbenches.service.js';

describe('WorkbenchesController', () => {
  let controller: WorkbenchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkbenchesController],
      providers: [WorkbenchesService],
    }).compile();

    controller = module.get<WorkbenchesController>(WorkbenchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
