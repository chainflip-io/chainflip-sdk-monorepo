/*
  Warnings:

  - You are about to drop the column `latestSwapScheduledAt` on the `Swap` table. All the data in the column will be lost.
  - You are about to drop the column `latestSwapScheduledBlockIndex` on the `Swap` table. All the data in the column will be lost.
  - Added the required column `swapScheduledAt` to the `Swap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `swapScheduledBlockIndex` to the `Swap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Swap" RENAME COLUMN "latestSwapScheduledAt" TO "swapScheduledAt";
ALTER TABLE "public"."Swap" RENAME COLUMN "latestSwapScheduledBlockIndex" TO "swapScheduledBlockIndex";

ALTER TABLE "public"."Swap"
ADD COLUMN     "latestSwapRescheduledAt" TIMESTAMP(3),
ADD COLUMN     "latestSwapRescheduledBlockIndex" TEXT;
