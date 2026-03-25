import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { resolve, sep } from 'path';
import { ForbiddenException } from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { multerConfig } from '../../common/config/multer.config.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { FileUploadDto } from './dto/file-upload.dto.js';
import { Throttle } from '@nestjs/throttler';

@Controller('resources')
@ApiBearerAuth('accessToken')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Upload a resource to a workspace' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  addResource(
    @GetUser('sub') userId: number,
    @Body() { workspaceId }: FileUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.resourcesService.create(userId, workspaceId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all resources in a workspace' })
  listResources(
    @GetUser('sub') userId: number,
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    return this.resourcesService.findAll(userId, workspaceId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a resource' })
  async downloadResource(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const resource = await this.resourcesService.getFilePath(userId, id);
    const safeBase = resolve('./uploads');
    const resolved = resolve(resource.filePath);
    if (!resolved.startsWith(safeBase + sep)) {
      throw new ForbiddenException('Invalid file path');
    }
    res.sendFile(resolved);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resource' })
  removeResource(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.resourcesService.remove(userId, id);
  }
}
