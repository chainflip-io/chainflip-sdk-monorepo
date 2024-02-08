-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failedBlockIndex" TEXT;

-- backfill with default values
UPDATE TABLE "public"."FailedSwap"
SET "failedAt" = 'epoch', "failedBlockIndex" = '0-0';

-- Make columns not null
ALTER TABLE "public"."FailedSwap" ALTER COLUMN "failedAt" SET NOT NULL,
ALTER COLUMN "failedBlockIndex" SET NOT NULL;
