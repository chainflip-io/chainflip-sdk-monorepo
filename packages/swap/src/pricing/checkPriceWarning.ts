import BigNumber from 'bignumber.js';
import { InternalAsset, assetConstants } from '@/shared/enums';
import env from '../config/env';
import logger from '../utils/logger';
import { getAssetPrice } from '.';

const toTokenAmount = (amount: bigint, decimals: number) =>
  new BigNumber(amount.toString()).shiftedBy(-decimals);

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
}): Promise<{ lowLiquidityWarning: boolean | undefined; inputUsdValue: string | undefined }> => {
  try {
    const inputPrice = await getAssetPrice(srcAsset);
    const outputPrice = await getAssetPrice(destAsset);
    const srcAssetDecimals = assetConstants[srcAsset].decimals;
    const destAssetDecimals = assetConstants[destAsset].decimals;

    if (!inputPrice || !outputPrice) {
      return { lowLiquidityWarning: undefined, inputUsdValue: undefined };
    }
    const inputUsdValue = toTokenAmount(srcAmount, srcAssetDecimals).times(inputPrice);

    const expectedOutput = inputUsdValue.dividedBy(outputPrice);

    const delta = toTokenAmount(destAmount, destAssetDecimals)
      .minus(expectedOutput)
      .dividedBy(expectedOutput)
      .multipliedBy(100);

    return {
      lowLiquidityWarning: delta.lte(env.LIQUIDITY_WARNING_THRESHOLD),
      inputUsdValue: inputUsdValue.toFixed(2),
    };
  } catch (err) {
    logger.error('error querying coingecko for price:', err);
    return { lowLiquidityWarning: undefined, inputUsdValue: undefined };
  }
};
