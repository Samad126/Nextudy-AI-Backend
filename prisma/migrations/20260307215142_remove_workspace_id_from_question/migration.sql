/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `Question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_workspaceId_fkey";

-- DropIndex
DROP INDEX "Question_workspaceId_workbenchId_idx";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "workspaceId";

-- CreateIndex
CREATE INDEX "Question_workbenchId_idx" ON "Question"("workbenchId");
