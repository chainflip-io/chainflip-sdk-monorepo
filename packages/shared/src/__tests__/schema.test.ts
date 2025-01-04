import { describe, it, expect } from 'vitest';
import { openSwapDepositChannelSchema } from '../schemas';

const swapBody = {
  srcAsset: 'BTC',
  srcChain: 'Bitcoin',
  destAsset: 'ETH',
  destChain: 'Ethereum',
  destAddress: '0x123',
  amount: '123',
  fillOrKillParams: {
    retryDurationBlocks: 2,
    refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
    minPriceX128: '1',
  },
};

describe('postSwapSchema', () => {
  it('handles empty ccmParams strings', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
      }),
    ).not.toThrow();
  });

  it('handles full ccmParams', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).not.toThrow();
  });

  it('handles without cf parameters', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
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
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
        },
      }),
    ).toThrow();
  });

  it('handles missing ccm params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
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
      openSwapDepositChannelSchema.parse({
        srcAsset: 'BTC',
        destAsset: 'ETH',
        destAddress: '0x123',
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
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        dcaParams: {
          numberOfChunks: 1,
        },
      }),
    ).toThrow();
  });

  it('allows FoK params without DCA params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        fillOrKillParams: {
          retryDurationBlocks: 10,
          refundAddress: '0x1234',
          minPriceX128: '1',
        },
      }),
    ).not.toThrow();
  });
});
