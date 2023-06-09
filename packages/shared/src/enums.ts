import { z } from 'zod';

const supportedNetworks = ['Bitcoin', 'Ethereum', 'Polkadot'] as const;
export const network = z.enum(supportedNetworks);
export type Network = (typeof supportedNetworks)[number];

const supportedAssets = ['FLIP', 'USDC', 'DOT', 'ETH', 'BTC'] as const;
export const supportedAsset = z.enum(supportedAssets);
export type SupportedAsset = (typeof supportedAssets)[number];

const chainflipNetworks = ['sisyphos', 'perseverance', 'mainnet'] as const;
export const chainflipNetwork = z.enum(chainflipNetworks);
export type ChainflipNetwork = (typeof chainflipNetworks)[number];

export const isTestnet = (cfNetwork: ChainflipNetwork): boolean =>
  cfNetwork === 'perseverance' || cfNetwork === 'sisyphos';
