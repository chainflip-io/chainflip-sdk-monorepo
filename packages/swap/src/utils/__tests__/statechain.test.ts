import { WsClient } from '@chainflip/rpc';
import { ChainflipAsset, internalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { describe, it, expect, vi } from 'vitest';
import { isAtLeastSpecVersion } from '../function.js';
import { getSwapRateV3 } from '../statechain.js';

vi.mock('../function', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    isAtLeastSpecVersion: vi.fn().mockResolvedValue(true),
  };
});

const buildFee = (asset: ChainflipAsset, amount: bigint | number) => ({
  bigint: {
    amount: BigInt(amount),
    ...internalAssetToRpcAsset[asset],
  },
  string: {
    amount: hexEncodeNumber(amount),
    ...internalAssetToRpcAsset[asset],
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
    vi.mocked(isAtLeastSpecVersion).mockResolvedValueOnce(false);

    const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
      broker_commission: buildFee('Usdc', 0).bigint,
      ingress_fee: buildFee('Usdc', 0).bigint,
      egress_fee: buildFee('Eth', 0).bigint,
      network_fee: buildFee('Usdc', 100100).bigint,
      intermediary: null,
      output: BigInt(1e18),
    });

    const getSwapRateV3Params = {
      srcAsset: 'Usdc' as const,
      destAsset: 'Eth' as const,
      depositAmount: 1000n,
      limitOrders: undefined,
      dcaParams: undefined,
      excludeFees: ['IngressDepositChannel' as const],
      brokerCommissionBps: 0,
    };

    await getSwapRateV3(getSwapRateV3Params);

    expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "cf_swap_rate_v3",
          {
            "asset": "USDC",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0x3e8",
          0,
          undefined,
          undefined,
          [
            "IngressDepositChannel",
          ],
          undefined,
          undefined,
        ],
      ]
    `);
  });

  it('calls sendRequest with ccm params', async () => {
    vi.mocked(isAtLeastSpecVersion).mockResolvedValueOnce(false);

    const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
      broker_commission: buildFee('Usdc', 0).bigint,
      ingress_fee: buildFee('Usdc', 0).bigint,
      egress_fee: buildFee('Eth', 0).bigint,
      network_fee: buildFee('Usdc', 100100).bigint,
      intermediary: null,
      output: BigInt(1e18),
    });

    const getSwapRateV3Params = {
      srcAsset: 'Usdc' as const,
      destAsset: 'Eth' as const,
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

    expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "cf_swap_rate_v3",
          {
            "asset": "USDC",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0x3e8",
          0,
          undefined,
          {
            "gas_budget": 10101,
            "message_length": 202,
          },
          undefined,
          undefined,
          undefined,
        ],
      ]
    `);
  });

  it('calls sendRequest with internal swap flag for v1.10', async () => {
    vi.mocked(isAtLeastSpecVersion).mockResolvedValueOnce(true);

    const sendSpy = vi.spyOn(WsClient.prototype, 'sendRequest').mockResolvedValueOnce({
      broker_commission: buildFee('Usdc', 0).bigint,
      ingress_fee: buildFee('Usdc', 0).bigint,
      egress_fee: buildFee('Eth', 0).bigint,
      network_fee: buildFee('Usdc', 100100).bigint,
      intermediary: null,
      output: BigInt(1e18),
    });

    const getSwapRateV3Params = {
      srcAsset: 'Usdc' as const,
      destAsset: 'Eth' as const,
      depositAmount: 1000n,
      limitOrders: undefined,
      dcaParams: undefined,
      ccmParams: {
        gasBudget: 10101n,
        messageLengthBytes: 202,
      },
      brokerCommissionBps: 0,
      isInternal: true,
    };

    await getSwapRateV3(getSwapRateV3Params);

    expect(sendSpy.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "cf_swap_rate_v3",
          {
            "asset": "USDC",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0x3e8",
          0,
          undefined,
          {
            "gas_budget": 10101,
            "message_length": 202,
          },
          undefined,
          undefined,
          true,
        ],
      ]
    `);
  });
});
