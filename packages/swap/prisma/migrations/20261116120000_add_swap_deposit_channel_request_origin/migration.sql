-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN "requestOrigin" VARCHAR(255);
-- AlterTable
ALTER TABLE "public"."AccountCreationDepositChannel" ADD COLUMN "requestOrigin" VARCHAR(255);
