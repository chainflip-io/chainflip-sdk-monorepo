-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "third_party";

-- CreateEnum
CREATE TYPE "ThirdPartyProvider" AS ENUM ('SWAPKIT');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('Polkadot', 'Ethereum', 'Bitcoin', 'Arbitrum', 'Solana', 'Assethub', 'Tron', 'Bsc');

-- CreateEnum
CREATE TYPE "ThirdPartySwapStatus" AS ENUM ('PENDING', 'SWAPPING', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ThirdPartySwapType" AS ENUM ('DEPOSIT_CHANNEL', 'WALLET');

-- CreateTable
CREATE TABLE "ThirdPartySwapRequests" (
    "id" TEXT NOT NULL,
    "provider" "ThirdPartyProvider" NOT NULL,
    "originType" "ThirdPartySwapType" NOT NULL,
    "routeId" TEXT NOT NULL,
    "routeProviders" TEXT[],
    "srcChain" "Chain" NOT NULL,
    "srcAsset" TEXT NOT NULL,
    "srcAddress" TEXT,
    "destChain" "Chain" NOT NULL,
    "destAsset" TEXT NOT NULL,
    "destAddress" TEXT NOT NULL,
    "refundAddress" TEXT NOT NULL,
    "expectedSwapInputAmount" DECIMAL(30,0) NOT NULL,
    "expectedSwapOutputAmount" DECIMAL(30,0) NOT NULL,
    "expectedMinSwapOutputAmount" DECIMAL(30,0) NOT NULL,
    "slippageTolerancePercent" DECIMAL(65,30),
    "affiliateFeeBps" INTEGER NOT NULL,
    "depositChannelId" TEXT,
    "depositAddress" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThirdPartySwapRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPartySwaps" (
    "id" BIGSERIAL NOT NULL,
    "status" "ThirdPartySwapStatus" NOT NULL DEFAULT 'PENDING',
    "srcChain" "Chain" NOT NULL,
    "txRef" TEXT NOT NULL,
    "swapInputAmount" DECIMAL(30,0),
    "swapOutputAmount" DECIMAL(30,0),
    "refundAmount" DECIMAL(30,0),
    "effectiveSlippagePercent" DECIMAL(65,30),
    "effectiveAffiliateFeeBps" INTEGER,
    "failureReason" TEXT,
    "providerStatus" JSONB,
    "depositFinalisedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "swapRequestId" TEXT NOT NULL,

    CONSTRAINT "ThirdPartySwaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_depositAddress_idx" ON "ThirdPartySwapRequests"("depositAddress");

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_routeId_idx" ON "ThirdPartySwapRequests"("routeId");

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_srcAddress_idx" ON "ThirdPartySwapRequests"("srcAddress");

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_destAddress_idx" ON "ThirdPartySwapRequests"("destAddress");

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_refundAddress_idx" ON "ThirdPartySwapRequests"("refundAddress");

-- CreateIndex
CREATE INDEX "ThirdPartySwapRequests_expiresAt_idx" ON "ThirdPartySwapRequests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwapRequests_provider_depositChannelId_key" ON "ThirdPartySwapRequests"("provider", "depositChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwaps_swapRequestId_key" ON "ThirdPartySwaps"("swapRequestId");

-- CreateIndex
CREATE INDEX "ThirdPartySwaps_srcChain_txRef_idx" ON "ThirdPartySwaps"("srcChain", "txRef");

-- CreateIndex
CREATE INDEX "ThirdPartySwaps_status_updatedAt_idx" ON "ThirdPartySwaps"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "ThirdPartySwaps" ADD CONSTRAINT "ThirdPartySwaps_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "ThirdPartySwapRequests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
