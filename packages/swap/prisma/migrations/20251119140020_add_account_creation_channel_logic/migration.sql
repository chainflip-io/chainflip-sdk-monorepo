BEGIN;

-- AlterTable
ALTER TABLE "private"."SolanaPendingTxRef" ADD COLUMN     "accountCreationDepositChannelId" BIGINT;

-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "accountCreationDepositChannelId" BIGINT;

-- CreateEnum
CREATE TYPE "private"."DepositChannelType" AS ENUM ('ACCOUNT_CREATION', 'SWAP', 'LIQUIDITY');

-- AlterTable
ALTER TABLE "private"."DepositChannel" ADD COLUMN     "type" "private"."DepositChannelType";

UPDATE private."DepositChannel" SET "type" = CASE
    WHEN "isSwapping" THEN 'SWAP'::private."DepositChannelType"
    ELSE 'LIQUIDITY'::private."DepositChannelType"
END;

ALTER TABLE "private"."DepositChannel" ALTER COLUMN     "type" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "accountCreationDepositChannelId" BIGINT;

-- CreateTable
CREATE TABLE "public"."AccountCreationDepositChannel" (
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
    "isExpired" BOOLEAN NOT NULL,
    "openedThroughBackend" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "estimatedExpiryAt" TIMESTAMPTZ(3),

    CONSTRAINT "AccountCreationDepositChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountCreationDepositChannel_depositAddress_idx" ON "public"."AccountCreationDepositChannel"("depositAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCreationDepositChannel_issuedBlock_chain_channelId_key" ON "public"."AccountCreationDepositChannel"("issuedBlock", "chain", "channelId");

-- AddForeignKey
ALTER TABLE "public"."AccountCreationDepositChannel" ADD CONSTRAINT "AccountCreationDepositChannel_swapBeneficiaryId_fkey" FOREIGN KEY ("swapBeneficiaryId") REFERENCES "public"."SwapBeneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_accountCreationDepositChannelId_fkey" FOREIGN KEY ("accountCreationDepositChannelId") REFERENCES "public"."AccountCreationDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."SolanaPendingTxRef" ADD CONSTRAINT "SolanaPendingTxRef_accountCreationDepositChannelId_fkey" FOREIGN KEY ("accountCreationDepositChannelId") REFERENCES "public"."AccountCreationDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FailedSwap" ADD CONSTRAINT "FailedSwap_accountCreationDepositChannelId_fkey" FOREIGN KEY ("accountCreationDepositChannelId") REFERENCES "public"."AccountCreationDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
