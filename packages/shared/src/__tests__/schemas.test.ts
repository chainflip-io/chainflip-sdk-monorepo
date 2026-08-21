import { describe, expect, it } from 'vitest';
import { quoteQuerySchema } from '../schemas.js';

describe('quoteQuerySchema', () => {
  const baseParams = {
    srcChain: 'Solana',
    srcAsset: 'SOL',
    destChain: 'Ethereum',
    destAsset: 'FLIP',
    amount: '1000000000000',
  } as const;

  const brokerAddress = 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa';

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

  it('accepts the broker under `brokerAccount`', () => {
    expect(quoteQuerySchema.parse({ ...baseParams, brokerAccount: brokerAddress })).toMatchObject({
      brokerIdSs58: brokerAddress,
    });
  });

  it('accepts the broker under the legacy `brokerIdSs58`', () => {
    expect(quoteQuerySchema.parse({ ...baseParams, brokerIdSs58: brokerAddress })).toMatchObject({
      brokerIdSs58: brokerAddress,
    });
  });

  it('prefers `brokerIdSs58` when both names are set', () => {
    expect(
      quoteQuerySchema.parse({
        ...baseParams,
        brokerAccount: 'cFLdvBS9Gq9iqB8Zdb5cmnWgmhqvEojQYGMBquDz7xRiSvsJV',
        brokerIdSs58: brokerAddress,
      }),
    ).toMatchObject({ brokerIdSs58: brokerAddress });
  });

  it('leaves the broker unset when neither name is given', () => {
    expect(quoteQuerySchema.parse(baseParams)).toMatchObject({ brokerIdSs58: undefined });
  });

  it('rejects an invalid `brokerAccount`', () => {
    expect(() => quoteQuerySchema.parse({ ...baseParams, brokerAccount: 'not-an-address' }))
      .toThrowErrorMatchingInlineSnapshot(`
        [ZodError: [
          {
            "code": "custom",
            "message": "not-an-address is not a valid Chainflip address",
            "path": [
              "brokerAccount"
            ]
          }
        ]]
      `);
  });
});
