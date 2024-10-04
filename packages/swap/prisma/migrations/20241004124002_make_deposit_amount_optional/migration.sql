-- AlterTable
ALTER TABLE "public"."SwapRequest" ALTER COLUMN "depositAmount" DROP NOT NULL;

UPDATE "SwapRequest"
set "depositAmount" = NULL
where "requestType" IN ('INGRESS_EGRESS_FEE', 'NETWORK_FEE');
