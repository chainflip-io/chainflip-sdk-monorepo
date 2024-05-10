/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `BlockedAddress` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "private"."BlockedAddress_address_idx";

-- CreateIndex
CREATE UNIQUE INDEX "BlockedAddress_address_key" ON "private"."BlockedAddress"("address");
