import { describe, expect, it } from 'vitest';
import { getOpenSwapDepositChannelSchema } from '../openSwapDepositChannel.js';

describe(getOpenSwapDepositChannelSchema, () => {
  const swapBody = {
    srcAsset: 'BTC',
    srcChain: 'Bitcoin',
    destAsset: 'ETH',
    destChain: 'Ethereum',
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
          cfParameters: '0xcafebabe',
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
          cfParameters: '0xcafebabe',
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
});
