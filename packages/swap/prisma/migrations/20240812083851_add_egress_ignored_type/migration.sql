-- CreateEnum
CREATE TYPE "public"."EgressIgnoredType" AS ENUM ('SWAP', 'REFUND');

-- AlterTable
ALTER TABLE "public"."IgnoredEgress" ADD COLUMN     "type" "public"."EgressIgnoredType" NOT NULL DEFAULT 'SWAP';

ALTER TABLE "public"."IgnoredEgress" ALTER COLUMN     "type" DROP DEFAULT;
