/*
  Warnings:

  - You are about to drop the column `type` on the `Broadcast` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Broadcast" DROP COLUMN "type";

-- DropEnum
DROP TYPE "public"."BroadcastType";
