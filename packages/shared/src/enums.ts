type ArrayToMap<T extends readonly string[]> = {
  [K in T[number]]: K;
};

const arrayToMap = <const T extends readonly string[]>(
  array: T,
): ArrayToMap<T> =>
  Object.fromEntries(array.map((key) => [key, key])) as ArrayToMap<T>;

export const InternalAssets = arrayToMap(['Flip', 'Usdc', 'Dot', 'Eth', 'Btc']);
export type InternalAsset =
  (typeof InternalAssets)[keyof typeof InternalAssets];

export const Chains = arrayToMap(['Bitcoin', 'Ethereum', 'Polkadot']);
export type Chain = (typeof Chains)[keyof typeof Chains];

export const Assets = arrayToMap(['FLIP', 'USDC', 'DOT', 'ETH', 'BTC']);
export type Asset = (typeof Assets)[keyof typeof Assets];

export const ChainflipNetworks = arrayToMap([
  'backspin',
  'sisyphos',
  'perseverance',
  'mainnet',
]);

export type ChainflipNetwork =
  (typeof ChainflipNetworks)[keyof typeof ChainflipNetworks];

export const isTestnet = (network: ChainflipNetwork): boolean =>
  network !== ChainflipNetworks.mainnet;

// https://github.com/chainflip-io/chainflip-backend/blob/a2a3c2e447e7b629c4b96797d9eed22eb5b87a0b/state-chain/primitives/src/chains/assets.rs#L51-L59
export const assetConstants = {
  [InternalAssets.Eth]: {
    chain: Chains.Ethereum,
    asset: Assets.ETH,
    name: 'Ether',
    decimals: 18,
    contractId: 1,
  },
  [InternalAssets.Flip]: {
    chain: Chains.Ethereum,
    asset: Assets.FLIP,
    name: 'FLIP',
    decimals: 18,
    contractId: 2,
  },
  [InternalAssets.Usdc]: {
    chain: Chains.Ethereum,
    asset: Assets.USDC,
    name: 'USDC',
    decimals: 6,
    contractId: 3,
  },
  [InternalAssets.Dot]: {
    chain: Chains.Polkadot,
    asset: Assets.DOT,
    name: 'Polkadot',
    decimals: 10,
    contractId: 4,
  },
  [InternalAssets.Btc]: {
    chain: Chains.Bitcoin,
    asset: Assets.BTC,
    name: 'Bitcoin',
    decimals: 8,
    contractId: 5,
  },
} satisfies Record<
  InternalAsset,
  {
    chain: Chain;
    asset: Asset;
    name: string;
    decimals: number;
    contractId: number;
  }
>;

// https://github.com/chainflip-io/chainflip-backend/blob/a2a3c2e447e7b629c4b96797d9eed22eb5b87a0b/state-chain/primitives/src/chains.rs#L52-L56
export const chainConstants = {
  [Chains.Ethereum]: {
    assets: [Assets.ETH, Assets.FLIP, Assets.USDC],
    gasAsset: Assets.ETH,
    contractId: 1,
  },
  [Chains.Polkadot]: {
    assets: [Assets.DOT],
    gasAsset: Assets.DOT,
    contractId: 2,
  },
  [Chains.Bitcoin]: {
    assets: [Assets.BTC],
    gasAsset: Assets.BTC,
    contractId: 3,
  },
} satisfies Record<
  Chain,
  { assets: Asset[]; gasAsset: Asset; contractId: number }
>;

export type AssetOfChain<C extends Chain> =
  (typeof chainConstants)[C]['assets'][number];

export type UncheckedAssetAndChain = { asset: Asset; chain: Chain };
export type AssetAndChain = {
  [C in Chain]: { chain: C; asset: AssetOfChain<C> };
}[Chain];

export type ChainAssetMap<T> = {
  [C in Chain]: {
    [A in AssetOfChain<C>]: T;
  };
};

export function isValidAssetAndChain(
  assetAndChain: UncheckedAssetAndChain,
): assetAndChain is AssetAndChain {
  const { asset, chain } = assetAndChain;
  const validAssets = chainConstants[chain].assets as string[];

  return validAssets.includes(asset);
}

export function assertIsValidAssetAndChain(
  assetAndChain: UncheckedAssetAndChain,
): asserts assetAndChain is AssetAndChain {
  if (!isValidAssetAndChain(assetAndChain)) {
    throw new Error('invalid asset and chain combination');
  }
}

export const readChainAssetMap = <T>(
  value: ChainAssetMap<T>,
  asset: UncheckedAssetAndChain,
): T => {
  assertIsValidAssetAndChain(asset);
  const chainValues = value[asset.chain];
  return chainValues[asset.asset as keyof typeof chainValues];
};

export function getInternalAsset(asset: UncheckedAssetAndChain) {
  const map: ChainAssetMap<InternalAsset> = {
    [Chains.Ethereum]: {
      [Assets.USDC]: InternalAssets.Usdc,
      [Assets.FLIP]: InternalAssets.Flip,
      [Assets.ETH]: InternalAssets.Eth,
    },
    [Chains.Bitcoin]: {
      [Assets.BTC]: InternalAssets.Btc,
    },
    [Chains.Polkadot]: {
      [Assets.DOT]: InternalAssets.Dot,
    },
  };

  return readChainAssetMap(map, asset);
}
