-- CreateIndex
CREATE INDEX "Swap_nativeId_idx" ON "public"."Swap"("nativeId");

-- CreateIndex
CREATE INDEX "SwapFee_swapRequestId_idx" ON "public"."SwapFee"("swapRequestId");

-- CreateIndex
CREATE INDEX "SwapRequest_nativeId_idx" ON "public"."SwapRequest"("nativeId");
