/*
  Warnings:

  - Made the column `mime_type` on table `Resource` required. This step will fail if there are existing NULL values in that column.
  - Made the column `store_id` on table `Resource` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Resource" ALTER COLUMN "mime_type" SET NOT NULL,
ALTER COLUMN "store_id" SET NOT NULL;
