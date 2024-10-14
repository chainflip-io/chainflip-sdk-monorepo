-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "chunkIntervalBlocks" INTEGER,
ADD COLUMN     "numberOfChunks" INTEGER;

-- backfill dca params into swap request
UPDATE "SwapRequest" sr
SET
	"numberOfChunks" = sc."numberOfChunks",
  "chunkIntervalBlocks" = sc."chunkIntervalBlocks"
FROM "SwapDepositChannel" sc
WHERE sr."swapDepositChannelId" = sc.id;
