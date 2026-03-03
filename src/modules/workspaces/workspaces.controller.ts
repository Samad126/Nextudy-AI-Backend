import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('workspaces')
@ApiBearerAuth('accessToken')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  create(
    @GetUser('sub') userId: number,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(userId, createWorkspaceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces' })
  findAll(@GetUser('sub') userId: number) {
    return this.workspacesService.findAll(userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a workspace' })
  update(
    @Param('id') id: string,
    @GetUser('sub') userId: number,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(userId, +id, updateWorkspaceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workspace' })
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(+id);
  }
}
