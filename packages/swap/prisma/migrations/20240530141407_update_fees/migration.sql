UPDATE
	"SwapFee" AS sf
SET
	amount = round((s. "intermediateAmount" * 1000) / ((10000 * 100) - 1000))::decimal
FROM
	"Swap" AS s
WHERE
	sf."type" = 'NETWORK'
	AND s."intermediateAmount" IS NOT NULL
	AND sf."swapId" = s.id;
