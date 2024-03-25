/*
  Warnings:

  - A unique constraint covering the columns `[transactionRef]` on the table `Broadcast` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Broadcast" ADD COLUMN     "transactionRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Broadcast_transactionRef_key" ON "public"."Broadcast"("transactionRef");
