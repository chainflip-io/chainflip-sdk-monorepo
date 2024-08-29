-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN     "chunkIntervalBlocks" INTEGER,
ADD COLUMN     "numberOfChunks" INTEGER DEFAULT 1;
