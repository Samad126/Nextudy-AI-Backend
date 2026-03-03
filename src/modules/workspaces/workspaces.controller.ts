import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResourcesService } from '../resources/resources.service.js';
import { multerConfig } from '../../common/config/multer.config.js';
import type { Response } from 'express';
import { resolve } from 'path';
import { WorkspaceAccessGuard } from '../../common/guards/workspace-access.guard.js';
import { WorkspaceRoles } from './guards/workspace-roles.decorator.js';
import { SkipWorkspaceCheck } from './guards/skip-workspace-check.decorator.js';
import { WorkspaceMemberRole } from '../../../generated/prisma/client.js';
import { FileUploadDto } from '../resources/dto/file-upload.dto.js';

@Controller('workspaces')
@ApiBearerAuth('accessToken')
@UseGuards(WorkspaceAccessGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly resourcesService: ResourcesService,
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
  @WorkspaceRoles(WorkspaceMemberRole.owner)
  @ApiOperation({ summary: 'Update a workspace' })
  update(
    @Param('id') id: string,
    @GetUser('sub') userId: number,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(userId, +id, updateWorkspaceDto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.owner)
  @ApiOperation({ summary: 'Delete a workspace' })
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(+id);
  }

  @Post(':id/join')
  @SkipWorkspaceCheck()
  @ApiOperation({ summary: 'Join a workspace' })
  join(@Param('id') id: string, @GetUser('sub') userId: number) {
    return this.workspacesService.join(userId, +id);
  }

  // ────────────────── Resource endpoints ──────────────────────

  @Post(':id/resources')
  @WorkspaceRoles(WorkspaceMemberRole.owner, WorkspaceMemberRole.editor)
  @ApiOperation({ summary: 'Upload a resource to a workspace' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  addResource(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.resourcesService.create(+id, file);
  }

  @Get(':id/resources')
  @ApiOperation({ summary: 'List all resources in a workspace' })
  listResources(@Param('id') id: string) {
    return this.resourcesService.findAll(+id);
  }

  @Get(':id/resources/:resourceId/download')
  @ApiOperation({ summary: 'Download a resource' })
  async downloadResource(
    @Param('id') id: string,
    @Param('resourceId') resourceId: string,
    @Res() res: Response,
  ) {
    const resource = await this.resourcesService.getFilePath(+id, +resourceId);
    res.sendFile(resolve(resource.filePath));
  }

  @Delete(':id/resources/:resourceId')
  @WorkspaceRoles(WorkspaceMemberRole.owner, WorkspaceMemberRole.editor)
  @ApiOperation({ summary: 'Delete a resource from a workspace' })
  removeResource(
    @Param('id') id: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcesService.remove(+id, +resourceId);
  }
}
