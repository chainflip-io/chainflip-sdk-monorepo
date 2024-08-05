/*
  Warnings:

  - You are about to drop the column `txHash` on the `FailedSwap` table. All the data in the column will be lost.
  - You are about to drop the column `txHash` on the `Swap` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."FailedSwap" RENAME COLUMN "txHash" TO "depositTransactionRef";

-- AlterTable
UPDATE "public"."Swap" SET "depositTransactionRef" = "txHash" WHERE "depositTransactionRef" IS NULL;
ALTER TABLE "public"."Swap" DROP COLUMN "txHash";
