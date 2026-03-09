/*
  Warnings:

  - You are about to drop the column `difficulty` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `QuizQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "difficulty";

-- AlterTable
ALTER TABLE "QuizQuestion" DROP COLUMN "order";
