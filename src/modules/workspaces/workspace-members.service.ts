import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceMemberRole } from '../../../generated/prisma/client.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { WorkspacesRepository } from './workspaces.repository.js';

@Injectable()
export class WorkspaceMembersService {
  private readonly logger = new Logger(WorkspaceMembersService.name);

  constructor(private readonly repo: WorkspacesRepository) {}

  async getMembers(userId: number, workspaceId: number) {
    const workspace = await this.repo.findWorkspaceAsMember(
      workspaceId,
      userId,
    );
    if (!workspace) throw new ForbiddenException('Access denied');

    const members = await this.repo.findMembers(workspaceId);

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
    const workspace = await this.repo.findWorkspaceAsOwner(
      workspaceId,
      requesterId,
    );
    if (!workspace)
      throw new ForbiddenException('Only the owner can change member roles');

    if (dto.role === WorkspaceMemberRole.owner) {
      throw new BadRequestException('Cannot assign owner role to a member');
    }

    const member = await this.repo.findMemberById(memberId, workspaceId);
    if (!member) throw new NotFoundException('Member not found');

    await this.repo.updateMemberRole(memberId, dto);

    return { message: 'Member role updated successfully' };
  }

  async removeMember(
    requesterId: number,
    workspaceId: number,
    memberId: number,
  ) {
    const workspace = await this.repo.findWorkspaceAsOwner(
      workspaceId,
      requesterId,
    );
    if (!workspace)
      throw new ForbiddenException('Only the owner can remove members');

    const member = await this.repo.findMemberById(memberId, workspaceId);
    if (!member) throw new NotFoundException('Member not found');

    await this.repo.deleteMember(memberId);
    this.logger.log(`Member ${memberId} removed from workspace ${workspaceId}`);
    return { message: 'Member removed successfully' };
  }

  async leaveWorkspace(userId: number, workspaceId: number) {
    const workspace = await this.repo.findWorkspaceById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === userId) {
      throw new BadRequestException('Owner cannot leave their own workspace');
    }

    const member = await this.repo.findMemberByUserId(workspaceId, userId);
    if (!member)
      throw new NotFoundException('You are not a member of this workspace');

    await this.repo.deleteMemberByUserId(workspaceId, userId);

    return { message: 'Left workspace successfully' };
  }
}
