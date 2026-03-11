import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  content: string;
}
