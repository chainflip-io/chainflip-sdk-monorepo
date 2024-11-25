-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "refundBroadcastId" BIGINT;

-- AddForeignKey
ALTER TABLE "public"."FailedSwap" ADD CONSTRAINT "FailedSwap_refundBroadcastId_fkey" FOREIGN KEY ("refundBroadcastId") REFERENCES "public"."Broadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;
