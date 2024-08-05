-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN     "fokMinPrice" DECIMAL,
ADD COLUMN     "fokRefundAddress" TEXT,
ADD COLUMN     "fokRetryDuration" INTEGER;
