/*
  Warnings:

  - A unique constraint covering the columns `[swapId]` on the table `FailedSwap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "swapId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "FailedSwap_swapId_key" ON "public"."FailedSwap"("swapId");

-- AddForeignKey
ALTER TABLE "public"."FailedSwap" ADD CONSTRAINT "FailedSwap_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "public"."Swap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- add not null constraint
ALTER TABLE "public"."FailedSwap" ADD CONSTRAINT check_columns_not_null CHECK ("swapId" IS NOT NULL OR "swapDepositChannelId" IS NOT NULL);