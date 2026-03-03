/*
  Warnings:

  - You are about to drop the column `workbenchId` on the `Resource` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_workbenchId_fkey";

-- DropIndex
DROP INDEX "Resource_workspaceId_workbenchId_idx";

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "workbenchId";

-- CreateTable
CREATE TABLE "WorkbenchResource" (
    "workbenchId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkbenchResource_pkey" PRIMARY KEY ("workbenchId","resourceId")
);

-- CreateIndex
CREATE INDEX "Resource_workspaceId_idx" ON "Resource"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkbenchResource" ADD CONSTRAINT "WorkbenchResource_workbenchId_fkey" FOREIGN KEY ("workbenchId") REFERENCES "Workbench"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbenchResource" ADD CONSTRAINT "WorkbenchResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
