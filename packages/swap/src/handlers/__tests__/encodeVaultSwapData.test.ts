import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import env from '@/swap/config/env';
import isDisallowedSwap from '../../utils/isDisallowedSwap';
import { encodeVaultSwapData } from '../encodeVaultSwapData';

vi.mock('@/shared/broker', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    requestSwapParameterEncoding: vi.fn(),
  };
});

vi.mock('../../utils/isDisallowedSwap', () => ({
  default: vi.fn().mockResolvedValue(false),
}));

describe(encodeVaultSwapData, () => {
  let oldEnv: typeof env;

  beforeEach(async () => {
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
      commissionBps: 15,
      extraParams: {
        chain: 'Bitcoin',
        min_output_amount: '0xfc6f7c40458122964d0000000',
        retry_duration: 500,
      },
      fillOrKillParams: {
        retry_duration: 500,
        refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
      },
      ccmParams: {
        gas_budget: '0x75bcd15',
        message: '0xdeadc0de',
        cf_parameters: undefined,
        ccm_additional_data: undefined,
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

    expect(postSpy).toHaveBeenCalledWith('https://rpc-broker.test', [
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
            min_output_amount: '0xfc6f7c40458122964d0000000',
            retry_duration: 500,
          },
          {
            gas_budget: '0x75bcd15',
            message: '0xdeadc0de',
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
      },
      fillOrKillParams: {
        retry_duration: 500,
        refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
      },
      ccmParams: {
        gas_budget: '0x75bcd15',
        message: '0xdeadc0de',
        cf_parameters: undefined,
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

    expect(postSpy).toHaveBeenCalledWith('http://rpc-node.test', [
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
            min_output_amount: '0xfc6f7c40458122964d0000000',
            retry_duration: 500,
          },
          {
            gas_budget: '0x75bcd15',
            message: '0xdeadc0de',
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

  it('rejects sanctioned addresses', async () => {
    vi.mocked(isDisallowedSwap).mockResolvedValueOnce(true);

    await expect(
      encodeVaultSwapData({
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        srcAddress: 'bc1qqwykx04uenc842d3sf50cjtehtj9tenugk808w',
        destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
        amount: 175000000n,
        commissionBps: 15,
        extraParams: {
          chain: 'Bitcoin',
          min_output_amount: '0xfc6f7c40458122964d0000000',
          retry_duration: 500,
        },
        fillOrKillParams: {
          retry_duration: 500,
          refund_address: 'bc1qv6nkwfd0l7gjucvccgd4k4qcea488cfkg7zjcp',
          min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
        },
      }),
    ).rejects.toThrow('Failed to get vault swap data, please try again later');
    expect(vi.mocked(isDisallowedSwap).mock.calls).toMatchSnapshot();
  });

  it('rejects if source asset is disabled', async () => {
    env.DISABLED_INTERNAL_ASSETS = ['Flip', 'Btc'];

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
        },
        fillOrKillParams: {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
        },
      }),
    ).rejects.toThrow('Asset Btc is disabled');
  });

  it('rejects if destination asset is disabled', async () => {
    env.DISABLED_INTERNAL_ASSETS = ['Btc', 'Dot'];

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
        },
        fillOrKillParams: {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          min_price: '0x152d02c7e14af680000000000000000000000000000000000000',
        },
      }),
    ).rejects.toThrow('Asset Dot is disabled');
  });
});
