import { assetConstants, ChainflipAsset } from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { getAssetPrice } from './index.js';

const toTokenAmount = (amount: bigint, asset: ChainflipAsset) =>
  new BigNumber(amount.toString()).shiftedBy(-assetConstants[asset].decimals);

export const getUsdValue = async (amount: bigint, asset: ChainflipAsset) => {
  const price = await getAssetPrice(asset);
  if (price === undefined) return undefined;
  return toTokenAmount(amount, asset).times(price).toFixed(2);
};

export const checkPriceWarning = async ({
  srcAsset,
  destAsset,
  srcAmount,
  destAmount,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
  srcAmount: bigint;
  destAmount: bigint;
}): Promise<boolean | undefined> => {
  try {
    const inputPrice = await getAssetPrice(srcAsset);
    const outputPrice = await getAssetPrice(destAsset);

    if (!inputPrice || !outputPrice) {
      return undefined;
    }
    const inputUsdValue = toTokenAmount(srcAmount, srcAsset).times(inputPrice);

    const expectedOutput = inputUsdValue.dividedBy(outputPrice);

    const delta = toTokenAmount(destAmount, destAsset)
      .minus(expectedOutput)
      .dividedBy(expectedOutput)
      .multipliedBy(100);

    return delta.lte(env.LIQUIDITY_WARNING_THRESHOLD);
  } catch (err) {
    logger.error('error querying coingecko for price:', err);
    return undefined;
  }
};
