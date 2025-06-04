/*
  Warnings:

  - You are about to drop the column `augment` on the `MarketMaker` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "private"."MarketMaker" ADD COLUMN "mevFactor" INTEGER NOT NULL DEFAULT 0;

UPDATE "private"."MarketMaker" SET "mevFactor" = "augment";

ALTER TABLE "private"."MarketMaker" DROP COLUMN "augment";
