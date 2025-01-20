-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."FailedSwapReason" ADD VALUE 'DepositWitnessRejected';
ALTER TYPE "public"."FailedSwapReason" ADD VALUE 'InvalidBrokerFees';
ALTER TYPE "public"."FailedSwapReason" ADD VALUE 'InvalidDcaParameters';
ALTER TYPE "public"."FailedSwapReason" ADD VALUE 'InvalidRefundParameters';

-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "ccmAdditionalData" TEXT,
ADD COLUMN     "destAsset" "public"."InternalAsset";
