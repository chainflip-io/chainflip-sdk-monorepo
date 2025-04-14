-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."FailedSwapReason" ADD VALUE 'CcmUnsupportedForTargetChain';
ALTER TYPE "public"."FailedSwapReason" ADD VALUE 'CcmInvalidMetadata';

-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "refundEgressId" BIGINT,
ALTER COLUMN "destAddress" DROP NOT NULL,
ALTER COLUMN "destChain" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."FailedSwap" ADD CONSTRAINT "FailedSwap_refundEgressId_fkey" FOREIGN KEY ("refundEgressId") REFERENCES "public"."Egress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
