-- CreateTable
CREATE TABLE "private"."BlockedAddress" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "BlockedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockedAddress_address_idx" ON "private"."BlockedAddress"("address");
