/*
  Warnings:

  - You are about to drop the column `chunkIntervalBlocks` on the `SwapDepositChannel` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfChunks` on the `SwapDepositChannel` table. All the data in the column will be lost.
  - You are about to drop the column `chunkIntervalBlocks` on the `SwapRequest` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfChunks` on the `SwapRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" DROP COLUMN "chunkIntervalBlocks",
DROP COLUMN "numberOfChunks",
ADD COLUMN     "dcaChunkIntervalBlocks" INTEGER,
ADD COLUMN     "dcaNumberOfChunks" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."SwapRequest" DROP COLUMN "chunkIntervalBlocks",
DROP COLUMN "numberOfChunks",
ADD COLUMN     "dcaChunkIntervalBlocks" INTEGER,
ADD COLUMN     "dcaNumberOfChunks" INTEGER;
