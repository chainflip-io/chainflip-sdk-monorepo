-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "oraclePriceDeltaBps" DECIMAL(30,0);

-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "oraclePriceDeltaBps" DECIMAL(30,0);
