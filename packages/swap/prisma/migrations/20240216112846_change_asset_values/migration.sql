-- AlterEnum
BEGIN;
ALTER TYPE "public"."Asset" RENAME VALUE 'FLIP' TO 'Flip';
ALTER TYPE "public"."Asset" RENAME VALUE 'USDC' TO 'Usdc';
ALTER TYPE "public"."Asset" RENAME VALUE 'DOT' TO 'Dot';
ALTER TYPE "public"."Asset" RENAME VALUE 'ETH' TO 'Eth';
ALTER TYPE "public"."Asset" RENAME VALUE 'BTC' TO 'Btc';
COMMIT;