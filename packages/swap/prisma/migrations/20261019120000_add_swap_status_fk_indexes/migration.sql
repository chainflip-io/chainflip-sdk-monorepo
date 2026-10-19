-- Indexes for the foreign keys read by GET /v2/swaps/:id. In production these are
-- created manually beforehand with CREATE INDEX CONCURRENTLY, so IF NOT EXISTS
-- makes this migration a no-op there.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Swap_swapRequestId_idx" ON "public"."Swap"("swapRequestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SwapRequest_swapDepositChannelId_idx" ON "public"."SwapRequest"("swapDepositChannelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SwapRequest_accountCreationDepositChannelId_idx" ON "public"."SwapRequest"("accountCreationDepositChannelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SwapBeneficiary_swapRequestId_idx" ON "public"."SwapBeneficiary"("swapRequestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SwapBeneficiary_accountCreationDepositChannelId_idx" ON "public"."SwapBeneficiary"("accountCreationDepositChannelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FailedSwap_accountCreationDepositChannelId_idx" ON "public"."FailedSwap"("accountCreationDepositChannelId");
