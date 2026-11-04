-- CCM gas budgets are u128 on the State Chain and can need up to 39 digits, which does not fit in
-- DECIMAL(30,0). The amounts accepted by `openSwapDepositChannel` are now bounded to u128 as well,
-- so the columns storing them are widened to match.
--
-- Increasing the precision of a numeric column without changing its scale does not rewrite the table.

-- AlterTable
ALTER TABLE "public"."SwapDepositChannel" ALTER COLUMN "expectedDepositAmount" SET DATA TYPE DECIMAL(39,0),
ALTER COLUMN "ccmGasBudget" SET DATA TYPE DECIMAL(39,0);

-- AlterTable
ALTER TABLE "public"."SwapRequest" ALTER COLUMN "ccmGasBudget" SET DATA TYPE DECIMAL(39,0);

-- AlterTable
ALTER TABLE "public"."FailedSwap" ALTER COLUMN "ccmGasBudget" SET DATA TYPE DECIMAL(39,0);

-- AlterTable
ALTER TABLE "private"."Quote" ALTER COLUMN "expectedDepositAmount" SET DATA TYPE DECIMAL(39,0),
ALTER COLUMN "quotedIntermediateAmount" SET DATA TYPE DECIMAL(39,0),
ALTER COLUMN "quotedEgressAmount" SET DATA TYPE DECIMAL(39,0);
