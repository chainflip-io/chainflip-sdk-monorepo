-- The solana tx ref queue deleted this broker-rejected vault swap's pending ref before
-- TransactionRejectedByBroker (mainnet block 15478424) could use it, halting the processor.
-- The deposit is matched exactly, so this inserts nothing on any other network.
--
-- Mirrors the same fix in the chainflip-web-services explorer.
INSERT INTO "private"."SolanaPendingTxRef" ("address", "slot", "failedVaultSwapId")
SELECT '5VLYw68CdXuXFEPewiiG2RLu1eFP37pH1popkJHmKTw9', 463388987, fs."id"
FROM "public"."FailedSwap" fs
WHERE fs."failedBlockIndex" LIKE '15478423-%'
  AND fs."srcChain" = 'Solana'
  AND fs."srcAsset" = 'SolUsdt'
  AND fs."depositAmount" = 597267181
  AND fs."reason" = 'TransactionRejectedByBroker'
  AND fs."refundBroadcastId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "private"."SolanaPendingTxRef" p WHERE p."failedVaultSwapId" = fs."id"
  );
