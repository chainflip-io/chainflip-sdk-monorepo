import { describe, expect, it } from 'vitest';
import { quoteQuerySchema } from '../schemas.js';

describe('quoteQuerySchema', () => {
  it('throws if requesting an on-chain swap with invalid options', () => {
    expect(() =>
      quoteQuerySchema.parse({
        srcChain: 'Solana',
        srcAsset: 'SOL',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        amount: '1000000000000',
        isOnChain: 'true',
        isVaultSwap: 'true',
        brokerCommissionBps: '10',
      }),
    ).toThrowErrorMatchingInlineSnapshot(`
      [ZodError: [
        {
          "message": "isOnChain and isVaultSwap cannot be set at the same time",
          "code": "custom",
          "path": []
        },
        {
          "message": "isOnChain cannot be set with a non-zero broker commission",
          "code": "custom",
          "path": []
        }
      ]]
    `);
  });

  it('allows a broker commission with `isOnChain=false`', () => {
    expect(() =>
      quoteQuerySchema.parse({
        srcChain: 'Solana',
        srcAsset: 'SOL',
        destChain: 'Ethereum',
        destAsset: 'FLIP',
        amount: '1000000000000',
        isOnChain: 'false',
        isVaultSwap: 'true',
        brokerCommissionBps: '10',
      }),
    ).not.toThrowError();
  });
});
