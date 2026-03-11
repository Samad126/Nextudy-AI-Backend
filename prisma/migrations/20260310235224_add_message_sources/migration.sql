/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `ChatHistory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatHistory" DROP CONSTRAINT "ChatHistory_workspaceId_fkey";

-- DropIndex
DROP INDEX "ChatHistory_workspaceId_workbenchId_idx";

-- AlterTable
ALTER TABLE "ChatHistory" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "sources" JSONB;

-- CreateIndex
CREATE INDEX "ChatHistory_workbenchId_idx" ON "ChatHistory"("workbenchId");
