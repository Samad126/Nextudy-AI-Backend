import { PartialType } from '@nestjs/swagger';
import { CreateResourceGroupDto } from './create-resource-group.dto.js';

export class UpdateResourceGroupDto extends PartialType(
  CreateResourceGroupDto,
) {}
