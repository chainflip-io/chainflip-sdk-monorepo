/*
  Warnings:

  - The primary key for the `BlockedAddress` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `BlockedAddress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "private"."BlockedAddress" DROP CONSTRAINT "BlockedAddress_pkey",
DROP COLUMN "id";
