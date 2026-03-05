import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkbenchesService } from './workbenches.service.js';
import { CreateWorkbenchDto } from './dto/create-workbench.dto.js';
import { UpdateWorkbenchDto } from './dto/update-workbench.dto.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';

@ApiBearerAuth('accessToken')
@Controller('workbenches')
export class WorkbenchesController {
  constructor(private readonly workbenchesService: WorkbenchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workbench' })
  create(
    @GetUser('sub') userId: number,
    @Body() createWorkbenchDto: CreateWorkbenchDto,
  ) {
    return this.workbenchesService.create(userId, createWorkbenchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workbenches' })
  findAll(
    @GetUser('sub') userId: number,
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    return this.workbenchesService.findAll(userId, workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workbenchesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workbench' })
  update(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorkbenchDto: UpdateWorkbenchDto,
  ) {
    return this.workbenchesService.update(userId, id, updateWorkbenchDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workbench' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
  ) {
    return this.workbenchesService.remove(userId, id);
  }
}
