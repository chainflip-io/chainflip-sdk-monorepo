-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "fallbackRefundEgressId" BIGINT;

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_fallbackRefundEgressId_fkey" FOREIGN KEY ("fallbackRefundEgressId") REFERENCES "public"."Egress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
