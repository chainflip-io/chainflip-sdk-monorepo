-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ADD COLUMN     "expiryBlock" INTEGER,
ADD COLUMN     "isExpired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "srcChainExpiryBlock" BIGINT;

ALTER TABLE "public"."SwapDepositChannel"
ALTER COLUMN "isExpired" SET DEFAULT false;
