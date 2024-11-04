/*
  Warnings:

  - A unique constraint covering the columns `[swapRequestNativeId]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "private"."Quote" ADD COLUMN     "channelOpenedAt" TIMESTAMP(3),
ADD COLUMN     "slippageTolerancePercent" DECIMAL(65,30),
ADD COLUMN     "swapRequestNativeId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_swapRequestNativeId_key" ON "private"."Quote"("swapRequestNativeId");

-- Migrate data
UPDATE "private"."Quote" q SET "channelOpenedAt" = (SELECT "createdAt" from "public"."SwapDepositChannel" c where c."id" = q."swapDepositChannelId");
UPDATE "private"."Quote" q SET "swapRequestNativeId" = (SELECT "nativeId" from "public"."SwapRequest" r where r."id" = q."swapRequestId");

-- AlterTable
ALTER TABLE "private"."Quote" ALTER COLUMN "channelOpenedAt" SET NOT NULL;
