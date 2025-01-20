import BigNumber from 'bignumber.js';
import EventEmitter, { once } from 'events';
import { assetConstants, getInternalAsset, InternalAsset } from './enums';
import { assert } from './guards';
import { FillOrKillParamsWithMinPrice, FillOrKillParamsWithSlippage, Quote } from './schemas';

export const onceWithTimeout = async (
  eventEmitter: EventEmitter,
  event: string | symbol,
  timeout: number,
): Promise<void> => {
  await once(eventEmitter, event, { signal: AbortSignal.timeout(timeout) });
};

export const bigintMin = (...args: bigint[]): bigint =>
  args.reduce((min, current) => (current < min ? current : min));

export const bigintMax = (...args: bigint[]): bigint =>
  args.reduce((max, current) => (current > max ? current : max));

export const ONE_IN_PIP = 10000;
export const ONE_IN_HUNDREDTH_PIPS = ONE_IN_PIP * 100;

export const getPipAmountFromAmount = (
  amount: bigint,
  pips: number,
  denominator: number = ONE_IN_PIP,
) => (amount * BigInt(pips)) / BigInt(denominator);

export const getHundredthPipAmountFromAmount = (amount: bigint, hundredthPips: number) =>
  getPipAmountFromAmount(amount, hundredthPips, ONE_IN_HUNDREDTH_PIPS);

export const getPriceX128FromPrice = (
  price: number | string,
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
) =>
  BigNumber(price)
    .multipliedBy(new BigNumber(2).pow(128))
    .shiftedBy(assetConstants[destAsset].decimals - assetConstants[srcAsset].decimals)
    .toFixed(0);

export const getPriceFromPriceX128 = (
  priceX128: bigint | string,
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
) =>
  BigNumber(priceX128.toString())
    .dividedBy(new BigNumber(2).pow(128))
    .shiftedBy(assetConstants[srcAsset].decimals - assetConstants[destAsset].decimals)
    .toFixed();

export const assertUnreachable = (_: never, message = 'unreachable'): never => {
  throw new Error(message);
};

export const parseFoKParams = (
  params: FillOrKillParamsWithMinPrice | FillOrKillParamsWithSlippage | undefined,
  quote: Pick<Quote, 'srcAsset' | 'destAsset' | 'estimatedPrice'>,
) => {
  if (!params) return undefined;

  const srcAsset = getInternalAsset(quote.srcAsset);
  const destAsset = getInternalAsset(quote.destAsset);

  let minPrice: string;

  if ('minPrice' in params) {
    assert(
      !('slippageTolerancePercent' in params),
      'Cannot have both minPrice and slippageTolerancePercent',
    );

    minPrice = params.minPrice;
  } else if ('slippageTolerancePercent' in params) {
    const tolerance = new BigNumber(params.slippageTolerancePercent);

    assert(!tolerance.isNaN(), 'Invalid slippage tolerance');

    assert(
      tolerance.gte(0) && tolerance.lte(100),
      'Slippage tolerance must be between 0 and 100 inclusive',
      RangeError,
    );

    const estimatedPrice = new BigNumber(quote.estimatedPrice);

    assert(!estimatedPrice.isNaN(), 'Invalid estimated price');

    minPrice = estimatedPrice
      .times(new BigNumber(100).minus(tolerance).dividedBy(100))
      .toFixed(assetConstants[destAsset].decimals);
  } else {
    throw new Error('Either minPrice or slippageTolerancePercent must be provided');
  }

  return {
    refundAddress: params.refundAddress,
    retryDurationBlocks: params.retryDurationBlocks,
    minPriceX128: getPriceX128FromPrice(minPrice, srcAsset, destAsset),
  };
};
