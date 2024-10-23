/*
  Warnings:

  - You are about to drop the column `executedSlippagePercentage` on the `Quote` table. All the data in the column will be lost.

*/
-- AlterTable

ALTER TABLE "private"."Quote" RENAME COLUMN "executedSlippagePercentage" TO "executedSlippagePercent";