-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "accountCreationDepositChannelId" BIGINT;

-- CreateTable
CREATE TABLE "private"."AccountCreationDepositChannel" (
    "id" BIGSERIAL NOT NULL,
    "channelId" BIGINT NOT NULL,
    "chain" "public"."Chain" NOT NULL,
    "asset" "public"."InternalAsset" NOT NULL,
    "issuedBlock" INTEGER NOT NULL,
    "depositChainExpiryBlock" BIGINT NOT NULL,
    "depositAddress" TEXT NOT NULL,
    "lpAccountId" TEXT NOT NULL,
    "swapBeneficiaryId" BIGINT NOT NULL,
    "refundAddress" TEXT NOT NULL,
    "openingFeePaid" DECIMAL(30,0) NOT NULL,
    "maxBoostFeeBps" INTEGER NOT NULL,

    CONSTRAINT "AccountCreationDepositChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountCreationDepositChannel_depositAddress_idx" ON "private"."AccountCreationDepositChannel"("depositAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCreationDepositChannel_issuedBlock_chain_channelId_key" ON "private"."AccountCreationDepositChannel"("issuedBlock", "chain", "channelId");

-- AddForeignKey
ALTER TABLE "private"."AccountCreationDepositChannel" ADD CONSTRAINT "AccountCreationDepositChannel_swapBeneficiaryId_fkey" FOREIGN KEY ("swapBeneficiaryId") REFERENCES "public"."SwapBeneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_accountCreationDepositChannelId_fkey" FOREIGN KEY ("accountCreationDepositChannelId") REFERENCES "private"."AccountCreationDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
