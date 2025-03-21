/*
  Warnings:

  - The values [TransactionTainted] on the enum `FailedSwapReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FailedSwapReason_new" AS ENUM ('BelowMinimumDeposit', 'NotEnoughToPayFees', 'TransactionRejectedByBroker', 'UnsupportedForTargetChain', 'InsufficientDepositAmount', 'InvalidMetadata', 'InvalidDestinationAddress');
ALTER TABLE "public"."FailedSwap" ALTER COLUMN "reason" TYPE "public"."FailedSwapReason_new" USING ("reason"::text::"public"."FailedSwapReason_new");
ALTER TYPE "public"."FailedSwapReason" RENAME TO "FailedSwapReason_old";
ALTER TYPE "public"."FailedSwapReason_new" RENAME TO "FailedSwapReason";
DROP TYPE "public"."FailedSwapReason_old";
COMMIT;
