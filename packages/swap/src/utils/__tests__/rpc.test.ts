import HttpClient from '@chainflip/rpc/HttpClient';
import { ChainAssetMap } from '@chainflip/utils/chainflip';
import { describe, it, expect, vi } from 'vitest';
import { boostPoolsDepth, mockRpcResponse } from '@/shared/tests/fixtures';
import { getBoostPoolsDepth, getLpBalances } from '../rpc';

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
      Ethereum: { ETH: 2n, FLIP: 3n, USDC: 4n, USDT: 5n },
      Arbitrum: { ETH: 6n, USDC: 7n },
      Polkadot: { DOT: 8n },
      Solana: { SOL: 9n, USDC: 10n },
    } as ChainAssetMap<bigint>);

    const balances = await getLpBalances(new Set(['lp1']));

    expect(balances).toMatchInlineSnapshot(`
      [
        [
          "lp1",
          {
            "ArbEth": 6n,
            "ArbUsdc": 7n,
            "Btc": 1n,
            "Dot": 8n,
            "Eth": 2n,
            "Flip": 3n,
            "Sol": 9n,
            "SolUsdc": 10n,
            "Usdc": 4n,
            "Usdt": 5n,
          },
        ],
      ]
    `);
  });
});
