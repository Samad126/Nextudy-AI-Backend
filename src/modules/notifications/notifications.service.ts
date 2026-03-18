import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus } from '../../../generated/prisma/client.js';
import { DatabaseService } from '../../common/database/database.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly db: DatabaseService) {}

  async getAll(userId: number) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
      include: {
        workspaceInvite: {
          select: {
            id: true,
            status: true,
            workspaceId: true,
            invitee_email: true,
            workspace: { select: { id: true, name: true } },
            inviter: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException();

    await this.db.notification.update({
      where: { id: notificationId },
      data: { is_read: true, read_at: new Date() },
    });

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: number) {
    await this.db.notification.updateMany({
      where: { userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    return { message: 'All notifications marked as read' };
  }

  async respondToInvite(
    userId: number,
    inviteId: number,
    action: 'accept' | 'reject',
  ) {
    const invite = await this.db.workspaceInvite.findUnique({
      where: { id: inviteId },
      include: { notification: true },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    // Verify the invite belongs to this user (by id or email)
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (invite.invitee_id !== userId && invite.invitee_email !== user.email) {
      throw new ForbiddenException('This invite is not for you');
    }

    if (invite.status !== InviteStatus.pending) {
      throw new ForbiddenException(`Invite has already been ${invite.status}`);
    }

    const newStatus =
      action === 'accept' ? InviteStatus.accepted : InviteStatus.rejected;

    await this.db.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: inviteId },
        data: {
          status: newStatus,
          invitee_id: userId,
          responded_at: new Date(),
        },
      });

      await tx.notification.update({
        where: { id: invite.notification_id },
        data: { is_read: true, read_at: new Date() },
      });

      if (action === 'accept') {
        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId,
            },
          },
          update: {},
          create: { workspaceId: invite.workspaceId, userId },
        });
      }
    });

    this.logger.log(`User ${userId} ${action}ed invite ${inviteId}`);
    return {
      message:
        action === 'accept'
          ? 'Invite accepted, you have joined the workspace'
          : 'Invite rejected',
    };
  }
}
