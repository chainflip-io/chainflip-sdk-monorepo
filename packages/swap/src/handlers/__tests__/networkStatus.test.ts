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
  safeModeStatuses = {},
}: {
  supportedAssets?: ChainflipAsset[];
  safeModeStatuses?: DeepPartial<typeof defaultSafeModeStatuses>;
}) =>
  vi.mocked(HttpClient.prototype.sendRequest).mockImplementation((async (method: RpcMethod) => {
    switch (method) {
      case 'cf_available_pools':
        return supportedAssets
          .filter((a) => a !== 'Usdc')
          .map((a) => ({ base: internalAssetToRpcAsset[a], quote: internalAssetToRpcAsset.Usdc }));
      case 'cf_safe_mode_statuses':
        return deepMerge(defaultSafeModeStatuses, safeModeStatuses);
      default:
        throw new Error('unexpected request');
    }
  }) as any);

describe('networkStatus', () => {
  let networkStatus: typeof import('../networkStatus.js').default;
  let env: typeof import('../../config/env.js').default;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    networkStatus = (await import('../networkStatus.js'))
      .default as unknown as typeof import('../networkStatus.js').default;
    env = (await import('../../config/env.js'))
      .default as unknown as typeof import('../../config/env.js').default;
  });

  it.each([['default', defaultSafeModeStatuses]])(
    'returns everything when possible (%s)',
    async (type, safeModeStatuses) => {
      mockRpc({ safeModeStatuses });

      expect(await networkStatus()).toMatchSnapshot();
    },
  );

  it('returns no assets when swapping is not enabled', async () => {
    mockRpc({ safeModeStatuses: { swapping: { swaps_enabled: false } } });

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [],
          "deposit": [],
          "destination": [],
        },
        "boostDepositsEnabled": true,
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('respects the FULLY_DISABLED_INTERNAL_ASSETS env var', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    mockRpc({});

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [
            "Flip",
          ],
          "deposit": [
            "Flip",
          ],
          "destination": [
            "Flip",
          ],
        },
        "boostDepositsEnabled": true,
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('respects the DISABLED_DESTINATION_INTERNAL_ASSETS env var', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    env.DISABLED_DESTINATION_INTERNAL_ASSETS.add('Flip');
    mockRpc({});

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [
            "Flip",
          ],
          "deposit": [
            "Flip",
          ],
          "destination": [],
        },
        "boostDepositsEnabled": true,
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('respects the DISABLED_DEPOSIT_INTERNAL_ASSETS env var', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS.add('Flip');
    mockRpc({});

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [
            "Flip",
          ],
          "deposit": [],
          "destination": [
            "Flip",
          ],
        },
        "boostDepositsEnabled": true,
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
    mockRpc({ safeModeStatuses: { ingress_egress_ethereum: { [key]: false } } });

    expect(await networkStatus()).toStrictEqual({
      assets: {
        all: ['Flip'],
        deposit: [],
        destination: ['Flip'],
      },
      boostDepositsEnabled: true,
      cfBrokerCommissionBps: 0,
    });
  });

  it('checks if withdrawals are enabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(chainflipAssets);
    env.FULLY_DISABLED_INTERNAL_ASSETS.delete('Flip');
    mockRpc({ safeModeStatuses: { swapping: { withdrawals_enabled: false } } });

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [
            "Flip",
          ],
          "deposit": [
            "Flip",
          ],
          "destination": [],
        },
        "boostDepositsEnabled": true,
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('handles the boost flag for BTC', async () => {
    mockRpc({
      safeModeStatuses: {
        swapping: { swaps_enabled: false },
        ingress_egress_bitcoin: { boost_deposits_enabled: false },
      },
    });

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [],
          "deposit": [],
          "destination": [],
        },
        "boostDepositsEnabled": false,
        "cfBrokerCommissionBps": 0,
      }
    `);
  });

  it('returns the chainflip broker commission', async () => {
    mockRpc({
      safeModeStatuses: {
        swapping: { swaps_enabled: false },
      },
    });
    env.BROKER_COMMISSION_BPS = 100;

    expect(await networkStatus()).toMatchInlineSnapshot(`
      {
        "assets": {
          "all": [],
          "deposit": [],
          "destination": [],
        },
        "boostDepositsEnabled": true,
        "cfBrokerCommissionBps": 100,
      }
    `);
  });
});
