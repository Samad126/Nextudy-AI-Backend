/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `Flashcard` table. All the data in the column will be lost.
  - The primary key for the `FlashcardResource` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `flashcardId` on the `FlashcardResource` table. All the data in the column will be lost.
  - Added the required column `flashcardSetId` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flashcardSetId` to the `FlashcardResource` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Flashcard" DROP CONSTRAINT "Flashcard_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "FlashcardResource" DROP CONSTRAINT "FlashcardResource_flashcardId_fkey";

-- DropIndex
DROP INDEX "Flashcard_workspaceId_idx";

-- DropIndex
DROP INDEX "FlashcardResource_flashcardId_idx";

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "workspaceId",
ADD COLUMN     "flashcardSetId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FlashcardResource" DROP CONSTRAINT "FlashcardResource_pkey",
DROP COLUMN "flashcardId",
ADD COLUMN     "flashcardSetId" INTEGER NOT NULL,
ADD CONSTRAINT "FlashcardResource_pkey" PRIMARY KEY ("flashcardSetId", "resourceId");

-- CreateTable
CREATE TABLE "FlashcardSet" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardSet_workspaceId_idx" ON "FlashcardSet"("workspaceId");

-- CreateIndex
CREATE INDEX "Flashcard_flashcardSetId_idx" ON "Flashcard"("flashcardSetId");

-- CreateIndex
CREATE INDEX "FlashcardResource_flashcardSetId_idx" ON "FlashcardResource"("flashcardSetId");

-- AddForeignKey
ALTER TABLE "FlashcardSet" ADD CONSTRAINT "FlashcardSet_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_flashcardSetId_fkey" FOREIGN KEY ("flashcardSetId") REFERENCES "FlashcardSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardResource" ADD CONSTRAINT "FlashcardResource_flashcardSetId_fkey" FOREIGN KEY ("flashcardSetId") REFERENCES "FlashcardSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
