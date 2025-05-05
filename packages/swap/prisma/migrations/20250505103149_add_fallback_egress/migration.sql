/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Egress` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Egress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Egress" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "fallbackDestinationAddress" TEXT;

-- AlterTable
ALTER TABLE "public"."SwapRequest" ADD COLUMN     "fallbackEgressId" BIGINT;

-- AddForeignKey
ALTER TABLE "public"."SwapRequest" ADD CONSTRAINT "SwapRequest_fallbackEgressId_fkey" FOREIGN KEY ("fallbackEgressId") REFERENCES "public"."Egress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
