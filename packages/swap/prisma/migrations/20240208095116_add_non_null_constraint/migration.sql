UPDATE "public"."FailedSwap" SET "reason" = 'BelowMinimumDeposit';

-- AlterTable
ALTER TABLE "public"."FailedSwap" ALTER COLUMN "reason" SET NOT NULL;
