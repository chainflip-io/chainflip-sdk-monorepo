import { ChainflipAsset, InternalAssetMap } from '@chainflip/utils/chainflip';

const prices: InternalAssetMap<number> & { Dot: number } = {
  Dot: 6.5,
  Usdt: 1,
  Usdc: 1,
  Wbtc: 65_000,
  ArbUsdc: 1,
  ArbUsdt: 1,
  SolUsdc: 1,
  SolUsdt: 1,
  Sol: 150,
  Btc: 65_000,
  Flip: 4,
  Eth: 2_000,
  ArbEth: 2_000,
  HubDot: 6.5,
  HubUsdc: 1,
  HubUsdt: 1,
};

export const getAssetPrice = async (asset: ChainflipAsset): Promise<number | undefined> =>
  prices[asset];
