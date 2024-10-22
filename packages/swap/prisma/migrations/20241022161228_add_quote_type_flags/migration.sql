/*
  Warnings:

  - Added the required column `isBoost` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isDca` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "private"."Quote" ADD COLUMN     "isBoost" BOOLEAN NOT NULL,
ADD COLUMN     "isDca" BOOLEAN NOT NULL;
