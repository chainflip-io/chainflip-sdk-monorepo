-- CreateEnum
CREATE TYPE "private"."FactorType" AS ENUM ('MEV', 'REPLENISHMENT');

DROP INDEX "private"."MevFactor_marketMakerId_asset_side_key";

ALTER TABLE "private"."MevFactor" RENAME TO "Factor";

ALTER TABLE "private"."Factor" RENAME CONSTRAINT "MevFactor_pkey" TO "Factor_pkey";
ALTER TABLE "private"."Factor" RENAME CONSTRAINT "MevFactor_marketMakerId_fkey" TO "Factor_marketMakerId_fkey";

ALTER TABLE "private"."Factor"
ADD COLUMN type private."FactorType",
ALTER COLUMN side DROP NOT NULL,
ALTER COLUMN "factor" SET DATA TYPE DOUBLE PRECISION;

UPDATE private."Factor" SET type = 'MEV';

ALTER TABLE private."Factor"
ALTER COLUMN type SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Factor_marketMakerId_type_asset_side_key" ON "private"."Factor"("marketMakerId", "type", "asset", "side");
