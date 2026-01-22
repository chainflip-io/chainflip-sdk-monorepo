-- CreateTable
CREATE TABLE "public"."LiquidationSwapInfo" (
    "id" SERIAL NOT NULL,
    "swapRequestId" BIGINT NOT NULL,
    "loanId" BIGINT NOT NULL,
    "refundAmount" DECIMAL(30,0),
    "completedAt" TIMESTAMP(3),
    "completedAtBlockIndex" TEXT,
    "abortedAt" TIMESTAMP(3),
    "abortedAtBlockIndex" TEXT,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "LiquidationSwapInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiquidationSwapInfo_swapRequestId_key" ON "public"."LiquidationSwapInfo"("swapRequestId");

-- AddForeignKey
ALTER TABLE "public"."LiquidationSwapInfo" ADD CONSTRAINT "LiquidationSwapInfo_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
