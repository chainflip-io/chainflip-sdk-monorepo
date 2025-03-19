-- backfill simple columns from deposit channel to swap request
UPDATE "public"."SwapRequest" sr
SET "maxBoostFeeBps" = dc."maxBoostFeeBps",
    "totalBrokerCommissionBps" = dc."totalBrokerCommissionBps",
    "fokMinPriceX128" = dc."fokMinPriceX128",
    "fokRefundAddress" = dc."fokRefundAddress",
    "fokRetryDurationBlocks" = dc."fokRetryDurationBlocks"
FROM "public"."SwapDepositChannel" dc
WHERE sr."swapDepositChannelId" = dc."id";

-- removed previously backfilled beneficiaries
DELETE FROM "public"."SwapBeneficiary" sb
    USING "public"."SwapRequest" sr
    WHERE sb."swapRequestId" = sr."id" AND sr."originType" = 'DEPOSIT_CHANNEL';

-- backfill swap request beneficiaries
INSERT INTO "public"."SwapBeneficiary" ("account", "commissionBps", "type", "swapRequestId")
    SELECT b."account", b."commissionBps", b.type, sr."id"
    FROM "public"."SwapRequest" sr
         JOIN "public"."SwapDepositChannel" dc ON sr."swapDepositChannelId" = dc."id"
         JOIN "public"."SwapBeneficiary" b ON dc."id" = b."channelId";
