/*
  Warnings:

  - You are about to drop the column `fokMaxOraclePriceSlippage` on the `SwapDepositChannel` table. All the data in the column will be lost.
  - You are about to drop the column `fokMaxOraclePriceSlippage` on the `SwapRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" DROP COLUMN "fokMaxOraclePriceSlippage",
ADD COLUMN     "fokMaxOraclePriceSlippageBps" INTEGER;

-- AlterTable
ALTER TABLE "public"."SwapRequest" DROP COLUMN "fokMaxOraclePriceSlippage",
ADD COLUMN     "fokMaxOraclePriceSlippageBps" INTEGER;
