import { PartialType } from '@nestjs/swagger';
import { CreateWorkbenchDto } from './create-workbench.dto.js';

export class UpdateWorkbenchDto extends PartialType(CreateWorkbenchDto) {}
