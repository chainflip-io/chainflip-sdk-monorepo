-- CreateTable
CREATE TABLE "private"."QuotingPair" (
    "id" SERIAL NOT NULL,
    "from" "public"."InternalAsset" NOT NULL,
    "to" "public"."InternalAsset" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QuotingPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotingPair_from_to_key" ON "private"."QuotingPair"("from", "to");
