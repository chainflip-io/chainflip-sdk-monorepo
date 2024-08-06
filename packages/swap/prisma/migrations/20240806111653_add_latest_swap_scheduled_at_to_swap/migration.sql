/*
  Warnings:

  - Added the required column `latestSwapScheduledBlockIndex` to the `Swap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "latestSwapScheduledAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "latestSwapScheduledBlockIndex" TEXT NOT NULL,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
