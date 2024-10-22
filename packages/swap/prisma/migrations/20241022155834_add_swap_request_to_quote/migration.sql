/*
  Warnings:

  - A unique constraint covering the columns `[swapRequestId]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "private"."Quote" ADD COLUMN     "swapRequestId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_swapRequestId_key" ON "private"."Quote"("swapRequestId");

-- AddForeignKey
ALTER TABLE "private"."Quote" ADD CONSTRAINT "Quote_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
