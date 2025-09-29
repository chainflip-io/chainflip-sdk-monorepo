import { CfSafeModeStatuses, HttpClient, RpcMethod } from '@chainflip/rpc';
import {
  ChainflipAsset,
  chainflipAssets,
  ChainflipChain,
  chainflipChains,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import { uncapitalize } from '@chainflip/utils/string';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@chainflip/rpc');

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const deepMerge = <T>(target: T, source: DeepPartial<T>): T => {
  if (typeof target !== 'object' || target === null || Array.isArray(target)) {
    return source as T;
  }

  const merged = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      merged[key] = deepMerge(merged[key], source[key]!);
    }
  }
  return merged;
};

const defaultSafeModeStatusesOld = chainflipChains.reduce(
  (acc, chain) => {
    acc[`ingress_egress_${uncapitalize(chain)}`] = {
      boost_deposits_enabled: true,
      add_boost_funds_enabled: true,
      stop_boosting_enabled: true,
      deposits_enabled: true,
    };
    acc[`broadcast_${uncapitalize(chain)}`] = {
      retry_enabled: true,
    };
    return acc;
  },
  {
    swapping: {
      swaps_enabled: true,
      withdrawals_enabled: true,
      broker_registration_enabled: true,
    },
  } as Pick<
    CfSafeModeStatuses,
    | `ingress_egress_${Uncapitalize<ChainflipChain>}`
    | 'swapping'
    | `broadcast_${Uncapitalize<ChainflipChain>}`
  >,
);
const defaultSafeModeStatuses = chainflipChains.reduce(
  (acc, chain) => {
    acc[`ingress_egress_${uncapitalize(chain)}`] = {
      deposit_channel_creation_enabled: true,
      vault_deposit_witnessing_enabled: true,
      deposit_channel_witnessing_enabled: true,
      boost_deposits_enabled: true,
    };
    acc[`broadcast_${uncapitalize(chain)}`] = {
      retry_enabled: true,
      egress_witnessing_enabled: true,
    };
    return acc;
  },
  {
    swapping: {
      swaps_enabled: true,
      withdrawals_enabled: true,
      broker_registration_enabled: true,
    },
  } as Pick<
    Extract<CfSafeModeStatuses, { lending_pools: any }>,
    | `ingress_egress_${Uncapitalize<ChainflipChain>}`
    | 'swapping'
    | `broadcast_${Uncapitalize<ChainflipChain>}`
  >,
);

const mockRpc = ({
  supportedAssets = [...chainflipAssets],
  safeModeStatuses,
}: {
  supportedAssets?: ChainflipAsset[];
  safeModeStatuses?: typeof defaultSafeModeStatuses | typeof defaultSafeModeStatusesOld;
}) =>
  vi.mocked(HttpClient.prototype.sendRequest).mockImplementation((async (method: RpcMethod) => {
    switch (method) {
      case 'cf_available_pools':
        return supportedAssets
          .filter((a) => a !== 'Usdc' && a !== 'Dot')
          .map((a) => ({ base: internalAssetToRpcAsset[a], quote: internalAssetToRpcAsset.Usdc }));
      case 'cf_safe_mode_statuses':
        return safeModeStatuses ?? defaultSafeModeStatuses;
      default:
        throw new Error('unexpected request');
    }
  }) as any);

describe('networkStatus', () => {
  let networkStatusV2: typeof import('../networkInfo.js').default;
  let env: typeof import('../../config/env.js').default;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    networkStatusV2 = (await import('../networkInfo.js'))
      .default as unknown as typeof import('../networkInfo.js').default;
    env = (await import('../../config/env.js'))
      .default as unknown as typeof import('../../config/env.js').default;
  });

  it.each([defaultSafeModeStatuses, defaultSafeModeStatusesOld])(
    'returns everything when possible',
    async (safeModeStatuses) => {
      mockRpc({ safeModeStatuses });

      expect(await networkStatusV2()).toStrictEqual({
        assets: [
          {
            asset: 'Usdc',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'Usdt',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'Flip',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'Eth',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'Btc',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'ArbUsdc',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'ArbEth',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'Sol',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'SolUsdc',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'HubDot',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'HubUsdt',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
          {
            asset: 'HubUsdc',
            boostDepositsEnabled: true,
            depositChannelCreationEnabled: true,
            depositChannelDepositsEnabled: true,
            egressEnabled: true,
            vaultSwapDepositsEnabled: true,
          },
        ],
        cfBrokerCommissionBps: 0,
      });
    },
  );

  it('sets the correct flags with the old safe mode statuses', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    mockRpc({
      safeModeStatuses: deepMerge(defaultSafeModeStatusesOld, {
        ingress_egress_ethereum: { deposits_enabled: false },
      }),
    });

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": true,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": true,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('returns no assets when swapping is not enabled', async () => {
    mockRpc({
      safeModeStatuses: deepMerge(defaultSafeModeStatuses, { swapping: { swaps_enabled: false } }),
    });

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('respects the FULLY_DISABLED_INTERNAL_ASSETS env var', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    mockRpc({});

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": true,
            "depositChannelCreationEnabled": true,
            "depositChannelDepositsEnabled": true,
            "egressEnabled": true,
            "vaultSwapDepositsEnabled": true,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('respects the DISABLED_DESTINATION_INTERNAL_ASSETS env var', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    env.DISABLED_DESTINATION_INTERNAL_ASSETS.add('Flip');
    mockRpc({});

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": true,
            "depositChannelCreationEnabled": true,
            "depositChannelDepositsEnabled": true,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": true,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('respects the DISABLED_DEPOSIT_INTERNAL_ASSETS env var', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS.add('Flip');
    mockRpc({});

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": true,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it.each([
    'deposit_channel_creation_enabled',
    'deposit_channel_witnessing_enabled',
    'vault_deposit_witnessing_enabled',
  ] as const)("checks the chain's safe mode", async (key) => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    mockRpc({
      safeModeStatuses: deepMerge(defaultSafeModeStatuses, {
        ingress_egress_ethereum: { [key]: false },
      }),
    });

    expect(await networkStatusV2()).toStrictEqual({
      assets: [
        {
          asset: 'Usdc',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'Usdt',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'Flip',
          boostDepositsEnabled: true,
          depositChannelCreationEnabled: key !== 'deposit_channel_creation_enabled',
          depositChannelDepositsEnabled: key !== 'deposit_channel_witnessing_enabled',
          egressEnabled: true,
          vaultSwapDepositsEnabled: key !== 'vault_deposit_witnessing_enabled',
        },
        {
          asset: 'Eth',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'Btc',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'ArbUsdc',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'ArbEth',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'Sol',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'SolUsdc',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'HubDot',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'HubUsdt',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
        {
          asset: 'HubUsdc',
          boostDepositsEnabled: false,
          depositChannelCreationEnabled: false,
          depositChannelDepositsEnabled: false,
          egressEnabled: false,
          vaultSwapDepositsEnabled: false,
        },
      ],
      cfBrokerCommissionBps: 0,
    });
  });

  it('checks if withdrawals are enabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    mockRpc({
      safeModeStatuses: deepMerge(defaultSafeModeStatuses, {
        swapping: { withdrawals_enabled: false },
      }),
    });

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": true,
            "depositChannelCreationEnabled": true,
            "depositChannelDepositsEnabled": true,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": true,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('handles the boost flag for BTC', async () => {
    mockRpc({
      safeModeStatuses: deepMerge(defaultSafeModeStatuses, {
        swapping: { swaps_enabled: false },
        ingress_egress_bitcoin: { boost_deposits_enabled: false },
      }),
    });

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('returns the chainflip broker commission', async () => {
    mockRpc({
      safeModeStatuses: deepMerge(defaultSafeModeStatuses, {
        swapping: { swaps_enabled: false },
      }),
    });
    env.BROKER_COMMISSION_BPS = 100;

    expect(await networkStatusV2()).toMatchInlineSnapshot(`
      {
        "assets": [
          {
            "asset": "Usdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Usdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Flip",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Eth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Btc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "ArbEth",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "Sol",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "SolUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubDot",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdt",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
          {
            "asset": "HubUsdc",
            "boostDepositsEnabled": false,
            "depositChannelCreationEnabled": false,
            "depositChannelDepositsEnabled": false,
            "egressEnabled": false,
            "vaultSwapDepositsEnabled": false,
          },
        ],
        "cfBrokerCommissionBps": 100,
      }
    `);
  });
});
