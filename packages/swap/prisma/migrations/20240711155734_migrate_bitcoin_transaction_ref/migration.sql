UPDATE "public"."Broadcast" SET "transactionRef" = SUBSTRING("transactionRef", 3) WHERE "chain" = 'Bitcoin' AND "transactionRef" IS NOT NULL;

