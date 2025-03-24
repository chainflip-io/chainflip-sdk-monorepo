-- AlterEnum
ALTER TYPE "public"."SwapRequestOrigin" ADD VALUE 'ON_CHAIN';

-- CreateTable
CREATE TABLE "public"."OnChainSwapInfo" (
    "id" SERIAL NOT NULL,
    "swapRequestId" BIGINT NOT NULL,
    "outputAmount" DECIMAL(30,0),
    "refundAmount" DECIMAL(30,0),
    "accountId" TEXT NOT NULL,

    CONSTRAINT "OnChainSwapInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnChainSwapInfo_swapRequestId_key" ON "public"."OnChainSwapInfo"("swapRequestId");

-- AddForeignKey
ALTER TABLE "public"."OnChainSwapInfo" ADD CONSTRAINT "OnChainSwapInfo_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
