-- AlterTable
ALTER TABLE "public"."SwapDepositChannelAffiliate" RENAME TO "SwapBeneficiary";
ALTER TABLE "public"."SwapBeneficiary" RENAME CONSTRAINT "SwapDepositChannelAffiliate_pkey" TO "SwapBeneficiary_pkey";
ALTER TABLE "public"."SwapBeneficiary" RENAME CONSTRAINT "SwapDepositChannelAffiliate_channelId_fkey" TO "SwapBeneficiary_channelId_fkey";
ALTER INDEX "public"."SwapDepositChannelAffiliate_channelId_idx" RENAME TO "SwapBeneficiary_channelId_idx";