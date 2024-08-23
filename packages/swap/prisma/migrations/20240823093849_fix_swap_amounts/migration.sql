create table "private"."backup_swaps" as select * from "Swap";
create table "private"."backup_swap_fees" as select * from "SwapFee";

CREATE TABLE naughty_swaps AS (
	SELECT
		s. id as swap_id,
		s. "depositAmount" - sum(sf.amount) AS swap_input_amount,
		s. "srcAsset" as source_asset
	FROM
		"Swap" s
		JOIN "SwapFee" sf ON sf. "swapId" = s.id
			AND sf.type in('INGRESS', 'BROKER')
	WHERE
		split_part(s. "swapExecutedBlockIndex", '-', 1)::int < 1906595
	GROUP BY
		s. id,
		s. "depositAmount",
		s. "swapInputAmount",
		s. "srcAsset"
	HAVING
		sum(sf.amount) + "swapInputAmount" != "depositAmount"
);

UPDATE "Swap" as s
SET "swapInputAmount" = ns.swap_input_amount
FROM naughty_swaps ns
WHERE ns.swap_id = s.id;

UPDATE "SwapFee" as sf
SET amount = (ns.swap_input_amount * case when sf.asset = 'Btc' then 1500 else 1000 end) / 1000000
FROM naughty_swaps ns
WHERE ns.swap_id = sf."swapId" and sf."type" = 'LIQUIDITY' AND sf.asset = ns.source_asset;

DROP TABLE naughty_swaps;

CREATE TABLE naughty_swaps AS (
	SELECT
		s. id AS swap_id,
		s. "depositAmount" - sum(sf.amount) AS swap_input_amount,
		s. "srcAsset" as source_asset
	FROM
		"Swap" s
		JOIN "SwapFee" sf ON sf. "swapId" = s.id
			AND sf.type in('INGRESS', 'BROKER')
	WHERE
		split_part(s. "swapExecutedBlockIndex", '-', 1)::int >= 1906595
	GROUP BY
		s. id,
		s. "depositAmount",
		s. "swapInputAmount",
		s. "srcAsset"
	HAVING
		sum(sf.amount) + "swapInputAmount" != "depositAmount"
);

UPDATE "Swap" as s
SET "swapInputAmount" = ns.swap_input_amount
FROM naughty_swaps ns
WHERE ns.swap_id = s.id;

UPDATE "SwapFee" as sf
SET amount = (ns.swap_input_amount * 500) / 1000000
FROM naughty_swaps ns
WHERE ns.swap_id = sf."swapId" and sf."type" = 'LIQUIDITY' AND sf.asset = ns.source_asset;

DROP TABLE naughty_swaps;
