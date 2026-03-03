/*
  Warnings:

  - You are about to drop the column `title` on the `ResourceGroups` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `ResourceGroups` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `ResourceGroups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `ResourceGroups` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ResourceGroups_title_key";

-- AlterTable
ALTER TABLE "ResourceGroups" DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "workspaceId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ResourceGroups_name_key" ON "ResourceGroups"("name");

-- AddForeignKey
ALTER TABLE "ResourceGroups" ADD CONSTRAINT "ResourceGroups_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
