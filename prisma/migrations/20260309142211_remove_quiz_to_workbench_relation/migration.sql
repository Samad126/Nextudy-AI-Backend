/*
  Warnings:

  - You are about to drop the column `workbenchId` on the `Quiz` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_workbenchId_fkey";

-- DropIndex
DROP INDEX "Quiz_workspaceId_workbenchId_idx";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "workbenchId";

-- CreateIndex
CREATE INDEX "Quiz_workspaceId_idx" ON "Quiz"("workspaceId");
