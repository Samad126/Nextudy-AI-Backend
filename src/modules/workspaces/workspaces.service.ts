import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceMemberRole } from '../../../generated/prisma/client.js';
import { DatabaseService } from '../../common/database/database.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: number, createWorkspaceDto: CreateWorkspaceDto) {
    await this.db.workspace.create({
      data: { ...createWorkspaceDto, ownerId: userId },
    });

    return {
      message: 'Workspace created successfully',
    };
  }

  async findAll(userId: number) {
    return await this.db.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      omit: { ownerId: true },
    });
  }

  async update(
    userId: number,
    id: number,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    await this.db.workspace.update({
      where: { id, ownerId: userId },
      data: updateWorkspaceDto,
    });

    return {
      message: 'Workspace updated successfully',
    };
  }

  async remove(userId: number, id: number) {
    await this.db.workspace.delete({ where: { id, ownerId: userId } });

    return {
      message: 'Workspace deleted successfully',
    };
  }

  async join(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === userId) {
      return { message: 'You already own this workspace' };
    }

    await this.db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: {},
      create: { workspaceId, userId },
    });

    return { message: 'Joined workspace successfully' };
  }

  // ---- Member management ----

  async getMembers(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    const members = await this.db.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      role: m.role,
      joined_at: m.joined_at,
      user: m.user,
    }));
  }

  async updateMemberRole(
    requesterId: number,
    workspaceId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ) {
    // Only owner can change roles
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ownerId: requesterId },
    });
    if (!workspace)
      throw new ForbiddenException('Only the owner can change member roles');

    if (dto.role === WorkspaceMemberRole.owner) {
      throw new BadRequestException('Cannot assign owner role to a member');
    }

    const member = await this.db.workspaceMember.findUnique({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.db.workspaceMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });

    return { message: 'Member role updated successfully' };
  }

  async removeMember(
    requesterId: number,
    workspaceId: number,
    memberId: number,
  ) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ownerId: requesterId },
    });
    if (!workspace)
      throw new ForbiddenException('Only the owner can remove members');

    const member = await this.db.workspaceMember.findUnique({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.db.workspaceMember.delete({ where: { id: memberId } });

    return { message: 'Member removed successfully' };
  }

  async leaveWorkspace(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === userId) {
      throw new BadRequestException('Owner cannot leave their own workspace');
    }

    const member = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member)
      throw new NotFoundException('You are not a member of this workspace');

    await this.db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    return { message: 'Left workspace successfully' };
  }

  // ---- Invitations ----

  async inviteMember(
    inviterId: number,
    workspaceId: number,
    dto: InviteMemberDto,
  ) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ownerId: inviterId },
    });
    if (!workspace)
      throw new ForbiddenException('Only the owner can invite members');

    // Check if already a member by email
    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.id === inviterId) {
        throw new BadRequestException('You cannot invite yourself');
      }
      const alreadyMember = await this.db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      });
      if (alreadyMember)
        throw new ConflictException(
          'User is already a member of this workspace',
        );
    }

    // Check for existing pending invite
    const existingInvite = await this.db.workspaceInvite.findUnique({
      where: {
        workspaceId_invitee_email: { workspaceId, invitee_email: dto.email },
      },
    });
    if (existingInvite && existingInvite.status === 'pending') {
      throw new ConflictException(
        'A pending invite already exists for this user',
      );
    }

    const inviter = await this.db.user.findUniqueOrThrow({
      where: { id: inviterId },
      select: { firstName: true, lastName: true },
    });

    await this.db.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: existingUser?.id ?? inviterId, // fallback, real delivery to invitee when they register
          type: 'workspace_invite',
          title: 'Workspace Invitation',
          message: `${inviter.firstName} ${inviter.lastName} invited you to join "${workspace.name}"`,
        },
      });

      await tx.workspaceInvite.upsert({
        where: {
          workspaceId_invitee_email: { workspaceId, invitee_email: dto.email },
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
          invitee_email: dto.email,
          invitee_id: existingUser?.id ?? null,
        },
      });
    });

    return { message: 'Invitation sent successfully' };
  }
}
