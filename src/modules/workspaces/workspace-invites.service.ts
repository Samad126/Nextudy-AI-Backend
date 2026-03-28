import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { WorkspacesRepository } from './workspaces.repository.js';
import { WorkspaceMembersRepository } from './workspace-members.repository.js';
import { WorkspaceInvitesRepository } from './workspace-invites.repository.js';

@Injectable()
export class WorkspaceInvitesService {
  private readonly logger = new Logger(WorkspaceInvitesService.name);

  constructor(
    private readonly repo: WorkspacesRepository,
    private readonly membersRepo: WorkspaceMembersRepository,
    private readonly invitesRepo: WorkspaceInvitesRepository,
  ) {}

  async inviteMember(
    inviterId: number,
    workspaceId: number,
    dto: InviteMemberDto,
  ) {
    const workspace = await this.repo.findWorkspaceAsOwner(
      workspaceId,
      inviterId,
    );
    if (!workspace)
      throw new ForbiddenException('Only the owner can invite members');

    const existingUser = await this.invitesRepo.findUserByEmail(dto.email);

    if (existingUser) {
      if (existingUser.id === inviterId) {
        throw new BadRequestException('You cannot invite yourself');
      }
      const alreadyMember = await this.membersRepo.findMemberByWorkspaceAndUser(
        workspaceId,
        existingUser.id,
      );
      if (alreadyMember) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
    } else {
      throw new BadRequestException('User not found');
    }

    const existingInvite = await this.invitesRepo.findExistingInvite(
      workspaceId,
      dto.email,
    );
    if (existingInvite && existingInvite.status === 'pending') {
      throw new ConflictException(
        'A pending invite already exists for this user',
      );
    }

    const inviter = await this.invitesRepo.findUserById(inviterId);

    await this.invitesRepo.createInviteWithNotification(
      workspaceId,
      inviterId,
      dto.email,
      existingUser?.id ?? null,
      existingUser?.id ?? inviterId,
      `${inviter.firstName} ${inviter.lastName}`,
      workspace.name,
    );

    this.logger.log(`Invite sent to ${dto.email} for workspace ${workspaceId}`);
    return { message: 'Invitation sent successfully' };
  }
}
