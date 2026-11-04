-- Indexes for GET /v2/swaps/:txRef. Without them every tx ref lookup scans SwapRequest and,
-- when no swap request matches (e.g. failed vault swaps), FailedSwap too. In production these
-- are created manually beforehand with CREATE INDEX CONCURRENTLY, so IF NOT EXISTS makes this
-- migration a no-op there.

-- The swap request lookup is case insensitive, so it matches on lower(). Prisma can't express
-- expression indexes, so this one only exists in SQL.
CREATE INDEX IF NOT EXISTS "SwapRequest_depositTransactionRef_lower_idx" ON "public"."SwapRequest"(lower("depositTransactionRef"));

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FailedSwap_depositTransactionRef_idx" ON "public"."FailedSwap"("depositTransactionRef");
