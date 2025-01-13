-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "maxBoostFeeBps" INTEGER NOT NULL DEFAULT 0;

UPDATE "public"."SwapRequest" sr
    SET "maxBoostFeeBps" = dc."maxBoostFeeBps"
    FROM "public"."SwapDepositChannel" dc
    WHERE sr."swapDepositChannelId" = dc."id";