-- DropForeignKey
ALTER TABLE "WorkspaceInvite" DROP CONSTRAINT "WorkspaceInvite_workspaceId_fkey";

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
