-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "latestSwapScheduledAt" TIMESTAMP(3),
ADD COLUMN     "latestSwapScheduledBlockIndex" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "public"."Swap" SET
  "latestSwapScheduledAt" = "depositReceivedAt",
  "latestSwapScheduledBlockIndex" = "depositReceivedBlockIndex";

ALTER TABLE "public"."Swap" ALTER COLUMN "latestSwapScheduledAt" SET NOT NULL;
ALTER TABLE "public"."Swap" ALTER COLUMN "latestSwapScheduledBlockIndex" SET NOT NULL;
