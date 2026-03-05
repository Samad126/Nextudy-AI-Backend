import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResourcesService } from './resources.service.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { CreateResourceGroupDto } from './dto/create-resource-group.dto.js';
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto.js';
import { AddResourceToGroupDto } from './dto/add-resource-to-group.dto.js';

@Controller('resource-groups')
@ApiBearerAuth('accessToken')
export class ResourceGroupsController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List all resource groups in a workspace' })
  listResourceGroups(
    @GetUser('sub') userId: number,
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    return this.resourcesService.findAllGroups(userId, workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a resource group' })
  createResourceGroup(
    @GetUser('sub') userId: number,
    @Body() createResourceGroupDto: CreateResourceGroupDto,
  ) {
    return this.resourcesService.createGroup(userId, createResourceGroupDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a resource group' })
  updateResourceGroup(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResourceGroupDto: UpdateResourceGroupDto,
  ) {
    return this.resourcesService.updateGroup(
      userId,
      id,
      updateResourceGroupDto,
    );
  }

  @Post(':id/resources')
  @ApiOperation({ summary: 'Add a resource to a group' })
  addResourceToGroup(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() { resourceId }: AddResourceToGroupDto,
  ) {
    return this.resourcesService.addResourceToGroup(userId, id, resourceId);
  }

  @Delete(':id/resources/:resourceId')
  @ApiOperation({ summary: 'Remove a resource from a group' })
  removeResourceFromGroup(
    @GetUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('resourceId', ParseIntPipe) resourceId: number,
  ) {
    return this.resourcesService.removeResourceFromGroup(
      userId,
      id,
      resourceId,
    );
  }
}
