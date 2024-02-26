import BigNumber from 'bignumber.js';
import { Asset, assetDecimals } from '@/shared/enums';
import { PriceWarning } from '@/shared/schemas';
import { getAssetPrice } from '.';

const toTokenAmount = (amount: bigint, decimals: number) =>
  new BigNumber(amount.toString()).shiftedBy(-decimals).toFixed(decimals);

export const checkPriceWarning = async ({
  srcAsset,
  destAsset,
  srcAmount,
  destAmount,
  threshold,
}: {
  srcAsset: Asset;
  destAsset: Asset;
  srcAmount: bigint;
  destAmount: bigint;
  threshold: number;
}): Promise<PriceWarning | undefined> => {
  const inputPrice = await getAssetPrice(srcAsset);
  const outputPrice = await getAssetPrice(destAsset);

  if (!inputPrice || !outputPrice) {
    return undefined;
  }

  const srcAssetDecimals = assetDecimals[srcAsset];
  const destAssetDecimals = assetDecimals[destAsset];

  const expectedOutput = new BigNumber(inputPrice)
    .times(toTokenAmount(srcAmount, srcAssetDecimals))
    .dividedBy(outputPrice);

  const delta = new BigNumber(toTokenAmount(destAmount, destAssetDecimals))
    .minus(expectedOutput)
    .dividedBy(expectedOutput)
    .multipliedBy(100);

  return {
    threshold: Math.abs(threshold),
    warn: delta.lte(threshold),
  };
};
