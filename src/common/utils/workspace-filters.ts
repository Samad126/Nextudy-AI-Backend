import { WorkspaceMemberRole } from '../../../generated/prisma/client.js';

export function ownerOrEditorFilter(userId: number) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, role: WorkspaceMemberRole.editor } } },
    ],
  };
}

export function anyMemberFilter(userId: number) {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}
