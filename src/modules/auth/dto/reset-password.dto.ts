import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
