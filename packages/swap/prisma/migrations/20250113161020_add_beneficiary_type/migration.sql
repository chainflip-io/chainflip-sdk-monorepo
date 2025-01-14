-- CreateEnum
CREATE TYPE "public"."BrokerType" AS ENUM ('SUBMITTER', 'AFFILIATE');

-- AlterTable
ALTER TABLE "public"."SwapBeneficiary" ADD COLUMN     "type" "public"."BrokerType" NOT NULL DEFAULT 'AFFILIATE';
ALTER TABLE "public"."SwapBeneficiary" ALTER COLUMN "type" DROP DEFAULT;

-- backfill submitter beneficiary
INSERT INTO "public"."SwapBeneficiary" ("account", "commissionBps", "channelId", "type")
    SELECT '', sdc."brokerCommissionBps", sdc."id", 'SUBMITTER'
    FROM "public"."SwapDepositChannel" sdc
    WHERE sdc."brokerCommissionBps" > 0;
