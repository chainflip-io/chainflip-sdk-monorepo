import { WsClient } from '@chainflip/rpc';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { describe, it, expect, vi } from 'vitest';
import { getAssetAndChain } from '@/shared/enums';
import { InternalAsset } from '@/swap/client';
import { getSwapRateV3 } from '../statechain';

vi.mock('../function', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    isAtLeastSpecVersion: vi.fn().mockResolvedValue(true),
  };
});

const buildFee = (asset: InternalAsset, amount: bigint | number) => ({
  bigint: {
    amount: BigInt(amount),
    ...getAssetAndChain(asset),
  },
  string: {
    amount: hexEncodeNumber(amount),
    ...getAssetAndChain(asset),
  },
});

vi.mock('@chainflip/rpc', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    WsClient: class {
      async connect() {
        return this;
      }

      sendRequest(method: string) {
        throw new Error(`unmocked request: "${method}"`);
      }
    },
  };
});

describe(getSwapRateV3, () => {
  it('calls sendRequest with excludeFees', async () => {
    const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
      broker_commission: buildFee('Usdc', 0).bigint,
      ingress_fee: buildFee('Usdc', 0).bigint,
      egress_fee: buildFee('Eth', 0).bigint,
      network_fee: buildFee('Usdc', 100100).bigint,
      intermediary: null,
      output: BigInt(1e18),
    });

    const getSwapRateV3Params = {
      srcAsset: 'Usdc' as InternalAsset,
      destAsset: 'Eth' as InternalAsset,
      depositAmount: 1000n,
      limitOrders: undefined,
      dcaParams: undefined,
      excludeFees: ['IngressDepositChannel' as const],
      brokerCommissionBps: 0,
    };

    await getSwapRateV3(getSwapRateV3Params);

    expect(sendSpy).toHaveBeenNthCalledWith(
      1,
      'cf_swap_rate_v3',
      { asset: 'USDC', chain: 'Ethereum' },
      { asset: 'ETH', chain: 'Ethereum' },
      '0x3e8',
      0,
      undefined,
      undefined,
      ['IngressDepositChannel'],
      undefined,
    );
  });

  it('calls sendRequest with ccm params', async () => {
    const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
      broker_commission: buildFee('Usdc', 0).bigint,
      ingress_fee: buildFee('Usdc', 0).bigint,
      egress_fee: buildFee('Eth', 0).bigint,
      network_fee: buildFee('Usdc', 100100).bigint,
      intermediary: null,
      output: BigInt(1e18),
    });

    const getSwapRateV3Params = {
      srcAsset: 'Usdc' as InternalAsset,
      destAsset: 'Eth' as InternalAsset,
      depositAmount: 1000n,
      limitOrders: undefined,
      dcaParams: undefined,
      ccmParams: {
        gasBudget: 10101n,
        messageLengthBytes: 202,
      },
      brokerCommissionBps: 0,
    };

    await getSwapRateV3(getSwapRateV3Params);

    expect(sendSpy).toHaveBeenNthCalledWith(
      1,
      'cf_swap_rate_v3',
      { asset: 'USDC', chain: 'Ethereum' },
      { asset: 'ETH', chain: 'Ethereum' },
      '0x3e8',
      0,
      undefined,
      {
        gas_budget: '0x2775',
        message_length: 202,
      },
      undefined,
      undefined,
    );
  });
});
