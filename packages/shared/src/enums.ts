import { z } from 'zod';

export const Chains = {
  Bitcoin: 'Bitcoin',
  Ethereum: 'Ethereum',
  Polkadot: 'Polkadot',
} as const;
export type Chain = (typeof Chains)[keyof typeof Chains];

export const Assets = {
  FLIP: 'FLIP',
  USDC: 'USDC',
  DOT: 'DOT',
  ETH: 'ETH',
  BTC: 'BTC',
} as const;
export type Asset = (typeof Assets)[keyof typeof Assets];

const chainflipNetworks = ['sisyphos', 'perseverance', 'mainnet'] as const;
export const chainflipNetwork = z.enum(chainflipNetworks);
export type ChainflipNetwork = (typeof chainflipNetworks)[number];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network === 'perseverance' || network === 'sisyphos';

export const assetChains: Record<Asset, Chain> = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
};

export const assetDecimals: Record<Asset, number> = {
  [Assets.DOT]: 10,
  [Assets.ETH]: 18,
  [Assets.FLIP]: 18,
  [Assets.USDC]: 6,
  [Assets.BTC]: 8,
};

export const chainAssets: Record<Chain, Asset[]> = {
  [Chains.Ethereum]: [Assets.ETH, Assets.USDC, Assets.FLIP],
  [Chains.Bitcoin]: [Assets.BTC],
  [Chains.Polkadot]: [Assets.DOT],
};
