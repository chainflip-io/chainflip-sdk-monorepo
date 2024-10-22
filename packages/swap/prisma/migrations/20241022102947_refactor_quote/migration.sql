/*
  Warnings:

  - You are about to drop the `QuoteResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "private"."QuoteResult";

-- CreateTable
CREATE TABLE "private"."Quote" (
   "id" SERIAL NOT NULL,
   "swapDepositChannelId" BIGINT NOT NULL,
   "srcAsset" "public"."InternalAsset" NOT NULL,
   "destAsset" "public"."InternalAsset" NOT NULL,
   "depositAmount" DECIMAL(30,0) NOT NULL,
   "intermediateAmount" DECIMAL(30,0),
   "egressAmount" DECIMAL(30,0) NOT NULL,
   "estimatedPrice" DECIMAL(65,30) NOT NULL,
   "executedPrice" DECIMAL(65,30),
   "executedSlippagePercentage" DECIMAL(65,30),

   CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_swapDepositChannelId_key" ON "private"."Quote"("swapDepositChannelId");

-- AddForeignKey
ALTER TABLE "private"."Quote" ADD CONSTRAINT "Quote_swapDepositChannelId_fkey" FOREIGN KEY ("swapDepositChannelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
