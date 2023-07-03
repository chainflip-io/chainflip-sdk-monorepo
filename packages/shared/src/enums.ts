type ArrayToMap<T extends readonly string[]> = {
  [K in T[number]]: K;
};

const arrayToMap = <const T extends readonly string[]>(
  array: T,
): ArrayToMap<T> =>
  Object.fromEntries(array.map((key) => [key, key])) as ArrayToMap<T>;

export const Chains = arrayToMap(['Bitcoin', 'Ethereum', 'Polkadot']);
export type Chain = (typeof Chains)[keyof typeof Chains];

export const Assets = arrayToMap(['FLIP', 'USDC', 'DOT', 'ETH', 'BTC']);
export type Asset = (typeof Assets)[keyof typeof Assets];

export const ChainflipNetworks = arrayToMap([
  'sisyphos',
  'perseverance',
  'mainnet',
  'partnernet',
]);

export type ChainflipNetwork =
  (typeof ChainflipNetworks)[keyof typeof ChainflipNetworks];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network !== ChainflipNetworks.mainnet;

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
