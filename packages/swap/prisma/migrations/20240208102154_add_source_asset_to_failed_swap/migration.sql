-- AlterTable
ALTER TABLE "public"."FailedSwap" ADD COLUMN     "srcAsset" "public"."Asset";

-- mainnet has no failed swaps so this is safe
UPDATE "public"."FailedSwap"
SET "srcAsset" = CASE
    WHEN "srcChain" = 'Ethereum' THEN 'ETH'::"Asset"
    WHEN "srcChain" = 'Bitcoin' THEN 'BTC'::"Asset"
    ELSE 'DOT'::"Asset"
  END;

ALTER TABLE "public"."FailedSwap" ALTER COLUMN "srcAsset" SET NOT NULL;
