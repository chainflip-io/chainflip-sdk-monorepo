-- CreateTable
CREATE TABLE "public"."BoostDelayChainflipBlocks" (
    "id" SERIAL NOT NULL,
    "chain" "public"."Chain" NOT NULL,
    "numBlocks" INTEGER NOT NULL,

    CONSTRAINT "BoostDelayChainflipBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoostDelayChainflipBlocks_chain_key" ON "public"."BoostDelayChainflipBlocks"("chain");
