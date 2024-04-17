-- CreateTable
CREATE TABLE "private"."QuoteResult" (
    "id" SERIAL NOT NULL,
    "srcAsset" "public"."InternalAsset" NOT NULL,
    "destAsset" "public"."InternalAsset" NOT NULL,
    "depositAmount" DECIMAL(30,0) NOT NULL,
    "quoterIntermediate" DECIMAL(30,0),
    "quoterOutput" DECIMAL(30,0) NOT NULL,
    "quoterDuration" INTEGER NOT NULL,
    "quoterFees" JSONB,
    "poolIntermediate" DECIMAL(30,0),
    "poolOutput" DECIMAL(30,0) NOT NULL,
    "poolDuration" INTEGER,
    "poolFees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteResult_srcAsset_destAsset_key" ON "private"."QuoteResult"("srcAsset", "destAsset");
