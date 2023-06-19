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

export const ChainflipNetworks = {
  sisyphos: 'sisyphos',
  perseverance: 'perseverance',
  mainnet: 'mainnet',
} as const;
export type ChainflipNetwork =
  (typeof ChainflipNetworks)[keyof typeof ChainflipNetworks];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network === 'perseverance' || network === 'sisyphos';

export const assetChains = {
  [Assets.ETH]: Chains.Ethereum,
  [Assets.FLIP]: Chains.Ethereum,
  [Assets.USDC]: Chains.Ethereum,
  [Assets.BTC]: Chains.Bitcoin,
  [Assets.DOT]: Chains.Polkadot,
} satisfies Record<Asset, Chain>;

export const assetDecimals = {
  [Assets.DOT]: 10,
  [Assets.ETH]: 18,
  [Assets.FLIP]: 18,
  [Assets.USDC]: 6,
  [Assets.BTC]: 8,
} satisfies Record<Asset, number>;

export const chainAssets = {
  [Chains.Ethereum]: [Assets.ETH, Assets.USDC, Assets.FLIP],
  [Chains.Bitcoin]: [Assets.BTC],
  [Chains.Polkadot]: [Assets.DOT],
} satisfies Record<Chain, Asset[]>;
