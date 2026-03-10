/*
  Warnings:

  - Added the required column `updated_at` to the `Flashcard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "FlashcardResource" (
    "flashcardId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardResource_pkey" PRIMARY KEY ("flashcardId","resourceId")
);

-- CreateIndex
CREATE INDEX "FlashcardResource_flashcardId_idx" ON "FlashcardResource"("flashcardId");

-- CreateIndex
CREATE INDEX "FlashcardResource_resourceId_idx" ON "FlashcardResource"("resourceId");

-- AddForeignKey
ALTER TABLE "FlashcardResource" ADD CONSTRAINT "FlashcardResource_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardResource" ADD CONSTRAINT "FlashcardResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
