-- CreateEnum
CREATE TYPE "IntegratorProvider" AS ENUM ('SWAPKIT');

-- CreateEnum
CREATE TYPE "IntegratorSwapStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'SWAPPING', 'COMPLETED', 'REFUNDED', 'FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "IntegratorSwap" (
    "id" SERIAL NOT NULL,
    "provider" "IntegratorProvider" NOT NULL,
    "providerRouteId" TEXT NOT NULL,
    "underlyingProvider" TEXT,
    "status" "IntegratorSwapStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "srcAsset" TEXT NOT NULL,
    "srcChainId" TEXT NOT NULL,
    "srcAmount" DECIMAL(78,0) NOT NULL,
    "srcAddress" TEXT NOT NULL,
    "destAsset" TEXT NOT NULL,
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

    CONSTRAINT "IntegratorSwap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegratorSwap_nextCheckAt_idx" ON "IntegratorSwap"("nextCheckAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegratorSwap_srcChainId_txHash_key" ON "IntegratorSwap"("srcChainId", "txHash");
