-- AlterTable
ALTER TABLE "private"."Quote" ADD COLUMN     "inputAssetPriceAtChannelOpening" DECIMAL(65,30),
ADD COLUMN     "inputAssetPriceAtCompletion" DECIMAL(65,30),
ADD COLUMN     "indexPriceAtChannelOpening" DECIMAL(65,30),
ADD COLUMN     "outputAssetPriceAtChannelOpening" DECIMAL(65,30),
ADD COLUMN     "outputAssetPriceAtCompletion" DECIMAL(65,30),
ADD COLUMN     "indexPriceAtCompletion" DECIMAL(65,30);
