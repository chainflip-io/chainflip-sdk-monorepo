-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('WAITING_FOR_DEPOSIT', 'ACTIVE', 'SOFT_LIQUIDATION', 'HARD_LIQUIDATION', 'SOFT_VOLUNTARY_LIQUIDATION', 'REPAID');

-- CreateEnum
CREATE TYPE "LoanEventType" AS ENUM ('CREATED', 'INCREASED', 'REPAID_PARTIAL', 'REPAID_FULL', 'SETTLED', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "CollateralEventType" AS ENUM ('ADDED', 'REMOVED', 'SYSTEM_TOP_UP', 'LIQUIDATION_EXCESS_RETURN', 'SWAPPED');

-- CreateEnum
CREATE TYPE "SupplyEventType" AS ENUM ('SUPPLIED', 'WITHDRAWN', 'INTEREST_EARNED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ORIGINATION', 'INTEREST', 'LIQUIDATION', 'LOW_LTV_PENALTY');

-- CreateEnum
CREATE TYPE "LiquidationType" AS ENUM ('SOFT', 'HARD', 'SOFT_VOLUNTARY', 'AUTO_TRIGGERED');

-- CreateEnum
CREATE TYPE "LiquidationReason" AS ENUM ('LTV_THRESHOLD_SOFT', 'LTV_THRESHOLD_HARD', 'USER_INITIATED', 'AUTO_TRIGGER');

-- CreateTable
CREATE TABLE "oracle_price" (
    "id" SERIAL NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "quoteAsset" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "priceValidFromBlock" INTEGER NOT NULL,
    "priceValidToBlock" INTEGER,
    "createdAtEventId" TEXT NOT NULL,
    "updatedAtOracleTimestamp" TIMESTAMP(3),
    "executedBlockIndex" TEXT NOT NULL,

    CONSTRAINT "oracle_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_config" (
    "id" SERIAL NOT NULL,
    "asset" TEXT NOT NULL,
    "canBorrow" BOOLEAN NOT NULL DEFAULT false,
    "canSupply" BOOLEAN NOT NULL DEFAULT false,
    "canCollateralize" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "asset_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lending_pool" (
    "id" SERIAL NOT NULL,
    "asset" TEXT NOT NULL,
    "totalSuppliedAmount" TEXT NOT NULL,
    "totalBorrowedAmount" TEXT NOT NULL,
    "totalAvailableAmount" TEXT NOT NULL,
    "supplyApyBps" INTEGER NOT NULL,
    "borrowApyBps" INTEGER NOT NULL,
    "utilizationRateBps" INTEGER NOT NULL,
    "originationFeeBps" INTEGER NOT NULL,
    "liquidationFeeBps" INTEGER NOT NULL,
    "updatedAtBlock" INTEGER NOT NULL,

    CONSTRAINT "lending_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "principalAmount" TEXT NOT NULL,
    "accruedInterest" TEXT NOT NULL DEFAULT '0',
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "poolId" INTEGER NOT NULL,
    "executedBlockIndex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_position" (
    "id" SERIAL NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "suppliedAmount" TEXT NOT NULL,
    "totalInterestEarned" TEXT NOT NULL DEFAULT '0',
    "poolShareBps" INTEGER NOT NULL DEFAULT 0,
    "poolId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_event" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "type" "LoanEventType" NOT NULL,
    "amount" TEXT,
    "executedBlockIndex" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collateral_event" (
    "id" SERIAL NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "type" "CollateralEventType" NOT NULL,
    "executedBlockIndex" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collateral_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_event" (
    "id" SERIAL NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "type" "SupplyEventType" NOT NULL,
    "executedBlockIndex" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_event" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER,
    "lpAccount" TEXT NOT NULL,
    "type" "FeeType" NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "networkShare" TEXT,
    "lenderShare" TEXT,
    "brokerShare" TEXT,
    "executedBlockIndex" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_event" (
    "id" SERIAL NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "loanId" INTEGER,
    "type" "LiquidationType" NOT NULL,
    "reason" "LiquidationReason",
    "collateralLiquidated" TEXT,
    "debtRepaid" TEXT,
    "excessReturned" TEXT,
    "swapRequestId" INTEGER,
    "executedBlockIndex" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidation_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_channel" (
    "id" SERIAL NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "depositAddress" TEXT NOT NULL,
    "totalDeposited" TEXT NOT NULL DEFAULT '0',
    "createdBlockIndex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_snapshot" (
    "id" SERIAL NOT NULL,
    "asset" TEXT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "totalSupplied" TEXT NOT NULL,
    "totalBorrowed" TEXT NOT NULL,
    "totalAvailable" TEXT NOT NULL,
    "supplyApyBps" INTEGER NOT NULL,
    "borrowApyBps" INTEGER NOT NULL,
    "utilizationBps" INTEGER NOT NULL,
    "executedBlockIndex" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_stat" (
    "id" SERIAL NOT NULL,
    "asset" TEXT NOT NULL,
    "intervalBlocks" INTEGER NOT NULL,
    "totalFeesEarned" TEXT NOT NULL DEFAULT '0',
    "totalLiquidations" INTEGER NOT NULL DEFAULT 0,
    "avgUtilizationBps" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stat" (
    "id" SERIAL NOT NULL,
    "lpAccount" TEXT NOT NULL,
    "totalBorrowed" TEXT NOT NULL DEFAULT '0',
    "totalRepaid" TEXT NOT NULL DEFAULT '0',
    "totalSupplied" TEXT NOT NULL DEFAULT '0',
    "totalWithdrawn" TEXT NOT NULL DEFAULT '0',
    "avgHealthFactor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processor_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastProcessedBlock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "processor_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oracle_price_baseAsset_quoteAsset_idx" ON "oracle_price"("baseAsset", "quoteAsset");

-- CreateIndex
CREATE INDEX "oracle_price_executedBlockIndex_idx" ON "oracle_price"("executedBlockIndex");

-- CreateIndex
CREATE UNIQUE INDEX "asset_config_asset_key" ON "asset_config"("asset");

-- CreateIndex
CREATE UNIQUE INDEX "lending_pool_asset_key" ON "lending_pool"("asset");

-- CreateIndex
CREATE UNIQUE INDEX "loan_loanId_key" ON "loan"("loanId");

-- CreateIndex
CREATE INDEX "loan_lpAccount_idx" ON "loan"("lpAccount");

-- CreateIndex
CREATE INDEX "loan_status_idx" ON "loan"("status");

-- CreateIndex
CREATE INDEX "loan_executedBlockIndex_idx" ON "loan"("executedBlockIndex");

-- CreateIndex
CREATE INDEX "supply_position_lpAccount_idx" ON "supply_position"("lpAccount");

-- CreateIndex
CREATE UNIQUE INDEX "supply_position_lpAccount_asset_key" ON "supply_position"("lpAccount", "asset");

-- CreateIndex
CREATE INDEX "loan_event_lpAccount_idx" ON "loan_event"("lpAccount");

-- CreateIndex
CREATE INDEX "loan_event_loanId_idx" ON "loan_event"("loanId");

-- CreateIndex
CREATE INDEX "loan_event_executedBlockIndex_idx" ON "loan_event"("executedBlockIndex");

-- CreateIndex
CREATE INDEX "collateral_event_lpAccount_idx" ON "collateral_event"("lpAccount");

-- CreateIndex
CREATE INDEX "collateral_event_executedBlockIndex_idx" ON "collateral_event"("executedBlockIndex");

-- CreateIndex
CREATE INDEX "supply_event_lpAccount_idx" ON "supply_event"("lpAccount");

-- CreateIndex
CREATE INDEX "supply_event_executedBlockIndex_idx" ON "supply_event"("executedBlockIndex");

-- CreateIndex
CREATE INDEX "fee_event_lpAccount_idx" ON "fee_event"("lpAccount");

-- CreateIndex
CREATE INDEX "fee_event_loanId_idx" ON "fee_event"("loanId");

-- CreateIndex
CREATE INDEX "fee_event_executedBlockIndex_idx" ON "fee_event"("executedBlockIndex");

-- CreateIndex
CREATE INDEX "liquidation_event_lpAccount_idx" ON "liquidation_event"("lpAccount");

-- CreateIndex
CREATE INDEX "liquidation_event_loanId_idx" ON "liquidation_event"("loanId");

-- CreateIndex
CREATE INDEX "liquidation_event_swapRequestId_idx" ON "liquidation_event"("swapRequestId");

-- CreateIndex
CREATE INDEX "liquidation_event_executedBlockIndex_idx" ON "liquidation_event"("executedBlockIndex");

-- CreateIndex
CREATE INDEX "deposit_channel_lpAccount_idx" ON "deposit_channel"("lpAccount");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_channel_chain_channelId_key" ON "deposit_channel"("chain", "channelId");

-- CreateIndex
CREATE INDEX "pool_snapshot_asset_timestamp_idx" ON "pool_snapshot"("asset", "timestamp");

-- CreateIndex
CREATE INDEX "pool_snapshot_executedBlockIndex_idx" ON "pool_snapshot"("executedBlockIndex");

-- CreateIndex
CREATE UNIQUE INDEX "pool_stat_asset_intervalBlocks_key" ON "pool_stat"("asset", "intervalBlocks");

-- CreateIndex
CREATE UNIQUE INDEX "user_stat_lpAccount_key" ON "user_stat"("lpAccount");

-- AddForeignKey
ALTER TABLE "loan" ADD CONSTRAINT "loan_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "lending_pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_position" ADD CONSTRAINT "supply_position_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "lending_pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_event" ADD CONSTRAINT "loan_event_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan"("loanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_event" ADD CONSTRAINT "fee_event_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan"("loanId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_event" ADD CONSTRAINT "liquidation_event_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan"("loanId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_snapshot" ADD CONSTRAINT "pool_snapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "lending_pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
