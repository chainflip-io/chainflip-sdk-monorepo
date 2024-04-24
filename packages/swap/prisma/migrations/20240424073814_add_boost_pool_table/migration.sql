-- CreateTable
CREATE TABLE "public"."BoostPool" (
    "id" SERIAL NOT NULL,
    "depositEnabled" BOOLEAN NOT NULL,
    "withdrawEnabled" BOOLEAN NOT NULL,
    "boostEnabled" BOOLEAN NOT NULL,
    "asset" "public"."InternalAsset" NOT NULL,
    "feeTierPips" INTEGER NOT NULL,

    CONSTRAINT "BoostPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoostPool_asset_feeTierPips_key" ON "public"."BoostPool"("asset", "feeTierPips");
