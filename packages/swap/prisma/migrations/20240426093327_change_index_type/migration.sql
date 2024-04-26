-- DropIndex
DROP INDEX "private"."QuoteResult_srcAsset_destAsset_key";

-- CreateIndex
CREATE INDEX "QuoteResult_srcAsset_destAsset_idx" ON "private"."QuoteResult"("srcAsset", "destAsset");
