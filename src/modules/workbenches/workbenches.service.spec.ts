import { Test, TestingModule } from '@nestjs/testing';
import { WorkbenchesService } from './workbenches.service.js';

describe('WorkbenchesService', () => {
  let service: WorkbenchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkbenchesService],
    }).compile();

    service = module.get<WorkbenchesService>(WorkbenchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
