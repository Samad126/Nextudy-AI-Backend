import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

@Injectable()
export class WorkspaceMembersRepository {
  constructor(private readonly db: DatabaseService) {}

  findMembers(workspaceId: number) {
    return this.db.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  findMemberById(memberId: number, workspaceId: number) {
    return this.db.workspaceMember.findUnique({
      where: { id: memberId, workspaceId },
    });
  }

  updateMemberRole(memberId: number, dto: UpdateMemberRoleDto) {
    return this.db.workspaceMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  deleteMember(memberId: number) {
    return this.db.workspaceMember.delete({ where: { id: memberId } });
  }

  findMemberByUserId(workspaceId: number, userId: number) {
    return this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  deleteMemberByUserId(workspaceId: number, userId: number) {
    return this.db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  findMemberByWorkspaceAndUser(workspaceId: number, userId: number) {
    return this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  upsertMember(workspaceId: number, userId: number) {
    return this.db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: {},
      create: { workspaceId, userId },
    });
  }
}
