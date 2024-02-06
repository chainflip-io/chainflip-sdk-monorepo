-- CreateTable
CREATE TABLE "public"."IgnoredEgress" (
    "id" BIGSERIAL NOT NULL,
    "amount" DECIMAL(30,0) NOT NULL,
    "ignoredAt" TIMESTAMP(3) NOT NULL,
    "ignoredBlockIndex" TEXT NOT NULL,
    "swapId" BIGINT NOT NULL,
    "stateChainErrorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgnoredEgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StateChainError" (
    "id" SERIAL NOT NULL,
    "specVersion" INTEGER NOT NULL,
    "palletIndex" INTEGER NOT NULL,
    "errorIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "docs" TEXT NOT NULL,

    CONSTRAINT "StateChainError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IgnoredEgress_swapId_key" ON "public"."IgnoredEgress"("swapId");

-- CreateIndex
CREATE UNIQUE INDEX "StateChainError_specVersion_palletIndex_errorIndex_key" ON "public"."StateChainError"("specVersion", "palletIndex", "errorIndex");

-- AddForeignKey
ALTER TABLE "public"."IgnoredEgress" ADD CONSTRAINT "IgnoredEgress_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "public"."Swap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IgnoredEgress" ADD CONSTRAINT "IgnoredEgress_stateChainErrorId_fkey" FOREIGN KEY ("stateChainErrorId") REFERENCES "public"."StateChainError"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
