import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty()
  @IsInt()
  workbenchId: number;

  @ApiProperty()
  @IsString()
  title: string;
}
