-- CreateTable
CREATE TABLE "public"."SwapDepositChannelBeneficiary" (
    "id" BIGSERIAL NOT NULL,
    "account" TEXT NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "channelId" BIGINT NOT NULL,

    CONSTRAINT "SwapDepositChannelBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwapDepositChannelBeneficiary_channelId_idx" ON "public"."SwapDepositChannelBeneficiary"("channelId");

-- AddForeignKey
ALTER TABLE "public"."SwapDepositChannelBeneficiary" ADD CONSTRAINT "SwapDepositChannelBeneficiary_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
