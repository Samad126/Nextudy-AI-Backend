import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsPositive } from 'class-validator';

export class SetResourcesDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  resourceIds: number[];
}
