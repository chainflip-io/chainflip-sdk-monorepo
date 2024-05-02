/*
  Warnings:

  - Added the required column `version` to the `QuoteResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "private"."QuoteResult" ADD COLUMN     "version" INTEGER;
UPDATE "private"."QuoteResult" SET "version" = 1;
ALTER TABLE "private"."QuoteResult" ALTER COLUMN "version" SET NOT NULL;
