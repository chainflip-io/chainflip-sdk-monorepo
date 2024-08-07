-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "refundEgressId" BIGINT;

-- AddForeignKey
ALTER TABLE "public"."Swap" ADD CONSTRAINT "Swap_refundEgressId_fkey" FOREIGN KEY ("refundEgressId") REFERENCES "public"."Egress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
