-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "totalBrokerCommissionBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."SwapRequest" ALTER COLUMN "totalBrokerCommissionBps" DROP DEFAULT;

-- backflill totalBrokerCommissionBps
UPDATE "public"."SwapRequest" sr
    SET "totalBrokerCommissionBps" = dc."totalBrokerCommissionBps"
    FROM "public"."SwapDepositChannel" dc
    WHERE sr."swapDepositChannelId" = dc."id";