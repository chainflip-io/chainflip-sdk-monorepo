-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "depositBoostedAt" TIMESTAMP(3),
ADD COLUMN     "depositBoostedBlockIndex" TEXT;
