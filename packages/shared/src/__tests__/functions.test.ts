import { assetConstants, getInternalAsset } from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import { describe, it, expect } from 'vitest';
import {
  calculateExpiryTime,
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
  getPriceFromPriceX128,
  getPriceX128FromPrice,
  parseFoKParams,
} from '../functions.js';

describe(getPipAmountFromAmount, () => {
  it.each([
    [10000000n, 100, 100000n],
    [250n, 100, 2n],
    [0n, 100, 0n],
    [1n, 100, 0n],
  ])('calculates pip amount from amount', (amount, pips, result) => {
    expect(getPipAmountFromAmount(amount, pips)).toBe(result);
  });
});

describe(getHundredthPipAmountFromAmount, () => {
  it.each([
    [10000000n, 100, 1000n],
    [10000000n, 1000, 10000n],
    [250n, 100, 0n],
    [0n, 100, 0n],
    [1n, 100, 0n],
  ])('calculates hundredth pip amount from amount', (amount, hundredthPips, result) => {
    expect(getHundredthPipAmountFromAmount(amount, hundredthPips)).toBe(result);
  });
});

describe(getPriceX128FromPrice, () => {
  it.each([
    [2458.206, 'Eth', 'Usdc', '836484156059252456516448240236'] as const,
    ['2458.206', 'Eth', 'Usdc', '836484156059252456516448240236'] as const,
    ['600', 'Eth', 'HubDot', '2041694201525630780780247644590609'] as const,
    [0, 'Eth', 'Usdc', '0'] as const,
  ])('calculates priceX128 from price', (price, srcAsset, destAsset, result) => {
    expect(getPriceX128FromPrice(price, srcAsset, destAsset)).toBe(result);
  });
});

describe(getPriceFromPriceX128, () => {
  it.each([
    [836484156059252456516448240236n, 'Eth', 'Usdc', '2458.206'] as const,
    ['836484156059252456516448240236', 'Eth', 'Usdc', '2458.206'] as const,
    [2041694201525630780780247644590609n, 'Eth', 'HubDot', '600'] as const,
    [0n, 'Eth', 'Usdc', '0'] as const,
  ])('calculates price from priceX128', (priceX128, srcAsset, destAsset, result) => {
    expect(getPriceFromPriceX128(priceX128, srcAsset, destAsset)).toBe(result);
  });
});

describe(parseFoKParams, () => {
  const slippageTolerancePercent = 1.5;
  const quote = {
    srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
    destAsset: { asset: 'ETH', chain: 'Ethereum' },
    estimatedPrice: '25.02922538655223706836',
    recommendedLivePriceSlippageTolerancePercent: 0.5,
  } as const;

  it('calculates the minimum price based off the quote and slippage tolerance', () => {
    expect(
      parseFoKParams(
        { slippageTolerancePercent, refundAddress: '0x1234', retryDurationBlocks: 100 },
        quote,
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: 50,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('uses the provided minimum price', () => {
    const minPrice = new BigNumber(quote.estimatedPrice)
      .times(new BigNumber(100).minus(slippageTolerancePercent).dividedBy(100))
      .toFixed(assetConstants[getInternalAsset(quote.destAsset)].decimals);

    expect(
      parseFoKParams({ minPrice, refundAddress: '0x1234', retryDurationBlocks: 100 }, quote),
    ).toStrictEqual({
      maxOraclePriceSlippage: 50,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it.each([0.5, 1, 0, 10, 0.25])('accepts the retry duration in %d minutes', (minutes) => {
    const minPrice = new BigNumber(quote.estimatedPrice)
      .times(new BigNumber(100).minus(slippageTolerancePercent).dividedBy(100))
      .toFixed(assetConstants[getInternalAsset(quote.destAsset)].decimals);

    expect(
      parseFoKParams({ minPrice, refundAddress: '0x1234', retryDurationMinutes: minutes }, quote),
    ).toMatchSnapshot();
  });

  it('validates the slippage tolerance range', () => {
    expect(() => {
      parseFoKParams(
        { slippageTolerancePercent: 0, refundAddress: '0x1234', retryDurationBlocks: 100 },
        quote,
      );
    }).not.toThrow();

    expect(() => {
      parseFoKParams(
        { slippageTolerancePercent: 100, refundAddress: '0x1234', retryDurationBlocks: 100 },
        quote,
      );
    }).not.toThrow();

    expect(() => {
      parseFoKParams(
        { slippageTolerancePercent: -1, refundAddress: '0x1234', retryDurationBlocks: 100 },
        quote,
      );
    }).toThrow(new RangeError('Slippage tolerance must be between 0 and 100 inclusive'));
    expect(() => {
      parseFoKParams(
        { slippageTolerancePercent: 101, refundAddress: '0x1234', retryDurationBlocks: 100 },
        quote,
      );
    }).toThrow(new RangeError('Slippage tolerance must be between 0 and 100 inclusive'));
  });

  it('accepts a minimum price or slippage tolerance', () => {
    expect(() => {
      parseFoKParams(
        {
          slippageTolerancePercent: 0,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
          minPrice: quote.estimatedPrice,
        },
        quote,
      );
    }).toThrow('Cannot have both minPrice and slippageTolerancePercent');
  });

  it('throws if estimated price is invalid', () => {
    expect(() => {
      parseFoKParams(
        {
          slippageTolerancePercent,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        { ...quote, estimatedPrice: 'invalid' },
      );
    }).toThrow('Invalid estimated price');
  });

  it('throws if slippageTolerancePercent is invalid', () => {
    expect(() => {
      parseFoKParams(
        {
          slippageTolerancePercent: 'invalid',
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      );
    }).toThrow('Invalid slippage tolerance');
    expect(() => {
      parseFoKParams(
        {
          slippageTolerancePercent: NaN,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      );
    }).toThrow('Invalid slippage tolerance');
  });

  it('throws if neither minPrice nor slippageTolerancePercent is provided', () => {
    expect(() => {
      // @ts-expect-error testing
      parseFoKParams(
        {
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      );
    }).toThrow('Either minPrice or slippageTolerancePercent must be provided');
  });

  it('sets the default livePriceSlippageTolerancePercent from quote if not provided', () => {
    expect(
      parseFoKParams(
        {
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: 50,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('sets the livePriceSlippageTolerancePercent correctly', () => {
    expect(
      parseFoKParams(
        {
          livePriceSlippageTolerancePercent: 6.8,
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: 680,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('handles livePriceSlippageTolerancePercent as a string', () => {
    expect(
      parseFoKParams(
        {
          livePriceSlippageTolerancePercent: '6.8',
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: 680,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('throws if livePriceSlippageTolerancePercent is invalid', () => {
    expect(() => {
      parseFoKParams(
        {
          livePriceSlippageTolerancePercent: 'invalid',
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      );
    }).toThrow('Invalid live price slippage tolerance');
  });

  it('throws if quote does not return live price slippage but user sets it anyway', () => {
    expect(() => {
      parseFoKParams(
        {
          livePriceSlippageTolerancePercent: '1',
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        {
          ...quote,
          recommendedLivePriceSlippageTolerancePercent: undefined,
        },
      );
    }).toThrow('Live price protection is not available for this asset pair');
  });

  it('does not throw if quote does not return live price slippage and user does not set it', () => {
    expect(
      parseFoKParams(
        {
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        {
          ...quote,
          recommendedLivePriceSlippageTolerancePercent: undefined,
        },
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: null,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('does not throw if quote does not return live price slippage and user sets it to undefined', () => {
    expect(
      parseFoKParams(
        {
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
          livePriceSlippageTolerancePercent: undefined,
        },
        {
          ...quote,
          recommendedLivePriceSlippageTolerancePercent: undefined,
        },
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: null,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('handles user setting live price slippage tolerance to 0', () => {
    expect(
      parseFoKParams(
        {
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
          livePriceSlippageTolerancePercent: 0,
        },
        {
          ...quote,
        },
      ),
    ).toStrictEqual({
      maxOraclePriceSlippage: 0,
      minPriceX128: '83892489958826316385497263710123985244108278726772',
      refundAddress: '0x1234',
      refundCcmMetadata: null,
      retryDurationBlocks: 100,
    });
  });

  it('handles user setting live price slippage tolerance to negative number', () => {
    expect(() => {
      parseFoKParams(
        {
          livePriceSlippageTolerancePercent: -1,
          slippageTolerancePercent: 1.5,
          refundAddress: '0x1234',
          retryDurationBlocks: 100,
        },
        quote,
      );
    }).toThrow('Live price slippage tolerance must be between 0 and 100 inclusive');
  });
});

describe(calculateExpiryTime, () => {
  const trackedAt = new Date('2026-01-01T12:00:00Z');

  it.each([
    { chain: 'Bitcoin', expiryBlock: 1150, expected: '2026-01-02T13:00:00.000Z' },
    { chain: 'Bitcoin', expiryBlock: 1288, expected: '2026-01-03T12:00:00.000Z' },
    { chain: 'Ethereum', expiryBlock: 8500, expected: '2026-01-02T13:00:00.000Z' },
    { chain: 'Ethereum', expiryBlock: 15400, expected: '2026-01-03T12:00:00.000Z' },
  ] as const)(
    'expires $chain block $expiryBlock at $expected when block 1000 was tracked at 12:00',
    ({ chain, expiryBlock, expected }) => {
      const result = calculateExpiryTime({
        chainInfo: { chain, height: 1000, blockTrackedAt: trackedAt },
        expiryBlock,
      });

      expect(result?.toISOString()).toBe(expected);
    },
  );

  it('returns a time in the past for an expired block', () => {
    const result = calculateExpiryTime({
      chainInfo: { chain: 'Ethereum', height: 1000, blockTrackedAt: trackedAt },
      expiryBlock: 990,
    });

    expect(result?.toISOString()).toBe('2026-01-01T11:58:00.000Z');
  });

  it('accepts bigint heights and a timestamp', () => {
    const result = calculateExpiryTime({
      chainInfo: { chain: 'Bitcoin', height: 1000n, blockTrackedAt: trackedAt.getTime() },
      expiryBlock: 1150n,
    });

    expect(result?.toISOString()).toBe('2026-01-02T13:00:00.000Z');
  });

  it.each([
    { chainInfo: null, expiryBlock: 1000 },
    { chainInfo: undefined, expiryBlock: 1000 },
    { chainInfo: { chain: 'Bitcoin', height: 1000, blockTrackedAt: trackedAt }, expiryBlock: null },
  ] as const)('returns null without chain info or expiry block', (args) => {
    expect(calculateExpiryTime(args)).toBeNull();
  });
});
