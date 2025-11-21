BEGIN;
-- DropForeignKey
ALTER TABLE "public"."AccountCreationDepositChannel" DROP CONSTRAINT "AccountCreationDepositChannel_swapBeneficiaryId_fkey";

-- AlterTable
ALTER TABLE "public"."SwapBeneficiary" ADD COLUMN     "accountCreationDepositChannelId" BIGINT;

UPDATE "public"."SwapBeneficiary" AS sb
SET "accountCreationDepositChannelId" = acdc."id"
FROM "public"."AccountCreationDepositChannel" AS acdc
WHERE acdc."swapBeneficiaryId" = sb."id";

-- AlterTable
ALTER TABLE "public"."AccountCreationDepositChannel" DROP COLUMN "swapBeneficiaryId";

-- AddForeignKey
ALTER TABLE "public"."SwapBeneficiary" ADD CONSTRAINT "SwapBeneficiary_accountCreationDepositChannelId_fkey" FOREIGN KEY ("accountCreationDepositChannelId") REFERENCES "public"."AccountCreationDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
