import HttpClient from '@chainflip/rpc/HttpClient';
import { ChainAssetMap } from '@chainflip/utils/chainflip';
import { describe, it, expect, vi } from 'vitest';
import {
  boostPoolsDepth,
  environment,
  mockRpcResponse,
  supplyPoolsDepth,
} from '@/shared/tests/fixtures.js';
import {
  getBoostDelay,
  getBoostPoolsDepth,
  getLpBalances,
  getRuntimeVersion,
  getSupplyPoolsDepth,
} from '../rpc.js';

describe(getBoostPoolsDepth, () => {
  it('allows filtering by asset through all the boost pools and sorts the result', async () => {
    mockRpcResponse(async () => ({ data: boostPoolsDepth() }));

    const assetBoostPoolsDepth = await getBoostPoolsDepth({ asset: 'Btc' });

    expect(assetBoostPoolsDepth).toMatchSnapshot();
  });
});

describe(getLpBalances, () => {
  it('returns the balances for the given accounts', async () => {
    vi.spyOn(HttpClient.prototype, 'sendRequest').mockResolvedValueOnce({
      Bitcoin: { BTC: 1n },
      Ethereum: { ETH: 2n, FLIP: 3n, USDC: 4n, USDT: 5n, WBTC: 14n },
      Arbitrum: { ETH: 6n, USDC: 7n, USDT: 15n },
      Solana: { SOL: 9n, USDC: 10n, USDT: 16n },
      Assethub: { DOT: 11n, USDT: 12n, USDC: 13n },
      Tron: { TRX: 17n, USDT: 18n },
    } as ChainAssetMap<bigint>);

    const balances = await getLpBalances(new Set(['lp1']));

    expect(balances).toMatchInlineSnapshot(`
      [
        [
          "lp1",
          {
            "ArbEth": 6n,
            "ArbUsdc": 7n,
            "ArbUsdt": 15n,
            "Btc": 1n,
            "Eth": 2n,
            "Flip": 3n,
            "HubDot": 11n,
            "HubUsdc": 13n,
            "HubUsdt": 12n,
            "Sol": 9n,
            "SolUsdc": 10n,
            "SolUsdt": 16n,
            "Trx": 17n,
            "TrxUsdt": 18n,
            "Usdc": 4n,
            "Usdt": 5n,
            "Wbtc": 14n,
          },
        ],
      ]
    `);
  });
});

describe(getBoostDelay, () => {
  it('returns the boost delay blocks for a specific chain', async () => {
    mockRpcResponse(async () => ({ data: environment() }));

    const numBlocks = environment().result.ingress_egress.boost_delays?.Bitcoin;

    expect(numBlocks).toBeDefined();
    expect(await getBoostDelay('Bitcoin')).toBe(numBlocks);
  });
});

describe(getSupplyPoolsDepth, () => {
  it('filters supply pools by asset and converts to RPC asset format', async () => {
    mockRpcResponse(async () => ({ data: supplyPoolsDepth() }));

    const result = await getSupplyPoolsDepth({ asset: 'Btc' });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "asset": {
            "asset": "BTC",
            "chain": "Bitcoin",
          },
          "availableAmount": 100000n,
          "currentInterestRate": 100,
          "interestRateCurve": {
            "interestAtJunctionUtilisation": 75,
            "interestAtMaxUtilisation": 200,
            "interestAtZeroUtilisation": 50,
            "junctionUtilisation": 80,
          },
          "liquidationFee": 5,
          "originationFee": 10,
          "totalAmount": 100000n,
          "utilisationRate": 0,
        },
      ]
    `);
  });

  it('fetches all supply pools when no asset is provided', async () => {
    mockRpcResponse(async () => ({ data: supplyPoolsDepth() }));

    const result = await getSupplyPoolsDepth({});

    expect(result).toHaveLength(1);
  });
});

describe(getRuntimeVersion, () => {
  it('returns the runtime version with camelCased fields', async () => {
    mockRpcResponse({
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          spec_name: 'chainflip-node',
          impl_name: 'chainflip-node',
          spec_version: 20200,
          impl_version: 0,
          authoring_version: 1,
          transaction_version: 17,
          state_version: 1,
          apis: [],
        },
      },
    });

    const result = await getRuntimeVersion();

    expect(result.specVersion).toBe(20200);
    expect(result.specName).toBe('chainflip-node');
  });
});
