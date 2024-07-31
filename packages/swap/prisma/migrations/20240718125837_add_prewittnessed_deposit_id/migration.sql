/*
  Warnings:

  - A unique constraint covering the columns `[srcAsset,prewitnessedDepositId]` on the table `Swap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "prewitnessedDepositId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Swap_srcAsset_prewitnessedDepositId_key" ON "public"."Swap"("srcAsset", "prewitnessedDepositId");
