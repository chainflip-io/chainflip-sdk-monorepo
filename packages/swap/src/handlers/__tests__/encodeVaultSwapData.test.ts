import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { z } from 'zod';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import env from '../../config/env.js';
import { encodeVaultSwapData, encodeVaultSwapDataSchema } from '../encodeVaultSwapData.js';

vi.mock('@/shared/broker.js', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    requestSwapParameterEncoding: vi.fn(),
  };
});

describe(encodeVaultSwapData, () => {
  let oldEnv: typeof env;

  beforeEach(async () => {
    vi.resetAllMocks();
    oldEnv = structuredClone(env);
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('calls the broker api with the correct params', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({ data: environment({ maxSwapAmount: '0x10000000000' }) });
      }

      if (data.method === 'broker_request_swap_parameter_encoding') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              chain: 'Bitcoin',
              nulldata_payload:
                '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
              deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
            },
          },
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });

    const result = await encodeVaultSwapData({
      srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
      destAsset: { asset: 'ETH', chain: 'Ethereum' },
      destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
      amount: 175000000n,
      commissionBps: 0,
      brokerCommissionBps: 0,
      extraParams: {
        chain: 'Bitcoin',
        min_output_amount: '0xfc6f7c40458122964d0000000',
        retry_duration: 500,
        max_oracle_price_slippage: null,
      },
      fillOrKillParams: {
        retry_duration: 500,
        refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        refund_ccm_metadata: null,
        min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
        max_oracle_price_slippage: null,
      },
      ccmParams: {
        gas_budget: '0x75bcd15',
        message: '0xdeadc0de',
        cf_parameters: '0x',
        ccm_additional_data: '0x',
      },
      maxBoostFeeBps: 35,
      affiliates: [
        {
          account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
          bps: 10,
        },
      ],
      dcaParams: {
        number_of_chunks: 100,
        chunk_interval: 5,
      },
    });

    expect(postSpy).toHaveBeenNthCalledWith(2, 'https://rpc-broker.test', [
      {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'broker_request_swap_parameter_encoding',
        params: [
          {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          0, // ignores commission
          {
            chain: 'Bitcoin',
            max_oracle_price_slippage: null,
            min_output_amount: '0xfc6f7c40458122964d0000000',
            retry_duration: 500,
          },
          {
            gas_budget: '0x75bcd15',
            message: '0xdeadc0de',
            cf_parameters: '0x',
            ccm_additional_data: '0x',
          },
          35,
          null, // ignores affiliates
          {
            chunk_interval: 5,
            number_of_chunks: 100,
          },
        ],
      },
    ]);
    expect(result).toEqual({
      chain: 'Bitcoin',
      nulldataPayload:
        '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
      depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
    });
  });

  it('calls the node rpc with the correct params if broker account is given', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({ data: environment({ maxSwapAmount: '0x10000000000' }) });
      }

      if (data.method === 'cf_request_swap_parameter_encoding') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              chain: 'Bitcoin',
              nulldata_payload:
                '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
              deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
            },
          },
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });

    const result = await encodeVaultSwapData({
      srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
      destAsset: { asset: 'ETH', chain: 'Ethereum' },
      destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
      amount: 175000000n,
      brokerAccount: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
      commissionBps: 15,
      extraParams: {
        chain: 'Bitcoin',
        min_output_amount: '0xfc6f7c40458122964d0000000',
        retry_duration: 500,
        max_oracle_price_slippage: 50,
      },
      fillOrKillParams: {
        retry_duration: 500,
        refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        refund_ccm_metadata: null,
        min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
        max_oracle_price_slippage: 50,
      },
      ccmParams: {
        gas_budget: '0x75bcd15',
        message: '0xdeadc0de',
        cf_parameters: '0x',
        ccm_additional_data: '0x',
      },
      maxBoostFeeBps: 35,
      affiliates: [
        {
          account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
          bps: 10,
        },
      ],
      dcaParams: {
        number_of_chunks: 100,
        chunk_interval: 5,
      },
    });

    expect(postSpy).toHaveBeenNthCalledWith(2, 'http://rpc-node.test', [
      {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'cf_request_swap_parameter_encoding',
        params: [
          'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
          {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          15,
          {
            chain: 'Bitcoin',
            max_oracle_price_slippage: 50,
            min_output_amount: '0xfc6f7c40458122964d0000000',
            retry_duration: 500,
          },
          {
            gas_budget: '0x75bcd15',
            message: '0xdeadc0de',
            ccm_additional_data: '0x',
            cf_parameters: '0x',
          },
          35,
          [
            {
              account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
              bps: 10,
            },
          ],
          {
            chunk_interval: 5,
            number_of_chunks: 100,
          },
        ],
      },
    ]);
    expect(result).toEqual({
      chain: 'Bitcoin',
      nulldataPayload:
        '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
      depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
    });
  });

  it('calls the node rpc with the broker commission if client passes brokerCommissionBps (sdk version 1.8.2)', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({ data: environment({ maxSwapAmount: '0x10000000000' }) });
      }

      if (data.method === 'cf_request_swap_parameter_encoding') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              chain: 'Bitcoin',
              nulldata_payload:
                '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
              deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
            },
          },
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });

    await encodeVaultSwapData({
      srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
      destAsset: { asset: 'ETH', chain: 'Ethereum' },
      destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
      amount: 175000000n,
      brokerAccount: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
      commissionBps: 0,
      brokerCommissionBps: 15,
      extraParams: {
        chain: 'Bitcoin',
        min_output_amount: '0xfc6f7c40458122964d0000000',
        retry_duration: 500,
        max_oracle_price_slippage: 50,
      },
      fillOrKillParams: {
        retry_duration: 500,
        refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        refund_ccm_metadata: null,
        min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
        max_oracle_price_slippage: 50,
      },
      maxBoostFeeBps: 35,
    });

    expect(postSpy).toHaveBeenCalledWith('http://rpc-node.test', [
      {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'cf_request_swap_parameter_encoding',
        params: [
          expect.anything(),
          expect.anything(),
          expect.anything(),
          '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          15,
          expect.anything(),
          null,
          expect.anything(),
          null,
          null,
        ],
      },
    ]);
  });

  it('rejects if source asset is disabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Flip', 'Btc']);

    await expect(
      encodeVaultSwapData({
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
        amount: 175000000n,
        commissionBps: 15,
        extraParams: {
          chain: 'Bitcoin',
          min_output_amount: '0xfc6f7c40458122964d0000000',
          retry_duration: 500,
          max_oracle_price_slippage: 50,
        },
        fillOrKillParams: {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
          max_oracle_price_slippage: 50,
        },
      }),
    ).rejects.toThrow('Asset Btc is disabled');
  });

  it('rejects if destination asset is disabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Btc', 'Dot']);

    await expect(
      encodeVaultSwapData({
        srcAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAsset: { asset: 'DOT', chain: 'Polkadot' },
        destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
        amount: 175000000n,
        commissionBps: 15,
        extraParams: {
          chain: 'Bitcoin',
          min_output_amount: '0xfc6f7c40458122964d0000000',
          retry_duration: 500,
          max_oracle_price_slippage: 50,
        },
        fillOrKillParams: {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
          max_oracle_price_slippage: 50,
        },
      }),
    ).rejects.toThrow('Asset Dot is disabled');
  });
});

describe('encodeVaultSwapDataSchema', () => {
  it('adds a seed if none is provided', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce(() => {
      const array = new Uint8Array(32);

      for (let i = 0; i < array!.byteLength; i += 1) {
        array[i] = i;
      }
      return array;
    });

    const data: z.input<typeof encodeVaultSwapDataSchema> = {
      amount: '1',
      destAddress: '0x1234567890123456789012345678901234567890',
      srcAsset: { chain: 'Solana', asset: 'SOL' },
      destAsset: { chain: 'Ethereum', asset: 'ETH' },
      srcAddress: '3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC',
      fillOrKillParams: {
        refundAddress: '3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC',
        minPriceX128: '1',
        retryDurationBlocks: 100,
        maxOraclePriceSlippage: 50,
      },
    };

    expect(encodeVaultSwapDataSchema.parse(data)).toMatchInlineSnapshot(`
      {
        "amount": 1n,
        "commissionBps": 0,
        "destAddress": "0x1234567890123456789012345678901234567890",
        "destAsset": {
          "asset": "ETH",
          "chain": "Ethereum",
        },
        "extraParams": {
          "chain": "Solana",
          "from": "3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC",
          "input_amount": "0x1",
          "refund_parameters": {
            "max_oracle_price_slippage": 50,
            "min_price": "0x1",
            "refund_address": "3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC",
            "refund_ccm_metadata": null,
            "retry_duration": 100,
          },
          "seed": "0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        },
        "fillOrKillParams": {
          "max_oracle_price_slippage": 50,
          "min_price": "0x1",
          "refund_address": "3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC",
          "refund_ccm_metadata": null,
          "retry_duration": 100,
        },
        "srcAddress": "3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC",
        "srcAsset": {
          "asset": "SOL",
          "chain": "Solana",
        },
      }
    `);
    expect(spy).toHaveBeenCalled();
  });
});
