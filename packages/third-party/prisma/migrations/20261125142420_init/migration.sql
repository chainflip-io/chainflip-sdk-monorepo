-- CreateEnum
CREATE TYPE "ThirdPartyProvider" AS ENUM ('SWAPKIT');

-- CreateEnum
CREATE TYPE "ThirdPartySwapStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'SWAPPING', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "ThirdPartySwaps" (
    "id" SERIAL NOT NULL,
    "provider" "ThirdPartyProvider" NOT NULL,
    "providerRouteId" TEXT NOT NULL,
    "protocol" TEXT,
    "status" "ThirdPartySwapStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "srcAsset" TEXT NOT NULL,
    "srcChainId" TEXT NOT NULL,
    "srcAmount" DECIMAL(78,0) NOT NULL,
    "srcAddress" TEXT NOT NULL,
    "destAsset" TEXT NOT NULL,
    "destChainId" TEXT NOT NULL,
    "expectedDestAmount" DECIMAL(78,0) NOT NULL,
    "destAmount" DECIMAL(78,0),
    "destAddress" TEXT NOT NULL,
    "txHash" TEXT,
    "depositChannelId" TEXT,
    "depositAddress" TEXT,
    "affiliateFeeBps" INTEGER NOT NULL,
    "providerStatus" JSONB,
    "nextCheckAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ThirdPartySwaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThirdPartySwaps_nextCheckAt_idx" ON "ThirdPartySwaps"("nextCheckAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwaps_srcChainId_txHash_key" ON "ThirdPartySwaps"("srcChainId", "txHash");
