import {
  assetConstants,
  getInternalAsset,
  ChainflipNetwork,
  AnyChainflipAsset,
  anyAssetConstants,
} from '@chainflip/utils/chainflip';
import { CHAINFLIP_BLOCK_TIME_SECONDS } from '@chainflip/utils/consts';
import BigNumber from 'bignumber.js';
import EventEmitter, { once } from 'events';
import { assert, isNotNullish } from './guards.js';
import {
  CcmParams,
  FillOrKillParams,
  FillOrKillParamsWithoutRefundAddress,
  Quote,
} from './schemas.js';

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
  srcAsset: AnyChainflipAsset,
  destAsset: AnyChainflipAsset,
) =>
  BigNumber(price)
    .multipliedBy(new BigNumber(2).pow(128))
    .shiftedBy(anyAssetConstants[destAsset].decimals - anyAssetConstants[srcAsset].decimals)
    .toFixed(0);

export const getPriceFromPriceX128 = (
  priceX128: bigint | string,
  srcAsset: AnyChainflipAsset,
  destAsset: AnyChainflipAsset,
) =>
  BigNumber(priceX128.toString())
    .dividedBy(new BigNumber(2).pow(128))
    .shiftedBy(anyAssetConstants[srcAsset].decimals - anyAssetConstants[destAsset].decimals)
    .toFixed();

export const assertUnreachable = (_: never, message = 'unreachable'): never => {
  throw new Error(message);
};

type ParsedFoKParams = {
  refundAddress: string;
  retryDurationBlocks: number;
  minPriceX128: string;
  maxOraclePriceSlippage: number;
  refundCcmMetadata: CcmParams | null;
};

const blocksPerMinute = 60 / CHAINFLIP_BLOCK_TIME_SECONDS;

export function parseFoKParams(
  params: FillOrKillParams,
  quote: Pick<
    Quote,
    'srcAsset' | 'destAsset' | 'estimatedPrice' | 'recommendedLivePriceSlippageTolerancePercent'
  >,
): ParsedFoKParams;
export function parseFoKParams(
  params: FillOrKillParamsWithoutRefundAddress,
  quote: Pick<
    Quote,
    'srcAsset' | 'destAsset' | 'estimatedPrice' | 'recommendedLivePriceSlippageTolerancePercent'
  >,
): Omit<ParsedFoKParams, 'refundAddress'>;
export function parseFoKParams(
  params: FillOrKillParams | FillOrKillParamsWithoutRefundAddress,
  quote: Pick<
    Quote,
    'srcAsset' | 'destAsset' | 'estimatedPrice' | 'recommendedLivePriceSlippageTolerancePercent'
  >,
) {
  const srcAsset = getInternalAsset(quote.srcAsset);
  const destAsset = getInternalAsset(quote.destAsset);
  const livePriceProtectionDisabled = params.livePriceSlippageTolerancePercent === false;
  const livePriceProtectionEnabled =
    typeof params.livePriceSlippageTolerancePercent === 'string' ||
    typeof params.livePriceSlippageTolerancePercent === 'number';
  const livePriceProtectionAvailable = isNotNullish(
    quote.recommendedLivePriceSlippageTolerancePercent,
  );

  if (livePriceProtectionEnabled && !livePriceProtectionAvailable) {
    throw new Error('Live price protection is not available for this asset pair');
  }

  let minPrice: string;
  let livePriceSlippageTolerancePercent = null as BigNumber | null;
  if (!livePriceProtectionDisabled) {
    if (
      isNotNullish(params.livePriceSlippageTolerancePercent) &&
      params.livePriceSlippageTolerancePercent !== false
    ) {
      livePriceSlippageTolerancePercent = new BigNumber(params.livePriceSlippageTolerancePercent);
      assert(!livePriceSlippageTolerancePercent.isNaN(), 'Invalid live price slippage tolerance');
      assert(
        livePriceSlippageTolerancePercent.gte(0) && livePriceSlippageTolerancePercent.lte(100),
        'Live price slippage tolerance must be between 0 and 100 inclusive',
      );
    } else if (quote.recommendedLivePriceSlippageTolerancePercent) {
      livePriceSlippageTolerancePercent = new BigNumber(
        quote.recommendedLivePriceSlippageTolerancePercent,
      );
      assert(!livePriceSlippageTolerancePercent.isNaN(), 'Invalid live price slippage tolerance');
    }
  }

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

  const retryDurationBlocks =
    'retryDurationBlocks' in params
      ? params.retryDurationBlocks
      : Math.max(Math.ceil(params.retryDurationMinutes * blocksPerMinute), 0);

  const maxOraclePriceSlippage =
    livePriceSlippageTolerancePercent?.multipliedBy(100).toNumber() ?? null;

  const parsed = {
    retryDurationBlocks,
    minPriceX128: getPriceX128FromPrice(minPrice, srcAsset, destAsset),
    maxOraclePriceSlippage,
    refundCcmMetadata: params.refundCcmMetadata ?? null,
  };

  return 'refundAddress' in params ? { ...parsed, refundAddress: params.refundAddress } : parsed;
}

export const safeStringify = (obj: unknown) =>
  JSON.stringify(obj, (_key, value) => (typeof value === 'bigint' ? value.toString() : value));

export const isTestnet = (network: ChainflipNetwork): boolean => network !== 'mainnet';
