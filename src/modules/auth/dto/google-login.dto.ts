import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google access token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
