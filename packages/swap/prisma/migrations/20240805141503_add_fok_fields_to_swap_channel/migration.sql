-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN     "fokMinPriceX128" DECIMAL(65,0),
ADD COLUMN     "fokRefundAddress" TEXT,
ADD COLUMN     "fokRetryDurationBlocks" INTEGER;
