ALTER TABLE "public"."SwapRequest" ADD COLUMN     "swapInputAmount" DECIMAL(30,0);

UPDATE
	"SwapRequest"
SET
	"swapInputAmount" = (
		SELECT
			SUM(s. "swapInputAmount")
		FROM
			"Swap" s
		WHERE
			s. "swapRequestId" = "SwapRequest"."id"
			AND s. "type" != 'GAS'
		GROUP BY
			s. "swapRequestId");

-- some legacy swaps and CCMs didn't get backfilled by the previous update
-- nbd imo
UPDATE "SwapRequest"
SET "swapInputAmount" = "depositAmount"
WHERE "swapInputAmount" IS NULL;

ALTER TABLE "public"."SwapRequest" ALTER COLUMN "swapInputAmount" SET NOT NULL;
