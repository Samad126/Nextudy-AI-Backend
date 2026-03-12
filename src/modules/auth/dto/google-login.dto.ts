import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token from @react-oauth/google' })
  @IsString()
  @IsNotEmpty()
  credential: string;
}
