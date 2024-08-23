CREATE TABLE naughty_swaps AS (
	SELECT
		s. "nativeId" AS native_id,
		s. "depositAmount" - sum(sf.amount) AS swap_input_amount,
		s. "srcAsset" as source_asset
	FROM
		"Swap" s
		JOIN "SwapFee" sf ON sf. "swapId" = s.id
			AND sf.type in('INGRESS', 'BROKER')
	WHERE
		split_part(s. "swapExecutedBlockIndex", '-', 1)::int < 1906595
	GROUP BY
		s. "nativeId",
		s. "depositAmount",
		s. "swapInputAmount",
		s. "srcAsset"
	HAVING
		sum(sf.amount) + "swapInputAmount" != "depositAmount"
);

UPDATE "Swap" as s
SET "swapInputAmount" = ns.swap_input_amount
FROM naughty_swaps ns
WHERE ns.native_id = s."nativeId";

UPDATE "SwapFee" as sf
SET amount = (ns.swap_input_amount * case when asset = 'Btc' then 1500 else 1000 end) / 1000000
FROM naughty_swaps ns
WHERE ns.native_id = sf."swapId" and sf."type" = 'LIQUIDITY' AND sf.asset = ns.source_asset;

DROP TABLE naughty_swaps;

CREATE TABLE naughty_swaps AS (
	SELECT
		s. "nativeId" AS native_id,
		s. "depositAmount" - sum(sf.amount) AS swap_input_amount,
		s. "srcAsset" as source_asset
	FROM
		"Swap" s
		JOIN "SwapFee" sf ON sf. "swapId" = s.id
			AND sf.type in('INGRESS', 'BROKER')
	WHERE
		split_part(s. "swapExecutedBlockIndex", '-', 1)::int >= 1906595
	GROUP BY
		s. "nativeId",
		s. "depositAmount",
		s. "swapInputAmount",
		s. "srcAsset"
	HAVING
		sum(sf.amount) + "swapInputAmount" != "depositAmount"
);

UPDATE "Swap" as s
SET "swapInputAmount" = ns.swap_input_amount
FROM naughty_swaps ns
WHERE ns.native_id = s."nativeId";

UPDATE "SwapFee" as sf
SET amount = (ns.swap_input_amount * 500) / 1000000
FROM naughty_swaps ns
WHERE ns.native_id = sf."swapId" and sf."type" = 'LIQUIDITY' AND sf.asset = ns.source_asset;

DROP TABLE naughty_swaps;
