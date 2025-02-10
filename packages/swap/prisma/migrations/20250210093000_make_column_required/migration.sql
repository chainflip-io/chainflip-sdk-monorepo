/*
  Warnings:

  - You are about to drop the `backup_swap_fees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `backup_swaps` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `swapRequestedBlockIndex` on table `SwapRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."SwapRequest" ALTER COLUMN "swapRequestedBlockIndex" SET NOT NULL;

-- DropTable
DROP TABLE "private"."backup_swap_fees";

-- DropTable
DROP TABLE "private"."backup_swaps";

-- CreateTable
CREATE TABLE "private"."SolanaPendingTxRef" (
    "id" SERIAL NOT NULL,
    "address" TEXT,
    "slot" BIGINT,
    "swapDepositChannelId" BIGINT,
    "vaultSwapRequestId" BIGINT,
    "failedVaultSwapId" INTEGER,

    CONSTRAINT "SolanaPendingTxRef_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "private"."SolanaPendingTxRef" ADD CONSTRAINT "SolanaPendingTxRef_swapDepositChannelId_fkey" FOREIGN KEY ("swapDepositChannelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."SolanaPendingTxRef" ADD CONSTRAINT "SolanaPendingTxRef_vaultSwapRequestId_fkey" FOREIGN KEY ("vaultSwapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."SolanaPendingTxRef" ADD CONSTRAINT "SolanaPendingTxRef_failedVaultSwapId_fkey" FOREIGN KEY ("failedVaultSwapId") REFERENCES "public"."FailedSwap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
