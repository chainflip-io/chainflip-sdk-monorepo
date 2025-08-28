-- CreateEnum
CREATE TYPE "public"."SwapAbortedReason" AS ENUM ('PriceImpactLimit', 'MinPriceViolation', 'OraclePriceSlippageExceeded', 'OraclePriceStale', 'PredecessorSwapFailure', 'SafeModeActive');

-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "swapAbortedAt" TIMESTAMP(3),
ADD COLUMN     "swapAbortedBlockIndex" TEXT,
ADD COLUMN     "swapAbortedReason" "public"."SwapAbortedReason";
