-- AlterTable
ALTER TABLE "public"."FailedBoost" ADD COLUMN     "asset" "public"."InternalAsset" NOT NULL DEFAULT 'Btc';
ALTER TABLE "public"."FailedBoost" ALTER COLUMN   "asset"  DROP DEFAULT;


ALTER TABLE "public"."FailedBoost" ADD COLUMN     "prewitnessedDepositId" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "public"."FailedBoost" ALTER COLUMN   "prewitnessedDepositId"  DROP DEFAULT;