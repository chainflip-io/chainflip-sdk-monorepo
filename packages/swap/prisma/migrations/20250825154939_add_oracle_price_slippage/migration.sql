-- AlterTable
ALTER TABLE "private"."Quote" ADD COLUMN     "livePriceSlippageTolerancePercent" DECIMAL(65,30),
ADD COLUMN     "recommendedLivePriceSlippageTolerancePercent" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN     "fokMaxOraclePriceSlippage" INTEGER;

-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "fokMaxOraclePriceSlippage" INTEGER;
