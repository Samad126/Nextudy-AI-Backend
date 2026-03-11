import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { WorkspacesService } from './workspaces.service.js';

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
  remove(@Param('id') id: string, @GetUser('sub') userId: number) {
    return this.workspacesService.remove(userId, +id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a workspace' })
  join(@Param('id') id: string, @GetUser('sub') userId: number) {
    return this.workspacesService.join(userId, +id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a workspace' })
  leave(@Param('id') id: string, @GetUser('sub') userId: number) {
    return this.workspacesService.leaveWorkspace(userId, +id);
  }

  // ---- Member management ----

  @Get(':id/members')
  @ApiOperation({ summary: 'List workspace members' })
  getMembers(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
  ) {
    return this.workspacesService.getMembers(userId, id);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update a member role (owner only)' })
  updateMemberRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetUser('sub') userId: number,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(userId, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from workspace (owner only)' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetUser('sub') userId: number,
  ) {
    return this.workspacesService.removeMember(userId, id, memberId);
  }
}
