-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "swapCanceledAt" TIMESTAMP(3),
ADD COLUMN     "swapCanceledBlockIndex" TEXT;
