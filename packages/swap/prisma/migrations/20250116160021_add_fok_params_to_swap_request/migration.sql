-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "fokMinPriceX128" DECIMAL(78,0),
ADD COLUMN     "fokRefundAddress" TEXT,
ADD COLUMN     "fokRetryDurationBlocks" INTEGER;

-- backfill
UPDATE "public"."SwapRequest" sr
SET "fokMinPriceX128" = dc."fokMinPriceX128",
    "fokRefundAddress" = dc."fokRefundAddress",
    "fokRetryDurationBlocks" = dc."fokRetryDurationBlocks"
FROM "public"."SwapDepositChannel" dc
WHERE sr."swapDepositChannelId" = dc."id";