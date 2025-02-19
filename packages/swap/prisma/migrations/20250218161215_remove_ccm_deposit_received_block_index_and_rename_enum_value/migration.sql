-- AlterEnum
ALTER TYPE "public"."SwapRequestType" RENAME VALUE 'CCM' TO 'LEGACY_CCM';

-- AlterTable
ALTER TABLE "public"."SwapRequest" DROP COLUMN "ccmDepositReceivedBlockIndex";
