import { PartialType } from '@nestjs/swagger';
import { CreateSettingDto } from './create-setting.dto.js';

export class UpdateSettingDto extends PartialType(CreateSettingDto) {}
