import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WorkbenchesService } from './workbenches.service.js';
import { CreateWorkbenchDto } from './dto/create-workbench.dto.js';
import { UpdateWorkbenchDto } from './dto/update-workbench.dto.js';

@Controller('workbenches')
export class WorkbenchesController {
  constructor(private readonly workbenchesService: WorkbenchesService) {}

  @Post()
  create(@Body() createWorkbenchDto: CreateWorkbenchDto) {
    return this.workbenchesService.create(createWorkbenchDto);
  }

  @Get()
  findAll() {
    return this.workbenchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workbenchesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkbenchDto: UpdateWorkbenchDto) {
    return this.workbenchesService.update(+id, updateWorkbenchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workbenchesService.remove(+id);
  }
}
