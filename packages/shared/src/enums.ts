import { z } from 'zod';

const supportedChains = ['Bitcoin', 'Ethereum', 'Polkadot'] as const;
export const supportedChain = z.enum(supportedChains);
export type SupportedChain = (typeof supportedChains)[number];

const supportedAssets = ['FLIP', 'USDC', 'DOT', 'ETH', 'BTC'] as const;
export const supportedAsset = z.enum(supportedAssets);
export type SupportedAsset = (typeof supportedAssets)[number];

const chainflipNetworks = ['sisyphos', 'perseverance', 'mainnet'] as const;
export const chainflipNetwork = z.enum(chainflipNetworks);
export type ChainflipNetwork = (typeof chainflipNetworks)[number];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network === 'perseverance' || network === 'sisyphos';

export const assetToChain: Record<SupportedAsset, SupportedChain> = {
  ETH: 'Ethereum',
  FLIP: 'Ethereum',
  USDC: 'Ethereum',
  BTC: 'Bitcoin',
  DOT: 'Polkadot',
};

export const chainToAsset: Record<SupportedChain, SupportedAsset[]> = {
  Ethereum: ['ETH', 'USDC', 'FLIP'],
  Bitcoin: ['BTC'],
  Polkadot: ['DOT'],
};
