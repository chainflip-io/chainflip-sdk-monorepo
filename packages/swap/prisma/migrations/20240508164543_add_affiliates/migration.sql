-- CreateTable
CREATE TABLE "public"."SwapDepositChannelAffiliate" (
    "id" BIGSERIAL NOT NULL,
    "account" TEXT NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "channelId" BIGINT NOT NULL,

    CONSTRAINT "SwapDepositChannelAffiliate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwapDepositChannelAffiliate_channelId_idx" ON "public"."SwapDepositChannelAffiliate"("channelId");

-- AddForeignKey
ALTER TABLE "public"."SwapDepositChannelAffiliate" ADD CONSTRAINT "SwapDepositChannelAffiliate_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
