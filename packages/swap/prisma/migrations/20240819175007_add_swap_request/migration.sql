-- CreateEnum
CREATE TYPE "public"."SwapRequestOrigin" AS ENUM ('DEPOSIT_CHANNEL', 'VAULT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "public"."SwapRequestType" AS ENUM ('LEGACY_SWAP', 'NETWORK_FEE', 'INGRESS_EGRESS_FEE', 'REGULAR', 'CCM');

-- CreateTable
CREATE TABLE "public"."SwapRequest" (
    "id" BIGSERIAL NOT NULL,
    "nativeId" BIGINT NOT NULL,
    "originType" "public"."SwapRequestOrigin" NOT NULL,
    "swapDepositChannelId" BIGINT,
    "depositTransactionRef" TEXT,
    "srcAsset" "public"."InternalAsset" NOT NULL,
    "destAsset" "public"."InternalAsset" NOT NULL,
    "depositAmount" DECIMAL(30,0) NOT NULL,
    "requestType" "public"."SwapRequestType" NOT NULL,
    "srcAddress" TEXT,
    "destAddress" TEXT,
    "swapRequestedAt" TIMESTAMP(3) NOT NULL,
    "depositReceivedAt" TIMESTAMP(3),
    "depositReceivedBlockIndex" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBlockIndex" TEXT,
    "prewitnessedDepositId" BIGINT,
    "depositBoostedAt" TIMESTAMP(3),
    "depositBoostedBlockIndex" TEXT,
		"effectiveBoostFeeBps" INTEGER,
		"egressId" BIGINT,
		"refundEgressId" BIGINT,
		"ccmDepositReceivedBlockIndex" TEXT,
		"ccmGasBudget" DECIMAL(30,0),
		"ccmMessage" TEXT,

    CONSTRAINT "SwapRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."Swap" ADD COLUMN     "swapRequestId" BIGINT;

INSERT INTO "SwapRequest" (
	"nativeId",
	"originType",
	"swapDepositChannelId",
	"depositTransactionRef",
	"srcAsset",
	"destAsset",
	"depositAmount",
	"requestType",
	"destAddress",
	"swapRequestedAt",
	"depositReceivedAt",
	"depositReceivedBlockIndex",
	"prewitnessedDepositId",
	"depositBoostedAt",
	"depositBoostedBlockIndex",
	"effectiveBoostFeeBps",
	"egressId",
	"refundEgressId",
	"ccmDepositReceivedBlockIndex",
	"ccmGasBudget",
	"ccmMessage"
)
SELECT
	"nativeId",
	CASE WHEN "swapDepositChannelId" IS NULL THEN
		'VAULT'::"SwapRequestOrigin"
	ELSE
		'DEPOSIT_CHANNEL'::"SwapRequestOrigin"
	END,
	"swapDepositChannelId",
	"depositTransactionRef",
	"srcAsset",
	"destAsset",
	"depositAmount",
	'LEGACY_SWAP',
	"destAddress",
	"depositReceivedAt",
	"depositReceivedAt",
	"depositReceivedBlockIndex",
	"prewitnessedDepositId",
	"depositBoostedAt",
	"depositBoostedBlockIndex",
	"effectiveBoostFeeBps",
	"egressId",
	"refundEgressId",
	"ccmDepositReceivedBlockIndex",
	"ccmGasBudget",
	"ccmMessage"
FROM
	"Swap"
ORDER BY
	id;

-- CreateIndex
CREATE UNIQUE INDEX "SwapRequest_nativeId_key" ON "public"."SwapRequest"("nativeId");

-- backfill "swap request" ids
UPDATE "Swap" s SET "swapRequestId" = (SELECT id from "SwapRequest" sr where sr."nativeId" = s."nativeId");

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_swapDepositChannelId_fkey" FOREIGN KEY ("swapDepositChannelId") REFERENCES "public"."SwapDepositChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Swap" ADD CONSTRAINT "Swap_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Swap"
	DROP COLUMN "depositAmount",
	DROP COLUMN "destAddress",
	DROP COLUMN "depositReceivedAt",
	DROP COLUMN "swapDepositChannelId",
	DROP COLUMN "depositTransactionRef",
	DROP COLUMN "prewitnessedDepositId",
	DROP COLUMN "depositBoostedAt",
	DROP COLUMN "depositBoostedBlockIndex",
	DROP COLUMN "depositReceivedBlockIndex",
	DROP COLUMN "effectiveBoostFeeBps",
	DROP COLUMN "egressId",
	DROP COLUMN "refundEgressId",
	DROP COLUMN "ccmDepositReceivedBlockIndex",
	DROP COLUMN "ccmGasBudget",
	DROP COLUMN "ccmMessage",
	ALTER COLUMN "swapRequestId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "public"."SwapFee" DROP CONSTRAINT "SwapFee_swapId_fkey";

-- AlterTable
ALTER TABLE "public"."SwapFee" ADD COLUMN     "swapRequestId" BIGINT,
ALTER COLUMN "swapId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SwapRequest_srcAsset_prewitnessedDepositId_idx" ON "public"."SwapRequest"("srcAsset", "prewitnessedDepositId");

-- AddForeignKey
ALTER TABLE "public"."SwapFee" ADD CONSTRAINT "SwapFee_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "public"."Swap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwapFee" ADD CONSTRAINT "SwapFee_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "public"."IgnoredEgress" DROP CONSTRAINT "IgnoredEgress_swapId_fkey";

-- DropIndex
DROP INDEX "public"."IgnoredEgress_swapId_key";

-- AlterTable
ALTER TABLE "public"."IgnoredEgress" RENAME COLUMN "swapId" TO "swapRequestId";

-- CreateIndex
CREATE UNIQUE INDEX "IgnoredEgress_swapRequestId_key" ON "public"."IgnoredEgress"("swapRequestId");

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_egressId_fkey" FOREIGN KEY ("egressId") REFERENCES "public"."Egress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_refundEgressId_fkey" FOREIGN KEY ("refundEgressId") REFERENCES "public"."Egress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IgnoredEgress" ADD CONSTRAINT "IgnoredEgress_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "public"."SwapRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "public"."SwapType" ADD VALUE 'INGRESS_EGRESS_FEE';
ALTER TYPE "public"."SwapType" ADD VALUE 'NETWORK_FEE';
