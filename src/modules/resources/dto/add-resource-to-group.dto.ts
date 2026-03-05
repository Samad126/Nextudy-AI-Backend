import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AddResourceToGroupDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  resourceId: number;
}
