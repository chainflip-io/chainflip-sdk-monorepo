WITH
  boost_info AS (
    SELECT
      sr."nativeId",
      sr."depositAmount" + sum(sf.amount) amount
    FROM
      "SwapRequest" sr
      JOIN "SwapFee" sf ON sf."swapRequestId" = sr.id
      AND sf."type" IN ('BOOST', 'INGRESS')
    WHERE
      sr."effectiveBoostFeeBps" > 0
    GROUP BY
      sr.id
  )
UPDATE "SwapRequest"
SET "depositAmount" = boost_info.amount
FROM boost_info
WHERE boost_info."nativeId" = "SwapRequest"."nativeId";
