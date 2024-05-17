/*
  Warnings:

  - You are about to drop the column `boostFeeBps` on the `SwapDepositChannel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" DROP COLUMN "boostFeeBps",
ADD COLUMN     "maxBoostFeeBps" INTEGER NOT NULL DEFAULT 0;
