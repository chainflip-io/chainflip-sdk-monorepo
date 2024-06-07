-- AlterTable
ALTER TABLE "public"."ChainTracking" ADD COLUMN     "blockTrackedAtStateChainBlock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."ChainTracking" ALTER COLUMN "blockTrackedAtStateChainBlock" DROP DEFAULT;
