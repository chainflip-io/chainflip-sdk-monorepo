import { z } from 'zod';

export enum Chains {
  Bitcoin = 'Bitcoin',
  Ethereum = 'Ethereum',
  Polkadot = 'Polkadot',
}
export type Chain = `${Chains}`;

const supportedAssets = ['FLIP', 'USDC', 'DOT', 'ETH', 'BTC'] as const;
export const supportedAsset = z.enum(supportedAssets);
export type SupportedAsset = (typeof supportedAssets)[number];

const chainflipNetworks = ['sisyphos', 'perseverance', 'mainnet'] as const;
export const chainflipNetwork = z.enum(chainflipNetworks);
export type ChainflipNetwork = (typeof chainflipNetworks)[number];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network === 'perseverance' || network === 'sisyphos';

export const assetToChain: Record<SupportedAsset, Chain> = {
  ETH: Chains.Ethereum,
  FLIP: Chains.Ethereum,
  USDC: Chains.Ethereum,
  BTC: Chains.Bitcoin,
  DOT: Chains.Polkadot,
};

export const chainToAsset: Record<Chain, SupportedAsset[]> = {
  [Chains.Ethereum]: ['ETH', 'USDC', 'FLIP'],
  [Chains.Bitcoin]: ['BTC'],
  [Chains.Polkadot]: ['DOT'],
};
