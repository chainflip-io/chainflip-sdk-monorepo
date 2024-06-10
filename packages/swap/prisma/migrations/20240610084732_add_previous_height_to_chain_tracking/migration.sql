-- AlterTable
ALTER TABLE "public"."ChainTracking" ADD COLUMN "eventWitnessedBlock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "previousHeight" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "public"."ChainTracking" ALTER COLUMN "eventWitnessedBlock" DROP DEFAULT;
