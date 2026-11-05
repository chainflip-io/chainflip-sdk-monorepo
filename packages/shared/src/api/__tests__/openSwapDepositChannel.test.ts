import { describe, expect, it } from 'vitest';
import { getOpenSwapDepositChannelSchema } from '../openSwapDepositChannel.js';

describe(getOpenSwapDepositChannelSchema, () => {
  const swapBody = {
    srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
    destAsset: { asset: 'ETH', chain: 'Ethereum' },
    destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
    amount: '123',
    fillOrKillParams: {
      retryDurationBlocks: 2,
      refundAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      minPriceX128: '1',
    },
  };

  it('handles empty ccmParams strings', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
      }),
    ).not.toThrow();
  });

  it('handles full ccmParams', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          ccmAdditionalData: '0xcafebabe',
        },
      }),
    ).not.toThrow();
  });

  it('handles without cf parameters', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
        },
      }),
    ).not.toThrow();
  });

  it('handles missing ccm params', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
        },
      }),
    ).toThrow();
  });

  it('handles other missing ccm params', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        ccmParams: {
          message: '0xdeadc0de',
          ccmAdditionalData: '0xcafebabe',
        },
      }),
    ).toThrow();
  });

  it('handles missing swap body params', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        srcAsset: 'BTC',
        destAsset: 'ETH',
        destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          ccmAdditional: '0xcafebabe',
        },
      }),
    ).toThrow();
  });

  it('handles missing dca params', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        dcaParams: {
          numberOfChunks: 1,
        },
      }),
    ).toThrow();
  });

  it('allows FoK params without DCA params', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        fillOrKillParams: {
          retryDurationBlocks: 10,
          refundAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          minPriceX128: '1',
        },
      }),
    ).not.toThrow();
  });

  it('allows FoK params without maxOraclePriceSlippage', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        fillOrKillParams: {
          retryDurationBlocks: 10,
          refundAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          minPriceX128: '1',
        },
      }),
    ).not.toThrow();
  });

  it('allows FoK params with maxOraclePriceSlippage', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        fillOrKillParams: {
          retryDurationBlocks: 10,
          refundAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          minPriceX128: '1',
          maxOraclePriceSlippage: 100,
        },
      }),
    ).not.toThrow();
  });

  it('throws if maxOraclePriceSlippage is not in basis points', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        fillOrKillParams: {
          retryDurationBlocks: 10,
          refundAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          minPriceX128: '1',
          maxOraclePriceSlippage: 0.5,
        },
      }),
    ).toThrow('must be in basis points');
  });

  it('accepts 30 digit amounts and a u128::MAX gas budget', () => {
    const maxAmount = '9'.repeat(30);

    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        amount: maxAmount,
        ccmParams: { gasBudget: (2n ** 128n - 1n).toString(), message: '0x00' },
        quote: { egressAmount: maxAmount, intermediateAmount: maxAmount, estimatedPrice: '1.5' },
      }),
    ).not.toThrow();
  });

  it.each([
    ['amount', { amount: '1'.repeat(31) }],
    ['quote egress amount', { quote: { egressAmount: '1'.repeat(31), estimatedPrice: '1' } }],
    [
      'quote intermediate amount',
      { quote: { egressAmount: '1', intermediateAmount: '1'.repeat(31), estimatedPrice: '1' } },
    ],
  ])('rejects a %s with more than 30 digits', (_name, overrides) => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({ ...swapBody, ...overrides }),
    ).toThrow('must have at most 30 digits');
  });

  it('rejects a ccm gas budget that does not fit in a u128', () => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        ccmParams: { gasBudget: (2n ** 128n).toString(), message: '0x00' },
      }),
    ).toThrow('ccm gas budget must be less than 2^128');
  });

  it.each(['1e999999999999999999', 'abc'])('rejects a quote estimated price of %s', (price) => {
    expect(() =>
      getOpenSwapDepositChannelSchema('mainnet').parse({
        ...swapBody,
        quote: { egressAmount: '1', estimatedPrice: price },
      }),
    ).toThrow('must be a finite number');
  });

  it.each([
    ['amount', { amount: '1.5' }],
    ['quote egress amount', { quote: { egressAmount: 'abc', estimatedPrice: '1' } }],
  ])('returns a validation error for a non-numeric %s', (_name, overrides) => {
    expect(
      getOpenSwapDepositChannelSchema('mainnet').safeParse({ ...swapBody, ...overrides }).success,
    ).toBe(false);
  });
});
