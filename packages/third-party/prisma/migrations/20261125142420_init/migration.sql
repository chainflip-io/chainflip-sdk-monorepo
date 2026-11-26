-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "third_party";

-- CreateEnum
CREATE TYPE "ThirdPartyProvider" AS ENUM ('SWAPKIT');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('Polkadot', 'Ethereum', 'Bitcoin', 'Arbitrum', 'Solana', 'Assethub', 'Tron', 'Bsc');

-- CreateEnum
CREATE TYPE "ThirdPartySwapStatus" AS ENUM ('PENDING', 'SWAPPING', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ThirdPartySwapType" AS ENUM ('WALLET', 'DEPOSIT_ADDRESS');

-- CreateTable
CREATE TABLE "ThirdPartySwapRequests" (
    "id" TEXT NOT NULL,
    "provider" "ThirdPartyProvider" NOT NULL,
    "routeId" TEXT NOT NULL,
    "protocols" TEXT[],
    "type" "ThirdPartySwapType" NOT NULL,
    "srcAsset" TEXT NOT NULL,
    "srcChain" "Chain" NOT NULL,
    "srcAmount" DECIMAL(78,0) NOT NULL,
    "srcAddress" TEXT,
    "destAsset" TEXT NOT NULL,
    "destChain" "Chain" NOT NULL,
    "destAddress" TEXT NOT NULL,
    "minDestAmount" DECIMAL(78,0) NOT NULL,
    "expectedDestAmount" DECIMAL(78,0) NOT NULL,
    "refundAddress" TEXT,
    "slippageToleranceBps" INTEGER NOT NULL,
    "affiliateFeeBps" INTEGER NOT NULL,
    "depositChannelId" TEXT,
    "depositAddress" TEXT,
    "txDataHash" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThirdPartySwapRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPartySwaps" (
    "id" SERIAL NOT NULL,
    "swapRequestId" TEXT NOT NULL,
    "status" "ThirdPartySwapStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT NOT NULL,
    "destAmount" DECIMAL(78,0),
    "providerStatus" JSONB,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ThirdPartySwaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_routeId_idx" ON "ThirdPartySwapRequests"("routeId");

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_expiresAt_idx" ON "ThirdPartySwapRequests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwapRequests_provider_depositChannelId_key" ON "ThirdPartySwapRequests"("provider", "depositChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwaps_swapRequestId_key" ON "ThirdPartySwaps"("swapRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwaps_txHash_key" ON "ThirdPartySwaps"("txHash");

-- AddForeignKey
ALTER TABLE "ThirdPartySwaps" ADD CONSTRAINT "ThirdPartySwaps_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "ThirdPartySwapRequests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
