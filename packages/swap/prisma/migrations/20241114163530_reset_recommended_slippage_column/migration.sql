/*
  Warnings:

  - You are about to drop the column `numberOfChunks` on the `SwapRequest` table. All the data in the column will be lost.

*/
-- AlterTable
UPDATE "private"."Quote" q SET "recommendedSlippageTolerancePercent" = NULL;
