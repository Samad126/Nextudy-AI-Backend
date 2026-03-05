import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class FileUploadDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  workspaceId: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The file to upload',
  })
  file: any;
}
