-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN "openingFeePaid" DECIMAL(30,0);

UPDATE "public"."SwapDepositChannel" SET "openingFeePaid" = 0;

ALTER TABLE "public"."SwapDepositChannel" ALTER COLUMN "openingFeePaid" SET NOT NULL;
