import BigNumber from 'bignumber.js';
import { Asset, assetDecimals } from '@/shared/enums';
import env from '../config/env';
import logger from '../utils/logger';
import { getAssetPrice } from '.';

const toTokenAmount = (amount: bigint, decimals: number) =>
  new BigNumber(amount.toString()).shiftedBy(-decimals).toFixed(decimals);

export const checkPriceWarning = async ({
  srcAsset,
  destAsset,
  srcAmount,
  destAmount,
}: {
  srcAsset: Asset;
  destAsset: Asset;
  srcAmount: bigint;
  destAmount: bigint;
}): Promise<boolean | undefined> => {
  try {
    const inputPrice = await getAssetPrice(srcAsset);
    const outputPrice = await getAssetPrice(destAsset);
    const srcAssetDecimals = assetDecimals[srcAsset];
    const destAssetDecimals = assetDecimals[destAsset];

    if (!inputPrice || !outputPrice) {
      return undefined;
    }

    const expectedOutput = new BigNumber(inputPrice)
      .times(toTokenAmount(srcAmount, srcAssetDecimals))
      .dividedBy(outputPrice);

    const delta = new BigNumber(toTokenAmount(destAmount, destAssetDecimals))
      .minus(expectedOutput)
      .dividedBy(expectedOutput)
      .multipliedBy(100);

    return delta.lte(env.LIQUIDITY_WARNING_THRESHOLD);
  } catch (err) {
    logger.error('error querying cache-gateway for price:', err);
    return undefined;
  }
};
