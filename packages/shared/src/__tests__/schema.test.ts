import { openSwapDepositChannelSchema } from '../schemas';

const swapBody = {
  srcAsset: 'BTC',
  srcChain: 'Bitcoin',
  destAsset: 'ETH',
  destChain: 'Ethereum',
  destAddress: '0x123',
  amount: '123',
};

describe('postSwapSchema', () => {
  it('handles empty ccmParams strings', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        ...swapBody,
      }),
    ).toMatchObject({ success: true });
  });

  it('handles full ccmParams', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).toMatchObject({ success: true });
  });

  it('handles without cf parameters', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
        },
      }),
    ).toMatchObject({ success: true });
  });

  it('handles missing ccm params', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
        },
      }),
    ).toMatchObject({ success: false });
  });

  it('handles missing ccm params', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        ...swapBody,
        ccmParams: {
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).toMatchObject({ success: false });
  });

  it('handles missing swap body params', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        srcAsset: 'BTC',
        destAsset: 'ETH',
        destAddress: '0x123',
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).toMatchObject({ success: false });
  });

  it('handles missing dca params', () => {
    expect(
      openSwapDepositChannelSchema.safeParse({
        ...swapBody,
        dcaParams: {
          numberOfChunks: 1,
        },
      }),
    ).toMatchObject({ success: false });
  });
});
