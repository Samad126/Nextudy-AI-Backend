import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';

@Injectable()
export class WorkspaceInvitesRepository {
  constructor(private readonly db: DatabaseService) {}

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findUserById(userId: number) {
    return this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
  }

  findUserEmail(userId: number) {
    return this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
  }

  findExistingInvite(workspaceId: number, email: string) {
    return this.db.workspaceInvite.findUnique({
      where: {
        workspaceId_invitee_email: { workspaceId, invitee_email: email },
      },
    });
  }

  findInviteWithNotification(inviteId: number) {
    return this.db.workspaceInvite.findUnique({
      where: { id: inviteId },
      include: { notification: true },
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

  respondToInviteTransaction(
    inviteId: number,
    userId: number,
    newStatus: 'accepted' | 'rejected',
    notificationId: number,
    workspaceId: number,
    accept: boolean,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: inviteId },
        data: {
          status: newStatus,
          invitee_id: userId,
          responded_at: new Date(),
        },
      });
      await tx.notification.update({
        where: { id: notificationId },
        data: { is_read: true, read_at: new Date() },
      });
      if (accept) {
        await tx.workspaceMember.upsert({
          where: { workspaceId_userId: { workspaceId, userId } },
          update: {},
          create: { workspaceId, userId },
        });
      }
    });
  }
}
