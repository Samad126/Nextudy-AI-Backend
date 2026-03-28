import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateResourceGroupDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  workspaceId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;
}
