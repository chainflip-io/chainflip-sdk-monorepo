/*
  Warnings:

  - You are about to drop the column `mevFactor` on the `MarketMaker` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "private"."Side" AS ENUM ('BUY', 'SELL');

-- AlterTable
ALTER TABLE "private"."MarketMaker" DROP COLUMN "mevFactor";

-- CreateTable
CREATE TABLE "private"."MevFactor" (
    "id" SERIAL NOT NULL,
    "marketMakerId" INTEGER NOT NULL,
    "asset" "public"."InternalAsset" NOT NULL,
    "side" "private"."Side" NOT NULL,
    "factor" INTEGER NOT NULL,

    CONSTRAINT "MevFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MevFactor_marketMakerId_asset_side_key" ON "private"."MevFactor"("marketMakerId", "asset", "side");

-- AddForeignKey
ALTER TABLE "private"."MevFactor" ADD CONSTRAINT "MevFactor_marketMakerId_fkey" FOREIGN KEY ("marketMakerId") REFERENCES "private"."MarketMaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
