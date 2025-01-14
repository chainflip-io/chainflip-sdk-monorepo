-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" RENAME COLUMN "brokerCommissionBps" TO "totalBrokerCommissionBps";

-- backfill total commission
UPDATE "public"."SwapDepositChannel" sdc
SET "totalBrokerCommissionBps" = subquery.totalCommission
FROM (
  SELECT "channelId", SUM("commissionBps") AS totalCommission
  FROM "public"."SwapBeneficiary"
  GROUP BY "channelId"
) AS subquery
WHERE sdc."id" = subquery."channelId";
