import { postSwapSchema } from '../schemas';

const swapBody = {
  srcAsset: 'BTC',
  destAsset: 'ETH',
  destAddress: '0x123',
  amount: '123',
};

describe('postSwapSchema', () => {
  it('handles empty ccmMetadata strings', () => {
    expect(
      postSwapSchema.safeParse({
        ...swapBody,
      }),
    ).toEqual(expect.objectContaining({ success: true }));
  });
  it('handles full ccmMetadata', () => {
    expect(
      postSwapSchema.safeParse({
        ...swapBody,
        ccmMetadata: {
          gas_budget: '123',
          message: 'message',
          source_address: '0x123',
          source_chain: 'Bitcoin',
          cf_parameters: 'string',
        },
      }),
    ).toEqual(expect.objectContaining({ success: true }));
  });
  it('handles without cf parameters', () => {
    expect(
      postSwapSchema.safeParse({
        ...swapBody,
        ccmMetadata: {
          gas_budget: '123',
          message: 'message',
          source_address: '0x123',
          source_chain: 'Bitcoin',
        },
      }),
    ).toEqual(expect.objectContaining({ success: true }));
  });
  it('handles missing ccm params', () => {
    expect(
      postSwapSchema.safeParse({
        ...swapBody,
        ccmMetadata: {
          gas_budget: '123',
          message: 'message',
          source_address: '0x123',
        },
      }),
    ).toEqual(expect.objectContaining({ success: false }));
  });
  it('handles missing ccm params', () => {
    expect(
      postSwapSchema.safeParse({
        ...swapBody,
        ccmMetadata: {
          gas_budget: '123',
          message: 'message',
          source_address: '0x123',
          cf_parameters: 'string',
        },
      }),
    ).toEqual(expect.objectContaining({ success: false }));
  });
  it('handles missing swap body params', () => {
    expect(
      postSwapSchema.safeParse({
        srcAsset: 'BTC',
        destAsset: 'ETH',
        destAddress: '0x123',
        ccmMetadata: {
          gas_budget: '123',
          message: 'message',
          source_address: '0x123',
          source_chain: 'Bitcoin',
          cf_parameters: 'string',
        },
      }),
    ).toEqual(expect.objectContaining({ success: false }));
  });
});
