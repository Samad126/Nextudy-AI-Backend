import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkspaceMemberRole } from '../../../../generated/prisma/client.js';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: WorkspaceMemberRole,
    description: 'New role for the member (editor or member)',
  })
  @IsEnum(WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}
