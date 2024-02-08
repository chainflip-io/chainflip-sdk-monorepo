/*
  Warnings:

  - The values [EgressAmountZero] on the enum `FailedSwapReason` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `type` on the `FailedSwap` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FailedSwapReason_new" AS ENUM ('BelowMinimumDeposit', 'NotEnoughToPayFees');
ALTER TABLE "public"."FailedSwap" ALTER COLUMN "reason" TYPE "public"."FailedSwapReason_new" USING ("reason"::text::"public"."FailedSwapReason_new");
ALTER TYPE "public"."FailedSwapReason" RENAME TO "FailedSwapReason_old";
ALTER TYPE "public"."FailedSwapReason_new" RENAME TO "FailedSwapReason";
DROP TYPE "public"."FailedSwapReason_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."FailedSwap" DROP COLUMN "type";

-- DropEnum
DROP TYPE "public"."FailedSwapType";
