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
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspaceMembersService } from './workspace-members.service.js';
import { WorkspaceInvitesService } from './workspace-invites.service.js';

@Controller('workspaces')
@ApiBearerAuth('accessToken')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly membersService: WorkspaceMembersService,
    private readonly invitesService: WorkspaceInvitesService,
  ) {}

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
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(userId, id, updateWorkspaceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workspace' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
  ) {
    return this.workspacesService.remove(userId, id);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'Get workspace dashboard overview' })
  getOverview(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
  ) {
    return this.workspacesService.getOverview(userId, id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a workspace' })
  leave(@Param('id', ParseIntPipe) id: number, @GetUser('sub') userId: number) {
    return this.membersService.leaveWorkspace(userId, id);
  }

  // ---- Member management ----

  @Get(':id/members')
  @ApiOperation({ summary: 'List workspace members' })
  getMembers(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
  ) {
    return this.membersService.getMembers(userId, id);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update a member role (owner only)' })
  updateMemberRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetUser('sub') userId: number,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateMemberRole(userId, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from workspace (owner only)' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetUser('sub') userId: number,
  ) {
    return this.membersService.removeMember(userId, id, memberId);
  }

  // ---- Invitations ----

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a user to workspace by email (owner only)' })
  inviteMember(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') userId: number,
    @Body() dto: InviteMemberDto,
  ) {
    return this.invitesService.inviteMember(userId, id, dto);
  }
}
