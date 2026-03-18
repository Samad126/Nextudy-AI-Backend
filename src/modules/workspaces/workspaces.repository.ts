import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly db: DatabaseService) {}

  createWorkspace(userId: number, dto: CreateWorkspaceDto) {
    return this.db.workspace.create({
      data: { ...dto, ownerId: userId },
    });
  }

  findAllForUser(userId: number) {
    return this.db.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      omit: { ownerId: true },
    });
  }

  updateWorkspace(userId: number, id: number, dto: UpdateWorkspaceDto) {
    return this.db.workspace.update({
      where: { id, ownerId: userId },
      data: dto,
    });
  }

  deleteWorkspace(userId: number, id: number) {
    return this.db.workspace.delete({ where: { id, ownerId: userId } });
  }

  findWorkspaceAsMember(workspaceId: number, userId: number) {
    return this.db.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });
  }

  findWorkspaceAsOwner(workspaceId: number, ownerId: number) {
    return this.db.workspace.findFirst({
      where: { id: workspaceId, ownerId },
    });
  }

  findWorkspaceById(workspaceId: number) {
    return this.db.workspace.findUnique({ where: { id: workspaceId } });
  }

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

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findUserById(userId: number) {
    return this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
  }

  findMemberByWorkspaceAndUser(workspaceId: number, userId: number) {
    return this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  findExistingInvite(workspaceId: number, email: string) {
    return this.db.workspaceInvite.findUnique({
      where: {
        workspaceId_invitee_email: { workspaceId, invitee_email: email },
      },
    });
  }

  createInviteWithNotification(
    workspaceId: number,
    inviterId: number,
    inviteeEmail: string,
    inviteeId: number | null,
    notificationTargetId: number,
    inviterName: string,
    workspaceName: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: notificationTargetId,
          type: 'workspace_invite',
          title: 'Workspace Invitation',
          message: `${inviterName} invited you to join "${workspaceName}"`,
        },
      });

      await tx.workspaceInvite.upsert({
        where: {
          workspaceId_invitee_email: {
            workspaceId,
            invitee_email: inviteeEmail,
          },
        },
        update: {
          status: 'pending',
          notification_id: notification.id,
          responded_at: null,
        },
        create: {
          notification_id: notification.id,
          workspaceId,
          inviter_id: inviterId,
          invitee_email: inviteeEmail,
          invitee_id: inviteeId,
        },
      });
    });
  }
}
