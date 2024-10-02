ALTER TABLE "public"."SwapRequest" RENAME COLUMN "depositReceivedAt" TO "depositFinalisedAt";
ALTER TABLE "public"."SwapRequest" RENAME COLUMN "depositReceivedBlockIndex" TO "depositFinalisedBlockIndex";
