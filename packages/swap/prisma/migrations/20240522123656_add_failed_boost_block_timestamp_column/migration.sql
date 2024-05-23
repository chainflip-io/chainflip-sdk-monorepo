/*
  Warnings:

  - Added the required column `failedAtBlockIndex` to the `FailedBoost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `failedAtTimestamp` to the `FailedBoost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."FailedBoost" ADD COLUMN     "failedAtBlockIndex" TEXT NOT NULL,
ADD COLUMN     "failedAtTimestamp" TIMESTAMP(3) NOT NULL;
