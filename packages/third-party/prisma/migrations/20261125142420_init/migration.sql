-- CreateEnum
CREATE TYPE "ThirdPartyProvider" AS ENUM ('SWAPKIT');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('Polkadot', 'Ethereum', 'Bitcoin', 'Arbitrum', 'Solana', 'Assethub', 'Tron', 'Bsc');

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
    "srcChain" "Chain" NOT NULL,
    "srcAmount" DECIMAL(78,0) NOT NULL,
    "srcAddress" TEXT NOT NULL,
    "destAsset" TEXT NOT NULL,
    "destChain" "Chain" NOT NULL,
    "expectedDestAmount" DECIMAL(78,0) NOT NULL,
    "destAmount" DECIMAL(78,0),
    "destAddress" TEXT NOT NULL,
    "txHash" TEXT,
    "depositChannelId" TEXT,
    "depositAddress" TEXT,
    "affiliateFeeBps" INTEGER NOT NULL,
    "providerStatus" JSONB,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ThirdPartySwaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySwaps_srcChain_txHash_key" ON "ThirdPartySwaps"("srcChain", "txHash");
