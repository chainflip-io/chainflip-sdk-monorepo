-- AlterTable
ALTER TABLE "public"."SwapRequest" ALTER COLUMN "depositAmount" DROP NOT NULL;

UPDATE "SwapRequest"
set "depositAmount" = NULL
where type = 'INGRESS_EGRESS_FEE';
