-- AlterTable
ALTER TABLE "public"."SwapRequest" ALTER COLUMN "depositAmount" DROP NOT NULL;

UPDATE "SwapRequest"
set "depositAmount" = NULL
where "requestType" = 'INGRESS_EGRESS_FEE';
