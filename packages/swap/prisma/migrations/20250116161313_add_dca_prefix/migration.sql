-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" RENAME COLUMN "chunkIntervalBlocks" TO "dcaChunkIntervalBlocks";
ALTER TABLE "public"."SwapDepositChannel" RENAME COLUMN "numberOfChunks" TO "dcaNumberOfChunks";

-- AlterTable
ALTER TABLE "public"."SwapRequest" RENAME COLUMN "chunkIntervalBlocks" TO "dcaChunkIntervalBlocks";
ALTER TABLE "public"."SwapRequest" RENAME COLUMN "numberOfChunks" TO "dcaNumberOfChunks";
