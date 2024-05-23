-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "effectiveBoostFeeBps" INTEGER;

-- CreateTable
CREATE TABLE "public"."FailedBoost" (
    "id" SERIAL NOT NULL,
    "swapDepositChannelId" BIGINT,
    "amount" DECIMAL(30,0) NOT NULL,

    CONSTRAINT "FailedBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedBoost_swapDepositChannelId_idx" ON "public"."FailedBoost"("swapDepositChannelId");

-- AddForeignKey
ALTER TABLE "public"."FailedBoost" ADD CONSTRAINT "FailedBoost_swapDepositChannelId_fkey" FOREIGN KEY ("swapDepositChannelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
