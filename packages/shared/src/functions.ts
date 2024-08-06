import BigNumber from 'bignumber.js';
import EventEmitter, { once } from 'events';
import { assetConstants, InternalAsset } from './enums';

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

export const assertUnreachable = (x: never): never => x;
