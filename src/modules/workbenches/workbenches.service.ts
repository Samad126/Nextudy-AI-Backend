import { Injectable } from '@nestjs/common';
import { CreateWorkbenchDto } from './dto/create-workbench.dto.js';
import { UpdateWorkbenchDto } from './dto/update-workbench.dto.js';

@Injectable()
export class WorkbenchesService {
  create(createWorkbenchDto: CreateWorkbenchDto) {
    return 'This action adds a new workbench';
  }

  findAll() {
    return `This action returns all workbenches`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workbench`;
  }

  update(id: number, updateWorkbenchDto: UpdateWorkbenchDto) {
    return `This action updates a #${id} workbench`;
  }

  remove(id: number) {
    return `This action removes a #${id} workbench`;
  }
}
