-- AlterTable
ALTER TABLE "private"."Quote" RENAME COLUMN "depositAmount" TO "expectedDepositAmount";
ALTER TABLE "private"."Quote" RENAME COLUMN "egressAmount" TO "quotedEgressAmount";
ALTER TABLE "private"."Quote" RENAME COLUMN "estimatedPrice" TO "quotedPrice";
ALTER TABLE "private"."Quote" RENAME COLUMN "intermediateAmount" TO "quotedIntermediateAmount";