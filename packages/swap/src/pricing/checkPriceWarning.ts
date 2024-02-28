import BigNumber from 'bignumber.js';
import { InternalAsset, assetConstants } from '@/shared/enums';
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
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  srcAmount: bigint;
  destAmount: bigint;
}): Promise<boolean | undefined> => {
  try {
    const inputPrice = await getAssetPrice(srcAsset);
    const outputPrice = await getAssetPrice(destAsset);
    const srcAssetDecimals = assetConstants[srcAsset].decimals;
    const destAssetDecimals = assetConstants[destAsset].decimals;

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
    logger.error('error querying coingecko for price:', err);
    return undefined;
  }
};
