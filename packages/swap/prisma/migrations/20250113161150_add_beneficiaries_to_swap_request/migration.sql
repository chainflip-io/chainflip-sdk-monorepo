-- DropForeignKey
ALTER TABLE "public"."SwapBeneficiary" DROP CONSTRAINT "SwapBeneficiary_channelId_fkey";

-- AlterTable
ALTER TABLE "public"."SwapBeneficiary" ADD COLUMN     "swapRequestId" BIGINT,
ALTER COLUMN "channelId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."SwapBeneficiary" ADD CONSTRAINT "SwapBeneficiary_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwapBeneficiary" ADD CONSTRAINT "SwapBeneficiary_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- backfill swap request beneficiaries
INSERT INTO "public"."SwapBeneficiary" ("account", "commissionBps", "type", "swapRequestId")
    SELECT b."account", b."commissionBps", b.type, sr."id"
    FROM "public"."SwapRequest" sr
        JOIN "public"."SwapDepositChannel" dc ON sr."swapDepositChannelId" = dc."id"
        JOIN "public"."SwapBeneficiary" b ON dc."id" = b."channelId";

