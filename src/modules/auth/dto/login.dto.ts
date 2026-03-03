import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ default: 'u1@gm.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ default: '12345678' })
  @IsString()
  password: string;
}
