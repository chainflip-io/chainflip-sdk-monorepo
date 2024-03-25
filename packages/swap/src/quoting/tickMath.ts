import BigNumber from 'bignumber.js';
import { InternalAsset, assetConstants } from '@/shared/enums';

type BaseAsset = Exclude<InternalAsset, 'Usdc'>;

export const MIN_TICK = -887272;
export const MAX_TICK = -MIN_TICK;

export function tickToRate(
  tick: number,
  baseAsset: BaseAsset,
  quoteAsset: 'Usdc',
): number;
export function tickToRate(
  tick: number,
  baseAsset: 'Usdc',
  quoteAsset: BaseAsset,
): number;
export function tickToRate(
  tick: number,
  baseAsset: InternalAsset,
  quoteAsset: InternalAsset,
): number;
export function tickToRate(
  tick: number,
  baseAsset: InternalAsset,
  quoteAsset: InternalAsset,
): number {
  // https://blog.uniswap.org/uniswap-v3-math-primer
  const rawRate = BigNumber(1.0001 ** tick);
  const rateDecimals =
    assetConstants[quoteAsset].decimals - assetConstants[baseAsset].decimals;

  return rawRate.shiftedBy(-rateDecimals).toNumber();
}

export function rateToTick(
  rate: BigNumber.Value,
  baseAsset: BaseAsset,
  quoteAsset: 'Usdc',
): number;
export function rateToTick(
  rate: BigNumber.Value,
  baseAsset: 'Usdc',
  quoteAsset: BaseAsset,
): number;
export function rateToTick(
  rate: BigNumber.Value,
  baseAsset: InternalAsset,
  quoteAsset: InternalAsset,
): number;
export function rateToTick(
  rate: BigNumber.Value,
  baseAsset: InternalAsset,
  quoteAsset: InternalAsset,
): number {
  const rateDecimals =
    assetConstants[quoteAsset].decimals - assetConstants[baseAsset].decimals;
  const rawRate = new BigNumber(rate).shiftedBy(rateDecimals);

  let tick = Math.log(rawRate.toNumber()) / Math.log(1.0001);
  tick = Math.round(tick * 1e6) / 1e6; // prevent flooring results like -207244.0000000557 to -207245
  tick = Math.floor(tick);

  return Math.max(MIN_TICK, Math.min(tick, MAX_TICK));
}

export const liquidityToTokenAmounts = ({
  liquidity,
  currentRate,
  lowerTick,
  upperTick,
  baseAsset,
}: {
  liquidity: BigNumber.Value;
  currentRate: BigNumber.Value;
  lowerTick: number;
  upperTick: number;
  baseAsset: BaseAsset;
}) => {
  const rateDecimals =
    assetConstants.Usdc.decimals - assetConstants[baseAsset].decimals;

  const rawRate = BigNumber(currentRate).shiftedBy(rateDecimals).toNumber();

  const _liquidity = BigNumber(liquidity);

  const currentRawSqrtRate = Math.sqrt(rawRate);
  const currentPriceTick = rateToTick(currentRate, baseAsset, 'Usdc');
  const rawSqrtRateLower = Math.sqrt(1.0001 ** lowerTick);
  const rawSqrtRateUpper = Math.sqrt(1.0001 ** upperTick);

  let quoteAssetAmount = BigNumber(0);
  let baseAssetAmount = BigNumber(0);

  // https://blog.uniswap.org/uniswap-v3-math-primer-2#how-to-calculate-current-holdings
  if (currentPriceTick < lowerTick) {
    const numerator = rawSqrtRateUpper - rawSqrtRateLower;
    const denominator = rawSqrtRateLower * rawSqrtRateUpper;

    baseAssetAmount = _liquidity.multipliedBy(numerator / denominator);
  } else if (currentPriceTick >= upperTick) {
    quoteAssetAmount = _liquidity.multipliedBy(
      rawSqrtRateUpper - rawSqrtRateLower,
    );
  } else if (currentPriceTick >= lowerTick && currentPriceTick < upperTick) {
    const numerator = rawSqrtRateUpper - currentRawSqrtRate;
    const denominator = currentRawSqrtRate * rawSqrtRateUpper;

    baseAssetAmount = _liquidity.multipliedBy(numerator / denominator);
    quoteAssetAmount = _liquidity.multipliedBy(
      currentRawSqrtRate - rawSqrtRateLower,
    );
  }

  return {
    quoteAsset: quoteAssetAmount.toFixed(0),
    baseAsset: baseAssetAmount.toFixed(0),
  };
};
