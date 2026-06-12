-- Data migration: bump effectiveBoostFeeBps from 4 to 5 on existing SwapRequest rows
UPDATE "public"."SwapRequest"
SET "effectiveBoostFeeBps" = 5
WHERE "effectiveBoostFeeBps" = 4;
