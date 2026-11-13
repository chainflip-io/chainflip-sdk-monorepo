import { describe, expect, it } from 'vitest';
import { ccmParamsSchema, quoteQuerySchema } from '../schemas.js';

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
            "path": [
              "brokerAccount"
            ],
            "message": "not-an-address is not a valid Chainflip address"
          }
        ]]
      `);
  });

  it('accepts a u128::MAX ccm gas budget', () => {
    const { ccmParams } = quoteQuerySchema.parse({
      ...baseParams,
      ccmGasBudget: (2n ** 128n - 1n).toString(),
      ccmMessageLengthBytes: '1',
    });

    expect(ccmParams?.gasBudget).toBe(2n ** 128n - 1n);
  });

  it('rejects a ccm gas budget that does not fit in a u128', () => {
    expect(() =>
      quoteQuerySchema.parse({
        ...baseParams,
        ccmGasBudget: (2n ** 128n).toString(),
        ccmMessageLengthBytes: '1',
      }),
    ).toThrow('ccm gas budget must be less than 2^128');
  });

  it('returns a validation error for a non-numeric ccm gas budget', () => {
    expect(
      quoteQuerySchema.safeParse({ ...baseParams, ccmGasBudget: 'abc', ccmMessageLengthBytes: '1' })
        .success,
    ).toBe(false);
  });

  it.each([
    { brokerCommissionBps: '65536' },
    { brokerCommissionBps: '99999999999999999999' },
    { ccmGasBudget: '1', ccmMessageLengthBytes: '4294967296' },
    { expectedResponseTimeMs: '4294967296' },
  ])('rejects out of range numeric params (%o)', (params) => {
    expect(quoteQuerySchema.safeParse({ ...baseParams, ...params }).success).toBe(false);
  });

  it('accepts in range numeric params at their upper bounds', () => {
    const result = quoteQuerySchema.parse({
      ...baseParams,
      brokerCommissionBps: '65535',
      ccmGasBudget: '1',
      ccmMessageLengthBytes: '4294967295',
      expectedResponseTimeMs: '4294967295',
    });

    expect(result).toMatchObject({
      brokerCommissionBps: 65535,
      ccmParams: { gasBudget: 1n, messageLengthBytes: 4294967295 },
      expectedResponseTimeMs: 4294967295,
    });
  });

  it('treats an empty broker commission as 0', () => {
    expect(quoteQuerySchema.parse({ ...baseParams, brokerCommissionBps: '' })).toMatchObject({
      brokerCommissionBps: 0,
    });
  });
});

describe('ccmParamsSchema', () => {
  it('returns a validation error for a non-numeric gas budget', () => {
    expect(ccmParamsSchema.safeParse({ gasBudget: 'abc', message: '0x00' }).success).toBe(false);
  });

  it.each([(2n ** 128n - 1n).toString(), '0xffffffffffffffffffffffffffffffff'])(
    'accepts a u128::MAX gas budget (%s)',
    (gasBudget) => {
      expect(ccmParamsSchema.parse({ gasBudget, message: '0x00' }).gasBudget).toBe(
        '0xffffffffffffffffffffffffffffffff',
      );
    },
  );

  it.each([(2n ** 128n).toString(), '0x100000000000000000000000000000000'])(
    'rejects a gas budget that does not fit in a u128 (%s)',
    (gasBudget) => {
      expect(() => ccmParamsSchema.parse({ gasBudget, message: '0x00' })).toThrow(
        'ccm gas budget must be less than 2^128',
      );
    },
  );
});
